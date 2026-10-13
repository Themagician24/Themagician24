// Génère assets/snake-letters.svg : un mini-jeu de snake en SVG animé (sans JavaScript).
// Le serpent parcourt une grille d'alphabet, mange les lettres cachées de
// « JEFF BIZO » et « THEMAGICIAN24 », grandit, marque des points, puis affiche le nom.
// Usage : node scripts/snake-letters.mjs
import { writeFileSync } from 'node:fs';

// ─── Réglages ────────────────────────────────────────────────────────────────
const COLS = 40;
const ROWS = 7;
const CELL = 26;
const STEP = 0.11;        // secondes par case (plus grand = plus lent)
const BASE_LENGTH = 3;    // longueur du serpent au départ
const HOLD = 5.5;         // durée de l'écran final
const POINTS = 100;       // points par lettre du nom

const C = {
  bg: '#1D1D1F',
  hudLine: '#2C2C2E',
  letter: '#636366',
  eaten: '#2C2C2E',
  muted: '#8E8E93',
  text: '#F5F5F7',
  first: '#30D158',  // JEFF BIZO
  second: '#FFD60A', // THEMAGICIAN24
  snake: '#FF453A',
  eye: '#1D1D1F',
};

// ─── Géométrie ───────────────────────────────────────────────────────────────
const W = 1200;
const HUD = 64;                            // bandeau score en haut
const GRID_Y = HUD + 18;
const PAD_X = (W - COLS * CELL) / 2;
const SLOTS_Y = GRID_Y + ROWS * CELL + 44; // lettres collectées en bas
const H = SLOTS_Y + 34;
const cx = (c) => PAD_X + c * CELL + CELL / 2;
const cy = (r) => GRID_Y + r * CELL + CELL / 2;

// ─── Mots cachés ─────────────────────────────────────────────────────────────
const hidden = new Map();
function place(word, row, color) {
  const start = Math.floor((COLS - word.length) / 2);
  [...word].forEach((ch, i) => {
    if (ch !== ' ') hidden.set(`${row},${start + i}`, { ch, color });
  });
}
place('JEFF BIZO', 2, C.first);
place('THEMAGICIAN24', 4, C.second);

// ─── Parcours en serpentin ───────────────────────────────────────────────────
const path = [];
for (let r = 0; r < ROWS; r++) {
  for (let i = 0; i < COLS; i++) path.push([r, r % 2 === 0 ? i : COLS - 1 - i]);
}
const TRAVEL = (path.length - 1) * STEP;
const TOTAL = TRAVEL + HOLD;
const kt = (t) => (Math.min(Math.max(t, 0), TOTAL) / TOTAL).toFixed(4);
const anim = (attr, values, times, extra = '') =>
  `<animate attributeName="${attr}" values="${values.join(';')}" keyTimes="${times.map(kt).join(';')}" dur="${TOTAL}s" repeatCount="indefinite"${extra}/>`;
const scale = (values, times) =>
  `<animateTransform attributeName="transform" type="scale" values="${values.join(';')}" keyTimes="${times.map(kt).join(';')}" dur="${TOTAL}s" repeatCount="indefinite"/>`;
const pathD = path.map(([r, c], i) => `${i ? 'L' : 'M'}${cx(c)} ${cy(r)}`).join(' ');

// Moments où chaque lettre cachée est mangée (dans l'ordre du parcours)
const eats = [];
path.forEach(([r, c], k) => {
  const secret = hidden.get(`${r},${c}`);
  if (secret) eats.push({ t: k * STEP, ...secret });
});

