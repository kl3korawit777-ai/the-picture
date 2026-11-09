#!/usr/bin/env python3
"""
ย่อรูปและแปลงเป็น WebP สำหรับเว็บ The Picture  (Resize and convert images to WebP)

วิธีใช้
  1. ติดตั้งครั้งเดียว:   pip install Pillow
  2. วางรูปต้นฉบับ (jpg, png, ฯลฯ) ใน  img-src/<โฟลเดอร์>/   โดย <โฟลเดอร์> คือ
        profile  activities  certificates  projects  covers
  3. รัน (จากโฟลเดอร์หลักของโปรเจกต์):
        python scripts/optimize-images.py
  4. ได้ไฟล์ .webp ที่  assets/img/<โฟลเดอร์>/  แล้วใส่เฉพาะชื่อไฟล์ในหน้าเว็บ เช่น  cert-1.webp

สิ่งที่สคริปต์ทำ
  - ย่อให้กว้างไม่เกิน 1600px (รูปที่เล็กกว่านั้นไม่ขยาย) รักษาสัดส่วน
  - หมุนรูปตามข้อมูลการถ่าย (EXIF orientation) แล้ว "ตัดข้อมูล EXIF ทิ้งทั้งหมด" รวมถึงพิกัด GPS
  - ข้ามรูปที่แปลงไว้แล้วและต้นฉบับไม่ได้ถูกแก้ (ใช้ --force เพื่อทำใหม่ทั้งหมด)
  - ไม่แตะไฟล์ต้นฉบับ

ตัวเลือก:  --max-width 1600  --quality 82  --force  --dry-run  --src DIR  --dest DIR
"""
import argparse
import re
import sys
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:  # pragma: no cover
    sys.exit("Pillow is not installed. Run:  pip install Pillow")

# stdout ของ Windows บางเครื่องไม่รองรับภาษาไทย ตั้งให้ไม่ error
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

ROOT = Path(__file__).resolve().parent.parent
FOLDERS = ("profile", "activities", "certificates", "projects", "covers")
EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}
SAFE_NAME = re.compile(r"^[A-Za-z0-9._-]+$")


def human(n):
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024 or unit == "GB":
            return f"{n:.0f} {unit}" if unit == "B" else f"{n:.1f} {unit}"
        n /= 1024


def prepare(im, max_width):
    """Fix orientation, normalise the colour mode and shrink to max_width."""
    im = ImageOps.exif_transpose(im)
    if im.mode in ("P", "LA", "PA") or "transparency" in im.info:
        im = im.convert("RGBA")
    elif im.mode not in ("RGB", "RGBA"):
        im = im.convert("RGB")
    if im.width > max_width:
        height = max(1, round(im.height * max_width / im.width))
        im = im.resize((max_width, height), Image.LANCZOS)
    return im


def main():
    ap = argparse.ArgumentParser(description="Resize images and convert them to WebP.")
    ap.add_argument("--src", type=Path, default=ROOT / "img-src", help="folder with the originals (default: img-src)")
    ap.add_argument("--dest", type=Path, default=ROOT / "assets" / "img", help="output folder (default: assets/img)")
    ap.add_argument("--max-width", type=int, default=1600, help="maximum width in pixels (default: 1600)")
    ap.add_argument("--quality", type=int, default=82, help="WebP quality 1-100 (default: 82)")
    ap.add_argument("--force", action="store_true", help="convert again even if the output is up to date")
    ap.add_argument("--dry-run", action="store_true", help="show what would happen without writing anything")
    args = ap.parse_args()

    if args.max_width < 1 or not 1 <= args.quality <= 100:
        ap.error("--max-width must be at least 1 and --quality must be 1-100")

    done = skipped = failed = 0
    saved_in = saved_out = 0
    seen = {}  # output path -> source path, to catch a.jpg and a.png both becoming a.webp

    if not args.src.exists() and not args.dry_run:
        args.src.mkdir(parents=True)
    for folder in FOLDERS:
        src_dir = args.src / folder
        if not src_dir.exists() and not args.dry_run:
            src_dir.mkdir(parents=True)  # create the empty folders so it is clear where to put originals
        if not src_dir.exists():
            continue
        for src in sorted(p for p in src_dir.rglob("*") if p.is_file() and p.suffix.lower() in EXTENSIONS):
            rel = src.relative_to(src_dir)
            out = (args.dest / folder / rel).with_suffix(".webp")
            label = f"{folder}/{rel.as_posix()}"

            if out in seen:
                print(f"SKIP   {label}: same output name as {seen[out]} (rename one of them)")
                failed += 1
                continue
            seen[out] = label
            if not SAFE_NAME.match(rel.name):
                print(f"WARN   {label}: use only English letters, digits, '-', '_' and '.' in file names (no spaces or Thai)")

            if out.exists() and not args.force and out.stat().st_mtime >= src.stat().st_mtime:
                print(f"skip   {label}: already converted")
                skipped += 1
                continue

            try:
                with Image.open(src) as im:
                    if getattr(im, "is_animated", False):
                        print(f"note   {label}: animated image, only the first frame is used")
                    before = f"{im.width}x{im.height}"
                    im = prepare(im, args.max_width)
                    after = f"{im.width}x{im.height}"
                    if args.dry_run:
                        print(f"would  {label} -> {out.relative_to(ROOT) if out.is_relative_to(ROOT) else out}  {before} -> {after}")
                        done += 1
                        continue
                    out.parent.mkdir(parents=True, exist_ok=True)
                    # no exif= / icc_profile= argument: all metadata (including GPS) is dropped
                    im.save(out, "WEBP", quality=args.quality, method=6)
            except Exception as exc:  # a broken file must not stop the rest
                print(f"FAIL   {label}: {exc}")
                failed += 1
                continue

            size_in, size_out = src.stat().st_size, out.stat().st_size
            saved_in += size_in
            saved_out += size_out
            print(f"ok     {label} -> {out.name}  {before} -> {after}  {human(size_in)} -> {human(size_out)}")
            done += 1

    # files dropped straight into img-src/ (not in a folder) would be silently ignored otherwise
    if args.src.exists():
        for stray in sorted(p for p in args.src.iterdir() if p.is_file() and p.suffix.lower() in EXTENSIONS):
            print(f"WARN   {stray.name}: move it into one of {', '.join(FOLDERS)} inside {args.src.name}/")

    verb = "would convert" if args.dry_run else "converted"
    print(f"\n{verb} {done}, skipped {skipped}, failed {failed}")
    if saved_in:
        print(f"total {human(saved_in)} -> {human(saved_out)}")
    if not (done or skipped or failed):
        print(f"No images found. Put originals in {args.src.name}/<{'|'.join(FOLDERS)}>/ and run again.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
