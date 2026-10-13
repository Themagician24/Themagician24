// Génère assets/snake-letters.svg : un serpent qui parcourt une grille de lettres
// et révèle « JEFF BIZO » et « THEMAGICIAN24 » cachés dans l'alphabet.
// Usage : node scripts/snake-letters.mjs
import { writeFileSync } from 'node:fs';

const COLS = 40;
const ROWS = 7;
const CELL = 26;
const PAD_X = (1200 - COLS * CELL) / 2;
const PAD_Y = 48;
const W = 1200;
const H = PAD_Y * 2 + ROWS * CELL;

const STEP = 0.06;          // secondes par case
const SEGMENTS = 8;         // longueur du serpent
const HOLD = 5;             // fin de parcours : le nom complet s'affiche en grand

const COLORS = {
  bg: '#1D1D1F',
  letter: '#636366',
  eaten: '#2C2C2E',
  first: '#30D158',  // JEFF BIZO
  second: '#FFD60A', // THEMAGICIAN24
  snake: '#FF453A',
};

// Mots cachés, centrés sur les lignes 2 et 4
const hidden = new Map();
function place(word, row, color) {
  const start = Math.floor((COLS - word.length) / 2);
  [...word].forEach((ch, i) => {
    if (ch !== ' ') hidden.set(`${row},${start + i}`, { ch, color });
  });
}
place('JEFF BIZO', 2, COLORS.first);
place('THEMAGICIAN24', 4, COLORS.second);

// Parcours en serpentin : gauche → droite, puis droite → gauche
const path = [];
for (let r = 0; r < ROWS; r++) {
  for (let i = 0; i < COLS; i++) path.push([r, r % 2 === 0 ? i : COLS - 1 - i]);
}
const TRAVEL = (path.length - 1) * STEP;
const TOTAL = TRAVEL + HOLD;
const kt = (t) => (Math.min(Math.max(t, 0), TOTAL) / TOTAL).toFixed(4);

const cx = (c) => PAD_X + c * CELL + CELL / 2;
const cy = (r) => PAD_Y + r * CELL + CELL / 2;
const pathD = path.map(([r, c], i) => `${i ? 'L' : 'M'}${cx(c)} ${cy(r)}`).join(' ');

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
let letters = '';
path.forEach(([r, c], k) => {
  const t = k * STEP;
  const secret = hidden.get(`${r},${c}`);
  const ch = secret ? secret.ch : ALPHABET[(r * COLS + c) % 26];
  const to = secret ? secret.color : COLORS.eaten;
  const cls = secret ? ' class="s"' : '';
  letters += `<text x="${cx(c)}" y="${cy(r) + 5}"${cls} fill="${COLORS.letter}">${ch}` +
    `<animate attributeName="fill" values="${COLORS.letter};${COLORS.letter};${to};${to}" ` +
    `keyTimes="0;${kt(t)};${kt(t + 0.01)};1" dur="${TOTAL}s" repeatCount="indefinite"/></text>`;
});

let snake = '';
for (let i = SEGMENTS - 1; i >= 0; i--) {
  const delay = i * STEP;
  const size = i === 0 ? 22 : 20 - i;
  const opacity = (1 - i / (SEGMENTS + 2)).toFixed(2);
  const end = TRAVEL + (SEGMENTS - 1) * STEP;
  snake += `<rect class="seg" x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}" rx="6" fill="${COLORS.snake}" opacity="${opacity}">` +
    `<animateMotion path="${pathD}" dur="${TOTAL}s" repeatCount="indefinite" calcMode="linear" ` +
    `keyPoints="0;0;1;1" keyTimes="0;${kt(delay)};${kt(TRAVEL + delay)};1"/>` +
    `<animate attributeName="opacity" values="${opacity};${opacity};0;0" keyTimes="0;${kt(end)};${kt(end + 0.4)};1" dur="${TOTAL}s" repeatCount="indefinite"/></rect>`;
}

// Fin de parcours : la grille s'efface, le nom complet apparaît en grand
const REVEAL = TRAVEL + (SEGMENTS - 1) * STEP;
const gridFade = `<animate attributeName="opacity" values="1;1;0.06;0.06;1" keyTimes="0;${kt(REVEAL)};${kt(REVEAL + 0.5)};${kt(TOTAL - 0.3)};1" dur="${TOTAL}s" repeatCount="indefinite"/>`;
const nameShow = `<animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;${kt(REVEAL + 0.3)};${kt(REVEAL + 0.9)};${kt(TOTAL - 0.4)};1" dur="${TOTAL}s" repeatCount="indefinite"/>`;
const fullName = `<g opacity="0" class="name">${nameShow}
    <text x="${W / 2}" y="${H / 2 - 8}" class="big" fill="${COLORS.first}">JEFF BIZO</text>
    <text x="${W / 2}" y="${H / 2 + 52}" class="big" fill="${COLORS.second}">THEMAGICIAN 24</text>
  </g>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Un serpent parcourt l'alphabet et révèle JEFF BIZO et THEMAGICIAN24.">
  <style>
    text { font-family: "SF Mono", ui-monospace, Menlo, Consolas, "Liberation Mono", monospace; font-size: 15px; font-weight: 600; text-anchor: middle; }
    .s { font-weight: 800; }
    .big { font-size: 56px; font-weight: 800; letter-spacing: 6px; }
    @media (prefers-reduced-motion: reduce) { .seg { display: none; } }
  </style>
  <rect width="${W}" height="${H}" rx="28" fill="${COLORS.bg}"/>
  <g>${gridFade}${letters}</g>
  ${snake}
  ${fullName}
</svg>
`;

writeFileSync(new URL('../assets/snake-letters.svg', import.meta.url), svg);
console.log(`snake-letters.svg : ${path.length} lettres, boucle de ${TOTAL.toFixed(1)} s, ${(svg.length / 1024).toFixed(0)} Ko`);
