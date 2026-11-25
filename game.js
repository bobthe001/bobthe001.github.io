const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Game State
let cash = 0;
let wanted = 0;
let inCar = null;
let lastShot = 0;
const keys = {};

const player = { x: 0, z: 0, angle: 0, speed: 0 };
const bullets = [];
const peds = [];
const cars = [
  { x: 12, z: 10, angle: 0, speed: 0, color: '#ef4444' },
  { x: -18, z: -20, angle: 1.5, speed: 0, color: '#10b981' },
  { x: 25, z: 30, angle: 3.1, speed: 0, color: '#f59e0b' },
  { x: -30, z: 35, angle: 0.5, speed: 0, color: '#8b5cf6' }
];

// Create 3D City Buildings & Bank
const buildings = [];
for (let x = -120; x <= 120; x += 45) {
  for (let z = -120; z <= 120; z += 45) {
    if (x === 0 && z === 0) continue;
    const isBank = (x === 45 && z === -45);
    buildings.push({
      x: x, z: z, w: 22, d: 22,
      h: isBank ? 16 : 12 + ((Math.abs(x * z) % 18)),
      color: isBank ? '#d97706' : '#64748b',
      topColor: isBank ? '#f59e0b' : '#94a3b8',
      isBank: isBank
    });
  }
}
const bankPad = { x: 45, z: -28 };

// Spawn Pedestrians
function spawnPed() {
  peds.push({
    x: (Math.random() - 0.5) * 180,
    z: (Math.random() - 0.5) * 180,
    dir: Math.random() * Math.PI * 2,
    timer: 60
  });
}
for (let i = 0; i < 25; i++) spawnPed();

function updateHUD() {
  document.getElementById('cash').textContent = '$' + cash;
  document.getElementById('wanted').textContent = '★'.repeat(wanted) + '☆'.repeat(5 - wanted);
  document.getElementById('mode').textContent = inCar ? 'Driving' : 'On Foot';
}

window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'KeyE') toggleCar();
  if (e.code === 'Space') handleAction();
});
window.addEventListener('keyup', e => keys[e.code] = false);

function toggleCar() {
  if (inCar) {
    player.x = inCar.x + Math.cos(inCar.angle) * 3.5;
    player.z = inCar.z - Math.sin(inCar.angle) * 3.5;
    inCar = null;
  } else {
    for (let c of cars) {
      if (Math.hypot(player.x - c.x, player.z - c.z) < 5) {
        inCar = c;
        wanted = Math.min(5, wanted + 1);
        break;
      }
    }
  }
  updateHUD();
}

function handleAction() {
  // Rob Bank if standing on yellow pad
  if (!inCar && Math.hypot(player.x - bankPad.x, player.z - bankPad.z) < 4.5) {
    cash += 500;
    wanted = Math.min(5, wanted + 2);
    updateHUD();
    return;
  }

  // Shoot Gun
  const now = Date.now();
  if (now - lastShot < 220) return;
  lastShot = now;

  const src = inCar || player;
  bullets.push({
    x: src.x,
    z: src.z,
    angle: src.angle,
    life: 45
  });
}

function hitsBuilding(x, z, r) {
  for (let b of buildings) {
    if (Math.abs(x - b.x) < b.w / 2 + r && Math.abs(z - b.z) < b.d / 2 + r) return true;
  }
  return false;
}

// 3D Projection Math (World X, Y, Z -> Screen X, Y)
const cam = { x: 0, y: 7, z: -12, angle: 0 };
function project(wx, wy, wz) {
  const dx = wx - cam.x;
  const dy = wy - cam.y;
  const dz = wz - cam.z;

  const cos = Math.cos(-cam.angle);
  const sin = Math.sin(-cam.angle);
  const rx = dx * cos - dz * sin;
  const rz = dx * sin + dz * cos;

  if (rz <= 0.5) return null; // Behind camera
  const fov = 450;
  return {
    x: canvas.width / 2 + (rx / rz) * fov,
    y: canvas.height / 2 - (dy / rz) * fov,
    z: rz
  };
}

