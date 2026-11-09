/* The Picture: build (Node 20+). Runs on GitHub Actions; authors never run it.
   npm ci && node scripts/build.mjs        (or: npm run build)

   src/ + content/ + media/  ->  _site/
     1. copies src/ (files and folders that start with "_" are templates and are skipped)
     2. content/articles/*.md -> articles/<slug>.html (published) or drafts/<slug>.html (draft, noindex),
        using src/articles/_template.html
     3. data/articles.json (published only, newest first) + content/data/*.json
     4. media/<folder>/*  -> assets/img/<folder>/<name>.webp (max 1600 px wide) and <name>-800.webp
     5. sitemap.xml, robots.txt
     6. a published article missing title, date or category, or with a picture without alt text, FAILS the build

   Site address (for og:url, og:image, sitemap): env SITE_URL, else "url" in content/data/site.json,
   else derived from GITHUB_REPOSITORY (owner.github.io[/repo]). Without any of these the build still works,
   but the share meta that needs a full URL and the sitemap are left out (a warning is printed). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import sharp from 'sharp';
import directives, { esc, parseAttrs } from './markdown-directives.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (...a) => path.join(ROOT, ...a);
const OUT = P('_site');
const CATEGORIES = ['medicine', 'biotech', 'bioinformatics', 'ai', 'notes'];
const COVER_TYPES = ['helix', 'fold', 'image'];
const IMG_EXT = /\.(jpe?g|png|webp|avif|tiff?)$/i;
const errors = [], warnings = [];
const err = (m) => errors.push(m), warn = (m) => warnings.push(m);

const read = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const write = (f, s) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); };
const readJson = (f) => { try { return JSON.parse(read(f)); } catch (e) { err(`${path.relative(ROOT, f)}: not valid JSON (${e.message})`); return null; } };

/* ------------------------------------------------------------------ 1. copy src/ */
fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(P('src'), OUT, { recursive: true, filter: (s) => !path.basename(s).startsWith('_') });
(function prune(dir) {                                   /* a folder that held only templates is left empty: drop it */
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    prune(path.join(dir, e.name));
    if (!fs.readdirSync(path.join(dir, e.name)).length) fs.rmdirSync(path.join(dir, e.name));
  }
})(OUT);

/* ------------------------------------------------------------------ site data and address */
const siteData = readJson(P('content/data/site.json')) || {};
function siteUrl() {
  let u = (process.env.SITE_URL || siteData.url || '').trim();
  if (!u && process.env.GITHUB_REPOSITORY) {
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
    u = `https://${owner}.github.io` + (repo.toLowerCase() === `${owner}.github.io`.toLowerCase() ? '' : '/' + repo);
  }
  u = u.replace(/\/+$/, '');
  if (u && !/^https?:\/\//.test(u)) { err(`site address "${u}" must start with https://`); u = ''; }
  return u;
}
const SITE = siteUrl();
if (!SITE) warn('no site address (set "url" in content/data/site.json or env SITE_URL): og:url, og:image, hreflang and sitemap.xml are left out');

/* ------------------------------------------------------------------ 4. media -> WebP 800 / 1600 */
const media = new Map();                       /* "folder/name.webp" -> { w, h, w800 } */
const mediaSrc = new Map();                    /* "folder/name" -> source file path */
async function processMedia() {
  const root = P('media');
  if (!fs.existsSync(root)) return;
  for (const folder of fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory())) {
    for (const f of fs.readdirSync(path.join(root, folder.name))) {
      const file = path.join(root, folder.name, f);
      if (f.startsWith('.') || !fs.statSync(file).isFile()) continue;
      if (/\.svg$/i.test(f)) { fs.mkdirSync(path.join(OUT, 'assets/img', folder.name), { recursive: true }); fs.copyFileSync(file, path.join(OUT, 'assets/img', folder.name, f)); continue; }
      if (!IMG_EXT.test(f)) { warn(`media/${folder.name}/${f}: not a picture format (jpg, png, webp, avif, tiff, svg), skipped`); continue; }
      const base = f.replace(IMG_EXT, '');
      const key = `${folder.name}/${base}`;
      if (mediaSrc.has(key)) { err(`media/${folder.name}: "${base}" exists with two different extensions`); continue; }
      mediaSrc.set(key, file);
      const dir = path.join(OUT, 'assets/img', folder.name);
      fs.mkdirSync(dir, { recursive: true });
      const input = sharp(file).rotate();                                   /* rotate(): apply EXIF orientation; output has no metadata */
      const meta = await sharp(file).rotate().metadata();
      const full = await input.clone().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(dir, base + '.webp'));
      const small = await input.clone().resize({ width: 800, withoutEnlargement: true }).webp({ quality: 78 }).toFile(path.join(dir, base + '-800.webp'));
      media.set(key + '.webp', { w: full.width, h: full.height, w800: small.width });
    }
  }
}
await processMedia();

