#!/usr/bin/env python3
"""
ตรวจเว็บก่อนขึ้นจริง (Check the site before publishing)

รันจากโฟลเดอร์หลักของโปรเจกต์:   python scripts/check-site.py
เพิ่ม --strict เพื่อให้ช่อง [ ] ที่ยังเหลือทำให้ผลเป็น "ไม่ผ่าน" (ใช้เป็นด่านสุดท้ายก่อนเผยแพร่)

ตรวจอะไรบ้าง
  1. ลิงก์ภายในที่เสีย (href / src ที่ไฟล์ไม่มีอยู่ และ #หัวข้อ ที่ไม่มีใน HTML)
  2. <img> ที่ไม่มี alt  (alt="" ใช้ได้ = รูปตกแต่ง)
  3. รายการใน data/*.json กับไฟล์จริง: หน้าบทความ, ฉบับอังกฤษ (has_en), หน้าโปรเจกต์, รูปปก, รูปโปรไฟล์, รูปใน data-file
  4. ข้อความ [ ] ที่ยังเหลือในหน้าจริง (ไม่นับไฟล์ _template) และช่องใน JSON ที่ว่างอยู่ซึ่งเว็บจะแสดงเป็น [ ]

ลิงก์ที่ JavaScript สร้าง (การ์ด รายการ ผลค้นหา) ตรวจผ่านข้อ 3 แทน และไม่ตรวจลิงก์ภายนอก (http/https)
"""
import argparse
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

ROOT = Path(__file__).resolve().parent.parent
SKIP_DIRS = {".git", "node_modules", "img-src", "scripts", "_prototype"}
PLACEHOLDER = re.compile(r"\[[^\[\]\n]{1,100}\]")
EXTERNAL = ("http:", "https:", "mailto:", "tel:", "javascript:", "data:", "//")
# ids created by main.js, so they are not in the HTML
DYNAMIC_ID = re.compile(r"^(sec-\d+|chem|bio|all)$")


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids, self.links, self.imgs, self.texts, self.files, self.terms = set(), [], [], [], [], []
        self._skip = 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        line = self.getpos()[0]
        if tag in ("script", "style"):
            self._skip += 1
        if a.get("id"):
            self.ids.add(a["id"])
        for key in ("href", "src"):
            if a.get(key) and tag in ("a", "link", "script", "img", "source", "iframe"):
                if not (tag == "link" and a.get("rel") in ("preconnect", "dns-prefetch")):
                    self.links.append((tag, a[key], line))
        if tag == "img":
            self.imgs.append((a.get("src", ""), "alt" in a, line))
        if "data-term" in a:
            self.terms.append((a["data-term"], line))
        if "data-slot" in a and "data-file" in a:
            self.files.append((a["data-slot"], a["data-file"].strip(), line))
        for key in ("content", "alt", "placeholder", "title", "aria-label", "href", "src"):
            if a.get(key) and PLACEHOLDER.search(a[key]) and tag != "script":
                for m in PLACEHOLDER.findall(a[key]):
                    self.texts.append((m, line))

    def handle_endtag(self, tag):
        if tag in ("script", "style") and self._skip:
            self._skip -= 1

    def handle_data(self, data):
        if not self._skip:
            for m in PLACEHOLDER.findall(data):
                self.texts.append((m, self.getpos()[0]))


def html_files():
    for p in sorted(ROOT.rglob("*.html")):
        if not (set(p.relative_to(ROOT).parts) & SKIP_DIRS):
            yield p


def rel(p):
    return p.relative_to(ROOT).as_posix()


