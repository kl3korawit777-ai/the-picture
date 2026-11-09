/* Checks .pages.yml against the real content, so that saving in Pages CMS cannot silently drop a field.
   node scripts/check-pages-config.mjs   (or: npm run check:cms)  -- exit 1 if something is wrong.
   - the file parses, every path exists, media names/folders exist
   - every key found in a data file / article front matter is declared as a field (Pages CMS rewrites files from the declared fields only)
   - every image field has an alt and a credit next to it, both required
   - every field has a description */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const bad = (m) => problems.push(m);

const cfg = matter.engines.yaml.parse(fs.readFileSync(path.join(ROOT, '.pages.yml'), 'utf8'));
const media = Array.isArray(cfg.media) ? cfg.media : [];
const mediaNames = new Set(media.map((m) => m.name));
for (const m of media) {
  if (!fs.existsSync(path.join(ROOT, m.input))) bad(`media "${m.name}": folder ${m.input} does not exist`);
  const ext = (m.extensions || []).map(String).sort().join(',');
  if (ext !== 'jpeg,jpg,png,webp') bad(`media "${m.name}": extensions must be exactly jpg, jpeg, png, webp (got ${ext || 'none'})`);
}
const components = cfg.components || {};

const expand = (f) => (f.component ? { ...(components[f.component] || {}), ...f, type: (components[f.component] || {}).type } : f);
const fieldsOf = (f) => { const e = expand(f); return Array.isArray(e.fields) ? e.fields : Array.isArray(e.blocks) ? null : []; };

function checkFields(fields, where) {
  const names = new Set();
  for (const raw of fields) {
    const f = expand(raw);
    const at = `${where}.${f.name}`;
    if (!f.name) { bad(`${where}: a field has no name`); continue; }
    if (names.has(f.name)) bad(`${at}: declared twice`);
    names.add(f.name);
    if (!f.type) bad(`${at}: no type`);
    if (!String(raw.description || f.description || '').trim()) bad(`${at}: no description`);
    if (f.type === 'image') {
      const mname = f.options && f.options.media;
      if (!mname || !mediaNames.has(mname)) bad(`${at}: image field needs options.media naming one of ${[...mediaNames].join(', ')}`);
      const sib = fields.map(expand);
      const base = f.name === 'file' || f.name === 'src' || f.name === 'image' ? '' : f.name + '_';
      const alt = sib.find((s) => s.name === base + 'alt'), credit = sib.find((s) => s.name === base + 'credit');
      if (!alt || alt.required !== true) bad(`${at}: needs a required "${base}alt" field next to it`);
      if (!credit || credit.required !== true) bad(`${at}: needs a required "${base}credit" field next to it`);
    }
    if (f.type === 'select' && !(f.options && Array.isArray(f.options.values) && f.options.values.length)) bad(`${at}: select without options.values`);
    if (f.type === 'block') {
      for (const b of f.blocks || []) checkFields(b.fields || [], `${at}<${b.name}>`);
    } else if (f.fields) checkFields(f.fields, at);
    if (f.component && !components[f.component]) bad(`${at}: unknown component ${f.component}`);
  }
}

/** every key used in the data must be a declared field */
function covers(value, fields, where) {
  if (Array.isArray(value)) { value.forEach((v, i) => covers(v, fields, `${where}[${i + 1}]`)); return; }
  if (!value || typeof value !== 'object') return;
  const decl = new Map(fields.map((f) => [f.name, expand(f)]));
  for (const [k, v] of Object.entries(value)) {
    const f = decl.get(k);
    if (!f) { bad(`${where}: key "${k}" is in the data but not declared in .pages.yml (it would be lost when saved in the CMS)`); continue; }
    if (f.type === 'block') {
      for (const item of Array.isArray(v) ? v : []) {
        const b = (f.blocks || []).find((x) => x.name === item[f.blockKey || '_block']);
        if (!b) { bad(`${where}.${k}: block type "${item[f.blockKey || '_block']}" is not declared`); continue; }
        covers(Object.fromEntries(Object.entries(item).filter(([kk]) => kk !== (f.blockKey || '_block'))), b.fields || [], `${where}.${k}<${b.name}>`);
      }
    } else if (f.fields) covers(v, f.fields, `${where}.${k}`);
  }
}

const seen = new Set();
for (const c of cfg.content || []) {
  if (seen.has(c.name)) bad(`content "${c.name}" is declared twice`);
  seen.add(c.name);
  if (!c.path || !fs.existsSync(path.join(ROOT, c.path))) { bad(`content "${c.name}": path ${c.path} does not exist`); continue; }
  checkFields(c.fields || [], c.name);
  if (c.type === 'collection') {
    for (const f of fs.readdirSync(path.join(ROOT, c.path)).filter((x) => x.endsWith('.md'))) {
      const fm = matter(fs.readFileSync(path.join(ROOT, c.path, f), 'utf8'));
      covers(fm.data, c.fields, `${c.name}/${f}`);
      if (!(c.fields || []).some((x) => x.name === 'body')) bad(`${c.name}: no "body" field, so the article text would be lost`);
    }
  } else if (c.type === 'file') {
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, c.path), 'utf8'));
    if (c.list === true && !Array.isArray(data)) bad(`${c.name}: list: true but ${c.path} is not an array`);
    if (c.list !== true && Array.isArray(data)) bad(`${c.name}: ${c.path} is an array, set list: true`);
    covers(data, c.fields || [], c.name);
  }
}

if (problems.length) {
  console.error(`.pages.yml: ${problems.length} problem(s)`);
  problems.forEach((p) => console.error(' - ' + p));
  process.exit(1);
}
console.log(`.pages.yml OK: ${media.length} media folders, ${(cfg.content || []).length} content entries`);
