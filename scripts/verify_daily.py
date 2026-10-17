#!/usr/bin/env python3
"""Check the daily card's Quran verses and hadith against their sources (ADR-023).

    python3 scripts/verify_daily.py

Run it after adding or editing anything in src/content/verses.ts or src/content/hadith.ts.
It downloads (once, into ~/.cache/itqan-daily) the sources the content was generated from:

- quran-json 3.1.2 (npm): KFGQPC Uthmani text from quranenc.com + Saheeh International English.
- fawazahmed0/hadith-api (GitHub, branch 1): the six books in Arabic and English, sunnah.com
  numbering, with grades.

and checks, word for word:
- every verse's Arabic is the source ayah (or a run of whole words from it, for an excerpt),
  after the same mapping of KFGQPC's private open-tanween code points to Standard Unicode;
- every verse's English uses Saheeh International's words (punctuation and capitals may differ);
- every hadith's Arabic appears in the cited hadith (any of its narrations under that number),
  and al-Albani's grade matches for books other than al-Bukhari and Muslim.

Exits non-zero on any mismatch. Not part of CI: it needs the network. Downloads are read as data
only — the npm tarball is read in memory, never extracted or executed.
"""
import io
import json
import re
import sys
import tarfile
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = Path.home() / '.cache' / 'itqan-daily'
QURAN_TGZ = 'https://registry.npmjs.org/quran-json/-/quran-json-3.1.2.tgz'
HADITH_URL = 'https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions/{}.min.json'
BOOKS = ['bukhari', 'muslim', 'tirmidhi', 'abudawud', 'ibnmajah']

KFGQPC_TO_UNICODE = {'ٗ': 'ࣰ', 'ٞ': 'ࣱ', 'ٖ': 'ࣲ', ' ': ' '}
DIAC_AND_MARKS = re.compile(r'[ً-ٰٟـۖ-ࣰۭ-ࣲ‎‏]')
FOLD = str.maketrans({'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ؤ': 'و', 'ئ': 'ي', 'ى': 'ي', 'ة': 'ه'})


def fetch(url: str, name: str) -> bytes:
    path = CACHE / name
    if not path.exists():
        CACHE.mkdir(parents=True, exist_ok=True)
        print(f'downloading {url}', file=sys.stderr)
        with urllib.request.urlopen(url, timeout=120) as r:
            path.write_bytes(r.read())
    return path.read_bytes()


def content_array(file: str, name: str) -> list:
    """The JSON array assigned to `export const NAME… = [` in a content file."""
    src = (ROOT / 'src' / 'content' / file).read_text(encoding='utf-8')
    start = src.index('= [', src.index(f'export const {name}')) + 2
    depth = 0
    for i in range(start, len(src)):
        if src[i] == '[':
            depth += 1
        elif src[i] == ']':
            depth -= 1
            if depth == 0:
                items = json.loads(re.sub(r',\s*\]$', ']', src[start:i + 1].strip()))
                if not items:
                    raise ValueError(f'{file}: {name} parsed as empty — refusing to pass vacuously')
                return items
    raise ValueError(f'{file}: array {name} not closed')


def quran():
    tgz = tarfile.open(fileobj=io.BytesIO(fetch(QURAN_TGZ, 'quran-json-3.1.2.tgz')), mode='r:gz')
    ar = json.load(tgz.extractfile('package/dist/quran.json'))
    en = json.load(tgz.extractfile('package/dist/quran_en.json'))
    return ar, en


def uthmani(ar, s, v):
    t = ''.join(KFGQPC_TO_UNICODE.get(c, c) for c in ar[s - 1]['verses'][v - 1]['text'])
    return re.sub(r'\s+', ' ', t.replace('۞', '')).strip()


def en_words(t: str) -> list:
    # Quote marks are punctuation; an apostrophe inside a word (Qur'an, atom's) is not.
    words = (w.strip("'") for w in re.findall(r"[a-z0-9'\[\]]+", t.lower().replace('’', "'")))
    return [w for w in words if w]


def contains_run(hay: list, needle: list) -> bool:
    n = len(needle)
    return any(hay[i:i + n] == needle for i in range(len(hay) - n + 1))


def check_verses(errors: list):
    ar, en = quran()
    verses = content_array('verses.ts', 'VERSES')
    for x in verses:
        ref = f"{x['s']}:{x['a']}-{x['b']}"
        for i, v in enumerate(range(x['a'], x['b'] + 1)):
            src = uthmani(ar, x['s'], v).split(' ')
            mine = x['ar'][i].split(' ')
            if x.get('part'):
                if not contains_run(src, mine):
                    errors.append(f'verse {ref}: ayah {v} Arabic is not a run of words from the source')
            elif mine != src:
                errors.append(f'verse {ref}: ayah {v} Arabic differs from the source')
        si = en_words(' '.join(en[x['s'] - 1]['verses'][v - 1]['translation'] for v in range(x['a'], x['b'] + 1)))
        mine = en_words(x['en'])
        if (x.get('part') and not contains_run(si, mine)) or (not x.get('part') and mine != si):
            errors.append(f'verse {ref}: English is not Saheeh International’s wording')
    print(f'{len(verses)} verses checked')


def plain(s: str) -> str:
    s = DIAC_AND_MARKS.sub('', s).translate(FOLD)
    return re.sub(r'[^ء-ي ]+', ' ', re.sub(r'\s+', ' ', s)).replace(' ', '')


def hadith_index(book: str) -> dict:
    ara = json.loads(fetch(HADITH_URL.format(f'ara-{book}'), f'ara-{book}.json'))['hadiths']
    eng = json.loads(fetch(HADITH_URL.format(f'eng-{book}'), f'eng-{book}.json'))['hadiths']
    by_number = {h['hadithnumber']: h for h in ara}
    index = {}
    for e in eng:
        key = str(e.get('arabicnumber' if book == 'muslim' else 'hadithnumber', '')).split('.')[0].strip()
        a = by_number.get(e['hadithnumber'])
        if a:
            index.setdefault(key, []).append((plain(a['text']), {g['name']: g['grade'] for g in e.get('grades', [])}))
    return index


def check_hadith(errors: list):
    items = content_array('hadith.ts', 'HADITH')
    indexes = {b: hadith_index(b) for b in BOOKS}
    manual = []
    for h in items:
        ref = f"{h['book']}:{h['n']}"
        if h.get('checked') is False:
            manual.append(ref)
            continue
        variants = indexes.get(h['book'], {}).get(str(h['n']), [])
        if not variants:
            errors.append(f'hadith {ref}: not found in the source')
            continue
        hit = [g for text, g in variants if plain(h['ar']) in text]
        if not hit:
            errors.append(f'hadith {ref}: Arabic not found in the cited hadith')
        elif h['book'] not in ('bukhari', 'muslim') and hit[0].get('Al-Albani') != h.get('grade'):
            errors.append(f"hadith {ref}: grade {h.get('grade')!r}, al-Albani says {hit[0].get('Al-Albani')!r}")
    print(f'{len(items) - len(manual)} hadith checked; sourced by hand (not in these sources): {", ".join(manual) or "none"}')


def main():
    errors: list = []
    check_verses(errors)
    check_hadith(errors)
    for e in errors:
        print('✗', e)
    print('OK' if not errors else f'{len(errors)} problem(s)')
    sys.exit(1 if errors else 0)


if __name__ == '__main__':
    main()
