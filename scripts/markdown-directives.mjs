/* markdown-it plugin: the short commands an author writes in an article become the site's interactive parts at build time.

     [[key|text]]                       a glossary word: <button class="term" data-term="key">  (the key must exist in content/data/glossary.json)
     {{mech}}                           the CRISPR-Cas9 mechanism diagram: <div data-mech>
     {{figure src="" alt="" caption="" credit=""}}   a <figure> (srcset, width/height, lazy, caption, credit): built by options.figure
     {{duo}} **label** text --- **label** text {{/duo}}   two side-by-side boxes, the sides separated by a line with ---
     | a | b |  (a Markdown table)      wrapped in .table-wrap so it scrolls sideways on a phone
     ## Heading {#id}                   a heading with its own id (for links to it)
     > quote                            the highlighted sentence (.pull)
     a paragraph holding only [ ... ]   a slot waiting for real text (.todo)
     ![alt](file "caption")             a picture alone in its paragraph = the same as {{figure}}

   Usage:  md.use(directives, { glossaryKeys, figure(attrs, env) => html, fatal(env, msg), error(env, msg), warn(env, msg) })
   env is the object passed to md.render(text, env); it needs { slug }. Problems are reported through the callbacks: fatal = always fails the build
   (unknown glossary key, a command that cannot be read), error = fails for a published article only, warn = message only. Nothing here reads files: it is pure text to HTML. */

