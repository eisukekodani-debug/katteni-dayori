/* 意見カードの絵を描く（インタビュー画面と「AIインタビュー」ページで共通） */
var CATCH = '選挙の日じゃなくても、町は動かせる。';

// インタビューのテーマごとに、カードの題名と上の写真を変える。テーマを増やすときはここに足す
var THEMES = {
  gikai: { title: '大山町議会について', photo: '/interview/daisen.jpg' }
};

// ニックネームが空欄のときに付ける名前（「匿名」ばかりにならないように）
var NICKS = ['大山ブロッコリー', '白ねぎ', '二十世紀梨', '大山スイカ', '牛乳びん', '大山おこわ', '新米', '朝霧',
  '日本海の夕日', '雪どけ水', '田んぼのカエル', '海辺のカモメ', '柿の木', '菜の花', '山の湧き水', '秋の紅葉'];
function randomNick() { return NICKS[Math.floor(Math.random() * NICKS.length)]; }

function wrap(ctx, text, width) {
  // 文節に近いまとまりで改行する。ひらがな・小さい字・句読点は前の語にくっつけ、
  // 漢字・カタカナの頭か、読点のあとでだけ区切る（使えない環境では1文字ずつ）
  var segs = window.Intl && Intl.Segmenter
    ? Array.from(new Intl.Segmenter('ja', { granularity: 'word' }).segment(text), function (s) { return s.segment; })
    : text.split('');
  var parts = [];
  segs.forEach(function (g) {
    var prev = parts[parts.length - 1];
    if (prev && /^[ぁ-ゖー、。」』）！？・]/.test(g) && !/[、。]$/.test(prev)) parts[parts.length - 1] = prev + g;
    else parts.push(g);
  });
  var out = [], cur = '', last = '';
  parts.forEach(function (p) {
    if (ctx.measureText(cur + p).width <= width || !cur || /^[、。」』）！？ー]/.test(p)) { cur += p; last = p; return; }
    // 「と」「が」などの助詞で行が始まらないよう、直前の語ごと次の行へ送る
    if (/^(と|が|の|を|に|は|も|で|へ|や|だ|た|いる|いた|います|ます|です|ない)$/.test(p) && last && cur.length > last.length) {
      out.push(cur.slice(0, cur.length - last.length)); cur = last + p; last = p; return;
    }
    out.push(cur); cur = p; last = p;
  });
  if (cur) out.push(cur);
  // 1語が長すぎて枠からはみ出す行は、1文字ずつ折り返す
  return out.reduce(function (acc, row) {
    if (ctx.measureText(row).width <= width * 1.04) { acc.push(row); return acc; }
    var c = '';
    row.split('').forEach(function (ch) {
      // 小さい「っ」や句読点で行が始まらないようにする
      if (ctx.measureText(c + ch).width > width && c && !/[っゃゅょぁぃぅぇぉッャュョー、。」』）]/.test(ch)) { acc.push(c); c = ch; } else c += ch;
    });
    if (c) acc.push(c);
    return acc;
  }, []);
}

// カード上部の大山（daisen.jpg：元写真の y=560〜1080 を切り抜いたもの）
function drawDaisen(x, bx, by, bw, bh, photo) {
  x.fillStyle = '#CFE6EA'; x.fillRect(bx, by, bw, bh);
  if (!photo || !photo.naturalWidth) return;
  var sh = photo.naturalWidth * bh / bw; // 縦横の比率を保って切り出す
  var sy = Math.min(photo.naturalHeight - sh, photo.naturalHeight * 0.2);
  x.drawImage(photo, 0, sy, photo.naturalWidth, sh, bx, by, bw, bh);
}

function roundRect(x, l, t, w, h, r) {
  x.beginPath();
  x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r);
  x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath();
}

// カードの似顔絵（10種類）。丸の中に、顔と肩だけの簡単な絵。
// 古いカードの値（m＝男性、f＝女性、空＝どちらでもない）は、1・2・9番の絵として描く
var AVATARS = {
  1: { bg: '#DCE7EF', cloth: '#3F6274', hair: '#3B2F2A', style: 'short' },
  2: { bg: '#F4E1DA', cloth: '#B4654F', hair: '#3B2F2A', style: 'long' },
  3: { bg: '#DDEBDD', cloth: '#4E6E4A', hair: '#2E2622', style: 'short', glasses: true },
  4: { bg: '#F5EBC8', cloth: '#B98A2E', hair: '#6B4A33', style: 'bob' },
  5: { bg: '#EDE4D6', cloth: '#7A5C44', hair: '#B9B5AE', style: 'bald', glasses: true },
  6: { bg: '#E7E0EF', cloth: '#6E5A86', hair: '#C9C5C0', style: 'perm' },
  7: { bg: '#D9EEEA', cloth: '#2F7F78', hair: '#5A3E2B', style: 'pony' },
  8: { bg: '#F7E2CC', cloth: '#6B7342', hair: '#3B2F2A', style: 'cap', capColor: '#D9822B' },
  9: { bg: '#E6E6E1', cloth: '#7C8288', hair: '#9AA0A6', style: 'plain' },
  10: { bg: '#DFE3E8', cloth: '#3C4148', hair: '#A8A7A3', style: 'short', beard: true }
};
var AVATAR_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
function avatarKey(v) {
  v = String(v == null ? '' : v);
  if (v === 'm') return '1';
  if (v === 'f') return '2';
  return AVATARS[v] ? v : '9';
}