def main():
    ap = argparse.ArgumentParser(description="Check links, alt text, data files and leftover [ ] placeholders.")
    ap.add_argument("--strict", action="store_true", help="leftover [ ] placeholders also fail the check")
    args = ap.parse_args()

    pages = {}
    for p in html_files():
        pg = Page()
        pg.feed(p.read_text(encoding="utf-8"))
        pages[p] = pg

    json_slugs = {"projects": set(), "articles": set()}
    def load(name):
        f = ROOT / "data" / name
        return json.loads(f.read_text(encoding="utf-8")) if f.exists() else None
    articles, projects, site = load("articles.json") or [], load("projects.json") or [], load("site.json") or {}
    certificates = load("certificates.json") or []
    json_slugs["articles"] = {a.get("slug") for a in articles}
    json_slugs["projects"] = {p.get("slug") for p in projects}

    broken, noalt, data_problems, cover_empty = [], [], [], []

    # 1 + 2: links and images in the HTML
    for path, pg in pages.items():
        is_template = path.name.startswith("_template")
        base_dir = ROOT if path.name == "404.html" else path.parent   # 404.html uses <base>, so it resolves from the site root
        for tag, url, line in pg.links:
            if url.startswith(EXTERNAL) or (is_template and "[" in url):
                continue
            parts = urlsplit(url)
            target_path, frag = unquote(parts.path), unquote(parts.fragment)
            if target_path == "":
                target = path
            else:
                target = (ROOT / target_path.lstrip("/")) if target_path.startswith("/") else (base_dir / target_path)
                target = target.resolve()
                if target.is_dir():
                    target = target / "index.html"
                if not target.exists():
                    broken.append(f"{rel(path)}:{line}  <{tag}> {url}  (file not found)")
                    continue
            if frag and target.suffix == ".html" and target in pages:
                ok = frag in pages[target].ids or DYNAMIC_ID.match(frag) or frag in json_slugs["projects"] and target.name == "projects.html"
                if not ok:
                    broken.append(f"{rel(path)}:{line}  <{tag}> {url}  (no element with id \"{frag}\")")
        for src, has_alt, line in pg.imgs:
            if not has_alt:
                noalt.append(f"{rel(path)}:{line}  <img src=\"{src}\">")

    # 3: data files vs real files
    for a in articles:
        slug = a.get("slug")
        if not (ROOT / "articles" / f"{slug}.html").exists():
            data_problems.append(f"articles.json: \"{slug}\" has no articles/{slug}.html")
        if a.get("has_en") is True and not (ROOT / "articles" / "en" / f"{slug}.html").exists():
            data_problems.append(f"articles.json: \"{slug}\" has has_en=true but articles/en/{slug}.html is missing (the English link would 404)")
        if a.get("has_en") is not True and (ROOT / "articles" / "en" / f"{slug}.html").exists():
            data_problems.append(f"articles/en/{slug}.html exists but has_en is not true in articles.json (the English page is not linked)")
        if "cover" in a:
            data_problems.append(f"articles.json: \"{slug}\" still has the old \"cover\" field; use \"covers\" (a list) instead")
        for n, cv in enumerate(a.get("covers") or [], 1):
            if cv.get("type") not in ("helix", "fold", "image"):
                data_problems.append(f"articles.json: \"{slug}\" covers[{n}] has an unknown type: {cv.get('type')!r} (use helix, fold or image)")
            elif cv.get("type") == "image":
                src = (cv.get("src") or "").strip()
                if src and not src.startswith(("http", "//")):
                    path = ROOT / (src if "/" in src else f"assets/img/covers/{src}")
                    if not path.exists():
                        data_problems.append(f"articles.json: \"{slug}\" covers[{n}] image not found: {src} (files go in assets/img/covers/)")
                elif not src:
                    cover_empty.append(f"data/articles.json  {slug}.covers[{n}] image has no src  -> shows [รูปปกของคุณ]")
                if src and not (cv.get("alt") or cv.get("caption")):
                    data_problems.append(f"articles.json: \"{slug}\" covers[{n}] image has no alt or caption (the picture needs an alt text)")
            for key in ("caption", "credit", "alt"):
                if PLACEHOLDER.search(str(cv.get(key) or "")):
                    cover_empty.append(f"data/articles.json  {slug}.covers[{n}].{key} = {cv[key]!r}  (still a [ ] placeholder)")
    for p in projects:
        slug = p.get("slug")
        if not (ROOT / "projects" / f"{slug}.html").exists():
            data_problems.append(f"projects.json: \"{slug}\" has no projects/{slug}.html (its card would 404)")
        thumb = p.get("thumb") or ""
        if re.search(r"\.(png|jpe?g|webp|gif|svg)$", thumb, re.I) and not thumb.startswith(("http", "//")) and not (ROOT / thumb).exists():
            data_problems.append(f"projects.json: \"{slug}\" thumb not found: {thumb}")
    for f in (ROOT / "articles").glob("*.html"):
        if not f.name.startswith("_template") and f.stem not in json_slugs["articles"]:
            data_problems.append(f"articles/{f.name} is not listed in data/articles.json (it will not appear in the lists or search)")
    for f in (ROOT / "projects").glob("*.html"):
        if not f.name.startswith("_template") and f.stem not in json_slugs["projects"]:
            data_problems.append(f"projects/{f.name} is not listed in data/projects.json")
    for n, ct in enumerate(certificates, 1):
        img = (ct.get("image") or "").strip()
        if img and not img.startswith(("http", "//")) and not (ROOT / "assets" / "img" / "certificates" / img).exists():
            data_problems.append(f"certificates.json: #{n} image not found in assets/img/certificates/: {img}")
        if img and not (ct.get("title") or ct.get("alt")):
            data_problems.append(f"certificates.json: #{n} has an image but no title (the picture needs an alt text)")
        for key, label in (("title", "[ชื่อรายการ ปี]"), ("year", "[ชื่อรายการ ปี]"), ("image", "[เกียรติบัตร " + str(n) + "]")):
            if not str(ct.get(key) or "").strip():
                cover_empty.append(f"data/certificates.json  #{n}.{key} is empty  -> shows {label}")
    if site.get("photo") and not (ROOT / "assets" / "img" / "profile" / site["photo"]).exists():
        data_problems.append(f"site.json: photo not found in assets/img/profile/: {site['photo']}")
    for path, pg in pages.items():
        for slot, fname, line in pg.files:
            if fname and not (ROOT / "assets" / "img" / slot / fname).exists():
                data_problems.append(f"{rel(path)}:{line}  data-file=\"{fname}\" not found in assets/img/{slot}/")

    # 3b: glossary words and the mechanism diagram
    glossary = load("glossary.json") or []
    keys = set()
    for n, g in enumerate(glossary, 1):
        for field in ("key", "term", "definition"):
            if not str(g.get(field) or "").strip():
                data_problems.append(f"glossary.json: entry #{n} has no {field!r}")
        if g.get("key") in keys:
            data_problems.append(f"glossary.json: duplicate key {g.get('key')!r}")
        keys.add(g.get("key"))
    for path, pg in pages.items():
        for key, line in pg.terms:
            if key not in keys:
                data_problems.append(f"{rel(path)}:{line}  data-term=\"{key}\" is not in data/glossary.json (the word stays plain)")
    uses_mech = any("data-mech" in p.read_text(encoding="utf-8") for p in pages if not p.name.startswith("_template"))
    mech = load("mechanism.json")
    if uses_mech and not isinstance(mech, dict):
        data_problems.append("a page uses data-mech but data/mechanism.json is missing")
    elif isinstance(mech, dict):
        if len(mech.get("steps") or []) < 3:
            data_problems.append("mechanism.json: needs 3 steps in \"steps\"")
        for k in ("nhej", "hdr"):
            if k not in (mech.get("repairs") or {}):
                data_problems.append(f"mechanism.json: missing repairs.{k}")

    # 4: placeholders
    leftovers = {}
    for path, pg in pages.items():
        if path.name.startswith("_template"):
            continue
        for text, line in pg.texts:
            leftovers.setdefault(rel(path), []).append((line, text))
    empty = list(cover_empty)
    for key, label in (("email", "[อีเมล]"), ("github", "[ลิงก์ GitHub]"), ("photo", "[รูปโปรไฟล์]"), ("url", "[URL เว็บ] ใน sitemap/robots")):
        if not site.get(key):
            empty.append(f"data/site.json  \"{key}\" is empty  -> shows {label}")
    for p in projects:
        for key, label in (("url", "[ลิงก์เว็บจริง]"), ("github", "[ลิงก์ GitHub]")):
            if not p.get(key):
                empty.append(f"data/projects.json  {p.get('slug')}.{key} is empty  -> shows {label}")

    def section(title, rows, none="none"):
        print(f"\n== {title} ({len(rows)}) ==")
        for r in rows or [none]:
            print("  " + r)

    section("Broken internal links", broken)
    section("Images without alt", noalt)
    section("Data files vs real files", data_problems)
    print(f"\n== Leftover [ ] placeholders in real pages ({sum(len(v) for v in leftovers.values())} in {len(leftovers)} files) ==")
    for f, items in leftovers.items():
        uniq = []
        for line, text in items:
            if text not in uniq:
                uniq.append(text)
        print(f"  {f}  ({len(items)}): " + "  ".join(uniq[:8]) + ("  ..." if len(uniq) > 8 else ""))
    if not leftovers:
        print("  none")
    section("Empty data fields (the site shows a [ ] for these)", empty)

    problems = len(broken) + len(noalt) + len(data_problems)
    print(f"\n{'FAIL' if problems or (args.strict and (leftovers or empty)) else 'OK'}: {problems} problem(s) with links/alt/data;"
          f" {sum(len(v) for v in leftovers.values())} placeholder(s) and {len(empty)} empty field(s) still to fill")
    return 1 if problems or (args.strict and (leftovers or empty)) else 0


if __name__ == "__main__":
    sys.exit(main())
