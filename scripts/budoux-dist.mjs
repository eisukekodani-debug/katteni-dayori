// ビルド後のページに、文節の区切りで改行の目印（<wbr>）を入れる。
// スマホで「とい／う」のように単語の途中で折り返さないようにするため（iPhoneのSafariでも効く）。
// CSS 側で body に word-break: keep-all を指定し、<wbr> の位置だけで改行させる。
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadDefaultJapaneseParser } from 'budoux';

const parser = loadDefaultJapaneseParser();
const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

// 中身に手を入れないタグ
const SKIP = new Set(['script', 'style', 'textarea', 'pre', 'code', 'title', 'svg', 'option']);
const JA = /[぀-ヿ㐀-鿿]/;

function addWbr(text) {
  if (!JA.test(text)) return text;
  // &amp; などの文字参照は分けない
  return text.split(/(&[#a-zA-Z0-9]+;)/).map((part) => {
    if (part.startsWith('&') || !JA.test(part)) return part;
    return parser.parse(part).join('<wbr>');
  }).join('');
}

function processHtml(html) {
  const start = html.indexOf('<body');
  if (start < 0) return html;
  const head = html.slice(0, start);
  const parts = html.slice(start).split(/(<[^>]*>)/);
  const stack = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p.startsWith('<')) {
      const m = p.match(/^<\/?([a-zA-Z0-9-]+)/);
      if (!m) continue;
      const tag = m[1].toLowerCase();
      if (!SKIP.has(tag)) continue;
      if (p.startsWith('</')) { if (stack[stack.length - 1] === tag) stack.pop(); }
      else if (!p.endsWith('/>')) stack.push(tag);
      continue;
    }
    if (stack.length === 0 && p) parts[i] = addWbr(p);
  }
  // 1行で見せたい部分（サイト名・意図して改行させない語句）からは目印を外す
  return head + parts.join('')
    .replace(/(<span class="(?:logo-main|logo-place|logo-katte|nw)[^"]*">)([\s\S]*?)(<\/span>)/g, (m, a, b, c) => a + b.replace(/<wbr>/g, '') + c);
}

let n = 0;
for (const f of walk('dist')) {
  if (!f.endsWith('.html')) continue;
  // 独自に作り込んだ静的ページ（AIインタビューの画面など）は対象外
  if (/dist\/(interview|share)\//.test(f)) continue;
  const src = readFileSync(f, 'utf8');
  const out = processHtml(src);
  if (out !== src) { writeFileSync(f, out); n++; }
}
console.log(`文節の改行目印を入れたページ: ${n}`);