// Draw a 3D Box in Perspective
function draw3DBox(x, y, z, w, h, d, angle, sideColor, topColor) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const hw = w / 2, hd = d / 2;

  const corners = [
    [-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]
  ].map(([lx, lz]) => ({
    x: x + lx * cos - lz * sin,
    z: z + lx * sin + lz * cos
  }));

  const bot = corners.map(c => project(c.x, y, c.z));
  const top = corners.map(c => project(c.x, y + h, c.z));
  if (bot.includes(null) || top.includes(null)) return;

  // Draw 4 Sides
  ctx.fillStyle = sideColor;
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const next = (i + 1) % 4;
    ctx.beginPath();
    ctx.moveTo(bot[i].x, bot[i].y);
    ctx.lineTo(bot[next].x, bot[next].y);
    ctx.lineTo(top[next].x, top[next].y);
    ctx.lineTo(top[i].x, top[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Draw Roof
  ctx.fillStyle = topColor;
  ctx.beginPath();
  ctx.moveTo(top[0].x, top[0].y);
  ctx.lineTo(top[1].x, top[1].y);
  ctx.lineTo(top[2].x, top[2].y);
  ctx.lineTo(top[3].x, top[3].y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function update() {
  // Player or Car Physics
  if (inCar) {
    if (keys['KeyW'] || keys['ArrowUp']) inCar.speed = Math.min(inCar.speed + 0.03, 0.85);
    else if (keys['KeyS'] || keys['ArrowDown']) inCar.speed = Math.max(inCar.speed - 0.03, -0.4);
    else inCar.speed *= 0.94;

    if (Math.abs(inCar.speed) > 0.03) {
      const turn = (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0) - (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0);
      inCar.angle += turn * 0.05 * Math.sign(inCar.speed);
    }

    const nx = inCar.x + Math.sin(inCar.angle) * inCar.speed;
    const nz = inCar.z + Math.cos(inCar.angle) * inCar.speed;
    if (!hitsBuilding(nx, nz, 2.2)) {
      inCar.x = nx;
      inCar.z = nz;
    } else {
      inCar.speed = -inCar.speed * 0.5;
    }
    player.x = inCar.x;
    player.z = inCar.z;
    player.angle = inCar.angle;
  } else {
    if (keys['KeyA'] || keys['ArrowLeft']) player.angle -= 0.06;
    if (keys['KeyD'] || keys['ArrowRight']) player.angle += 0.06;

    let fwd = 0;
    if (keys['KeyW'] || keys['ArrowUp']) fwd = 0.28;
    if (keys['KeyS'] || keys['ArrowDown']) fwd = -0.18;

    const nx = player.x + Math.sin(player.angle) * fwd;
    const nz = player.z + Math.cos(player.angle) * fwd;
    if (!hitsBuilding(nx, nz, 0.8)) {
      player.x = nx;
      player.z = nz;
    }
  }

  // Bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += Math.sin(b.angle) * 1.8;
    b.z += Math.cos(b.angle) * 1.8;
    b.life--;

    let hit = false;
    for (let j = peds.length - 1; j >= 0; j--) {
      if (Math.hypot(b.x - peds[j].x, b.z - peds[j].z) < 1.6) {
        peds.splice(j, 1);
        cash += 50;
        wanted = Math.min(5, wanted + 1);
        updateHUD();
        spawnPed();
        hit = true;
        break;
      }
    }
    if (hit || b.life <= 0 || hitsBuilding(b.x, b.z, 0.3)) bullets.splice(i, 1);
  }

  // Pedestrians
  for (let i = peds.length - 1; i >= 0; i--) {
    const p = peds[i];
    p.timer--;
    if (p.timer <= 0) {
      p.dir = Math.random() * Math.PI * 2;
      p.timer = 60 + Math.random() * 90;
    }
    const px = p.x + Math.sin(p.dir) * 0.06;
    const pz = p.z + Math.cos(p.dir) * 0.06;
    if (!hitsBuilding(px, pz, 0.7)) {
      p.x = px;
      p.z = pz;
    }

    // Run over pedestrian
    if (inCar && Math.abs(inCar.speed) > 0.2 && Math.hypot(p.x - inCar.x, p.z - inCar.z) < 2.6) {
      peds.splice(i, 1);
      cash += 50;
      wanted = Math.min(5, wanted + 1);
      updateHUD();
      spawnPed();
    }
  }

  // Smooth Camera Follow
  const target = inCar || player;
  const dist = inCar ? 15 : 10;
  cam.y = inCar ? 7.5 : 5.5;
  const goalX = target.x - Math.sin(target.angle) * dist;
  const goalZ = target.z - Math.cos(target.angle) * dist;
  cam.x += (goalX - cam.x) * 0.15;
  cam.z += (goalZ - cam.z) * 0.15;
  cam.angle = target.angle;
}

function draw() {
  // Sky & Asphalt Ground
  ctx.fillStyle = '#7dd3fc';
  ctx.fillRect(0, 0, canvas.width, canvas.height / 2);
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);

  // Collect all 3D objects and sort far-to-near (Painter's Algorithm)
  const renderList = [];

  // Bank Robbery Pad
  renderList.push({
    x: bankPad.x, z: bankPad.z,
    draw: () => draw3DBox(bankPad.x, 0, bankPad.z, 5, 0.2, 5, 0, '#eab308', '#facc15')
  });

  // Buildings
  for (let b of buildings) {
    renderList.push({
      x: b.x, z: b.z,
      draw: () => draw3DBox(b.x, 0, b.z, b.w, b.h, b.d, 0, b.color, b.topColor)
    });
  }

  // Cars
  for (let c of cars) {
    renderList.push({
      x: c.x, z: c.z,
      draw: () => {
        draw3DBox(c.x, 0, c.z, 2.6, 1.1, 4.8, c.angle, c.color, c.color);
        draw3DBox(c.x, 1.1, c.z, 2.1, 0.8, 2.4, c.angle, '#cbd5e1', '#f8fafc');
      }
    });
  }

  // Pedestrians
  for (let p of peds) {
    renderList.push({
      x: p.x, z: p.z,
      draw: () => draw3DBox(p.x, 0, p.z, 0.9, 1.8, 0.9, p.dir, '#ec4899', '#f472b6')
    });
  }

  // Player (if on foot)
  if (!inCar) {
    renderList.push({
      x: player.x, z: player.z,
      draw: () => draw3DBox(player.x, 0, player.z, 1, 1.9, 1, player.angle, '#1d4ed8', '#3b82f6')
    });
  }

  // Bullets
  for (let b of bullets) {
    renderList.push({
      x: b.x, z: b.z,
      draw: () => draw3DBox(b.x, 1.1, b.z, 0.3, 0.3, 0.8, b.angle, '#fef08a', '#fef08a')
    });
  }

  // Sort by distance from camera so closer objects draw on top
  renderList.sort((a, b) => {
    const distA = Math.hypot(a.x - cam.x, a.z - cam.z);
    const distB = Math.hypot(b.x - cam.x, b.z - cam.z);
    return distB - distA;
  });

  for (let item of renderList) {
    if (Math.hypot(item.x - cam.x, item.z - cam.z) < 160) item.draw();
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();