// ─── Grille de lettres ───────────────────────────────────────────────────────
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
let grid = '';
let effects = '';
path.forEach(([r, c], k) => {
  const t = k * STEP;
  const x = cx(c);
  const y = cy(r);
  const secret = hidden.get(`${r},${c}`);
  if (!secret) {
    grid += `<text x="${x}" y="${y + 5}" fill="${C.letter}">${ALPHABET[(r * COLS + c) % 26]}` +
      anim('fill', [C.letter, C.letter, C.eaten, C.eaten], [0, t, t + 0.01, TOTAL]) + `</text>`;
    return;
  }
  // Lettre du nom : rebond, onde de choc et « +100 » qui s'envole
  grid += `<g transform="translate(${x} ${y})"><text y="5" class="s" fill="${C.letter}">${secret.ch}` +
    anim('fill', [C.letter, C.letter, secret.color, secret.color], [0, t, t + 0.01, TOTAL]) +
    scale([1, 1, 1.9, 1, 1], [0, t, t + 0.12, t + 0.3, TOTAL]) + `</text></g>`;
  effects += `<circle cx="${x}" cy="${y}" r="4" fill="none" stroke="${secret.color}" stroke-width="2" opacity="0">` +
    anim('r', [4, 4, 4, 24, 24], [0, t, t + 0.01, t + 0.45, TOTAL]) +
    anim('opacity', [0, 0, 0.9, 0, 0], [0, t, t + 0.01, t + 0.45, TOTAL]) + `</circle>`;
  effects += `<text x="${x}" y="${y - 14}" class="pts" fill="${secret.color}" opacity="0">+${POINTS}` +
    anim('opacity', [0, 0, 1, 0, 0], [0, t, t + 0.02, t + 0.7, TOTAL]) +
    `<animateTransform attributeName="transform" type="translate" values="0 0;0 0;0 -18;0 -18" keyTimes="${[0, t, t + 0.7, TOTAL].map(kt).join(';')}" dur="${TOTAL}s" repeatCount="indefinite"/>` +
    `</text>`;
});

// ─── Serpent : grandit d'un anneau à chaque lettre du nom ────────────────────
const MAX = BASE_LENGTH + eats.length;
let snake = '';
for (let i = MAX - 1; i >= 0; i--) {
  const delay = i * STEP;
  const isHead = i === 0;
  const size = isHead ? 22 : Math.max(12, 19 - i * 0.25);
  const appear = i < BASE_LENGTH ? 0 : eats[i - BASE_LENGTH].t;
  const shade = (1 - (i / MAX) * 0.55).toFixed(2);
  const motion = `<animateMotion path="${pathD}" dur="${TOTAL}s" repeatCount="indefinite" calcMode="linear" rotate="auto" ` +
    `keyPoints="0;0;1;1" keyTimes="0;${kt(delay)};${kt(TRAVEL + delay)};1"/>`;
  const visible = appear === 0
    ? anim('opacity', [shade, shade, 0, 0], [0, TRAVEL, TRAVEL + 0.3, TOTAL])
    : anim('opacity', [0, 0, shade, shade, 0, 0], [0, appear, appear + 0.01, TRAVEL, TRAVEL + 0.3, TOTAL]);
  const body = `<rect x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}" rx="${isHead ? 7 : 5}" fill="${C.snake}"/>`;
  const eyes = isHead
    ? `<circle cx="5" cy="-5" r="2.6" fill="${C.eye}"/><circle cx="5" cy="5" r="2.6" fill="${C.eye}"/>`
    : '';
  snake += `<g class="seg" opacity="${appear === 0 ? shade : 0}">${motion}${visible}${body}${eyes}</g>`;
}

// ─── HUD : score, compteur, record, barre de progression ─────────────────────
let score = '';
let counter = '';
for (let k = 0; k <= eats.length; k++) {
  const from = k === 0 ? 0 : eats[k - 1].t;
  const last = k === eats.length;
  const values = last ? [0, 1] : k === 0 ? [1, 0] : [0, 1, 0];
  const times = last ? [0, from] : k === 0 ? [0, eats[0].t] : [0, from, eats[k].t];
  const show = `<animate attributeName="opacity" values="${values.join(';')}" keyTimes="${times.map(kt).join(';')}" dur="${TOTAL}s" repeatCount="indefinite" calcMode="discrete"/>`;
  score += `<text x="${PAD_X}" y="40" class="hud" text-anchor="start" opacity="${k === 0 ? 1 : 0}">SCORE <tspan fill="${C.text}">${String(k * POINTS).padStart(5, '0')}</tspan>${show}</text>`;
  counter += `<text x="${W / 2}" y="40" class="hud" opacity="${k === 0 ? 1 : 0}">LETTRES <tspan fill="${C.text}">${String(k).padStart(2, '0')}/${eats.length}</tspan>${show}</text>`;
}
const hiScore = `<text x="${W - PAD_X}" y="40" class="hud" text-anchor="end">RECORD <tspan fill="${C.second}">${String(eats.length * POINTS).padStart(5, '0')}</tspan></text>`;
const barW = COLS * CELL;
const progress = `<rect x="${PAD_X}" y="${HUD - 6}" width="${barW}" height="3" rx="1.5" fill="${C.hudLine}"/>` +
  `<rect x="${PAD_X}" y="${HUD - 6}" width="0" height="3" rx="1.5" fill="${C.snake}">` +
  anim('width', [0, barW, barW, 0], [0, TRAVEL, TOTAL - 0.01, TOTAL]) + `</rect>`;