export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const parseAttrs = (s) => { const o = {}; for (const m of s.matchAll(/(\w+)\s*=\s*"([^"]*)"/g)) o[m[1]] = m[2]; return o; };

export default function directives(md, options) {
  const { glossaryKeys, figure, error, fatal, warn } = options;

  /* [[key|text]]: inside a table cell the bar is written \| */
  md.inline.ruler.before('link', 'tp_term', (state, silent) => {
    const s = state.src, p = state.pos;
    if (s.charCodeAt(p) !== 0x5b || s.charCodeAt(p + 1) !== 0x5b) return false;
    const end = s.indexOf(']]', p + 2); if (end < 0) return false;
    const m = s.slice(p + 2, end).match(/^([a-z0-9_-]+)\\?\|(.+)$/i); if (!m) return false;
    if (!silent) {
      if (!glossaryKeys.has(m[1])) fatal(state.env, `glossary key "${m[1]}" (written [[${m[1]}|${m[2]}]]) is not in content/data/glossary.json`);
      const t = state.push('html_inline', '', 0);
      t.content = `<button type="button" class="term" data-term="${esc(m[1])}">${esc(m[2])}</button>`;
    }
    state.pos = end + 2; return true;
  });

  /* {{mech}}  {{figure ...}}  {{duo}} ... {{/duo}} */
  md.block.ruler.before('fence', 'tp_directive', (state, startLine, endLine, silent) => {
    const pos = state.bMarks[startLine] + state.tShift[startLine], max = state.eMarks[startLine];
    const line = state.src.slice(pos, max).trim();
    if (!line.startsWith('{{')) return false;
    const m = line.match(/^\{\{\s*(\/?\w+)([^}]*)\}\}$/);
    if (!m) { fatal(state.env, `cannot read the command "${line.slice(0, 60)}" (a {{ }} command sits alone on its line, e.g. {{mech}})`); return false; }
    const [, name, rest] = m, env = state.env;
    if (name === 'mech') {
      if (silent) return true;
      state.push('html_block', '', 0).content = '<div data-mech></div>\n';
      state.line = startLine + 1; return true;
    }
    if (name === 'figure') {
      if (silent) return true;
      state.push('html_block', '', 0).content = figure(parseAttrs(rest), env);
      state.line = startLine + 1; return true;
    }
    if (name === 'duo') {
      let close = -1;
      for (let l = startLine + 1; l < endLine; l++) {
        if (state.src.slice(state.bMarks[l] + state.tShift[l], state.eMarks[l]).trim() === '{{/duo}}') { close = l; break; }
      }
      if (close < 0) { fatal(env, '{{duo}} has no {{/duo}}'); return false; }
      if (silent) return true;
      const inner = state.getLines(startLine + 1, close, state.blkIndent, false);
      const sides = inner.split(/\n\s*---\s*\n/);
      if (sides.length !== 2) error(env, '{{duo}} needs exactly two sides separated by a line with ---');
      const html = sides.map((side, i) => {
        const lines = side.trim().split('\n');
        const lm = lines[0].match(/^\*\*(.+)\*\*$/);
        if (!lm) error(env, 'each {{duo}} side starts with a **label** line');
        const label = lm ? md.renderInline(lm[1], env) : '';
        const body = md.render((lm ? lines.slice(1) : lines).join('\n'), env);
        return `<div><span class="label${i === 0 ? ' accent' : ''}">${label}</span>${body.trim()}</div>`;
      }).join('\n');
      state.push('html_block', '', 0).content = `<div class="duo">\n${html}\n</div>\n`;
      state.line = close + 1; return true;
    }
    fatal(env, `unknown command {{${name}}} (use mech, figure, duo)`);
    return false;
  });

  /* heading {#id}, paragraphs inside a quote, a picture alone in its paragraph */
  md.core.ruler.push('tp_post', (state) => {
    const t = state.tokens, env = state.env;
    let inQuote = 0;
    for (let i = 0; i < t.length; i++) {
      const tok = t[i];
      if (tok.type === 'blockquote_open') inQuote++;
      else if (tok.type === 'blockquote_close') inQuote--;
      else if (inQuote && (tok.type === 'paragraph_open' || tok.type === 'paragraph_close')) tok.hidden = true;
      if (tok.type === 'heading_open') {
        if (tok.tag === 'h1') warn(env, '"# " heading in the text: use ## and ### (the page title is the front matter title)');
        const inl = t[i + 1];
        const m = inl.content.match(/\s*\{#([A-Za-z0-9_-]+)\}\s*$/);
        if (m) {
          tok.attrSet('id', m[1]);
          inl.content = inl.content.replace(m[0], '');
          const last = inl.children[inl.children.length - 1];
          if (last && last.type === 'text') last.content = last.content.replace(/\s*\{#[A-Za-z0-9_-]+\}\s*$/, '');
          env.ids = env.ids || new Set();
          if (env.ids.has(m[1])) error(env, `heading id "${m[1]}" is used twice`);
          env.ids.add(m[1]);
        }
      }
      if (tok.type === 'paragraph_open' && t[i + 1] && t[i + 1].type === 'inline') {
        const ch = t[i + 1].children;
        if (ch.length === 1 && ch[0].type === 'image') {
          const im = ch[0];
          const html = new state.Token('html_block', '', 0);
          html.content = figure({ src: im.attrGet('src'), alt: im.content, caption: im.attrGet('title') || '' }, env);
          t.splice(i, 3, html);
        }
      }
    }
  });

  const r = md.renderer.rules;
  r.blockquote_open = () => '<blockquote class="pull">';
  r.table_open = () => '<div class="table-wrap">\n<table>\n';        /* .table-wrap scrolls sideways on a phone (see style.css) */
  r.table_close = () => '</table>\n</div>\n';
  r.th_open = () => '<th scope="col">';
  const para = r.paragraph_open || ((tokens, idx, o, e, self) => self.renderToken(tokens, idx, o));
  r.paragraph_open = (tokens, idx, o, env, self) => {
    const inl = tokens[idx + 1];
    if (!tokens[idx].hidden && inl && /^\[[^\[\]]*\]$/.test(inl.content.trim())) return '<p class="todo">';
    return para(tokens, idx, o, env, self);
  };
  const link = r.link_open || ((tokens, idx, o, e, self) => self.renderToken(tokens, idx, o));
  r.link_open = (tokens, idx, o, env, self) => {
    const href = tokens[idx].attrGet('href') || '';
    if (/^https?:\/\//i.test(href)) { tokens[idx].attrSet('target', '_blank'); tokens[idx].attrSet('rel', 'noopener'); }
    return link(tokens, idx, o, env, self);
  };
  const image = r.image;
  r.image = (tokens, idx, o, env, self) => {
    if (!tokens[idx].content) error(env, 'a picture has no alt text');
    return image(tokens, idx, o, env, self);
  };
}
