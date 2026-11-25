const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 40, 140);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.75));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
dirLight.position.set(50, 100, 50);
scene.add(dirLight);

let cash = 0;
let wanted = 0;
let inCar = null;
let lastShot = 0;
const keys = {};
const bullets = [];
const peds = [];
const cars = [];
const buildings = [];

function updateHUD() {
  document.getElementById('cash').textContent = '$' + cash;
  document.getElementById('wanted').textContent = '★'.repeat(wanted) + '☆'.repeat(5 - wanted);
  document.getElementById('mode').textContent = inCar ? 'Driving' : 'On Foot';
}

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(300, 300),
  new THREE.MeshLambertMaterial({ color: 0x333333 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
for (let x = -80; x <= 80; x += 40) {
  for (let z = -80; z <= 80; z += 40) {
    if (x === 0 && z === 0) continue;
    const isBank = (x === 40 && z === -40);
    const h = isBank ? 14 : 10 + Math.random() * 20;
    const mat = new THREE.MeshLambertMaterial({ color: isBank ? 0xd97706 : 0x64748b });
    const b = new THREE.Mesh(boxGeo, mat);
    b.scale.set(22, h, 22);
    b.position.set(x, h / 2, z);
    scene.add(b);
    buildings.push({ x: x, z: z, w: 22, d: 22 });
  }
}

const bankPad = new THREE.Mesh(
  new THREE.CylinderGeometry(3, 3, 0.2, 16),
  new THREE.MeshBasicMaterial({ color: 0xfacc15 })
);
bankPad.position.set(40, 0.1, -26);
scene.add(bankPad);

const player = new THREE.Group();
const body = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x2563eb }));
body.scale.set(1, 1.8, 0.8);
body.position.y = 0.9;
const gun = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({ color: 0x111111 }));
gun.scale.set(0.2, 0.2, 0.9);
gun.position.set(0.6, 1.2, 0.5);
player.add(body, gun);
scene.add(player);

function createCar(x, z, color) {
  const car = new THREE.Group();
  const chassis = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: color }));
  chassis.scale.set(2.4, 1, 4.5);
  chassis.position.y = 0.7;
  const cabin = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0xe2e8f0 }));
  cabin.scale.set(2, 0.8, 2.2);
  cabin.position.set(0, 1.5, -0.3);
  car.add(chassis, cabin);
  car.position.set(x, 0, z);
  car.userData = { speed: 0 };
  scene.add(car);
  cars.push(car);
}
createCar(8, 5, 0xef4444);
createCar(-12, -15, 0x10b981);
createCar(20, 25, 0xf59e0b);
createCar(-25, 30, 0x8b5cf6);

function spawnPed() {
  const ped = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0xf472b6 }));
  ped.scale.set(0.9, 1.7, 0.7);
  ped.position.set((Math.random() - 0.5) * 140, 0.85, (Math.random() - 0.5) * 140);
  ped.userData = { dir: Math.random() * Math.PI * 2, timer: 0 };
  scene.add(ped);
  peds.push(ped);
}
for (let i = 0; i < 20; i++) spawnPed();

window.addEventListener('keydown', function(e) {
  keys[e.code] = true;
  if (e.code === 'KeyE') toggleCar();
  if (e.code === 'Space') handleAction();
});
window.addEventListener('keyup', function(e) {
  keys[e.code] = false;
});
window.addEventListener('resize', function() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function toggleCar() {
  if (inCar) {
    player.position.copy(inCar.position).add(new THREE.Vector3(2.5, 0, 0));
    player.visible = true;
    inCar = null;
  } else {
    for (let i = 0; i < cars.length; i++) {
      if (player.position.distanceTo(cars[i].position) < 4.5) {
        inCar = cars[i];
        player.visible = false;
        wanted = Math.min(5, wanted + 1);
        break;
      }
    }
  }
  updateHUD();
}

function handleAction() {
  if (!inCar && player.position.distanceTo(bankPad.position) < 3.5) {
    cash += 500;
    wanted = Math.min(5, wanted + 2);
    updateHUD();
    return;
  }

  const now = Date.now();
  if (now - lastShot < 250) return;
  lastShot = now;

  const source = inCar ? inCar : player;
  const bullet = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({ color: 0xfef08a }));
  bullet.scale.set(0.2, 0.2, 0.6);
  bullet.position.copy(source.position);
  bullet.position.y = 1.2;
  bullet.rotation.y = source.rotation.y;
  bullet.userData = { life: 60 };
  scene.add(bullet);
  bullets.push(bullet);
}

