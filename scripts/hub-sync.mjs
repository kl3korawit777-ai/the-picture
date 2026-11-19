/* Project Hub → data/projects.json, at build time.

   Project Hub (github.com/kl3korawit777-ai/project-hub) keeps every project in Supabase, readable only by its owner.
   Its sql/003_public_portfolio.sql adds one public, read-only function, hub_public_projects(), that returns a few safe
   fields (name, tagline, status, tags, dates, web and GitHub links) of the projects tagged "portfolio" in the Hub.

   The build calls that function and merges the result into content/data/projects.json:
   - a Hub project matches a card here by `hub` (the Hub slug), else by the same GitHub link, else by the same web link
   - links (url, github), status and dates come from the Hub; the card's own text (desc, types, thumb) stays as written
     in Pages CMS and the Hub only fills what is empty
   - a "portfolio" project with no card here gets a card from the Hub data and a project page made from
     src/projects/_template.html (its content stays the [ ] placeholders until a real page is written)

   The Hub never stops the build: no settings, no network, the function not created yet or any error = the cards
   are built from content/data/projects.json alone and the build prints a warning.

   Settings: scripts/hub.config.json { "url", "key" } (the Hub's public "publishable" key, the same one its own web page
   uses), overridden by env HUB_URL / HUB_KEY; env HUB_SYNC=off skips the Hub. */
import fs from 'node:fs';

const STATUSES = ['idea', 'planning', 'active', 'paused', 'done'];
const httpsOnly = (u) => (typeof u === 'string' && /^https:\/\/[^\s"'<>]+$/i.test(u.trim()) ? u.trim() : '');
const linkKey = (u) => String(u || '').trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\.git$/, '').replace(/[#?].*$/, '').replace(/\/+$/, '');
const day = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : '');
const slugOf = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
function initials(name) {
  const words = String(name || '').match(/[A-Za-z0-9]+/g) || [];
  if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase();
  if (words.length === 1) return words[0][0].toUpperCase() + (words[0][1] || '').toLowerCase();
  return String(name || '?').trim().charAt(0) || '?';
}

export function hubSettings(configFile) {
  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(configFile, 'utf8')); } catch { /* no file = no Hub */ }
  return { url: (process.env.HUB_URL || cfg.url || '').trim(), key: (process.env.HUB_KEY || cfg.key || '').trim(), off: /^(off|0|false|no)$/i.test(process.env.HUB_SYNC || '') };
}

/** The Hub's public projects, or null (and a reason) when they cannot be read. */
export async function fetchHubProjects({ url, key, off }, timeoutMs = 15000) {
  if (off) return { list: null, why: 'HUB_SYNC=off' };
  if (!url || !key) return { list: null, why: 'no Hub address or key in scripts/hub.config.json' };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url.replace(/\/+$/, '') + '/rest/v1/rpc/hub_public_projects', {
      method: 'POST',
      headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: '{}',
      signal: ctrl.signal,
    });
    if (res.status === 404) return { list: null, why: 'hub_public_projects() not found: run sql/003_public_portfolio.sql in the Hub\'s Supabase project' };
    if (!res.ok) return { list: null, why: `the Hub answered ${res.status}` };
    const data = await res.json();
    return Array.isArray(data) ? { list: data, why: '' } : { list: null, why: 'the Hub answered something that is not a list' };
  } catch (e) {
    return { list: null, why: e.name === 'AbortError' ? 'the Hub did not answer in time' : e.message };
  } finally { clearTimeout(timer); }
}

/** Merge Hub projects into the cards from content/data/projects.json. Returns { list, added, matched }. */
export function mergeHub(local, hub) {
  const list = local.map((p) => ({ ...p }));
  const added = [];
  let matched = 0;
  const taken = new Set(list.map((p) => p.slug));
  for (const h of hub) {
    if (!h || !h.name) continue;
    const gh = httpsOnly(h.github_url).replace(/\.git$/i, ''), web = httpsOnly(h.web_url);
    let p = (h.slug && list.find((x) => x.hub && x.hub === h.slug))
      || (gh && list.find((x) => x.github && linkKey(x.github) === linkKey(gh)))
      || (web && list.find((x) => x.url && linkKey(x.url) === linkKey(web)));
    if (p) matched++;
    else {
      let slug = slugOf(h.slug) || slugOf(h.name) || 'project';
      for (let i = 2; taken.has(slug); i++) slug = (slugOf(h.slug) || 'project') + '-' + i;
      taken.add(slug);
      p = { slug, name: String(h.name), desc_th: '', desc_en: '', types: [], tags: [], url: '', github: '', thumb: initials(h.name), from_hub: true };
      list.push(p); added.push(p);
    }
    p.hub = p.hub || (typeof h.slug === 'string' ? h.slug : '');
    if (web) p.url = web;
    if (gh) p.github = gh;
    if (!String(p.desc_th || '').trim() && typeof h.tagline === 'string') p.desc_th = h.tagline.trim();
    if (!(p.tags && p.tags.length) && Array.isArray(h.tags)) p.tags = h.tags.filter((t) => typeof t === 'string' && t.trim() && t.trim().toLowerCase() !== 'portfolio');
    p.status = STATUSES.includes(h.status) ? h.status : '';
    p.start_date = day(h.start_date);
    p.end_date = day(h.end_date);
    p.updated = day(h.last_update_date) || day(h.updated_at);
  }
  return { list, added, matched };
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A project page for a card that came only from the Hub, made from src/projects/_template.html. */
export function pageFromTemplate(template, p) {
  return template
    .replace(/^(<!doctype html>\s*)<!--[\s\S]*?-->\s*(?=<html)/i, '$1')       /* the "how to use this template" note */
    .replace(/<!-- TEMPLATE-ONLY[^>]*-->\s*\n<meta name="robots" content="noindex">\s*\n/, '')
    .replace(/\[slug\]/g, esc(p.slug))
    .replace(/\[ชื่อโปรเจกต์\]/g, esc(p.name))
    .replace(/\[คำอธิบายสั้น\]/g, esc(p.desc_th || p.name));
}
