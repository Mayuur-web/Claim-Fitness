// Canvas-based Instagram / Social Run Card generator

import { formatTime, formatDistance, formatPace } from './grid';

export async function generateShareCard(summary) {
  if (typeof window === 'undefined') return;

  const {
    duration = 0,
    distance = 0,
    cellsClaimed = 0,
    cellsStolen = 0,
    path = [],
  } = summary;

  const canvas = document.createElement('canvas');
  const width = 1080;
  const height = 1350;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 1. Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0E1622');
  bgGrad.addColorStop(0.5, '#0B0F14');
  bgGrad.addColorStop(1, '#070A0E');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Subtle radial glow in upper-center
  const glowGrad = ctx.createRadialGradient(width / 2, 480, 50, width / 2, 480, 450);
  glowGrad.addColorStop(0, 'rgba(61, 225, 255, 0.12)');
  glowGrad.addColorStop(0.7, 'rgba(182, 255, 59, 0.05)');
  glowGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, width, height);

  // 3. Subtle grid dots
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  for (let x = 60; x < width; x += 50) {
    for (let y = 60; y < height; y += 50) {
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 4. Header Bar
  ctx.textAlign = 'left';
  ctx.fillStyle = '#B6FF3B';
  ctx.font = 'bold 36px monospace, sans-serif';
  ctx.fillText('⚡ CLAIMR', 80, 110);

  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(242, 245, 248, 0.6)';
  ctx.font = '24px monospace, sans-serif';
  const dateStr = new Date().toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).toUpperCase();
  ctx.fillText(dateStr, width - 80, 110);

  // Divider line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, 140);
  ctx.lineTo(width - 80, 140);
  ctx.stroke();

  // 5. GPS Path visualization in center
  const pathBox = { left: 120, top: 200, width: 840, height: 580 };

  if (Array.isArray(path) && path.length > 1) {
    const lats = path.map((p) => p[0]);
    const lngs = path.map((p) => p[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const dLat = Math.max(0.0005, maxLat - minLat);
    const dLng = Math.max(0.0005, maxLng - minLng);

    const scale = Math.min((pathBox.width - 60) / dLng, (pathBox.height - 60) / dLat);
    const xOffset = pathBox.left + (pathBox.width - dLng * scale) / 2;
    const yOffset = pathBox.top + (pathBox.height - dLat * scale) / 2;

    const screenPoints = path.map(([lat, lng]) => ({
      x: xOffset + (lng - minLng) * scale,
      y: yOffset + (maxLat - lat) * scale,
    }));

    // Outer Neon Glow
    ctx.strokeStyle = 'rgba(61, 225, 255, 0.35)';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    screenPoints.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    // Core Bright Cyan Path
    ctx.strokeStyle = '#3DE1FF';
    ctx.lineWidth = 6;
    ctx.beginPath();
    screenPoints.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    // Start Marker (Lime)
    const startPt = screenPoints[0];
    ctx.fillStyle = '#B6FF3B';
    ctx.beginPath();
    ctx.arc(startPt.x, startPt.y, 8, 0, Math.PI * 2);
    ctx.fill();

    // End Marker (Cyan Pulse)
    const endPt = screenPoints[screenPoints.length - 1];
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#3DE1FF';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(endPt.x, endPt.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    // Fallback if no points: Icon graphic
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.font = 'bold 120px sans-serif';
    ctx.fillText('⚡', width / 2, 520);
  }

  // 6. Stats Cards Grid (2 rows x 2 columns)
  const turfLabel = cellsStolen > 0 ? `${cellsClaimed} (+${cellsStolen}⚔)` : `${cellsClaimed} CELLS`;
  const cards = [
    { label: 'DISTANCE', val: `${formatDistance(distance)} KM`, color: '#F2F5F8' },
    { label: 'TURF CLAIMED', val: turfLabel, color: '#B6FF3B' },
    { label: 'DURATION', val: formatTime(duration), color: '#F2F5F8' },
    { label: 'AVG PACE', val: `${formatPace(distance, duration)} /KM`, color: '#3DE1FF' },
  ];

  const gridY = 820;
  const cardW = 430;
  const cardH = 170;

  cards.forEach((card, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = 80 + col * (cardW + 60);
    const y = gridY + row * (cardH + 30);

    // Card background with fallback for older browsers
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, cardW, cardH, 24);
    } else {
      ctx.rect(x, y, cardW, cardH);
    }
    ctx.fill();
    ctx.stroke();

    // Label
    ctx.textAlign = 'left';
    ctx.fillStyle = '#8A97A6';
    ctx.font = 'bold 20px monospace, sans-serif';
    ctx.fillText(card.label, x + 30, y + 50);

    // Value
    ctx.fillStyle = card.color;
    ctx.font = 'bold 48px sans-serif';
    ctx.fillText(card.val, x + 30, y + 120);
  });

  // 7. Footer
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '18px monospace, sans-serif';
  ctx.fillText('TERRITORY CONQUEST // CLAIMR.APP', width / 2, 1260);

  // Return download trigger
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `claimr-story-${Math.round(distance)}m.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/png');
}

