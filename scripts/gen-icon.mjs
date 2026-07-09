// Génère build/icon.png (512×512) depuis le monogramme Lennyx.
// electron-builder l'utilise automatiquement pour l'exe et l'installateur.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const svg = `<svg width="512" height="512" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f4dd8c"/>
      <stop offset="0.45" stop-color="#d4af37"/>
      <stop offset="1" stop-color="#8a6d1d"/>
    </linearGradient>
    <linearGradient id="g2" x1="1" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f4dd8c"/>
      <stop offset="1" stop-color="#a9852a"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="100" height="100" rx="22" fill="#0a0a0d"/>
  <circle cx="50" cy="50" r="41" stroke="url(#g)" stroke-width="1.6" fill="none"/>
  <circle cx="50" cy="50" r="37" stroke="url(#g)" stroke-width="0.6" opacity="0.65" fill="none"/>
  <path d="M50 6.8l2.2 4.2-2.2 3.4-2.2-3.4zM50 93.2l2.2-4.2-2.2-3.4-2.2 3.4zM6.8 50l4.2-2.2 3.4 2.2-3.4 2.2zM93.2 50l-4.2-2.2-3.4 2.2 3.4 2.2z" fill="url(#g2)"/>
  <path d="M36.5 28h17.2v3.1c-4.1.3-5.5 1.5-5.5 6.3v25.4c0 4.2 1.6 5.5 6.4 5.5h4.1c6.3 0 8.7-2.3 10.6-9h3.4L70.9 74H33.2v-3.1c4.2-.3 5.6-1.5 5.6-6.3V37.4c0-4.8-1.4-6-5.9-6.3z" fill="url(#g)"/>
  <path d="M32 79c7-3.2 15-3.6 22.5-1.1 6.8 2.3 12.8 2 17.5-.9" stroke="url(#g2)" stroke-width="1.5" stroke-linecap="round" fill="none"/>
</svg>`;

mkdirSync('build', { recursive: true });
await sharp(Buffer.from(svg)).resize(512, 512).png().toFile('build/icon.png');
console.log('build/icon.png généré');
