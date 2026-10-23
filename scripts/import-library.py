"""Reproducible importer for the explicitly redistributable source editions.

No third-party scraping libraries. Sources/build output stay outside Git.
Run python scripts/import-library.py, then node scripts/upload-library.cjs.
"""
import calendar
import hashlib
import json
import re
import shutil
import sqlite3
import urllib.request
import zipfile
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "generated-artifacts/library"
SOURCES = OUT / "sources"
SOURCES.mkdir(parents=True, exist_ok=True)


def fetch(url, filename):
    path = SOURCES / filename
    if not path.exists():
        request = urllib.request.Request(url, headers={"User-Agent": "GospelAI public-domain edition importer"})
        with urllib.request.urlopen(request, timeout=90) as response:
            path.write_bytes(response.read())
    return path


class Paragraphs(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.items, self.current = [], []
        self.ignored = 0

    def flush(self):
        text = re.sub(r"\s+", " ", "".join(self.current)).strip()
        self.current = []
        if text:
            self.items.append(text)

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.ignored += 1
        if tag in ("p", "h1", "h2", "h3", "h4", "tr", "center", "pre"):
            self.flush()
        if tag in ("br", "td"):
            self.current.append(" ")

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self.ignored -= 1
        if tag in ("p", "h1", "h2", "h3", "h4", "tr", "center", "pre"):
            self.flush()

    def handle_data(self, data):
        if not self.ignored:
            self.current.append(data)


def paragraphs(html):
    parser = Paragraphs()
    parser.feed(html)
    parser.flush()
    return parser.items


books = [
    (int(i), name, int(count))
    for i, name, count in re.findall(
        r'id:\s*(\d+),\s*name:\s*"([^"]+)".*?chapters:\s*(\d+)',
        (ROOT / "constants/bibleBooks.ts").read_text()
    )
]
assert len(books) == 66
sermonindex_book_codes = [
    "GEN", "EXO", "LEV", "NUM", "DEU", "JOS", "JDG", "RUT", "1SA", "2SA",
    "1KI", "2KI", "1CH", "2CH", "EZR", "NEH", "EST", "JOB", "PSA", "PRO",
    "ECC", "SOS", "ISA", "JER", "LAM", "EZK", "DAN", "HOS", "JOL", "AMO",
    "OBA", "JON", "MIC", "NAM", "HAB", "ZEP", "HAG", "ZEC", "MAL", "MAT",
    "MRK", "LUK", "JHN", "ACT", "ROM", "1CO", "2CO", "GAL", "EPH", "PHP",
    "COL", "1TH", "2TH", "1TI", "2TI", "TIT", "PHM", "HEB", "JAS", "1PE",
    "2PE", "1JN", "2JN", "3JN", "JUD", "REV",
]
assert len(sermonindex_book_codes) == len(books)
# MyBible reserves numeric slots for books outside this 66-book canon. These
# identifiers are not canonical book IDs multiplied by ten.
mybible_book_numbers = [
    10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160,
    190, 220, 230, 240, 250, 260, 290, 300, 310, 330, 340, 350, 360, 370,
    380, 390, 400, 410, 420, 430, 440, 450, 460, 470, 480, 490, 500, 510,
    520, 530, 540, 550, 560, 570, 580, 590, 600, 610, 620, 630, 640, 650,
    660, 670, 680, 690, 700, 710, 720, 730,
]
assert len(mybible_book_numbers) == len(books)
contributors = {
    45: "John Evans", 46: "Simon Browne", 47: "Daniel Mayo", 48: "Joshua Bayes",
    49: "Samuel Rosewell", 50: "William Harris", 51: "William Harris",
    52: "Daniel Mayo", 53: "Daniel Mayo", 54: "Benjamin Andrews Atkinson",
    55: "Benjamin Andrews Atkinson", 56: "Jeremiah Smith", 57: "Jeremiah Smith",
    58: "William Tong", 59: "Dr. S. Wright", 60: "Zec. Merrill", 61: "Joseph Hill",
    62: "John Reynolds, of Shrewsbury", 63: "John Reynolds, of Shrewsbury",
    64: "John Reynolds, of Shrewsbury", 65: "John Billingsley", 66: "William Tong",
}


def henry():
    sections = []
    base = "https://www.ccel.org/h/henry/mhc2/"
    for volume in range(1, 7):
        archive = fetch(f"{base}MHC-V{volume}.ZIP", f"henry{volume}.zip")
        with zipfile.ZipFile(archive) as z:
            for name in sorted(z.namelist()):
                match = re.fullmatch(r"MHC(\d{2})(\d{3})\.HTM", name, re.I)
                if not match:
                    continue
                book, chapter = map(int, match.groups())
                html = z.read(name).decode("cp1252")
                body = re.search(r'<!\s*-- \(Begin Body\) -->(.*?)<!\s*-- \(End Body\) -->', html, re.S | re.I)
                if not body:
                    raise ValueError(f"Body boundaries missing: {name}")
                if book == 0:
                    title = f"Preface to Volume {chapter}" if chapter else "Original table of contents"
                    sid = f"preface-{chapter}"
                else:
                    title = books[book - 1][1] + (f" {chapter}" if chapter else " · Introduction")
                    sid = f"b{book:02d}-c{chapter:03d}"
                attribution = "Matthew Henry"
                if book >= 45:
                    attribution = (f"Completed by {contributors[book]} after Matthew Henry’s death, "
                                   "using his notes; attribution from the Volume VI preface.")
                section = {
                    "id": sid, "title": title, "sourceUrl": base + name,
                    "attribution": attribution, "paragraphs": paragraphs(body.group(1)),
                }
                if book and chapter:
                    section["scripture"] = {"book": book, "chapter": chapter}
                assert section["paragraphs"], name
                sections.append(section)
    # Source filename order is canonical (prefaces first, then books).
    sections.sort(key=lambda s: (0, int(s["id"].split("-")[1])) if s["id"].startswith("preface-") else (1, s["id"]))
    mappings = {(s["scripture"]["book"], s["scripture"]["chapter"]) for s in sections if "scripture" in s}
    expected = {(i, chapter) for i, _, count in books for chapter in range(1, count + 1)}
    assert mappings == expected, f"Missing/extra chapters: {mappings ^ expected}"
    return {
        "schema": 1, "workId": "henry-whole-bible", "revision": "ccel-mhc2-1",
        "notices": [
            "Public domain text. No rights reserved. May be distributed freely.",
            "Source: Christian Classics Ethereal Library, legacy MHC2 electronic edition, "
            "Commentary on the Whole Bible (1706–1721).",
            "Matthew Henry through Acts; Romans–Revelation completed by other ministers "
            "using his notes. See the preserved Preface to Volume 6 and each chapter’s attribution.",
            "HTML converted to plain text with paragraph and table-row boundaries preserved. "
            "Scripture matches are chapter-level, not verse-level.",
        ], "sections": sections,
    }


def morning_evening():
    base = "https://ccel.org/s/spurgeon/morn_eve/"
    html = fetch(base + "morn_eve-bod.html", "morn-eve.html").read_text(encoding="cp1252")
    matches = list(re.finditer(r'<a name="(\d{2})/(\d{2})/(AM|PM)"></a>', html, re.I))
    sections = []
    for index, match in enumerate(matches):
        month, day, period = match.groups()
        # A month's heading at the tail belongs to the next group, not this entry.
        body = html[match.end():matches[index + 1].start() if index + 1 < len(matches) else len(html)]
        body = re.sub(r"<H2>.*?</H2>", "", body, flags=re.S | re.I)
        date = f"{month}-{day}"
        sections.append({
            "id": f"{date}-{period.lower()}", "date": date,
            "title": f"{calendar.month_name[int(month)]} {int(day)} · {'Morning' if period == 'AM' else 'Evening'}",
            "sourceUrl": base + f"ME{month}{period}.html#{month}/{day}/{period}",
            "attribution": "Charles Haddon Spurgeon",
            "paragraphs": paragraphs(body),
        })
    assert len(sections) == 732
    assert len({s["id"] for s in sections}) == 732
    assert all(len(s["paragraphs"]) >= 2 for s in sections)
    sections.sort(key=lambda s: s["id"])
    return {
        "schema": 1, "workId": "spurgeon-morning-evening", "revision": "ccel-morn-eve-1",
        "notices": [
            "MORNING & EVENING: DAILY READINGS by Charles Spurgeon. Public Domain -- Copy Freely.",
            "This material was scanned from the printed edition published by Hendrickson. "
            "The scanned material was cleaned and formated by Ernie Stefanik, Derry PA.",
            "Edition notice: https://ccel.org/s/spurgeon/morn_eve/MEDOC.html",
            "Source: CCEL legacy morn_eve single HTML file. Original historical wording; "
            "HTML converted to plain text. Includes February 29, morning and evening.",
        ], "sections": sections,
    }


def gill():
    archive = fetch(
        "https://www.sermonindex.net/modules/mybible/SI-GILL.commentaries.zip",
        "gill-mybible.zip",
    )
    database_path = SOURCES / "gill-mybible.sqlite3"
    if not database_path.exists():
        with zipfile.ZipFile(archive) as z:
            candidates = [name for name in z.namelist() if name.lower().endswith(".sqlite3")]
            if len(candidates) != 1:
                raise ValueError(f"Expected one MyBible SQLite module; found {len(candidates)}.")
            with z.open(candidates[0]) as source, database_path.open("wb") as target:
                shutil.copyfileobj(source, target)

    db = sqlite3.connect(f"file:{database_path}?mode=ro", uri=True)
    try:
        info = dict(db.execute("SELECT name,value FROM info"))
        if info.get("description") != "Gill's Exposition of the Entire Bible":
            raise ValueError("Downloaded MyBible module is not the expected John Gill edition.")
        details = info.get("detailed_info", "")
        if "Public domain" not in details or "SermonIndex.net" not in details:
            raise ValueError("The Gill module is missing its source and public-domain notice.")

        module_books = [
            row[0] for row in db.execute(
                "SELECT DISTINCT book_number FROM commentaries ORDER BY book_number"
            )
        ]
        if module_books != mybible_book_numbers:
            raise ValueError("Gill module book identifiers differ from the verified 66-book mapping.")
        book_map = {
            number: (book[0], book[1], code)
            for number, book, code in zip(module_books, books, sermonindex_book_codes)
        }
        sections = []
        seen = set()
        chapter_coverage = set()
        verse_coverage = set()
        cursor = db.execute(
            """SELECT book_number,chapter_number_from,verse_number_from,
                      chapter_number_to,verse_number_to,text
               FROM commentaries
               ORDER BY book_number,chapter_number_from,verse_number_from"""
        )
        for module_book, chapter, verse_start, chapter_end, verse_end, raw_html in cursor:
            if module_book not in book_map:
                raise ValueError(f"Unknown Gill module book number: {module_book}.")
            book_id, book_name, book_code = book_map[module_book]
            chapter_count = books[book_id - 1][2]
            if chapter != chapter_end or not 1 <= chapter <= chapter_count:
                raise ValueError(f"Invalid chapter mapping in {book_name}: {chapter}–{chapter_end}.")

            section = {
                "sourceUrl": f"https://www.sermonindex.net/commentary/gill/{book_code}/{chapter}",
                "attribution": "John Gill (1697–1771); electronic module prepared by SermonIndex.net.",
                "paragraphs": paragraphs(raw_html),
            }
            if not section["paragraphs"]:
                raise ValueError(f"Gill section has no readable text: {book_name} {chapter}.")

            if verse_start == 0 and verse_end == 0:
                section["id"] = f"b{book_id:02d}-c{chapter:03d}-intro"
                section["title"] = f"{book_name} {chapter} · Chapter introduction"
                section["scripture"] = {"book": book_id, "chapter": chapter}
                chapter_coverage.add((book_id, chapter))
            else:
                if verse_start < 1 or verse_end < verse_start:
                    raise ValueError(f"Invalid Gill verse range in {book_name} {chapter}.")
                section["id"] = f"b{book_id:02d}-c{chapter:03d}-v{verse_start:03d}"
                if verse_end != verse_start:
                    section["id"] += f"-{verse_end:03d}"
                section["title"] = (
                    f"{book_name} {chapter}:{verse_start}" if verse_end == verse_start
                    else f"{book_name} {chapter}:{verse_start}–{verse_end}"
                )
                section["scripture"] = {
                    "book": book_id, "chapter": chapter,
                    "verseStart": verse_start, "verseEnd": verse_end,
                }
                verse_coverage.add((book_id, chapter, verse_start, verse_end))

            if section["id"] in seen:
                raise ValueError(f"Duplicate Gill section ID: {section['id']}.")
            seen.add(section["id"])
            sections.append(section)

        expected_chapters = {
            (book_id, chapter)
            for book_id, _, chapter_count in books
            for chapter in range(1, chapter_count + 1)
        }
        chapter_coverage.update((book, chapter) for book, chapter, _, _ in verse_coverage)
        if chapter_coverage != expected_chapters:
            raise ValueError(f"Gill source has missing or extra chapter coverage: {chapter_coverage ^ expected_chapters}.")

        # Confirm every source mapping exists in the bundled KJV, while keeping
        # genuine source gaps explicit instead of inventing verse commentary.
        bible_db = sqlite3.connect(f"file:{ROOT / 'assets/bible/kjv.sqlite'}?mode=ro", uri=True)
        try:
            bible_verses = set(bible_db.execute(
                """SELECT b.book_reference_id,v.chapter,v.verse
                   FROM verse v JOIN book b ON b.id=v.book_id WHERE b.id<=66"""
            ))
        finally:
            bible_db.close()
        mapped_verses = set()
        for book, chapter, verse_start, verse_end in verse_coverage:
            mapped_verses.update(
                (book, chapter, verse) for verse in range(verse_start, verse_end + 1)
            )
        if mapped_verses - bible_verses:
            raise ValueError(f"Gill source contains invalid KJV mappings: {sorted(mapped_verses - bible_verses)[:10]}.")
        missing_verses = bible_verses - mapped_verses

        return {
            "schema": 1, "workId": "gill-exposition", "revision": "sermonindex-gill-mybible-1",
            "notices": [
                "Gill’s Exposition of the Entire Bible by John Gill (1697–1771).",
                "Source edition: SermonIndex.net MyBible module SI-GILL, downloaded from "
                "https://www.sermonindex.net/modules/mybible/SI-GILL.commentaries.zip.",
                "SermonIndex module metadata identifies this edition as public domain; "
                "the work page states “Public domain — free to copy, share and build on.”",
                "The module was converted from MyBible SQLite/HTML to structured paragraphs. "
                "Original wording and source attribution are retained.",
                "Verse mappings are taken from the source module. Chapter introductions are "
                "labeled separately and shown as fallback only when no verse-specific entry exists.",
                f"The source contains {len(sections):,} sections and maps "
                f"{len(mapped_verses):,} KJV verses; {len(missing_verses)} KJV verses have no "
                "verse-specific source entry. No missing commentary was generated.",
                "Source chapter links: https://www.sermonindex.net/commentary/gill/.",
            ], "sections": sections,
        }
    finally:
        db.close()


if __name__ == "__main__":
    from import_spurgeon import build_spurgeon

    def spurgeon():
        return build_spurgeon(fetch, paragraphs, books, mybible_book_numbers,
                              sermonindex_book_codes, ROOT, SOURCES)

    manifest = {}
    for build in (henry, gill, morning_evening, spurgeon):
        package = build()
        data = json.dumps(package, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        path = OUT / f"{package['workId']}.json"
        path.write_bytes(data)
        manifest[package["workId"]] = {
            "revision": package["revision"], "bytes": len(data),
            "sha256": hashlib.sha256(data).hexdigest(), "sections": len(package["sections"]),
        }
        print(path.name, manifest[package["workId"]])
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print("Copy the small verified manifest to constants/libraryManifest.json after inspecting the import.")