function drawAvatar(x, cx, cy, r, key, ring) {
  var a = AVATARS[avatarKey(key)], skin = '#F2D3B8', u = r / 56;
  function ell(px, py, rx, ry, s0, s1) { x.beginPath(); x.ellipse(cx + px * u, cy + py * u, rx * u, ry * u, 0, s0 || 0, s1 || Math.PI * 2); x.closePath(); x.fill(); }
  x.save();
  x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.clip();
  x.fillStyle = a.bg; x.fillRect(cx - r, cy - r, r * 2, r * 2);
  x.fillStyle = a.hair; // 後ろ髪
  if (a.style === 'long') ell(0, 2, 31, 38);
  if (a.style === 'bob') { ell(0, -2, 30, 30); x.fillRect(cx - 30 * u, cy - 2 * u, 60 * u, 16 * u); }
  if (a.style === 'pony') { ell(27, -2, 9, 18); }
  x.fillStyle = a.cloth; ell(0, 62, 44, 34);
  x.fillStyle = skin; x.fillRect(cx - 8 * u, cy + 14 * u, 16 * u, 16 * u);
  x.beginPath(); x.arc(cx, cy - 4 * u, 23 * u, 0, Math.PI * 2); x.fill();
  x.fillStyle = a.hair; // 前髪・帽子
  if (a.style === 'short') ell(0, -12, 25, 18, Math.PI, Math.PI * 2);
  if (a.style === 'long' || a.style === 'pony') ell(0, -12, 25, 20, Math.PI, Math.PI * 2);
  if (a.style === 'bob') { ell(0, -12, 26, 20, Math.PI, Math.PI * 2); }
  if (a.style === 'plain') ell(0, -14, 24, 15, Math.PI, Math.PI * 2);
  if (a.style === 'bald') { ell(-22, -4, 5, 9); ell(22, -4, 5, 9); }
  if (a.style === 'perm') { [-20, -10, 0, 10, 20].forEach(function (dx, i) { x.beginPath(); x.arc(cx + dx * u, cy - (i % 4 ? 24 : 18) * u, 10 * u, 0, Math.PI * 2); x.fill(); }); }
  if (a.style === 'cap') {
    ell(0, -12, 25, 18, Math.PI, Math.PI * 2);
    x.fillStyle = a.capColor; ell(0, -16, 25, 17, Math.PI, Math.PI * 2);
    x.fillRect(cx - 25 * u, cy - 17 * u, 42 * u, 5 * u); ell(14, -14, 20, 4);
  }
  if (a.beard) { x.fillStyle = a.hair; ell(0, 9, 17, 11, 0, Math.PI); }
  x.fillStyle = '#3B2F2A';
  x.beginPath(); x.arc(cx - 8 * u, cy - 2 * u, 2.4 * u, 0, Math.PI * 2); x.arc(cx + 8 * u, cy - 2 * u, 2.4 * u, 0, Math.PI * 2); x.fill();
  if (a.glasses) {
    x.strokeStyle = '#3B2F2A'; x.lineWidth = 1.6 * u;
    x.beginPath(); x.arc(cx - 8 * u, cy - 2 * u, 6.5 * u, 0, Math.PI * 2); x.stroke();
    x.beginPath(); x.arc(cx + 8 * u, cy - 2 * u, 6.5 * u, 0, Math.PI * 2); x.stroke();
    x.beginPath(); x.moveTo(cx - 1.5 * u, cy - 2 * u); x.lineTo(cx + 1.5 * u, cy - 2 * u); x.stroke();
  }
  x.strokeStyle = a.beard ? '#FFFFFF' : '#B5715A'; x.lineWidth = 2 * u; x.lineCap = 'round';
  x.beginPath(); x.arc(cx, cy + 4 * u, 6 * u, 0.2 * Math.PI, 0.8 * Math.PI); x.stroke();
  x.restore();
  if (ring !== false) { x.strokeStyle = '#FFFFFF'; x.lineWidth = 6; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.stroke(); }
}

