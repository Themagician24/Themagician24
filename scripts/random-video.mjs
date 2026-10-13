// Tire une vidéo au hasard dans assets/videos et l'affiche dans le README,
// entre les balises <!-- video:start --> et <!-- video:end -->.
// Ne retire jamais la vidéo déjà affichée, pour qu'elle change à chaque passage.
// Usage : node scripts/random-video.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const README = new URL('../README.md', import.meta.url);
const VIDEOS = new URL('../assets/videos/', import.meta.url);

const videos = readdirSync(VIDEOS).filter((f) => f.endsWith('.webp')).sort();
if (videos.length === 0) throw new Error('Aucune vidéo dans assets/videos');

const readme = readFileSync(README, 'utf8');
const block = /<!-- video:start -->[\s\S]*?<!-- video:end -->/;
if (!block.test(readme)) throw new Error('Balises <!-- video:start --> / <!-- video:end --> absentes du README');

const current = readme.match(/assets\/videos\/([\w-]+\.webp)/)?.[1];
const choices = videos.length > 1 ? videos.filter((v) => v !== current) : videos;
const next = choices[Math.floor(Math.random() * choices.length)];

const html = `<!-- video:start -->
<p align="center">
  <img src="assets/videos/${next}" width="100%" alt="" />
</p>
<!-- video:end -->`;

writeFileSync(README, readme.replace(block, html));
console.log(`Vidéo affichée : ${next}${current ? ` (avant : ${current})` : ''}`);
