"""Reproducible importer for the two explicitly redistributable editions.

No third-party scraping libraries. Sources/build output stay outside Git.
Run python scripts/import-library.py, then node scripts/upload-library.cjs.
"""
import calendar
import hashlib
import json
import re
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


if __name__ == "__main__":
    manifest = {}
    for build in (henry, morning_evening):
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
