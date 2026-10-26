import * as THREE from 'three';

// Marmer putih berurat krem (prosedural, 256px -> ringan)
export function makeMarbleTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#FBF8F3'; g.fillRect(0, 0, 256, 256);
  let seed = 7; // acak tetap agar hasil konsisten
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 14; i++) {
    g.beginPath();
    let x = rnd() * 256, y = 0;
    g.moveTo(x, y);
    for (let k = 0; k < 6; k++) { x += (rnd() - 0.5) * 70; y += 256 / 6; g.lineTo(x, y); }
    g.strokeStyle = `rgba(190,160,120,${0.1 + rnd() * 0.18})`;
    g.lineWidth = 0.6 + rnd() * 1.8;
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Papan nama bulat hitam (placeholder; ganti dengan gambar logo asli bila ada)
export function drawSign(canvas) {
  const g = canvas.getContext('2d');
  const s = canvas.width;
  g.fillStyle = '#111'; g.fillRect(0, 0, s, s);
  g.strokeStyle = '#B07A3A'; g.lineWidth = 6;
  g.beginPath(); g.arc(s / 2, s / 2, s * 0.44, 0, Math.PI * 2); g.stroke();
  g.textAlign = 'center';
  g.fillStyle = '#F8F1E7'; g.font = `600 ${s * 0.14}px "Playfair Display", Georgia, serif`;
  g.fillText('FOUR É', s / 2, s * 0.5);
  g.fillStyle = '#B07A3A'; g.font = `400 ${s * 0.11}px "Playfair Display", Georgia, serif`;
  g.fillText('BARATIE', s / 2, s * 0.64);
}