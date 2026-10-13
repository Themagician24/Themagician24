// Génère assets/snake-letters.svg : un vrai mini-jeu de snake en SVG animé (sans JavaScript).
// Le serpent chasse uniquement les lettres de « JEFF BIZO THEMAGICIAN24 » dans l'ordre.
// Chaque lettre mangée quitte la grille et devient un anneau du serpent : son corps
// épelle le nom. À la fin, il s'aligne au centre et le nom se lit sur son corps.
// Usage : node scripts/snake-letters.mjs
import { writeFileSync } from 'node:fs';

// ─── Réglages ────────────────────────────────────────────────────────────────
const COLS = 40;
const ROWS = 7;
const CELL = 26;
const STEP = 0.12;          // secondes par case (plus grand = plus lent)
const POINTS = 100;         // points par lettre
const SEED = 24;            // change la disposition des lettres

const WORDS = [
  { text: 'JEFFBIZO', label: 'JEFF BIZO', color: '#30D158' },
  { text: 'THEMAGICIAN24', label: 'THEMAGICIAN 24', color: '#FFD60A' },
];

const C = {
  bg: '#1D1D1F',
  line: '#2C2C2E',
  filler: '#48484A',
  target: '#F5F5F7',
  muted: '#8E8E93',
  text: '#F5F5F7',
  ink: '#1D1D1F',
  snake: '#FF453A',
};

// ─── Géométrie ───────────────────────────────────────────────────────────────
const W = 1200;
const HUD = 64;
const GRID_Y = HUD + 20;
const PAD_X = (W - COLS * CELL) / 2;
const SLOTS_Y = GRID_Y + ROWS * CELL + 46;
const H = SLOTS_Y + 34;
const FINAL_ROW = 3;
const cx = (c) => PAD_X + c * CELL + CELL / 2;
const cy = (r) => GRID_Y + r * CELL + CELL / 2;

// Générateur pseudo-aléatoire déterministe : même rendu à chaque génération
let seed = SEED;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

// ─── Placement des lettres à chasser ─────────────────────────────────────────
const targets = [];
WORDS.forEach((w, wi) => [...w.text].forEach((ch) => targets.push({ ch, color: w.color, word: wi })));
const taken = new Set();
let prev = [FINAL_ROW, 0];
targets.forEach((tg, k) => {
  const col = Math.round(2 + (k * (COLS - 5)) / (targets.length - 1));
  let row;
  do { row = Math.floor(rand() * ROWS); }
  while (taken.has(`${row},${col}`) || Math.abs(row - prev[0]) + Math.abs(col - prev[1]) < 3);
  taken.add(`${row},${col}`);
  tg.r = row; tg.c = col;
  prev = [row, col];
});

// ─── Trajet case par case (déplacements en L, comme au snake) ────────────────
const path = [[FINAL_ROW, 0]];
function go(r, c, horizontalFirst) {
  const step = (dr, dc) => { const [pr, pc] = path[path.length - 1]; path.push([pr + dr, pc + dc]); };
  const moveH = () => { while (path[path.length - 1][1] !== c) step(0, Math.sign(c - path[path.length - 1][1])); };
  const moveV = () => { while (path[path.length - 1][0] !== r) step(Math.sign(r - path[path.length - 1][0]), 0); };
  if (horizontalFirst) { moveH(); moveV(); } else { moveV(); moveH(); }
}
targets.forEach((tg) => { go(tg.r, tg.c, rand() < 0.5); tg.i = path.length - 1; });
// Sortie : bord droit, puis grande ligne droite vers la gauche sur la ligne centrale
const BODY = targets.length + 1;
const HEAD_END = Math.floor((COLS - BODY) / 2);
go(FINAL_ROW, COLS - 1, true);
go(FINAL_ROW, HEAD_END, true);

