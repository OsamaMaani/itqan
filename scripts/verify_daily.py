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

- every French, Spanish and Chinese verse meaning (src/content/meanings/) is the published
  translation word for word, and every excerpt is a run of it (ADR-024).

    python3 scripts/verify_daily.py --write-meanings

regenerates the published translations and surah names in src/content/meanings/ from the same
tarball (after adding a verse), keeping the hand-cut excerpts.

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


def tarball():
    return tarfile.open(fileobj=io.BytesIO(fetch(QURAN_TGZ, 'quran-json-3.1.2.tgz')), mode='r:gz')


def quran():
    tgz = tarball()
    ar = json.load(tgz.extractfile('package/dist/quran.json'))
    en = json.load(tgz.extractfile('package/dist/quran_en.json'))
    return ar, en


# The published translations of the meanings shown under a verse in each interface language.
MEANINGS = {
    'fr': ('Muhammad Hamidullah', 'tanzil.net/trans/fr.hamidullah'),
    'es': ('Muhammad Isa García', 'tanzil.net/trans/es.garcia'),
    'zh': ('Muhammad Makin', 'quranenc.com/en/browse/chinese_makin'),
}


def chapters(lang: str) -> list:
    tgz = tarball()
    return [json.load(tgz.extractfile(f'package/dist/chapters/{lang}/{s}.json')) for s in range(1, 115)]


def verse_key(x) -> str:
    return f"{x['s']}:{x['a']}-{x['b']}"


def published(ch: list, x) -> str:
    return ' '.join(ch[x['s'] - 1]['verses'][v - 1]['translation'].strip() for v in range(x['a'], x['b'] + 1))


def meanings_file(lang: str) -> Path:
    return ROOT / 'src' / 'content' / 'meanings' / f'{lang}.ts'


def content_object(path: Path, name: str) -> dict:
    """The JSON object assigned to `export const NAME… = {` in a content file ({} if absent)."""
    src = path.read_text(encoding='utf-8') if path.exists() else ''
    if f'export const {name}' not in src:
        return {}
    start = src.index('= {', src.index(f'export const {name}')) + 2
    depth = 0
    for i in range(start, len(src)):
        if src[i] == '{':
            depth += 1
        elif src[i] == '}':
            depth -= 1
            if depth == 0:
                return json.loads(re.sub(r',\s*\}$', '}', src[start:i + 1].strip()))
    raise ValueError(f'{path}: object {name} not closed')


def write_meanings():
    verses = content_array('verses.ts', 'VERSES')
    ar_chapters = chapters('zh')  # any language: every chapter file carries the Arabic name too
    (ROOT / 'src' / 'content' / 'meanings').mkdir(exist_ok=True)
    names = [c['name'] for c in ar_chapters]
    meanings_file('ar').write_text(
        '/** Surah names in Arabic for the Arabic interface (ADR-024). Generated by\n'
        ' * `python3 scripts/verify_daily.py --write-meanings` from quran-json 3.1.2 — do not edit. In Arabic\n'
        ' * the daily card shows the verse alone, without a translation of its meanings. */\n'
        f'export const SURAH_NAMES: string[] = {json.dumps(names, ensure_ascii=False)}\n', encoding='utf-8')
    for lang, (by, src) in MEANINGS.items():
        ch = chapters(lang)
        path = meanings_file(lang)
        excerpts = content_object(path, 'EXCERPTS')
        full = {verse_key(x): published(ch, x) for x in verses}
        keep = {k: excerpts.get(k, '') for k in (verse_key(x) for x in verses if x.get('part'))}
        lines = [
            f'/**',
            f' * The meanings of the daily card\'s verses in this language: {by}\'s translation ({src}),',
            f' * via quran-json 3.1.2. VERSE_MEANINGS and SURAH_NAMES are generated by',
            f' * `python3 scripts/verify_daily.py --write-meanings` — never edit them by hand (ADR-024).',
            f' * EXCERPTS are cut by hand for the verses shown in part: each must be a run of words from',
            f' * the published translation of that verse, matching the Arabic excerpt (checked by',
            f' * daily.test.ts and verify_daily.py). An excerpt is never retranslated.',
            f' */',
            f"export const TRANSLATOR = {json.dumps(by, ensure_ascii=False)}",
            f'export const SURAH_NAMES: string[] = {json.dumps([c["translation"] for c in ch], ensure_ascii=False)}',
            f'export const VERSE_MEANINGS: Record<string, string> = {{',
            *[f'  {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)},' for k, v in full.items()],
            f'}}',
            f'export const EXCERPTS: Record<string, string> = {{',
            *[f'  {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)},' for k, v in keep.items()],
            f'}}',
        ]
        path.write_text('\n'.join(lines) + '\n', encoding='utf-8')
        print(f'{path.relative_to(ROOT)}: {len(full)} verses, {sum(1 for v in keep.values() if v)}/{len(keep)} excerpts cut')


def squash(t: str) -> str:
    return re.sub(r'\s+', ' ', t).strip()


def check_meanings(errors: list):
    verses = content_array('verses.ts', 'VERSES')
    for lang in MEANINGS:
        ch = chapters(lang)
        path = meanings_file(lang)
        full = content_object(path, 'VERSE_MEANINGS')
        excerpts = content_object(path, 'EXCERPTS')
        for x in verses:
            k = verse_key(x)
            if full.get(k) != published(ch, x):
                errors.append(f'{lang} meaning {k}: not the published translation — run --write-meanings')
            if x.get('part') and squash(excerpts.get(k, '')) not in squash(published(ch, x)) or (x.get('part') and not excerpts.get(k)):
                errors.append(f'{lang} excerpt {k}: missing, or not a run of the published translation')
    print(f'{len(verses)} verse meanings checked in {", ".join(MEANINGS)}')


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
    if '--write-meanings' in sys.argv:
        write_meanings()
        return
    errors: list = []
    check_verses(errors)
    check_meanings(errors)
    check_hadith(errors)
    for e in errors:
        print('✗', e)
    print('OK' if not errors else f'{len(errors)} problem(s)')
    sys.exit(1 if errors else 0)


if __name__ == '__main__':
    main()
