#!/usr/bin/env python3
"""
เตรียมที่อยู่เว็บจริงก่อนขึ้น GitHub Pages (Set the real site address, rebuild sitemap.xml and robots.txt)

ใช้ครั้งแรก (หรือเมื่อเปลี่ยนชื่อ repo / ย้ายโดเมน):
    python scripts/prepare-deploy.py --url https://<ชื่อผู้ใช้>.github.io/<ชื่อ-repo>

ถ้าเป็น user site หรือโดเมนของตัวเอง ไม่มีชื่อ repo:
    python scripts/prepare-deploy.py --url https://<ชื่อผู้ใช้>.github.io

สิ่งที่ทำ
  1. เก็บที่อยู่ไว้ที่ "url" ใน data/site.json
  2. แทน [URL เว็บ] ในหน้าจริงทั้งหมด (og:url, og:image, twitter:image, hreflang) ด้วยที่อยู่นี้
     และถ้าเคยตั้งที่อยู่เก่าไว้ จะแทนที่อยู่เก่าด้วยที่อยู่ใหม่ (รันซ้ำได้เมื่อย้ายเว็บ) ไม่แตะไฟล์ _template
  3. สร้าง sitemap.xml ใหม่ จากบทความที่ published, ฉบับอังกฤษ (has_en), โปรเจกต์ และหน้าหลัก
  4. สร้าง robots.txt ใหม่ (มีบรรทัด Sitemap)
รันโดยไม่ใส่ --url = สร้าง sitemap.xml และ robots.txt ใหม่ด้วยที่อยู่ที่เก็บไว้ (ใช้หลังเพิ่มบทความ)
ตัวเลือก: --dry-run (ดูก่อน ไม่เขียนไฟล์)

สิ่งที่สคริปต์ไม่ทำ: 404.html เดาชื่อ repo เองจาก URL (ดู README) และ path รูปแชร์ [path รูปปก] ต้องกรอกเอง
"""
import argparse
import json
import re
import sys
from pathlib import Path
from xml.sax.saxutils import escape

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

ROOT = Path(__file__).resolve().parent.parent
PLACEHOLDER = "[URL เว็บ]"
SKIP_DIRS = {".git", "node_modules", "img-src", "scripts", "_prototype"}


def read_json(name, default):
    f = ROOT / "data" / name
    return json.loads(f.read_text(encoding="utf-8")) if f.exists() else default


def real_pages():
    for p in sorted(ROOT.rglob("*.html")):
        if set(p.relative_to(ROOT).parts) & SKIP_DIRS or p.name.startswith("_template") or p.name == "404.html":
            continue
        yield p


def build_sitemap(base):
    articles, projects = read_json("articles.json", []), read_json("projects.json", [])
    entries = [(f"{base}/", []), (f"{base}/projects.html", []), (f"{base}/portfolio.html", []), (f"{base}/about.html", [])]
    for a in articles:
        slug = a.get("slug")
        if a.get("status") != "published" or not slug or not (ROOT / "articles" / f"{slug}.html").exists():
            continue
        th = f"{base}/articles/{slug}.html"
        if a.get("has_en") is True and (ROOT / "articles" / "en" / f"{slug}.html").exists():
            en = f"{base}/articles/en/{slug}.html"
            alts = [("th", th), ("en", en), ("x-default", th)]
            entries += [(th, alts), (en, alts)]
        else:
            entries.append((th, []))
    for p in projects:
        slug = p.get("slug")
        if slug and (ROOT / "projects" / f"{slug}.html").exists():
            entries.append((f"{base}/projects/{slug}.html", []))
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    for loc, alts in entries:
        lines.append("  <url>")
        lines.append(f"    <loc>{escape(loc)}</loc>")
        for lang, href in alts:
            lines.append(f'    <xhtml:link rel="alternate" hreflang="{lang}" href="{escape(href)}"/>')
        lines.append("  </url>")
    lines.append("</urlset>")
    return "\n".join(lines) + "\n", len(entries)


def main():
    ap = argparse.ArgumentParser(description="Set the real site URL and rebuild sitemap.xml and robots.txt.")
    ap.add_argument("--url", help="full site address, e.g. https://user.github.io/the-picture")
    ap.add_argument("--dry-run", action="store_true", help="show what would change without writing")
    args = ap.parse_args()

    site_file = ROOT / "data" / "site.json"
    site = json.loads(site_file.read_text(encoding="utf-8"))
    old = (site.get("url") or "").rstrip("/")
    new = old
    if args.url:
        new = args.url.strip().rstrip("/")
        if not re.fullmatch(r"https://[A-Za-z0-9.-]+(:\d+)?(/[A-Za-z0-9._~%/-]*)?", new):
            sys.exit("The address must start with https:// and contain no spaces, e.g. https://user.github.io/the-picture")

    changed = []
    if new:
        for p in real_pages():
            text = p.read_text(encoding="utf-8")
            out = text.replace(PLACEHOLDER, new)
            if old and old != new:
                out = out.replace(old, new)
            if out != text:
                changed.append(p.relative_to(ROOT).as_posix())
                if not args.dry_run:
                    p.write_text(out, encoding="utf-8")
        if new != old and not args.dry_run:
            site["url"] = new
            site_file.write_text(json.dumps(site, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    base = new or PLACEHOLDER
    sitemap, count = build_sitemap(base)
    robots = "User-agent: *\nAllow: /\n"
    robots += f"\nSitemap: {new}/sitemap.xml\n" if new else "\n# Sitemap line is added by scripts/prepare-deploy.py --url <site address>\n"
    if not args.dry_run:
        (ROOT / "sitemap.xml").write_text(sitemap, encoding="utf-8")
        (ROOT / "robots.txt").write_text(robots, encoding="utf-8")

    tag = "would " if args.dry_run else ""
    print(f"site address: {new or '(not set - sitemap uses ' + PLACEHOLDER + ')'}")
    print(f"{tag}update {len(changed)} page(s) with the address" + ("".join(f"\n  {c}" for c in changed)))
    print(f"{tag}write sitemap.xml ({count} URLs) and robots.txt")
    if not new:
        print("\nNo address yet: run with --url https://<user>.github.io/<repo> once you know it.")
    else:
        left = sum(p.read_text(encoding="utf-8").count("[path รูป") for p in real_pages())
        if left:
            print(f"\nStill to fill by hand: {left} share-image path placeholder(s) ([path รูปปก] / [path รูปภาพ]) in og:image / twitter:image.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