const N = path.length;
const TRAVEL = (N - 1) * STEP;
const REVEAL = TRAVEL + 0.35;              // le serpent s'arrête, le nom se lit
const WAVE = 0.07;
const FINALE = REVEAL + BODY * WAVE + 0.9; // le nom s'affiche en grand
const TOTAL = FINALE + 4.5;
targets.forEach((tg) => { tg.t = tg.i * STEP; });

const kt = (t) => (Math.min(Math.max(t, 0), TOTAL) / TOTAL).toFixed(4);
const loop = `dur="${TOTAL.toFixed(3)}s" repeatCount="indefinite"`;
const anim = (attr, values, times, extra = '') =>
  `<animate attributeName="${attr}" values="${values.join(';')}" keyTimes="${times.map(kt).join(';')}" ${loop}${extra}/>`;
const tr = (type, values, times) =>
  `<animateTransform attributeName="transform" type="${type}" values="${values.join(';')}" keyTimes="${times.map(kt).join(';')}" ${loop}/>`;
const pathD = path.map(([r, c], i) => `${i ? 'L' : 'M'}${cx(c)} ${cy(r)}`).join(' ');

// ─── Grille : lettres de décor + lettres à chasser ───────────────────────────
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const targetAt = new Map(targets.map((tg) => [`${tg.r},${tg.c}`, tg]));
let filler = '';
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    if (targetAt.has(`${r},${c}`)) continue;
    filler += `<text x="${cx(c)}" y="${cy(r) + 5}">${ALPHABET[Math.floor(rand() * 26)]}</text>`;
  }
}

let food = '';
let fx = '';
targets.forEach((tg, k) => {
  const x = cx(tg.c);
  const y = cy(tg.r);
  const t = tg.t;
  // La lettre clignote doucement tant qu'elle n'est pas mangée, puis disparaît d'un coup
  food += `<g transform="translate(${x} ${y})"><text y="5" class="food">${tg.ch}` +
    anim('opacity', [1, 1, 0, 0, 1], [0, t, t + 0.01, TOTAL - 0.01, TOTAL]) +
    tr('scale', [1, 1, 1.6, 1.6, 1], [0, t - 0.06, t, TOTAL - 0.01, TOTAL]) + `</text></g>`;
  // Onde de choc
  fx += `<circle cx="${x}" cy="${y}" r="6" fill="none" stroke="${tg.color}" stroke-width="2" opacity="0">` +
    anim('r', [6, 6, 6, 28, 28], [0, t, t + 0.01, t + 0.5, TOTAL]) +
    anim('opacity', [0, 0, 0.9, 0, 0], [0, t, t + 0.01, t + 0.5, TOTAL]) + `</circle>`;
  // Éclats : 8 particules projetées en étoile
  for (let p = 0; p < 8; p++) {
    const a = (p / 8) * Math.PI * 2 + k;
    const dx = (Math.cos(a) * 26).toFixed(1);
    const dy = (Math.sin(a) * 26).toFixed(1);
    fx += `<rect x="${x - 2}" y="${y - 2}" width="4" height="4" rx="1" fill="${tg.color}" opacity="0">` +
      anim('opacity', [0, 0, 1, 0, 0], [0, t, t + 0.01, t + 0.45, TOTAL]) +
      tr('translate', ['0 0', '0 0', `${dx} ${dy}`, `${dx} ${dy}`], [0, t, t + 0.45, TOTAL]) + `</rect>`;
  }
  // « +100 » qui s'envole
  fx += `<text x="${x}" y="${y - 16}" class="pts" fill="${tg.color}" opacity="0">+${POINTS}` +
    anim('opacity', [0, 0, 1, 0, 0], [0, t, t + 0.02, t + 0.8, TOTAL]) +
    tr('translate', ['0 0', '0 0', '0 -20', '0 -20'], [0, t, t + 0.8, TOTAL]) + `</text>`;
});

// Viseur : encadre la prochaine lettre à attraper
const corner = 15;
const L = 6;
const reticlePath = [[-1, -1], [1, -1], [1, 1], [-1, 1]]
  .map(([sx, sy]) => `M${sx * corner} ${sy * (corner - L)} L${sx * corner} ${sy * corner} L${sx * (corner - L)} ${sy * corner}`)
  .join(' ');
