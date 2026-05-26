#!/usr/bin/env python3
"""Sync cancellation modal bodies from standalone legal pages (h2 -> h3)."""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def extract_body(html: str, marker_end: str) -> str:
    start = html.find('<p class="meta">')
    end = html.rfind(marker_end)
    if start == -1 or end == -1:
        raise ValueError('Could not extract cancellation body')
    body = html[start:end].strip()
    body = re.sub(r'<h2>', '<h3>', body)
    body = re.sub(r'</h2>', '</h3>', body)
    return body


def patch_index(path: Path, modal_body: str, closing_em: str) -> None:
    text = path.read_text(encoding='utf-8')
    pattern = (
        r'(<div id="yogaModalCancellation"[^>]*>.*?'
        r'<div class="yoga-modal__body yoga-modal__body--scroll">)\s*'
        r'.*?\s*'
        r'(</div>\s*</div>\s*</div>\s*\n\s*'
        r'<!-- Tawk)'
    )
    indented = modal_body.replace('\n', '\n                ')
    repl = (
        r'\1\n                ' + indented + closing_em
        + '\n            </div>\n        </div>\n    </div>\n\n    \2'
    )
    new_text, n = re.subn(pattern, repl, text, count=1, flags=re.DOTALL)
    if n != 1:
        raise SystemExit(f'Failed to patch {path}: {n} replacements')
    path.write_text(new_text, encoding='utf-8')
    print(f'Updated {path}')


def main() -> None:
    ru_html = (ROOT / 'ru' / 'cancellation.html').read_text(encoding='utf-8')
    en_html = (ROOT / 'cancellation.html').read_text(encoding='utf-8')

    ru_body = extract_body(ru_html, '<p><em>Дата последнего обновления:')
    en_body = extract_body(en_html, '<p><em>Last updated:')

    ru_link = '<p><a href="/ru/cancellation.html" target="_blank" rel="noopener noreferrer">Полная версия на отдельной странице</a></p>\n                '
    en_link = '<p><a href="/cancellation.html" target="_blank" rel="noopener noreferrer">Full version on a separate page</a></p>\n                '
    ru_body = ru_link + ru_body
    en_body = en_link + en_body

    patch_index(
        ROOT / 'ru' / 'index.html',
        ru_body,
        '\n                <p><em>Дата последнего обновления: 25 мая 2026 г. Версия документа: 2026-05-25.</em></p>',
    )
    patch_index(
        ROOT / 'index.html',
        en_body,
        '\n                <p><em>Last updated: 25 May 2026. Document version: 2026-05-25.</em></p>',
    )


if __name__ == '__main__':
    main()
