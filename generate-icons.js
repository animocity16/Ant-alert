const { createCanvas } = require('canvas');
const fs = require('fs');

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const r = size / 2;

  ctx.fillStyle = '#1D9E75';
  ctx.beginPath();
  ctx.arc(r, r, r, 0, Math.PI * 2);
  ctx.fill();

  const s = size / 192;
  ctx.fillStyle = '#ffffff';

  // Body (ellipse)
  ctx.beginPath();
  ctx.ellipse(r, r + 20*s, 22*s, 30*s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.ellipse(r, r - 28*s, 18*s, 18*s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Thorax
  ctx.beginPath();
  ctx.ellipse(r, r, 14*s, 14*s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wings
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.ellipse(r - 30*s, r - 10*s, 26*s, 14*s, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(r + 30*s, r - 10*s, 26*s, 14*s, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Antennae
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(r - 8*s, r - 40*s);
  ctx.quadraticCurveTo(r - 30*s, r - 70*s, r - 22*s, r - 85*s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(r + 8*s, r - 40*s);
  ctx.quadraticCurveTo(r + 30*s, r - 70*s, r + 22*s, r - 85*s);
  ctx.stroke();

  return canvas.toBuffer('image/png');
}

fs.writeFileSync('/home/claude/ant-alert/icon-192.png', drawIcon(192));
fs.writeFileSync('/home/claude/ant-alert/icon-512.png', drawIcon(512));
console.log('Icons generated');