function hitsBuilding(x, z, radius) {
  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i];
    if (Math.abs(x - b.x) < (b.w / 2 + radius) && Math.abs(z - b.z) < (b.d / 2 + radius)) {
      return true;
    }
  }
  return false;
}

function animate() {
  requestAnimationFrame(animate);

  if (inCar) {
    const d = inCar.userData;
    if (keys['KeyW'] || keys['ArrowUp']) d.speed = Math.min(d.speed + 0.02, 0.65);
    else if (keys['KeyS'] || keys['ArrowDown']) d.speed = Math.max(d.speed - 0.02, -0.3);
    else d.speed *= 0.95;

    if (Math.abs(d.speed) > 0.02) {
      const turn = (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0) - (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0);
      inCar.rotation.y += turn * 0.045 * Math.sign(d.speed);
    }

    const nx = inCar.position.x + Math.sin(inCar.rotation.y) * d.speed;
    const nz = inCar.position.z + Math.cos(inCar.rotation.y) * d.speed;
    if (!hitsBuilding(nx, nz, 1.8)) {
      inCar.position.x = nx;
      inCar.position.z = nz;
    } else {
      d.speed = -d.speed * 0.5;
    }
    player.position.copy(inCar.position);
  } else {
    const moveSpeed = 0.22;
    if (keys['KeyA'] || keys['ArrowLeft']) player.rotation.y += 0.06;
    if (keys['KeyD'] || keys['ArrowRight']) player.rotation.y -= 0.06;

    let forward = 0;
    if (keys['KeyW'] || keys['ArrowUp']) forward = moveSpeed;
    if (keys['KeyS'] || keys['ArrowDown']) forward = -moveSpeed * 0.7;

    const nx = player.position.x + Math.sin(player.rotation.y) * forward;
    const nz = player.position.z + Math.cos(player.rotation.y) * forward;
    if (!hitsBuilding(nx, nz, 0.7)) {
      player.position.x = nx;
      player.position.z = nz;
    }
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.position.x += Math.sin(b.rotation.y) * 1.4;
    b.position.z += Math.cos(b.rotation.y) * 1.4;
    b.userData.life--;

    let hit = false;
    for (let j = peds.length - 1; j >= 0; j--) {
      if (b.position.distanceTo(peds[j].position) < 1.3) {
        scene.remove(peds[j]);
        peds.splice(j, 1);
        cash += 50;
        wanted = Math.min(5, wanted + 1);
        updateHUD();
        spawnPed();
        hit = true;
        break;
      }
    }

    if (hit || b.userData.life <= 0 || hitsBuilding(b.position.x, b.position.z, 0.2)) {
      scene.remove(b);
      bullets.splice(i, 1);
    }
  }

  for (let i = peds.length - 1; i >= 0; i--) {
    const p = peds[i];
    p.userData.timer--;
    if (p.userData.timer <= 0) {
      p.userData.dir = Math.random() * Math.PI * 2;
      p.userData.timer = 60 + Math.random() * 100;
    }
    const px = p.position.x + Math.sin(p.userData.dir) * 0.05;
    const pz = p.position.z + Math.cos(p.userData.dir) * 0.05;
    if (!hitsBuilding(px, pz, 0.6)) {
      p.position.x = px;
      p.position.z = pz;
    }

    if (inCar && Math.abs(inCar.userData.speed) > 0.15 && p.position.distanceTo(inCar.position) < 2.2) {
      scene.remove(p);
      peds.splice(i, 1);
      cash += 50;
      wanted = Math.min(5, wanted + 1);
      updateHUD();
      spawnPed();
    }
  }

  const target = inCar ? inCar : player;
  const dist = inCar ? 12 : 8;
  const height = inCar ? 6 : 4.5;
  const camX = target.position.x - Math.sin(target.rotation.y) * dist;
  const camZ = target.position.z - Math.cos(target.rotation.y) * dist;
  camera.position.lerp(new THREE.Vector3(camX, height, camZ), 0.12);
  camera.lookAt(target.position.x, 1.5, target.position.z);

  renderer.render(scene, camera);
}
animate();
