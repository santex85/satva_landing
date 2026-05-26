#!/usr/bin/env python3
"""Sync privacy modal bodies from standalone privacy.html pages (h2 -> h3)."""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def extract_body(html: str) -> str:
    start = html.find('<p class="meta">')
    if start == -1:
        start = html.find('<p>Настоящая') if 'Настоящая' in html else html.find('<p>This Privacy')
    end = html.rfind('<p><em>Дата последнего')
    if end == -1:
        end = html.rfind('<p><em>Last updated:')
    if start == -1 or end == -1:
        raise ValueError('Could not extract privacy body')
    body = html[start:end].strip()
    body = re.sub(r'<h2>', '<h3>', body)
    body = re.sub(r'</h2>', '</h3>', body)
    link_ru = '<p><a href="/ru/privacy.html" target="_blank" rel="noopener noreferrer">Полная версия на отдельной странице</a></p>\n'
    link_en = '<p><a href="/privacy.html" target="_blank" rel="noopener noreferrer">Full version on a separate page</a></p>\n'
    if 'Настоящая Политика' in body or '«Политика»' in body:
        body = link_ru + body
    else:
        body = link_en + body
    return body


def patch_index(path: Path, modal_body: str) -> None:
    text = path.read_text(encoding='utf-8')
    pattern = (
        r'(<div id="yogaModalPrivacy"[^>]*>.*?'
        r'<div class="yoga-modal__body yoga-modal__body--scroll">)\s*'
        r'.*?\s*'
        r'(</div>\s*</div>\s*</div>\s*\n\s*'
        r'<div id="yogaModalOffer")'
    )
    closing = (
        '\n                <p><em>Дата последнего обновления: 25 мая 2026 г. Версия документа: 2026-05-25.</em></p>'
        if 'Настоящая' in modal_body or '«Политика»' in modal_body
        else '\n                <p><em>Last updated: 25 May 2026. Document version: 2026-05-25.</em></p>'
    )
    repl = r'\1\n' + modal_body + closing + '\n            \2'
    new_text, n = re.subn(pattern, repl, text, count=1, flags=re.DOTALL)
    if n != 1:
        raise SystemExit(f'Failed to patch {path}: {n} replacements')
    path.write_text(new_text, encoding='utf-8')
    print(f'Updated {path}')


def main() -> None:
    ru_body = extract_body((ROOT / 'ru' / 'privacy.html').read_text(encoding='utf-8'))
    en_body = extract_body((ROOT / 'privacy.html').read_text(encoding='utf-8'))
    patch_index(ROOT / 'ru' / 'index.html', '                ' + ru_body.replace('\n', '\n                '))
    patch_index(ROOT / 'index.html', '                ' + en_body.replace('\n', '\n                '))


if __name__ == '__main__':
    main()
