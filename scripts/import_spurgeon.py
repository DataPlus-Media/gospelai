"""Convert the explicitly public-domain SermonIndex Spurgeon MyBible edition."""
import re
import shutil
import sqlite3
import zipfile


def build_spurgeon(fetch, paragraphs, books, book_numbers, book_codes, root, sources):
    url = "https://www.sermonindex.net/modules/mybible/SI-SPURGEON.commentaries.zip"
    archive = fetch(url, "spurgeon-mybible.zip")
    path = sources / "spurgeon-mybible.sqlite3"
    if not path.exists():
        with zipfile.ZipFile(archive) as z:
            members = [name for name in z.namelist() if name.lower().endswith(".sqlite3")]
            if len(members) != 1:
                raise ValueError("Expected one Spurgeon MyBible database.")
            with z.open(members[0]) as source, path.open("wb") as target:
                shutil.copyfileobj(source, target)
    book_map = dict(zip(book_numbers, zip(books, book_codes)))
    bible = sqlite3.connect(f"file:{root / 'assets/bible/kjv.sqlite'}?mode=ro", uri=True)
    try:
        verses = set(bible.execute(
            """SELECT b.book_reference_id,v.chapter,v.verse
               FROM verse v JOIN book b ON b.id=v.book_id WHERE b.id<=66"""
        ))
    finally:
        bible.close()
    db = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    try:
        info = dict(db.execute("SELECT name,value FROM info"))
        if info.get("description") != "Charles Spurgeon's Commentary and Expositions":
            raise ValueError("Unexpected Spurgeon source edition.")
        details = info.get("detailed_info", "")
        if "Public domain" not in details or "SermonIndex.net" not in details:
            raise ValueError("Spurgeon module lacks its source/public-domain notice.")
        sections, seen, chapters, covered_books, unmapped = [], set(), set(), set(), []
        for number, chapter, start, chapter_end, end, html in db.execute(
            """SELECT book_number,chapter_number_from,verse_number_from,
                      chapter_number_to,verse_number_to,text FROM commentaries
               ORDER BY book_number,chapter_number_from,verse_number_from,verse_number_to"""
        ):
            if number not in book_map:
                raise ValueError(f"Unknown Spurgeon book identifier: {number}")
            (book, name, chapter_count), code = book_map[number]
            if chapter != chapter_end or not 1 <= chapter <= chapter_count:
                raise ValueError(f"Invalid Spurgeon chapter: {name} {chapter}")
            section = {
                "id": f"b{book:02d}-c{chapter:03d}-v{start:03d}-{end:03d}",
                "title": f"{name} {chapter}:{start}" + (f"–{end}" if end != start else ""),
                "sourceUrl": f"https://www.sermonindex.net/commentary/spurgeon/{code}/{chapter}",
                "attribution": "Charles Haddon Spurgeon (1834–1892); electronic module prepared by SermonIndex.net.",
                "paragraphs": paragraphs(html),
            }
            if not section["paragraphs"] or section["id"] in seen:
                raise ValueError(f"Empty or duplicate Spurgeon section: {section['id']}")
            if start == end == 0:
                section["id"] = f"b{book:02d}-c{chapter:03d}-intro"
                section["title"] = f"{name} {chapter} · Chapter introduction"
                section["scripture"] = {"book": book, "chapter": chapter}
            elif start >= 1 and end >= start and all(
                (book, chapter, verse) in verses for verse in range(start, end + 1)
            ):
                section["scripture"] = {
                    "book": book, "chapter": chapter, "verseStart": start, "verseEnd": end,
                }
            elif (book, chapter, start, end) == (66, 20, 11, 21):
                # This source combines Revelation 20:11–15 and 21:1 but records
                # an impossible same-chapter range. Preserve text, not a false map.
                text = " ".join(section["paragraphs"])
                if not re.search(r"Revelation 20:12[-–]15", text) or "Revelation 21:1" not in text:
                    raise ValueError("The known cross-chapter Spurgeon source entry changed.")
                section["title"] = "Revelation 20:11–15 and 21:1 · Unmapped source section"
                unmapped.append(section["title"])
            else:
                raise ValueError(f"Invalid Spurgeon verse range: {section['title']}")
            seen.add(section["id"])
            chapters.add((book, chapter))
            covered_books.add(book)
            sections.append(section)
        if (len(sections), len(chapters), len(covered_books), len(unmapped)) != (997, 639, 59, 1):
            raise ValueError("Spurgeon source coverage changed; review before revising the manifest.")
        return {
            "schema": 1, "workId": "spurgeon-expositions",
            "revision": "sermonindex-spurgeon-mybible-1",
            "notices": [
                "Charles Spurgeon's Commentary and Expositions by Charles Haddon Spurgeon (1834–1892).",
                f"Source edition: SermonIndex.net MyBible module SI-SPURGEON. Download: {url}",
                "Public domain — free to copy, share and build on. "
                "Source: https://www.sermonindex.net/commentary/spurgeon/.",
                "This is the SermonIndex compilation, not the StudyLight Verse Expositions edition. "
                "It includes Psalms material from The Treasury of David.",
                "The source contains 997 sections across 639 chapters in 59 Bible books. "
                "Coverage is selective, not commentary on every verse. Overlapping source ranges "
                "are retained as separate expositions. No missing commentary is generated.",
                "Original source wording is preserved as structured paragraphs. Verse ranges come "
                "from the module; chapter introductions are labeled and used only as fallbacks.",
                "One source entry incorrectly encodes Revelation 20:11–15 and 21:1 as 20:11–21. "
                "Its complete text is retained in the reader without a passage mapping; "
                "it is not represented as verified commentary on any selected verse.",
            ],
            "sections": sections,
        }
    finally:
        db.close()