// ─── Lettres collectées (en bas) ─────────────────────────────────────────────
const slotText = 'JEFF BIZO  THEMAGICIAN24';
const SLOT = 30;
const slotStart = W / 2 - ((slotText.length - 1) * SLOT) / 2;
let slots = '';
let e = 0;
[...slotText].forEach((ch, i) => {
  if (ch === ' ') return;
  const x = slotStart + i * SLOT;
  const { t, color } = eats[e++];
  slots += `<rect x="${x - 10}" y="${SLOTS_Y + 8}" width="20" height="2" rx="1" fill="${C.hudLine}"/>`;
  slots += `<text x="${x}" y="${SLOTS_Y}" class="slot" fill="${color}" opacity="0">${ch}` +
    `<animate attributeName="opacity" values="0;1" keyTimes="0;${kt(t)}" dur="${TOTAL}s" repeatCount="indefinite" calcMode="discrete"/></text>`;
});

// ─── Écran final : flash, « NIVEAU TERMINÉ » et nom complet ──────────────────
const REVEAL = TRAVEL + 0.3;
const flash = `<rect width="${W}" height="${H}" rx="28" fill="${C.text}" opacity="0">` +
  anim('opacity', [0, 0, 0.18, 0, 0], [0, REVEAL, REVEAL + 0.08, REVEAL + 0.45, TOTAL]) + `</rect>`;
const fadeOut = anim('opacity', [1, 1, 0.05, 0.05, 1], [0, REVEAL, REVEAL + 0.4, TOTAL - 0.3, TOTAL]);
const midY = GRID_Y + (ROWS * CELL) / 2;
const finale = `<g opacity="0">` +
  anim('opacity', [0, 0, 1, 1, 0], [0, REVEAL + 0.2, REVEAL + 0.7, TOTAL - 0.4, TOTAL]) +
  `<text x="${W / 2}" y="${midY - 54}" class="hud">NIVEAU TERMINÉ · ${eats.length * POINTS} PTS</text>` +
  `<g transform="translate(${W / 2} ${midY + 4})"><text class="big" fill="${C.first}">JEFF BIZO` +
  scale([0.6, 0.6, 1.08, 1, 1], [0, REVEAL + 0.2, REVEAL + 0.55, REVEAL + 0.75, TOTAL]) + `</text></g>` +
  `<g transform="translate(${W / 2} ${midY + 66})"><text class="big" fill="${C.second}">THEMAGICIAN 24` +
  scale([0.6, 0.6, 0.6, 1.08, 1, 1], [0, REVEAL + 0.2, REVEAL + 0.35, REVEAL + 0.7, REVEAL + 0.9, TOTAL]) + `</text></g>` +
  `</g>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Mini-jeu : un serpent parcourt l'alphabet, collecte JEFF BIZO et THEMAGICIAN24, puis affiche le nom complet.">
  <style>
    text { font-family: "SF Mono", ui-monospace, Menlo, Consolas, "Liberation Mono", monospace; font-size: 15px; font-weight: 600; text-anchor: middle; }
    .s { font-weight: 800; }
    .hud { font-size: 15px; font-weight: 700; letter-spacing: 2px; fill: ${C.muted}; }
    .pts { font-size: 13px; font-weight: 800; }
    .slot { font-size: 22px; font-weight: 800; }
    .big { font-size: 56px; font-weight: 800; letter-spacing: 6px; }
    @media (prefers-reduced-motion: reduce) { .seg { display: none; } }
  </style>
  <rect width="${W}" height="${H}" rx="28" fill="${C.bg}"/>
  <g>${fadeOut}
    ${score}${counter}${hiScore}${progress}
    ${grid}
    ${effects}
    ${slots}
  </g>
  ${snake}
  ${flash}
  ${finale}
</svg>
`;

writeFileSync(new URL('../assets/snake-letters.svg', import.meta.url), svg);
console.log(`snake-letters.svg : ${path.length} lettres, ${eats.length} à collecter, boucle de ${TOTAL.toFixed(1)} s, ${(svg.length / 1024).toFixed(0)} Ko`);