const reticle = `<path d="${reticlePath}" fill="none" stroke="${C.snake}" stroke-width="2" stroke-linecap="round">` +
  `<animateTransform attributeName="transform" type="translate" calcMode="discrete" ` +
  `values="${targets.map((tg) => `${cx(tg.c)} ${cy(tg.r)}`).join(';')}" ` +
  `keyTimes="${[0, ...targets.slice(0, -1).map((tg) => tg.t)].map(kt).join(';')}" ${loop}/>` +
  anim('opacity', [1, 1, 0, 0, 1], [0, targets.at(-1).t, targets.at(-1).t + 0.01, TOTAL - 0.01, TOTAL]) +
  `<animate attributeName="stroke-opacity" values="1;0.35;1" dur="0.8s" repeatCount="indefinite"/></path>`;

// ─── Serpent : la tête, puis un anneau-lettre par lettre mangée ──────────────
// Chaque anneau suit la tête avec un décalage d'une case et s'arrête avec elle.
const motion = (k) =>
  `<animateMotion path="${pathD}" ${loop} calcMode="linear" ` +
  `keyPoints="0;0;${((N - 1 - k) / (N - 1)).toFixed(4)};${((N - 1 - k) / (N - 1)).toFixed(4)}" ` +
  `keyTimes="0;${kt(k * STEP)};${kt(TRAVEL)};1"/>`;
const hide = (from) => anim('opacity', [0, 0, 1, 1, 0, 0], [0, from, from + 0.01, FINALE, FINALE + 0.4, TOTAL]);

let snake = '';
for (let k = targets.length; k >= 1; k--) {
  const tg = targets[k - 1];
  const pop = REVEAL + k * WAVE;
  snake += `<g class="seg" opacity="0">${motion(k)}${hide(tg.t)}` +
    `<g>${tr('scale', [1, 1, 1.35, 1, 1.3, 1, 1], [0, tg.t, tg.t + 0.08, tg.t + 0.2, pop, pop + 0.18, TOTAL])}` +
    `<rect x="-11" y="-11" width="22" height="22" rx="5" fill="${tg.color}"/>` +
    `<text y="5" class="seg-t">${tg.ch}</text></g></g>`;
}
// Tête : yeux orientés dans le sens de la marche, « croque » à chaque lettre
const chomp = targets.flatMap((tg) => [tg.t - 0.04, tg.t + 0.04, tg.t + 0.12]);
const chompV = targets.flatMap(() => [1, 1.3, 1]);
snake += `<g class="seg">${motion(0).replace('calcMode="linear"', 'calcMode="linear" rotate="auto"')}` +
  anim('opacity', [1, 1, 0, 0, 1], [0, FINALE, FINALE + 0.4, TOTAL - 0.01, TOTAL]) +
  `<g>${tr('scale', [1, ...chompV, 1], [0, ...chomp, TOTAL])}` +
  `<rect x="-12" y="-12" width="24" height="24" rx="7" fill="${C.snake}"/>` +
  `<circle cx="5" cy="-5" r="3" fill="${C.ink}"/><circle cx="5" cy="5" r="3" fill="${C.ink}"/>` +
  `<circle cx="6" cy="-6" r="1" fill="${C.text}"/><circle cx="6" cy="4" r="1" fill="${C.text}"/></g></g>`;