/** a file name written in the CMS (crispr.jpg, crispr.webp or crispr) -> the built "name.webp" if the picture exists */
function mediaName(folder, name) {
  const base = String(name || '').trim().split('/').pop().replace(/\.[A-Za-z0-9]+$/, '');   /* the CMS writes /media/<folder>/<file>: only the file name counts */
  return media.has(`${folder}/${base}.webp`) ? `${base}.webp` : null;
}
const isUrl = (s) => /^(https?:)?\/\//i.test(s);
function imgUrl(folder, file, prefix) { return `${prefix}assets/img/${folder}/${file}`; }

/* ------------------------------------------------------------------ 3. data files */
const DATA_DIR = P('content/data');
const dataOut = path.join(OUT, 'data');
fs.mkdirSync(dataOut, { recursive: true });
const IMAGE_FIELDS = { 'site.json': ['profile', ['photo']], 'certificates.json': ['certificates', ['image']], 'activities.json': ['activities', ['image']], 'projects.json': ['projects', ['image']] };
function normaliseImages(file, data) {
  const spec = IMAGE_FIELDS[file]; if (!spec) return;
  const [folder, fields] = spec;
  const items = Array.isArray(data) ? data : [data];
  items.forEach((it, i) => fields.forEach((k) => {
    const holder = it && it[k] && typeof it[k] === 'object' ? it[k] : it, key = holder === it ? k : 'file';      /* a picture is a file name, or { file, alt, credit } */
    const v = holder && typeof holder[key] === 'string' ? holder[key].trim() : '';
    if (!v || isUrl(v)) return;
    const fixed = mediaName(folder, v);
    if (fixed) holder[key] = fixed; else warn(`content/data/${file}${Array.isArray(data) ? ` #${i + 1}` : ''}: ${k} "${v}" is not in media/${folder}/ (the page shows the [ ] placeholder)`);
  }));
}
const dataFiles = fs.existsSync(DATA_DIR) ? fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json')) : [];
for (const f of dataFiles) {
  const d = readJson(path.join(DATA_DIR, f)); if (d === null) continue;
  normaliseImages(f, d);
  write(path.join(dataOut, f), JSON.stringify(d, null, 2) + '\n');
}
const glossary = readJson(P('content/data/glossary.json')) || [];
const glossaryKeys = new Set(glossary.map((g) => g.key));

/* ------------------------------------------------------------------ 2. markdown -> HTML */
/** one picture block. ctx = { slug, published, prefix }.  Empty src = the [ ] placeholder slot. */
function figureHtml(a, ctx) {
  const alt = (a.alt || '').trim(), cap = (a.caption || '').trim(), credit = (a.credit || '').trim(), src = (a.src || '').trim();
  const where = `${ctx.slug}.md`;
  let inner;
  if (!src) {
    inner = `<div class="ph">${esc(alt)}</div>`;
  } else {
    if (!alt) (ctx.published ? err : warn)(`${where}: picture "${src}" has no alt text`);
    if (!credit) (ctx.published ? err : warn)(`${where}: picture "${src}" has no credit (who made it / where it is from)`);
    if (isUrl(src)) {
      inner = `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
    } else {
      const rel = src.replace(/^\/?media\//, '');                     /* the CMS writes /media/<folder>/<file> */
      const slash = rel.includes('/');
      const folder = slash ? rel.split('/')[0] : 'articles', name = slash ? rel.slice(folder.length + 1) : rel;
      const file = mediaName(folder, name);
      if (!file) { (ctx.published ? err : warn)(`${where}: picture "${src}" is not in media/${folder}/`); inner = `<div class="ph">${esc(alt)}</div>`; }
      else {
        const m = media.get(`${folder}/${file}`), base = file.replace(/\.webp$/, '');
        const u = imgUrl(folder, file, ctx.prefix), u8 = imgUrl(folder, base + '-800.webp', ctx.prefix);
        inner = `<img src="${u}" srcset="${u8} ${m.w800}w, ${u} ${m.w}w" sizes="(max-width: 840px) 100vw, 800px" alt="${esc(alt)}" width="${m.w}" height="${m.h}" loading="lazy" decoding="async">`;
      }
    }
  }
  const capHtml = cap || credit ? `<figcaption>${esc(cap)}${credit ? `<span class="credit">ภาพ: ${esc(credit)}</span>` : ''}</figcaption>` : '';
  return `<figure class="figure">\n${inner}\n${capHtml}\n</figure>\n`;
}

const report = (env, msg) => (env.published ? err : warn)(`${env.slug}.md: ${msg}`);
const md = new MarkdownIt({ html: false, linkify: false, typographer: false }).use(directives, {
  glossaryKeys,
  figure: figureHtml,
  fatal: (env, msg) => err(`${env.slug}.md: ${msg}`),
  error: report,
  warn: (env, msg) => warn(`${env.slug}.md: ${msg}`),
});

/* ------------------------------------------------------------------ read articles */
const normDate = (d) => d instanceof Date ? d.toISOString().slice(0, 10) : String(d ?? '').trim();
const sortKey = (d) => { const p = String(d).split('-'); return `${p[0] || '0000'}-${(p[1] || '00').padStart(2, '0')}-${(p[2] || '00').padStart(2, '0')}`; };
const articles = [];
const artDir = P('content/articles');
for (const f of (fs.existsSync(artDir) ? fs.readdirSync(artDir) : []).filter((x) => x.endsWith('.md')).sort()) {
  const slug = f.replace(/\.md$/, '');
  if (!/^_?[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) { err(`content/articles/${f}: the file name (the address of the article) uses only a-z, 0-9 and "-" (a leading _ marks a draft guide)`); continue; }
  let fm;
  try { fm = matter(read(path.join(artDir, f))); } catch (e) { err(`content/articles/${f}: front matter is not valid (${e.message})`); continue; }
  const d = fm.data;
  const status = String(d.status || 'draft').trim();
  if (!['draft', 'published'].includes(status)) err(`${f}: status must be draft or published (got "${status}")`);
  const published = status === 'published';
  if (slug.startsWith('_') && published) err(`${f}: a file name that starts with _ is a guide/example and must stay status: draft`);
  const need = published ? err : warn;
  const title = String(d.title ?? '').trim(), date = normDate(d.date), category = String(d.category ?? '').trim();
  if (!title) need(`${f}: no title`);
  if (!date) need(`${f}: no date`);
  else if (!/^\d{4}(-\d{2}(-\d{2})?)?$/.test(date)) need(`${f}: date "${date}" must look like 2026-11 or 2026-11-09`);
  if (!category) need(`${f}: no category`);
  else if (!CATEGORIES.includes(category)) need(`${f}: category "${category}" is not one of ${CATEGORIES.join(', ')}`);

  /* covers: helix | fold | image; an image cover with a file needs alt text */
  const covers = (Array.isArray(d.covers) ? d.covers : []).map((c, i) => {
    const o = { ...(c || {}) };
    if (!COVER_TYPES.includes(o.type)) { need(`${f}: covers[${i + 1}] type must be helix, fold or image`); o.type = 'image'; }
    if (o.type === 'image' && String(o.src || '').trim() && !isUrl(o.src)) {
      const fixed = mediaName('covers', o.src);
      if (!fixed) need(`${f}: covers[${i + 1}] picture "${o.src}" is not in media/covers/`);
      else o.src = fixed;
    }
    if (o.type === 'image' && String(o.src || '').trim() && !String(o.alt || '').trim()) need(`${f}: covers[${i + 1}] picture has no alt text`);
    if (o.type === 'image' && String(o.src || '').trim() && !String(o.credit || '').trim()) need(`${f}: covers[${i + 1}] picture has no credit`);
    return o;
  });

  const env = { slug, published, prefix: '../' };
  const body = md.render(fm.content, env);
  articles.push({ slug, file: f, fm: d, status, published, title, date, category, covers, body,
    references: Array.isArray(d.references) ? d.references.map(String) : [], env });
}

/* ------------------------------------------------------------------ article pages */
const template = read(P('src/articles/_template.html'));
const must = (re, label) => { if (!re.test(template)) throw new Error(`src/articles/_template.html: cannot find ${label}`); };
must(/<meta name="robots" content="noindex">[\s\S]*?(?=<link rel="icon" href="\.\.\/favicon\.svg")/, 'the meta block');
must(/<h1>\[ชื่อเรื่องเต็ม\]<\/h1>\s*(<!--[\s\S]*?-->\s*)?<p class="article-dek">\[คำโปรย\]<\/p>/, 'the title and dek');
must(/<article class="prose">[\s\S]*?<section class="refs"[\s\S]*?<\/section>/, 'the article body and references');

const hasEn = (slug) => fs.existsSync(P('src/articles/en', slug + '.html'));
const ogImage = (a) => {
  const c = a.covers.find((x) => x.type === 'image' && String(x.src || '').trim());
  return c && !isUrl(c.src) ? c : null;
};
const ogFiles = [];
async function makeOg(a) {                         /* 1200x630 JPEG of the first real cover (share sites do not read WebP reliably) */
  const c = ogImage(a); if (!c) return null;
  const base = c.src.replace(/\.webp$/, ''), src = mediaSrc.get(`covers/${base}`); if (!src) return null;
  const name = `${base}-og.jpg`, out = path.join(OUT, 'assets/img/covers', name);
  if (!fs.existsSync(out)) await sharp(src).rotate().resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 82 }).toFile(out);
  return `assets/img/covers/${name}`;
}

for (const a of articles) {
  const url = SITE ? `${SITE}/articles/${a.slug}.html` : '';
  const desc = String(a.fm.description || a.fm.dek || '').trim();
  const ogPath = (await makeOg(a)) || 'og-default.png';
  const metas = [
    a.published ? '' : '<meta name="robots" content="noindex">',
    `<title>${esc(String(a.fm.short_title || a.title))} · The Picture</title>`,
    '<meta name="claude:viewport-fit-sides" content="cover">',
    desc ? `<meta name="description" content="${esc(desc)}">` : '',
    '<meta property="og:type" content="article">',
    '<meta property="og:site_name" content="The Picture">',
    '<meta property="og:locale" content="th_TH">',
    `<meta property="og:title" content="${esc(a.title)}">`,
    desc ? `<meta property="og:description" content="${esc(desc)}">` : '',
    a.published && url ? `<meta property="og:url" content="${esc(url)}">` : '',
    SITE ? `<meta property="og:image" content="${esc(`${SITE}/${ogPath}`)}">` : '',
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${esc(a.title)}">`,
    desc ? `<meta name="twitter:description" content="${esc(desc)}">` : '',
    SITE ? `<meta name="twitter:image" content="${esc(`${SITE}/${ogPath}`)}">` : '',
    a.published && SITE && hasEn(a.slug) ? `<link rel="alternate" hreflang="th" href="${esc(url)}">\n<link rel="alternate" hreflang="en" href="${esc(`${SITE}/articles/en/${a.slug}.html`)}">\n<link rel="alternate" hreflang="x-default" href="${esc(url)}">` : '',
  ].filter(Boolean).join('\n') + '\n';

  const entry = {
    slug: a.slug, title: a.title, dek: String(a.fm.dek ?? ''), title_en: String(a.fm.title_en ?? ''), dek_en: String(a.fm.dek_en ?? ''),
    category: a.category, date: a.date, covers: a.covers, featured: a.fm.featured === true, status: a.status, has_en: hasEn(a.slug),
  };
  a.entry = entry;
  const refs = a.references.length
    ? `<section class="refs" aria-labelledby="refs-h">\n<h2 id="refs-h" data-i18n="art.refs">แหล่งอ้างอิง</h2>\n<ol>${a.references.map((r) => `<li>${md.renderInline(r, a.env)}</li>`).join('')}</ol>\n</section>`
    : '';
  const embedded = `<script type="application/json" id="tp-article">${JSON.stringify(entry).replace(/</g, '\\u003c')}</script>\n`;

  let html = template.replace(/<!--[\s\S]*?-->\n?/g, '')
    .replace('data-slug="[slug]"', `data-slug="${esc(a.slug)}"`)
    .replace(/<meta name="robots" content="noindex">[\s\S]*?(?=<link rel="icon" href="\.\.\/favicon\.svg")/, () => metas)
    .replace('</head>', () => embedded + '</head>')
    .replace(/<h1>\[ชื่อเรื่องเต็ม\]<\/h1>\s*<p class="article-dek">\[คำโปรย\]<\/p>/, () => `<h1>${esc(a.title)}</h1>\n<p class="article-dek">${esc(String(a.fm.lead || a.fm.dek || ''))}</p>`)
    .replace(/<article class="prose">[\s\S]*?<section class="refs"[\s\S]*?<\/section>/, () => `<article class="prose">\n\n${a.body}\n${refs}`);
  write(path.join(OUT, a.published ? 'articles' : 'drafts', a.slug + '.html'), html);
}

/* ------------------------------------------------------------------ articles.json (published, newest first) */
const published = articles.filter((a) => a.published).sort((x, y) => sortKey(y.date).localeCompare(sortKey(x.date)) || x.slug.localeCompare(y.slug));
write(path.join(dataOut, 'articles.json'), JSON.stringify(published.map((a) => a.entry), null, 2) + '\n');

/* ------------------------------------------------------------------ 5. sitemap.xml, robots.txt */
if (SITE) {
  const pages = ['', 'projects.html', 'portfolio.html', 'about.html'];
  const projDir = P('src/projects');
  if (fs.existsSync(projDir)) for (const f of fs.readdirSync(projDir).filter((x) => x.endsWith('.html') && !x.startsWith('_')).sort()) pages.push('projects/' + f);
  for (const a of published) pages.push(`articles/${a.slug}.html`);
  write(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    pages.map((p) => `  <url><loc>${esc(`${SITE}/${p}`)}</loc></url>`).join('\n') + '\n</urlset>\n');
}
write(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /drafts/\n` + (SITE ? `\nSitemap: ${SITE}/sitemap.xml\n` : ''));

/* ------------------------------------------------------------------ the address placeholder in the copied pages */
let leftover = 0;
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f);
    else if (/\.html$/.test(e.name)) {
      let s = fs.readFileSync(f, 'utf8');
      if (s.includes('[URL เว็บ]')) { if (SITE) fs.writeFileSync(f, s.split('[URL เว็บ]').join(SITE)); else leftover++; }
    }
  }
})(OUT);
if (leftover) warn(`${leftover} page(s) still contain the placeholder [URL เว็บ] (it is filled in when the site address is set)`);

/* ------------------------------------------------------------------ report */
const n = (x) => x.length;
console.log(`built _site/: ${n(published)} published article(s), ${n(articles) - n(published)} draft(s), ${media.size} picture(s) (x2 sizes), ${n(dataFiles)} data file(s)`);
if (SITE) console.log('site address: ' + SITE);
warnings.forEach((w) => console.warn('warning: ' + w));
if (errors.length) {
  console.error(`\nBUILD FAILED, ${errors.length} problem(s) to fix:`);
  errors.forEach((e) => console.error(' - ' + e));
  process.exit(1);
}