function drawCard(ls, nick, av, themeKey) {
  var theme = THEMES[themeKey] || THEMES.gikai;
  var W = 1080, H = 1080, PAD = 90;
  var c = document.createElement('canvas');
  c.width = W; c.height = H;
  var x = c.getContext('2d');
  var qr = new Image();
  var photo = new Image();
  var photoReady = new Promise(function (ok) { photo.onload = ok; photo.onerror = ok; });
  photo.src = theme.photo;
  var qrReady = new Promise(function (ok) { qr.onload = ok; qr.onerror = ok; });
  qr.src = '/line-qr.svg';
  var fonts = document.fonts ? Promise.all([
    document.fonts.load('800 48px "Shippori Mincho B1"'),
    document.fonts.load('700 30px "Zen Kaku Gothic New"')
  ]).catch(function () {}) : Promise.resolve();

  return Promise.all([qrReady, photoReady, fonts]).then(function () {
    var M = '"Shippori Mincho B1","Hiragino Mincho ProN",serif';
    var G = '"Zen Kaku Gothic New","Hiragino Sans",sans-serif';
    x.fillStyle = '#FAF8F3'; x.fillRect(0, 0, W, H);
    // ── 上：写真（テーマの風景）
    var BAND = 220;
    drawDaisen(x, 50, 50, W - 100, BAND - 50, photo);
    x.strokeStyle = '#222'; x.lineWidth = 3; x.strokeRect(40, 40, W - 80, H - 80);
    x.lineWidth = 1; x.strokeRect(50, 50, W - 100, H - 100);
    x.textBaseline = 'top';

    // ── 人：似顔絵を写真の下端に重ね、その下にお名前
    var AR = 86, AX = PAD + 110, AY = BAND;
    drawAvatar(x, AX, AY, AR, av);
    var nm = nick || '匿名', ns = 32;
    for (; ns > 20; ns -= 2) { x.font = '800 ' + ns + 'px ' + G; if (x.measureText(nm).width <= 250) break; }
    x.textAlign = 'center'; x.fillStyle = '#222'; x.fillText(nm, AX, AY + AR + 14); x.textAlign = 'left';

    // ── 似顔絵の右：インタビューのテーマ
    var TX = AX + AR + 64;
    x.fillStyle = '#6B6B6B'; x.font = '700 22px ' + G; x.fillText('インタビューのテーマ', TX, AY + 30);
    var ts = 40;
    for (; ts > 26; ts -= 2) { x.font = '800 ' + ts + 'px ' + M; if (x.measureText(theme.title).width <= W - PAD - TX) break; }
    x.fillStyle = '#222'; x.fillText(theme.title, TX, AY + 64);

    // ── 見出し「わたしの意見」と、その下に3行。上の段と詰まらないよう、残りの高さの中で上下にゆとりを配る
    var AREA_T = 380, AREA_B = 920, HEAD = 56, size = 44, gap = 18, blocks, rows;
    for (; size >= 28; size -= 2) {
      x.font = '700 ' + size + 'px ' + M;
      blocks = ls.map(function (l) { return wrap(x, l, W - PAD * 2 - 48); });
      rows = blocks.reduce(function (n, b) { return n + b.length; }, 0);
      if (HEAD + rows * size * 1.5 + (blocks.length - 1) * gap * 2 <= AREA_B - AREA_T) break;
    }
    var spare = AREA_B - AREA_T - (HEAD + rows * size * 1.5 + (blocks.length - 1) * gap * 2);
    if (spare > 0 && blocks.length > 1) { var add = Math.min(14, spare / 3 / (blocks.length - 1)); gap += add; spare -= add * 2 * (blocks.length - 1); }
    var HY = AREA_T + Math.max(0, spare) * 0.45;

    x.fillStyle = '#3F6274'; x.font = '800 32px ' + M; x.fillText('わたしの意見', PAD, HY);
    var hw = x.measureText('わたしの意見').width;
    x.strokeStyle = '#3F6274'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(PAD + hw + 20, HY + 18); x.lineTo(W - PAD, HY + 18); x.stroke();

    var y = HY + HEAD;
    blocks.forEach(function (b, i) {
      x.fillStyle = '#3F6274'; x.fillRect(PAD, y + size * 0.45, 18, 18);
      x.fillStyle = '#222'; x.font = '700 ' + size + 'px ' + M;
      b.forEach(function (row) { x.fillText(row, PAD + 48, y); y += size * 1.5; });
      if (i < blocks.length - 1) {
        x.strokeStyle = '#DDD7CB'; x.lineWidth = 2;
        x.beginPath(); x.moveTo(PAD + 48, y + gap - 8); x.lineTo(W - PAD, y + gap - 8); x.stroke();
        y += gap * 2;
      }
    });

    // ── 下：合言葉と公式LINE（意見を大きく見せるため、小さく1段に）
    x.strokeStyle = '#222'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(PAD, 938); x.lineTo(W - PAD, 938); x.stroke();
    x.fillStyle = '#6B6B6B'; x.font = '700 18px ' + G;
    x.fillText('AIインタビューに答えて、まとめた意見です　公式LINE「議員定数削減の署名活動」', PAD, 952);
    x.fillStyle = '#222'; x.font = '800 26px ' + M; x.fillText(CATCH, PAD, 980);
    if (qr.naturalWidth) { x.fillStyle = '#fff'; x.fillRect(W - PAD - 80, 946, 80, 80); x.drawImage(qr, W - PAD - 76, 950, 72, 72); }
    return c.toDataURL('image/png');
  });
}