// ─── HUD : score, lettres, record, progression ───────────────────────────────
const stateText = (x, anchor, label, value, valueColor) => {
  let out = '';
  for (let k = 0; k <= targets.length; k++) {
    const from = k === 0 ? 0 : targets[k - 1].t;
    const last = k === targets.length;
    const values = last ? [0, 1] : k === 0 ? [1, 0] : [0, 1, 0];
    const times = last ? [0, from] : k === 0 ? [0, targets[0].t] : [0, from, targets[k].t];
    out += `<text x="${x}" y="40" class="hud" text-anchor="${anchor}" opacity="${k === 0 ? 1 : 0}">${label} ` +
      `<tspan fill="${valueColor}">${value(k)}</tspan>` +
      `<animate attributeName="opacity" values="${values.join(';')}" keyTimes="${times.map(kt).join(';')}" ${loop} calcMode="discrete"/></text>`;
  }
  return out;
};
const score = stateText(PAD_X, 'start', 'SCORE', (k) => String(k * POINTS).padStart(5, '0'), C.text);
const counter = stateText(W / 2, 'middle', 'LETTRES', (k) => `${String(k).padStart(2, '0')}/${targets.length}`, C.text);
const record = `<text x="${W - PAD_X}" y="40" class="hud" text-anchor="end">RECORD <tspan fill="${WORDS[1].color}">${String(targets.length * POINTS).padStart(5, '0')}</tspan></text>`;
const barW = COLS * CELL;
const progress = `<rect x="${PAD_X}" y="${HUD - 6}" width="${barW}" height="3" rx="1.5" fill="${C.line}"/>` +
  `<rect x="${PAD_X}" y="${HUD - 6}" width="0" height="3" rx="1.5" fill="${C.snake}">` +
  `<animate attributeName="width" calcMode="discrete" values="${[0, ...targets.map((_, k) => ((k + 1) / targets.length) * barW)].join(';')}" ` +
  `keyTimes="${[0, ...targets.map((tg) => tg.t)].map(kt).join(';')}" ${loop}/></rect>`;

// Bannière quand un mot est complet
let banners = '';
WORDS.forEach((w, wi) => {
  const lastOfWord = targets.filter((tg) => tg.word === wi).at(-1);
  const t = lastOfWord.t + 0.15;
  banners += `<g transform="translate(${W / 2} ${GRID_Y - 6})"><text class="banner" fill="${w.color}" opacity="0">MOT ${wi + 1} · ${w.label} ✓` +
    anim('opacity', [0, 0, 1, 1, 0, 0], [0, t, t + 0.1, t + 1.3, t + 1.6, TOTAL]) +
    tr('scale', [0.7, 0.7, 1.1, 1, 1], [0, t, t + 0.15, t + 0.3, TOTAL]) + `</text></g>`;
});

// Inventaire : les lettres collectées se remplissent en bas
const slotText = 'JEFF BIZO  THEMAGICIAN24';
const SLOT = 30;
const slotStart = W / 2 - ((slotText.length - 1) * SLOT) / 2;
let slots = '';
let s = 0;
[...slotText].forEach((ch, i) => {
  if (ch === ' ') return;
  const x = slotStart + i * SLOT;
  const tg = targets[s++];
  slots += `<rect x="${x - 10}" y="${SLOTS_Y + 8}" width="20" height="2" rx="1" fill="${C.line}"/>`;
  slots += `<g transform="translate(${x} ${SLOTS_Y})"><text class="slot" fill="${tg.color}" opacity="0">${ch}` +
    `<animate attributeName="opacity" values="0;1" keyTimes="0;${kt(tg.t)}" ${loop} calcMode="discrete"/>` +
    tr('scale', [1, 1, 1.5, 1, 1], [0, tg.t, tg.t + 0.1, tg.t + 0.25, TOTAL]) + `</text></g>`;
});

// ─── Secousse d'écran à chaque mot complété ──────────────────────────────────
const shakeTimes = [0];
const shakeValues = ['0 0'];
WORDS.forEach((_, wi) => {
  const t = targets.filter((tg) => tg.word === wi).at(-1).t;
  [['0 0', 0], ['-4 2', 0.04], ['4 -2', 0.08], ['-3 -1', 0.12], ['2 2', 0.16], ['0 0', 0.2]]
    .forEach(([v, d]) => { shakeValues.push(v); shakeTimes.push(t + d); });
});
shakeValues.push('0 0'); shakeTimes.push(TOTAL);
const shake = tr('translate', shakeValues, shakeTimes);

