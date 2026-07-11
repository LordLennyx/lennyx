// ── Carte de partage : génère une image PNG aux couleurs de Lennyx ────────
// 100 % client (canvas), aucun serveur — prête à partager ou télécharger.

export interface ShareCardData {
  name: string;
  rankName: string;
  level: number;
  headline: string;
  stats: Array<{ label: string; value: string }>;
  footer?: string;
}

export async function renderShareCard(data: ShareCardData): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible');

  try {
    await (document as unknown as { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
  } catch {
    /* tant pis, on dessine avec la police système de repli */
  }

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0d0b06');
  bg.addColorStop(1, '#050403');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W / 2, 260, 40, W / 2, 260, 720);
  glow.addColorStop(0, 'rgba(212,175,55,0.20)');
  glow.addColorStop(1, 'rgba(212,175,55,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 3;
  ctx.strokeRect(40, 40, W - 80, H - 80);
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 1;
  ctx.strokeRect(56, 56, W - 112, H - 112);
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.fillStyle = '#d4af37';
  ctx.font = '700 210px Cinzel, Georgia, serif';
  ctx.fillText('L', W / 2, 330);

  ctx.font = '600 44px Cinzel, Georgia, serif';
  ctx.fillStyle = '#f4dd8c';
  ctx.fillText('L E N N Y X', W / 2, 430);

  ctx.font = '500 30px Cinzel, Georgia, serif';
  ctx.fillStyle = '#eae6dc';
  ctx.fillText(data.headline, W / 2, 498);

  ctx.font = '700 46px Cinzel, Georgia, serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(data.name, W / 2, 580);

  ctx.font = '400 28px Manrope, system-ui, sans-serif';
  ctx.fillStyle = '#c9a227';
  ctx.fillText(`Niveau ${data.level} — ${data.rankName}`, W / 2, 622);

  const startY = 730;
  const rowH = 108;
  ctx.textAlign = 'left';
  data.stats.forEach((s, i) => {
    const y = startY + i * rowH;
    ctx.font = '400 25px Manrope, system-ui, sans-serif';
    ctx.fillStyle = '#8f8a80';
    ctx.fillText(s.label.toUpperCase(), 120, y);
    ctx.font = '700 54px Cinzel, Georgia, serif';
    ctx.fillStyle = '#f4dd8c';
    ctx.fillText(s.value, 120, y + 52);
    ctx.strokeStyle = 'rgba(212,175,55,0.25)';
    ctx.beginPath();
    ctx.moveTo(120, y + 70);
    ctx.lineTo(W - 120, y + 70);
    ctx.stroke();
  });

  ctx.textAlign = 'center';
  ctx.font = '400 22px Manrope, system-ui, sans-serif';
  ctx.fillStyle = '#8f8a80';
  ctx.fillText(data.footer ?? 'ORDRE & GLOIRE', W / 2, H - 70);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Échec de génération de l’image'))), 'image/png');
  });
}
