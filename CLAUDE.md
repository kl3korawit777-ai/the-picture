# The Picture — กฎของโปรเจกต์

เว็บบทความ โปรเจกต์ และพอร์ตโฟลิโอส่วนตัวของ กรวิชญ์ บัวดำ (นักเรียน SMA โรงเรียนนาทวีวิทยาคม เป้าหมาย TCAS70 คณะแพทยศาสตร์) เขียนด้วย HTML/CSS/JS ล้วน ขึ้น GitHub Pages
อ่านไฟล์นี้ก่อนแก้อะไรทุกครั้ง กฎด้านล่างใช้กับทุกเฟส

## กฎหลัก

1. **ไม่ใช้ framework ฝั่งหน้าเว็บ (ไม่มี React/Vue ฯลฯ) และ build บน GitHub Actions เท่านั้น ผู้เขียนไม่ต้องรันอะไรในเครื่อง** (branch `cms`, เฟส 12 เป็นต้นไป): ผู้เขียนแก้เนื้อหาผ่าน Pages CMS (pagescms.org) ซึ่งบันทึกลง repo โดยตรง แล้ว GitHub Actions รันสคริปต์ใน `scripts/` สร้าง `_site/` และ deploy ขึ้น GitHub Pages ผลลัพธ์ใน `_site/` ยังเป็น HTML/CSS/JS ล้วน (ไม่มี bundler, SCSS, template engine ฝั่งเบราว์เซอร์) ห้ามใส่ขั้นตอนที่ต้องให้ผู้เขียนรันในเครื่องหรือ commit ไฟล์ที่ build แล้ว (`_site/` อยู่ใน `.gitignore`)
2. **โทนสีขาว สีเน้นสีเดียวคือ `--accent` (#2B59C3)** ใช้ token ใน `:root` ของ `assets/css/style.css` เท่านั้น ห้ามใส่สีตรงๆ (hex, rgb, ชื่อสี) ในหน้า HTML หรือใน rule ของ CSS ถ้าต้องการสีใหม่ ให้เพิ่ม token ใน `:root` ก่อนแล้วค่อยอ้างถึง
3. **ฟอนต์:** Prompt สำหรับหัวข้อ (`--font-display`), IBM Plex Sans Thai สำหรับเนื้อหา (`--font-body`) โหลดผ่าน Google Fonts ห้ามเพิ่มฟอนต์อื่น
4. **บทความกับโปรเจกต์แยกกันเสมอ** ห้ามนำมาปนในหน้าเดียวกัน ยกเว้นส่วน "ผลงานที่เกี่ยวข้อง" (`.work-grid`) ในพอร์ตโฟลิโอ
5. **ทุกหน้าต้องใช้งานได้ที่ความกว้าง 375px และไม่มี scroll แนวนอน** ตรวจทุกครั้งที่แก้ layout (ตารางกว้างให้ครอบด้วย `.table-wrap` ที่ scroll ในตัวเอง)
6. **ข้อความในวงเล็บ `[ ]` คือช่องรอข้อมูลจริง ห้ามแต่งข้อมูลมาเติมเอง** (ปี ชื่อรายการแข่งขัน อีเมล ลิงก์ แหล่งอ้างอิง ภาพ ฯลฯ) ถ้าไม่มีข้อมูลให้คงช่อง `[ ]` ไว้และบอกผู้ใช้ ห้ามเดาตัวเลขรางวัลหรือข้อเท็จจริงทางวิทยาศาสตร์

## โครงสร้าง (branch `cms`)

```
src/                        ของที่นักพัฒนาดูแล (ผู้เขียนไม่แตะ)
  index.html, projects.html, portfolio.html, about.html, 404.html   หน้าเทมเพลต (ข้อความดึงจาก content/ ตอนรันในเบราว์เซอร์หรือตอน build)
  articles/_template.html, articles/en/_template.html               โครงหน้าบทความ (เฟส 13 จะสร้างหน้าบทความจาก content/articles/*.md ด้วยโครงนี้)
  projects/<slug>.html      หน้าโปรเจกต์ 1 อัน = 1 ไฟล์ (ใช้ data-base="../" และ data-project="<slug>")
  assets/css, assets/js     สไตล์และสคริปต์ทั้งหมด (style.css, main.js, covers, certificates, glossary, mechanism, interactive)
  data/i18n.json            ข้อความ UI ไทย/อังกฤษ (นักพัฒนาแก้ ไม่ใช่เนื้อหา)
  favicon.*, apple-touch-icon.png, robots.txt, sitemap.xml
content/                    เนื้อหา: ที่ Pages CMS แก้ได้ (บันทึกลง repo โดยตรง)
  articles/<slug>.md        บทความ 1 เรื่อง = 1 ไฟล์ (front matter + Markdown + คำสั่งย่อด้านล่าง)
  data/site.json            ชื่อ อีเมล GitHub รูป + ข้อความแนะนำตัว/หน้าเกี่ยวกับฉัน (bio, intro, about_*, interests, path, tools)
  data/projects.json, certificates.json, activities.json, awards.json (stats + items), glossary.json, mechanism.json
media/                      รูปต้นฉบับที่อัปโหลดจาก CMS: covers, articles, projects, certificates, activities, profile
scripts/build.mjs           สคริปต์ build (ใช้ package.json: gray-matter, markdown-it, sharp) ส่วน check-site.py / optimize-images.py / prepare-deploy.py เขียนสำหรับโครงสร้างเก่า ยังไม่ได้ปรับ
_site/                      ผลลัพธ์ build (ห้าม commit)
```

ผลลัพธ์ที่ build แล้วต้องมีหน้าตา **เหมือนโครงสร้างเก่า** เพราะโค้ดใน `src/assets/js` ยังอ้าง path ของผลลัพธ์: `data/*.json` (build รวม `content/data/*.json` + `src/data/i18n.json` + `data/articles.json` ที่สร้างจาก front matter), `assets/img/<โฟลเดอร์>/<ไฟล์>.webp` (build ย่อรูปจาก `media/<โฟลเดอร์>/`), `articles/<slug>.html` (สร้างจาก .md) ดังนั้นในกฎด้านล่าง path ที่ขึ้นต้นด้วย `data/` หรือ `assets/` หมายถึง **ในผลลัพธ์ที่ build แล้ว** ต้นทางคือ `content/data/`, `src/data/`, `src/assets/`, `media/` **เว็บใน `src/` เปิดตรงๆ ไม่ได้ ให้รัน `npm run build` แล้วเปิดโฟลเดอร์ `_site/` ผ่านเซิร์ฟเวอร์ในเครื่อง**

### รูปแบบบทความ (`content/articles/<slug>.md`)

front matter: `title`, `dek`, `category` (medicine|biotech|bioinformatics|ai|notes), `date` (ค.ศ. เช่น 2026-11 หรือ 2026-11-09), `status` (draft|published), `featured`, `covers` (`type`: helix|fold|image, `src`, `alt`, `caption`, `credit`), `references` (รายการข้อความ), `title_en`, `dek_en` (ไม่บังคับ) และช่องเสริมที่ไม่บังคับ (ข้อความที่เดิมอยู่ในหน้าอยู่แล้ว) `short_title` (ชื่อใน `<title>`), `lead` (ข้อความใต้หัวเรื่องในหน้าบทความ), `description` (meta/og) ถ้าไม่ใส่ build ใช้ `title`/`dek` แทน

เนื้อหาเป็น Markdown + คำสั่งย่อ (ห้ามเขียน HTML ในไฟล์ .md):
- `## หัวข้อ {#id}` / `### หัวข้อ {#id}` หัวข้อพร้อม id (ไม่ใส่ {#id} ให้ build สร้างให้) ตาราง = ตาราง GFM บล็อกอ้างอิง `> ...` = ประโยคเด่น (`.pull`) ย่อหน้าที่มีแค่ `[ ... ]` = ช่องรอข้อมูล (`.todo`)
- `[[key|ข้อความ]]` คำศัพท์จาก glossary.json (build เป็น `<button class="term" data-term="key">`)
- `{{mech}}` แผนภาพกลไก CRISPR (build เป็น `<div data-mech></div>`)
- `{{figure src="..." alt="..." caption="..." credit="..."}}` รูปพร้อมคำบรรยาย (build ต่อเป็น "คำบรรยาย · ภาพ: เครดิต" src ว่าง = ช่องรอรูป)
- `{{duo}} ... {{/duo}}` กล่องเปรียบเทียบสองฝั่ง คั่นสองฝั่งด้วยบรรทัด `---` แต่ละฝั่งขึ้นต้นด้วยบรรทัดตัวหนา `**ป้าย**` ตามด้วยข้อความ (ป้ายฝั่งแรกเป็นสี accent)
- ห้ามแก้หรือเติมเนื้อหาบทความเอง รายการอ้างอิงอยู่ที่ `references` ไม่ใช่ท้ายเนื้อหา
- ในเซลล์ตารางต้องเขียนเส้นตั้งของคำศัพท์เป็น `[[key|คำ]]` (ไม่งั้นตารางแตกคอลัมน์) รูปแบบ Markdown `![alt](ไฟล์ "คำบรรยาย")` ที่อยู่ในย่อหน้าเดียวก็เป็นรูปพร้อมคำบรรยายเหมือน `{{figure}}`
- ชื่อไฟล์ `<slug>.md` = ที่อยู่บทความ ใช้ a-z 0-9 และ `-` เท่านั้น ชื่อรูปใน `src` ของ figure/covers เขียนชื่อไฟล์ที่อัปโหลดใน `media/` (`media/articles/` สำหรับรูปในเนื้อหา, `media/covers/` สำหรับปก; เขียนนามสกุลเดิมหรือไม่เขียนก็ได้)

### ระบบ build (`scripts/build.mjs`, Node 20+, ไลบรารี: gray-matter, markdown-it, sharp)

รันบน GitHub Actions เท่านั้น: `npm ci && npm run build` ได้ `_site/` ทำตามลำดับ: (1) คัดลอก `src/` (ข้ามไฟล์/โฟลเดอร์ที่ขึ้นต้นด้วย `_` ซึ่งเป็นเทมเพลต) (2) แปลง `content/articles/*.md` เป็น `articles/<slug>.html` ด้วย `src/articles/_template.html` พร้อม meta Open Graph/Twitter (รูปปกแรกที่เป็นรูปจริงถูกครอบเป็น JPEG 1200x630 `<ชื่อ>-og.jpg`; ไม่มีใช้ `og-default.png`) `status: draft` ไปที่ `drafts/<slug>.html` พร้อม `noindex` และไม่อยู่ใน `articles.json`/sitemap (3) `data/articles.json` เฉพาะ published เรียงวันที่ใหม่ไปเก่า + คัดลอก `content/data/*.json` (ชื่อรูปในไฟล์ข้อมูลถูกแปลงเป็น `.webp`) (4) รูปใน `media/<โฟลเดอร์>/` เป็น `assets/img/<โฟลเดอร์>/<ชื่อ>.webp` (กว้างสูงสุด 1600px) และ `<ชื่อ>-800.webp` บทความได้ `srcset`/`width`/`height`/`loading="lazy"` ให้เอง JS ที่สร้างรูป (ปก ช่องรูป) ใส่ `srcset` ตามชื่อนี้ (5) `sitemap.xml`, `robots.txt` (6) **build ล้ม (exit 1) เมื่อบทความ published ขาด title, date หรือ category (หรือค่าไม่ถูกต้อง) มีรูปที่ไม่มี alt รูปที่ไม่มีไฟล์ใน `media/` หรือคำศัพท์ `[[key|…]]` ที่ไม่มีใน glossary.json** ส่วน draft แค่เตือน

ที่อยู่เว็บ (og:url, og:image, hreflang, sitemap) มาจาก env `SITE_URL` → `url` ใน `content/data/site.json` → `GITHUB_REPOSITORY` (`owner.github.io[/repo]`) ถ้าไม่มีสักอย่างจะข้ามส่วนที่ต้องใช้ URL เต็มและเตือน ห้ามเดา URL

## ข้อตกลงในโค้ด

- ทุกหน้ามี header, nav, `.en-notice`, footer และ `.search-layer` ชุดเดียวกัน (คัดลอกซ้ำ ไม่มี include) แก้เมนูต้องแก้ครบทุกหน้า รวมหน้าใน `articles/` ที่ใช้ path `../`
- `<html data-base="">` (หรือ `"../"` ในโฟลเดอร์ย่อย) ใช้ให้ `main.js` สร้างลิงก์ผลค้นหา ต้องตั้งให้ตรงทุกหน้า
- แปลภาษา: องค์ประกอบที่ต้องแปลใส่ `data-i18n="key"` (ข้อความไทยอยู่ใน HTML, อังกฤษอยู่ใน `dict.en` ใน `main.js`) placeholder ใช้ `data-i18n-ph`
- ตัวกรอง: ปุ่มใส่ `data-filter-group="<id ของพื้นที่เป้าหมาย>"` และปุ่มละ `data-filter` ส่วนรายการเป้าหมายใส่ `data-cat` (คั่นหลายหมวดด้วยช่องว่าง)
- **ข้อมูลอยู่ที่เดียว:** รายการบทความอยู่ใน `data/articles.json` และโปรเจกต์อยู่ใน `data/projects.json` เท่านั้น `main.js` สร้างหน้าแรก (บทความเด่น, "ล่าสุด", จำนวนในการ์ดหมวด), หน้าโปรเจกต์ และดัชนีค้นหาจากสองไฟล์นี้ ห้ามเขียนรายการบทความ/โปรเจกต์ซ้ำใน HTML หรือ `main.js` (ยกเว้นหน้าคงที่ในช่องค้นหา คือ พอร์ตโฟลิโอกับเกี่ยวกับฉัน)
- ช่อง schema และวิธีเพิ่มรายการอยู่ใน `README.md` บทความ `status: "draft"` ต้องไม่ปรากฏที่ไหนบนเว็บ ช่องที่ยังไม่มีข้อมูลจริง (`url`, `github`) ให้เป็น `""` ห้ามเดาลิงก์
- ข้อความจาก JSON ต้องใส่เข้า DOM ด้วย `textContent` เท่านั้น (ใช้ `mk()` และ `bi()` ใน `main.js`) ห้าม `innerHTML` กับข้อมูลจาก JSON
- ข้อความสองภาษาที่สร้างจาก JS ใช้ `bi(el, th, en)` เพื่อให้สลับ TH/EN ได้โดยไม่ต้อง render ใหม่ ข้อความที่มีแค่ใน JS ให้เพิ่มใน `dict.th` และ `dict.en`
- `fetch` ใช้ไม่ได้บน `file://` ต้องทดสอบผ่านเซิร์ฟเวอร์ในเครื่อง (`python -m http.server 8000`) ถ้าโหลดข้อมูลไม่ได้ หน้าต้องแสดงข้อความแจ้ง ห้ามเป็นหน้าว่าง
- เพิ่มบทความใหม่ ให้ทำตามขั้นตอนใน `README.md` (คัดลอก `articles/_template.html` แล้วเพิ่มรายการใน `data/articles.json`) ห้ามแก้ `_template.html` ให้กลายเป็นบทความจริง และแก้เทมเพลตพร้อมหน้าบทความต้นแบบเสมอเมื่อเปลี่ยนโครงหน้าบทความ
- หน้าบทความ: สารบัญ (จาก h2/h3 ใน `.prose`), เวลาอ่าน, วันที่, หมวดใน breadcrumb, ก่อนหน้า/ถัดไป และบทความในหมวดเดียวกัน สร้างโดย `main.js` ผ่าน `data-slug` บน `<html>` และ attribute `data-article-*`, `data-read-time`, `data-post-nav`, `data-related` ห้ามเขียนสิ่งเหล่านี้ซ้ำในบทความ
- หน้าโปรเจกต์ `projects/<slug>.html` สร้างจาก `projects/_template.html` และอ่านหัวหน้า (ชื่อ คำอธิบาย แท็ก ภาพหัว ปุ่ม) จาก `data/projects.json` ผ่าน `data-project="<slug>"` โครงเนื้อหา: ปัญหา → วิธีทำ/เครื่องมือ → ผลลัพธ์ (ภาพหน้าจอ) → สิ่งที่ได้เรียนรู้ → ปุ่มเปิดเว็บจริง/GitHub เนื้อหาที่ผู้ใช้ยังไม่ให้ต้องเป็น `[ ]` ห้ามแต่งปัญหา เครื่องมือ ผลลัพธ์ ตัวเลข หรือสิ่งที่ได้เรียนรู้ของโปรเจกต์ (แม้จะเดาได้จากชื่อหรือคำอธิบาย) เพิ่มโปรเจกต์ใหม่ต้องมีทั้งรายการใน JSON และไฟล์หน้า ไม่งั้นการ์ดจะลิงก์ไป 404
- ภาพที่กดขยายได้ใช้ `<button class="zoom-btn" data-zoom>` ครอบ `<img>` ห้ามเขียน lightbox ซ้ำ (main.js สร้างเอง) สีฉากหลังใช้ token `--scrim`
- **`data/site.json`** เก็บชื่อ อักษรย่อ อีเมล GitHub และรูปโปรไฟล์ที่เดียว ผูกใน HTML ด้วย `data-site="name|initials|email"`, `data-site-href="github"`, `data-copy-site="email"` ห้ามพิมพ์อีเมล/ลิงก์ GitHub ลงใน HTML ตรงๆ ค่าว่าง `""` = ช่องรอข้อมูล ห้ามเดาอีเมลหรือลิงก์
- **ช่องรูป:** `<div class="ph" data-slot="profile|activities|certificates|projects" data-file="ชื่อไฟล์.webp">[ข้อความช่องรอ]</div>` main.js สลับเป็น `<img>` ให้เมื่อ `data-file` ไม่ว่าง (โปรไฟล์อ่านจาก `photo` ใน site.json) ใส่ `data-zoomable` เพื่อกดขยายด้วย lightbox ใส่ `data-alt` เมื่อ alt ต้องเฉพาะเจาะจง ห้ามอ้างไฟล์รูปที่ไม่มีอยู่จริงใน `assets/img/`
- รูปต้นฉบับอยู่ใน `img-src/` (ไม่ commit) แปลงด้วย `scripts/optimize-images.py` (ต้องมี Pillow; บนเครื่องนี้ `python` ใน PATH เป็นตัวหลอกของ Microsoft Store ให้ใช้ `py` หรือ path ของ Python จริง) ใช้ได้เฉพาะ `.webp` กว้างไม่เกิน 1600px ใน `assets/img/`
- ตัวกรองที่มี `data-hash` (เวอร์ชันพอร์ตโฟลิโอ) ผูกกับที่อยู่หน้า `#chem` / `#bio` ถ้าเพิ่มเวอร์ชันใหม่ ต้องเพิ่มทั้งปุ่ม `data-filter`, `data-cat` ในรายการ และข้อความพิมพ์ `data-ver`
- **การพิมพ์ (`@media print` ท้าย `style.css`):** ซ่อนเมนู ปุ่ม ช่องค้นหา lightbox ตอนพิมพ์ เมื่อเพิ่มปุ่มหรือส่วนควบคุมใหม่ในหน้าพอร์ตโฟลิโอ/เกี่ยวกับฉัน ต้องซ่อนในบล็อกนี้ด้วย การ์ดที่เพิ่มใหม่ใส่ `break-inside: avoid` และห้ามพึ่งสีพื้นหลัง (เบราว์เซอร์มักไม่พิมพ์) ใช้เส้นขอบแทน
- **ข้อความ UI อยู่ใน `data/i18n.json` ที่เดียว** (`th` และ `en` ต้องมี key ชุดเดียวกัน) ห้ามพิมพ์ข้อความที่ผู้ใช้เห็นลงใน `main.js` (ยกเว้น `FALLBACK_ERROR` สำหรับตอน i18n.json โหลดไม่ได้) ผูกใน HTML ด้วย `data-i18n`, `data-i18n-ph`, `data-i18n-aria` ส่วนข้อความที่ JS สร้างใช้ `bk(el, key, vars)` / `bi(el, th, en)` เพิ่มข้อความใหม่ต้องเพิ่มทั้ง th และ en
- **ห้ามแปลเนื้อหาบทความเอง** ฉบับอังกฤษ (`articles/en/<slug>.html`) ผู้ใช้เขียนเอง งานของระบบมีแค่โครง/ลิงก์/แถบแจ้ง ช่อง `title_en`, `dek_en`, `name_en`, `initials_en` ที่ว่างอยู่ต้องคงเป็น `""` จนกว่าผู้ใช้จะให้ข้อความ
- **`<html lang>` = ภาษาของเนื้อหาในไฟล์ (`th` หรือ `en` สำหรับ `articles/en/`) JS ห้ามเปลี่ยนค่านี้** ข้อความที่สลับภาษาใช้ `lang` ที่องค์ประกอบนั้น (`tagLang`) บทความที่มีฉบับอังกฤษต้องมี `has_en: true`, ไฟล์ `articles/en/<slug>.html` ที่มีจริง และบล็อก hreflang คู่กันทั้งสองไฟล์ (ต้องเป็น URL เต็ม `[URL เว็บ]`) ลิงก์ไปบทความทุกที่สร้างด้วย `articleLink()` เพื่อให้ตามภาษาที่เลือก
- วันที่: เก็บเป็น ค.ศ. (`YYYY-MM-DD`) ใน JSON แสดง พ.ศ. ตอนไทย ค.ศ. ตอนอังกฤษ ผ่าน `formatDate`/`dateBi` และรูปแบบใน `i18n.json` (`date.*`) ห้ามเขียนวันที่หรือปี พ.ศ./ค.ศ. ตายตัวใน HTML (ปีท้ายหน้าใช้ `<span data-year>`)
- **ก่อนส่งงาน/ขึ้นเว็บ:** รัน `scripts/check-site.py` (ใช้ Python จริงของเครื่อง ดูหมายเหตุ Python ข้างบน) ต้องไม่มีลิงก์เสีย/รูปไม่มี alt สีข้อความต้องผ่าน WCAG AA (4.5:1, ตัวใหญ่ 3:1) โดยห้ามใช้ `--faint` กับข้อความที่ผู้ใช้ต้องอ่าน เนื้อหาที่ JS สร้างต้องมีที่จองพื้นที่ใน CSS (`:empty` min-height) ไม่ให้หน้ากระตุก (CLS) ที่อยู่เว็บจริงใส่ผ่าน `scripts/prepare-deploy.py` เท่านั้น ห้ามเดา URL
- หน้าใหม่ทุกหน้าต้องมี: `interactive.css`/`interactive.js` + ปุ่ม `.to-top`, favicon, skip link (`.skip-link` → `#main`), `<main id="main">`, preload ข้อมูล `data/*.json` ใน `<head>`, ฟอนต์แบบไม่บล็อกการแสดงผล (คัดลอกจากหน้าเดิม) และ `404.html` ใช้ `<base>` ที่คำนวณเอง ห้ามใช้ path ที่ขึ้นต้นด้วย `/` ในหน้าใดๆ (project site อยู่ใต้ `/<ชื่อ-repo>/`)
- **Interactive layer (`assets/css/interactive.css` + `assets/js/interactive.js`):** โมดูลแยกที่โหลดต่อจาก `style.css`/`main.js` ทุกหน้า (view transitions, header ซ่อน/แสดง, reveal on scroll, แสงบนการ์ด, แอนิเมชันตัวกรอง, คีย์ลัดค้นหา, ปุ่มกลับขึ้นบน, เส้นใต้หัวข้อ, วงกระเพื่อมหน้าเกี่ยวกับฉัน) โมดูลนี้ต้องเป็น "ส่วนเสริม" เว็บใช้งานได้เหมือนเดิมถ้าไม่มีสองไฟล์นี้ กฎ: (1) ทุกอย่างที่ขยับอยู่ใน `@media (prefers-reduced-motion: no-preference)` และฝั่ง JS เช็ค `reduced()` (2) สี/เงาใช้ token ใน `style.css :root` เท่านั้น (3) ไม่มีข้อความที่ผู้ใช้เห็นใน JS (ป้ายปุ่มกลับขึ้นบนมาจาก `aria.toTop` ใน `i18n.json`) (4) ของในจอแรกต้องแสดงทันที ห้ามซ่อนรอ (5) header ห้ามซ่อนตอนเมนูมือถือเปิดหรือโฟกัสอยู่ใน header (6) อ่าน DOM เท่านั้น ไม่แก้ `main.js` และรองรับการ์ดที่ `main.js` สร้างทีหลัง (ใช้ MutationObserver/delegation)
- **สไลด์ภาพปก (`assets/js/covers.js` + `assets/css/covers.css`):** ภาพปกทุกที่ (บทความเด่นหน้าแรก, หัวบทความ) สร้างจากช่อง `covers` ใน `data/articles.json` (`type`: helix | fold | image, `src`, `alt`, `caption`, `credit` + `_en`) ห้ามเขียน markup สไลด์ซ้ำใน HTML หน้าบทความมีแค่ `<figure class="cover" data-cover>` กับภาพเกลียว DNA สำรองข้างใน (ใช้ตอนข้อมูลโหลดไม่ได้ และกันหน้ากระตุก) `main.js` เรียก `TP.covers.mount()` ถ้าไม่มี `covers.js` จะแสดงภาพเกลียวธรรมดา กฎ: (1) หลายภาพ = สไลด์ ภาพเดียว = ภาพนิ่งไม่มีปุ่ม/จุด/เลื่อนเอง (2) เลื่อนเอง 5 วินาที หยุดเมื่อ hover/focus/แท็บซ่อน/สไลด์พ้นจอ ลากแล้วห้ามเผลอกดลิงก์ (3) เกลียว DNA หยุดหมุนเมื่อพ้นจอหรือไม่ใช่สไลด์ปัจจุบัน (4) สี pLDDT เป็น token `--plddt-*` ใน `style.css` ห้ามใส่ hex ตรงๆ ใน JS/CSS ของโมดูล (5) ข้อความทุกอย่างมาจาก `i18n.json` (`cover.*`, `fold.*`) (6) รูปแรกของสไลด์ห้าม lazy (เป็นภาพแรกที่เห็น) รูปถัดไป lazy และต้องมี alt (7) ปิดการเคลื่อนไหวทั้งหมดเมื่อ prefers-reduced-motion และสไลด์ต้องมีขนาดเท่าภาพสำรองเสมอ (ระวัง CLS)
- **แถบเกียรติบัตร (`assets/js/certificates.js` + `assets/css/certificates.css`, เฉพาะหน้าพอร์ตโฟลิโอ):** เกียรติบัตรสร้างจาก `data/certificates.json` (`title`, `title_en`, `year` เป็น ค.ศ., `image` = ชื่อไฟล์ใน `assets/img/certificates/`) ห้ามเขียนการ์ดเกียรติบัตรซ้ำใน HTML `main.js` สร้างการ์ดเป็นกริดก่อน (ฐานที่ใช้ได้แม้ไม่มีโมดูล) แล้วเรียก `TP.certs.enhance()` กฎ: (1) ต่ำกว่า 4 ใบ = กริดธรรมดา (2) 4 ใบขึ้นไป = เลื่อนขวาไปซ้ายคงที่ 40px/วินาที (คำนวณ `--dur` จากระยะจริงของชุดรายการ ไม่ใช่ค่าตายตัว) ต่อกันด้วยชุดสำเนา `aria-hidden` + `inert` (3) หยุดเมื่อ hover/focus/พ้นจอ (ไม่มีปุ่มหยุดเลื่อน ผู้ใช้ตัดออกโดยตั้งใจ ห้ามเพิ่มกลับโดยไม่ถาม) (4) ลดการเคลื่อนไหว = ไม่เลื่อนเอง ไม่ทำสำเนา เป็นแถวเลื่อนเองที่ focus ด้วยคีย์บอร์ดได้ (5) ข้อความทุกอย่างอยู่ใน `i18n.json` (`cert.*`) (6) lightbox กลุ่มรูป: ใส่ `data-zoom-group` ให้ปุ่มที่ต้องการให้เลื่อนดูต่อกัน lightbox ข้ามรายการใน `[inert]` เสมอ
- **คอมโพเนนต์ในบทความ (`glossary.js/css`, `mechanism.js/css`):** (1) คำศัพท์ = `<button type="button" class="term" data-term="key">คำ</button>` คำอธิบายอยู่ใน `data/glossary.json` (`key`, `term`, `definition` + `_en`) ห้ามเขียนคำอธิบายหรือกล่อง `.term-pop` ใน HTML; key ที่ไม่มีใน JSON ต้องไม่ทำให้หน้าพัง (เป็นคำธรรมดา) (2) แผนภาพกลไก = `<div data-mech></div>` อันเดียว JS สร้างทั้งหมด (แผนภาพ ขั้น ปุ่ม การ์ด NHEJ/HDR) เนื้อหาขั้นตอนอยู่ใน `data/mechanism.json` ป้ายและปุ่มอยู่ใน `i18n.json` (`mech.*`) ห้ามเขียนข้อความในแผนภาพไว้ใน JS (3) คอมโพเนนต์ทั้งสองเริ่มทำงานเมื่อ `main.js` ส่งสัญญาณ `tp:ready` และขอข้อมูลผ่าน `TP.load(ชื่อ, asObject)` (ไฟล์ที่เป็นอ็อบเจกต์ เช่น mechanism ต้องส่ง `true` ทั้งตอน prefetch ใน main.js และตอนเรียก) ใช้ `TP.bi/bk/tr/lang` ของ main.js ไม่ใช้ข้อความตายตัว (4) กล่องคำศัพท์ต้องไม่ล้นจอ (จำกัดซ้ายขวา พลิกไปอยู่เหนือคำเมื่อด้านล่างไม่พอ) ปิดด้วย Esc/แตะข้างนอก (5) แผนภาพต้องอ่านออกบนมือถือ: ข้อความใน SVG ใช้หน่วยของ viewBox ซึ่งถูกย่อตามความกว้าง จึงมีกฎขยายตัวอักษรที่ ≤600px ใน `mechanism.css` และเว้นแถวป้ายไม่ให้ชนกัน ถ้าเพิ่ม/ย้ายป้าย ต้องตรวจที่ 375px ทุกขั้นทั้งไทยและอังกฤษ (6) ชื่อ class ของคอมโพเนนต์ต้องไม่ซ้ำกับของอื่น (เคยชนกับ `.seg` ของภาพโปรตีน จึงใช้ `.mech-seg`) (7) สีใหม่เป็น token ใน `style.css :root` (`--amber*`, `--target-fill`, `--cas9-fill`, `--shadow-pop`) การเคลื่อนไหวอยู่ใน `no-preference`
- ต้นแบบอยู่ในโฟลเดอร์ `_prototype/` (อ้างอิงอย่างเดียว) **ห้ามแก้หรือคัดลอกทับ** และสคริปต์/คำสั่งที่ไล่แก้ไฟล์ทั้งโปรเจกต์ต้องข้ามโฟลเดอร์นี้ ส่วนของต้นแบบทุกอย่างที่อยู่ในรายการงานย้ายมาครบแล้ว (helix, fold, สไลด์ปก, แถบเกียรติบัตร, คำศัพท์, แผนภาพกลไก)
- ปุ่มกลับขึ้นบน (`<button class="to-top" hidden data-i18n-aria="aria.toTop">`) ต้องมีในทุกหน้า ใส่ก่อน `<script src=…main.js>`
- meta แชร์ลิงก์ (og:*, twitter:*) ต้องเขียนใน `<head>` ของแต่ละบทความเพราะ crawler ไม่รัน JS ค่า `[URL เว็บ]` และ path รูปปกเป็นช่องรอข้อมูลจริง ห้ามเดา URL ของเว็บ
- รูปในบทความต้องมี `alt`, `width`, `height`, `loading="lazy"` (ยกเว้นภาพปก) และ figcaption ที่มีเครดิต ห้ามใส่เครดิตหรือแหล่งที่มาที่ไม่ได้รับมาจากผู้ใช้
- หมวดบทความ: `medicine`, `biotech`, `bioinformatics`, `ai`, `notes`
- การเข้าถึง: ปุ่ม/ลิงก์แตะได้ขนาดอย่างน้อย 44px (ชิปกรองอย่างน้อย 36px ตามที่มีอยู่), ใส่ `aria-label` ให้ปุ่มไอคอน, เคารพ `prefers-reduced-motion`
- ภาษาในเนื้อหา: ไทยเป็นหลัก ปี พ.ศ. ใช้รูป "2569"
- เขียน JS แบบ ES5 ที่มีอยู่ (`var`, `function`) ให้สอดคล้องกับ `main.js` เดิม

## ก่อนส่งงานทุกครั้ง

- เปิดหน้าที่แก้ที่ 375px ตรวจว่าไม่มี scroll แนวนอน
- ค้นหาสีตรงๆ ที่หลุดมา: ไม่ควรมี `#hex`/`rgb(` นอก `:root`
- ลิงก์ภายในทุกอันเปิดได้ (เทียบ path ของหน้าใน `articles/`)
- ไม่ได้เติมข้อมูลจริงแทนช่อง `[ ]` โดยผู้ใช้ไม่ได้ให้มา
