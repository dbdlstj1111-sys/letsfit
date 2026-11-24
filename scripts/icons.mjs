// public/icon.svg → 홈 화면·PWA용 PNG 아이콘 생성 (npm run icons)
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const pub = f => fileURLToPath(new URL('../public/' + f, import.meta.url));
const svg = await readFile(pub('icon.svg'));
for (const [name, size] of [['apple-touch-icon.png', 180], ['pwa-192.png', 192], ['pwa-512.png', 512]]) {
  await sharp(svg, {density: 300}).resize(size, size).flatten({background: '#e0322f'}).png().toFile(pub(name));
  console.log('made', name);
}
