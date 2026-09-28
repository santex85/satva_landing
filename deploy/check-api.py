#!/usr/bin/env python3
"""Host-side check for the Satva API. Run from cron, not from the app container.

The app cannot email anyone while it is crash-looping, so this script curls
the health URL from the host and sends mail through Resend directly.

Cron (every 5 minutes), after the repo is on the server:

    */5 * * * * root /var/www/satva-landing/deploy/check-api.py >> /var/log/satva-api-check.log 2>&1

A single failed check is ignored, so a deploy restart does not send mail.
Two failures in a row send one letter, then a reminder every 6 hours.
Recovery sends one letter and clears the state.
"""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path("/var/www/satva-landing")
ENV_FILE = ROOT / "server" / ".env"
STATE_FILE = Path("/var/lib/satva/api-alert.json")
HEALTH_URL = "http://127.0.0.1:9080/api/health"
CONTAINER = "satva-landing-app-1"
REMIND_AFTER_SEC = 6 * 60 * 60


def load_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.is_file():
        return values
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def container_status() -> str:
    try:
        import subprocess

        result = subprocess.run(
            ["docker", "inspect", "-f", "{{.State.Status}}", CONTAINER],
            check=False,
            capture_output=True,
            text=True,
            timeout=15,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        return f"inspect failed: {exc}"
    if result.returncode != 0:
        err = (result.stderr or result.stdout or "").strip()
        return f"inspect failed: {err or result.returncode}"
    return (result.stdout or "").strip() or "unknown"


def health_status() -> tuple[bool, str]:
    request = urllib.request.Request(HEALTH_URL, method="GET")
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            code = response.status
            body = response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        return False, f"HTTP {exc.code}"
    except Exception as exc:
        return False, f"no response ({exc.__class__.__name__})"

    if code != 200:
        return False, f"HTTP {code}"
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        return False, "health body is not JSON"
    if payload.get("status") != "ok" or payload.get("db") != "ok":
        return False, f"degraded: {body[:300]}"
    return True, "ok"


def read_state() -> dict:
    try:
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"failures": 0, "alerted": False, "last_alert": 0}


def write_state(state: dict) -> None:
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state), encoding="utf-8")


def send_mail(env: dict[str, str], subject: str, text: str) -> None:
    api_key = env.get("RESEND_API_KEY", "")
    sender = env.get("RESEND_FROM", "")
    recipients = [item.strip() for item in env.get("RESEND_TO", "").split(",") if item.strip()]
    if not api_key or not sender or not recipients:
        raise SystemExit("RESEND_API_KEY, RESEND_FROM and RESEND_TO must be set in server/.env")

    payload = json.dumps(
        {"from": sender, "to": recipients, "subject": subject, "text": text}
    ).encode("utf-8")
    request = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "satva-api-check/1.0",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            response.read()
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:400]
        raise SystemExit(f"Resend HTTP {exc.code}: {detail}") from exc


def problem() -> str:
    app_state = container_status()
    healthy, detail = health_status()
    if app_state != "running":
        return f"container {CONTAINER} is {app_state}; health: {detail}"
    if not healthy:
        return f"container is running; health: {detail}"
    return ""


def main() -> None:
    env = load_env(ENV_FILE)
    if "--test" in sys.argv:
        send_mail(
            env,
            "Satva API: проверка оповещения",
            "Это тестовое письмо. Проверка API на сервере работает, "
            "и письма уходят на адрес уведомлений о заявках.",
        )
        print("test email sent")
        return

    state = read_state()
    reason = problem()
    now = int(datetime.now(timezone.utc).timestamp())

    if not reason:
        if state.get("alerted"):
            send_mail(
                env,
                "Satva API снова работает",
                "Проверка http://127.0.0.1:9080/api/health прошла, контейнер запущен.",
            )
            print("recovery email sent")
        write_state({"failures": 0, "alerted": False, "last_alert": 0})
        return

    failures = int(state.get("failures") or 0) + 1
    alerted = bool(state.get("alerted"))
    last_alert = int(state.get("last_alert") or 0)
    should_send = (not alerted and failures >= 2) or (
        alerted and now - last_alert >= REMIND_AFTER_SEC
    )
    if should_send:
        send_mail(
            env,
            "Satva API не отвечает",
            "Сайт может открываться, потому что страницы отдаёт nginx, "
            "но API заявок и админки недоступен.\n\n"
            f"{reason}\n\n"
            "Проверка: curl -sS http://127.0.0.1:9080/api/health\n"
            "Логи: docker logs --tail 80 satva-landing-app-1",
        )
        alerted = True
        last_alert = now
        print(f"alert sent: {reason}")
    else:
        print(f"down ({failures}): {reason}")

    write_state({"failures": failures, "alerted": alerted, "last_alert": last_alert})


if __name__ == "__main__":
    main()
