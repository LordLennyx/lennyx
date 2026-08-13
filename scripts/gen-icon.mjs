// Génère build/icon.png (512×512) depuis le monogramme Lennyx.
// electron-builder l'utilise automatiquement pour l'exe et l'installateur.
import sharp from 'sharp';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

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

// variante ronde (Android round icons) et premier plan (adaptive icons)
const svgRound = svg
  .replace('<rect x="0" y="0" width="100" height="100" rx="22" fill="#0a0a0d"/>',
    '<circle cx="50" cy="50" r="50" fill="#0a0a0d"/>');
// premier plan : contenu réduit dans la zone de sécurité (66 %) sur fond transparent
const svgForeground = `<svg width="432" height="432" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(50 50) scale(0.6) translate(-50 -50)">
    ${svg.replace(/^<svg[^>]*>/, '').replace('<rect x="0" y="0" width="100" height="100" rx="22" fill="#0a0a0d"/>', '').replace('</svg>', '')}
  </g>
</svg>`;

mkdirSync('build', { recursive: true });
mkdirSync('public/icons', { recursive: true });
await sharp(Buffer.from(svg)).resize(512, 512).png().toFile('build/icon.png');
await sharp(Buffer.from(svg)).resize(512, 512).png().toFile('public/icons/icon-512.png');
await sharp(Buffer.from(svg)).resize(192, 192).png().toFile('public/icons/icon-192.png');
// maskable : zone de sécurité de 20 % (le système peut rogner en cercle)
const inner = await sharp(Buffer.from(svg)).resize(400, 400).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#0a0a0d' } })
  .composite([{ input: inner, left: 56, top: 56 }])
  .png()
  .toFile('public/icons/maskable-512.png');

// Favicon vectoriel : net à toutes les tailles, dans l'onglet comme dans la
// barre des favoris, et issu de la même source que toutes les autres icônes.
writeFileSync('public/icons/monogram.svg', svg);

// ── Apple : icône de Dock / d'écran d'accueil ──
// iOS et macOS applique leur propre masque arrondi : on fournit un carré PLEIN.
// Surtout, l'image ne doit pas avoir de canal alpha — iOS compose du noir
// derrière la transparence et l'icône ressort sale.
await sharp(Buffer.from(svg))
  .resize(180, 180)
  .flatten({ background: '#0a0a0d' })
  .png()
  .toFile('public/icons/apple-touch-icon.png');

// ── Écrans de lancement iOS ──
// Sans eux, ouvrir la PWA depuis l'écran d'accueil affiche un flash blanc :
// c'est le détail qui trahit une page web déguisée en application.
// (macOS n'utilise pas ces images ; iOS les exige par résolution exacte.)
const APPLE_SCREENS = [
  // [largeur CSS, hauteur CSS, densité, description]
  [320, 568, 2, 'iPhone SE 1'],
  [375, 667, 2, 'iPhone SE 2/3, 8'],
  [414, 736, 3, 'iPhone 8 Plus'],
  [375, 812, 3, 'iPhone X/XS/11 Pro/12 mini'],
  [414, 896, 2, 'iPhone XR/11'],
  [414, 896, 3, 'iPhone XS Max/11 Pro Max'],
  [390, 844, 3, 'iPhone 12/13/14'],
  [428, 926, 3, 'iPhone 12/13 Pro Max, 14 Plus'],
  [393, 852, 3, 'iPhone 14/15/16 Pro'],
  [430, 932, 3, 'iPhone 14/15 Pro Max'],
  [402, 874, 3, 'iPhone 16 Pro'],
  [440, 956, 3, 'iPhone 16 Pro Max'],
  [768, 1024, 2, 'iPad'],
  [810, 1080, 2, 'iPad 10.2"'],
  [820, 1180, 2, 'iPad Air'],
  [834, 1194, 2, 'iPad Pro 11"'],
  [1024, 1366, 2, 'iPad Pro 12.9"'],
];

mkdirSync('public/splash', { recursive: true });

/** Un écran de lancement : fond obsidienne, monogramme centré, rien d'autre. */
async function splash(w, h, file) {
  const logoSize = Math.round(Math.min(w, h) * 0.28);
  const logo = await sharp(Buffer.from(svg)).resize(logoSize, logoSize).png().toBuffer();
  await sharp({ create: { width: w, height: h, channels: 3, background: '#0a0a0d' } })
    .composite([{ input: logo, left: Math.round((w - logoSize) / 2), top: Math.round((h - logoSize) / 2) }])
    // Ces images sont un aplat + un petit monogramme : une palette indexée
    // les divise par dix sans différence visible, et vingt-deux écrans de
    // lancement n'ont pas à peser plus lourd que l'application elle-même.
    .png({ compressionLevel: 9, palette: true, effort: 10 })
    .toFile(`public/splash/${file}`);
}

const appleLinks = [];
for (const [cw, ch, dpr, label] of APPLE_SCREENS) {
  const isTablet = cw >= 768;
  const orientations = isTablet ? ['portrait', 'landscape'] : ['portrait'];
  for (const orientation of orientations) {
    const [w, h] = orientation === 'portrait' ? [cw * dpr, ch * dpr] : [ch * dpr, cw * dpr];
    const file = `splash-${cw}x${ch}@${dpr}-${orientation}.png`;
    await splash(w, h, file);
    appleLinks.push(
      `    <link rel="apple-touch-startup-image" href="./splash/${file}"\n` +
      `      media="(device-width: ${cw}px) and (device-height: ${ch}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: ${orientation})" />` +
      `<!-- ${label} -->`,
    );
  }
}

// Les balises sont réécrites dans index.html entre deux marqueurs : la liste
// des appareils vit à un seul endroit, ici.
const INDEX = 'index.html';
const START = '<!-- apple-splash:start -->';
const END = '<!-- apple-splash:end -->';
let html = readFileSync(INDEX, 'utf8');
const a = html.indexOf(START);
const b = html.indexOf(END);
if (a !== -1 && b !== -1) {
  html = html.slice(0, a + START.length) + '\n' + appleLinks.join('\n') + '\n    ' + html.slice(b);
  writeFileSync(INDEX, html);
} else {
  console.warn('⚠ marqueurs apple-splash absents d’index.html : balises non injectées');
}

// ── mipmaps Android : le même « L » majestueux sur le téléphone ──
const DENSITIES = [
  ['mdpi', 48, 108],
  ['hdpi', 72, 162],
  ['xhdpi', 96, 216],
  ['xxhdpi', 144, 324],
  ['xxxhdpi', 192, 432],
];
for (const [name, size, fg] of DENSITIES) {
  const dir = `android/app/src/main/res/mipmap-${name}`;
  mkdirSync(dir, { recursive: true });
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`${dir}/ic_launcher.png`);
  await sharp(Buffer.from(svgRound)).resize(size, size).png().toFile(`${dir}/ic_launcher_round.png`);
  await sharp(Buffer.from(svgForeground)).resize(fg, fg).png().toFile(`${dir}/ic_launcher_foreground.png`);
}
console.log('Icônes générées : build/icon.png + public/icons/* + mipmaps Android');