// ─── Écran final ─────────────────────────────────────────────────────────────
const midY = cy(FINAL_ROW);
const fadeGrid = anim('opacity', [1, 1, 0.07, 0.07, 1], [0, REVEAL - 0.2, REVEAL + 0.3, TOTAL - 0.3, TOTAL]);
const flash = `<rect width="${W}" height="${H}" rx="28" fill="${C.text}" opacity="0">` +
  anim('opacity', [0, 0, 0.16, 0, 0, 0.12, 0, 0], [0, REVEAL, REVEAL + 0.06, REVEAL + 0.4, FINALE, FINALE + 0.06, FINALE + 0.4, TOTAL]) + `</rect>`;
const finale = `<g opacity="0">` +
  anim('opacity', [0, 0, 1, 1, 0], [0, FINALE, FINALE + 0.4, TOTAL - 0.4, TOTAL]) +
  `<text x="${W / 2}" y="${midY - 58}" class="hud">NIVEAU TERMINÉ · ${targets.length * POINTS} PTS · SANS FAUTE</text>` +
  `<g transform="translate(${W / 2} ${midY + 6})"><text class="big" fill="${WORDS[0].color}">${WORDS[0].label}` +
  tr('scale', [0.5, 0.5, 1.1, 1, 1], [0, FINALE, FINALE + 0.3, FINALE + 0.5, TOTAL]) + `</text></g>` +
  `<g transform="translate(${W / 2} ${midY + 70})"><text class="big" fill="${WORDS[1].color}">${WORDS[1].label}` +
  tr('scale', [0.5, 0.5, 0.5, 1.1, 1, 1], [0, FINALE, FINALE + 0.15, FINALE + 0.45, FINALE + 0.65, TOTAL]) + `</text></g>` +
  `</g>`;
const finaleLabel = `<text x="${W / 2}" y="${midY - 30}" class="hud" opacity="0">LE SERPENT A TOUT COLLECTÉ` +
  anim('opacity', [0, 0, 1, 1, 0, 0], [0, REVEAL + 0.2, REVEAL + 0.4, FINALE - 0.2, FINALE, TOTAL]) + `</text>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Mini-jeu de snake : le serpent attrape une à une les lettres de JEFF BIZO THEMAGICIAN24, son corps épelle le nom, puis le nom complet s'affiche.">
  <style>
    text { font-family: "SF Mono", ui-monospace, Menlo, Consolas, "Liberation Mono", monospace; font-size: 15px; font-weight: 600; text-anchor: middle; }
    .filler text { fill: ${C.filler}; }
    .food { font-weight: 800; fill: ${C.target}; }
    .seg-t { font-size: 14px; font-weight: 800; fill: ${C.ink}; }
    .hud { font-size: 15px; font-weight: 700; letter-spacing: 2px; fill: ${C.muted}; }
    .pts { font-size: 13px; font-weight: 800; }
    .banner { font-size: 14px; font-weight: 800; letter-spacing: 2px; }
    .slot { font-size: 22px; font-weight: 800; }
    .big { font-size: 56px; font-weight: 800; letter-spacing: 6px; }
    @media (prefers-reduced-motion: reduce) { .seg { display: none; } }
  </style>
  <rect width="${W}" height="${H}" rx="28" fill="${C.bg}"/>
  <g>${shake}
    ${score}${counter}${record}${progress}
    <g>${fadeGrid}<g class="filler">${filler}</g>${food}${reticle}${slots}</g>
    ${fx}
    ${banners}
    ${snake}
    ${finaleLabel}
  </g>
  ${flash}
  ${finale}
</svg>
`;

writeFileSync(new URL('../assets/snake-letters.svg', import.meta.url), svg);
console.log(`snake-letters.svg : ${N} cases parcourues, ${targets.length} lettres, boucle de ${TOTAL.toFixed(1)} s, ${(svg.length / 1024).toFixed(0)} Ko`);
