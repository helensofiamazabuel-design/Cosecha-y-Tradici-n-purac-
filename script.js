// ==========================================
// ESTADO Y VARIABLES DEL JUEGO
// ==========================================
const gameState = {
  farmCorn: 25,
  playerCorn: 0,
  dough: 0,
  arepas: 0,
  shopArepas: 0,
  coins: 0,
  sowersCount: 1,      // Cantidad de sembradores
  sowerCost: 50,       // Costo inicial para contratar sembrador
  step: 1
};

let scene, camera, renderer;
let playerGroup, tractorGroup;
let cornPlants = [];
let npcs = [];
let sowers = [];

let farmBasketZone, kneadingZone, ovenZone, shopDepositZone;

const keys = { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false };

// ==========================================
// INICIALIZACIÓN
// ==========================================
function init() {
  const container = document.getElementById('canvas-container');

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.FogExp2(0x87ceeb, 0.01);

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xfffaed, 0.95);
  sunLight.position.set(40, 50, 30);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  scene.add(sunLight);

  buildWorld();
  setupInputs();

  window.addEventListener('resize', onWindowResize);

  animate(0);

  // Sembrado dinámico por los trabajadores y ventas en el local
  setInterval(sowAndHarvestLoop, 2000);
  setInterval(shopSalesLoop, 2200);
}

// ==========================================
// CONSTRUCCIÓN DEL MUNDO 3D
// ==========================================
function buildWorld() {
  // Suelo General
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 160),
    new THREE.MeshStandardMaterial({ color: 0x55aa44, roughness: 0.8 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Calles Empedradas del Pueblo
  const street = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 120),
    new THREE.MeshStandardMaterial({ color: 0x8d8d8d, roughness: 0.9 })
  );
  street.rotation.x = -Math.PI / 2;
  street.position.set(10, 0.02, 0);
  street.receiveShadow = true;
  scene.add(street);

  // 🌽 CULTIVO DE MAÍZ
  const farmField = new THREE.Mesh(
    new THREE.BoxGeometry(30, 0.2, 30),
    new THREE.MeshStandardMaterial({ color: 0x5c4033 })
  );
  farmField.position.set(-30, 0.1, -20);
  farmField.receiveShadow = true;
  scene.add(farmField);

  for (let x = -42; x <= -18; x += 4) {
    for (let z = -32; z <= -8; z += 4) {
      createCornPlant(x, 0.2, z);
    }
  }

  createTractor(-30, -5);

  // 👨‍🌾 PRIMER SEMBRADOR EN EL CULTIVO
  createSowerWorker(-32, -22);

  // 🏡 CASAS
  createHouse(25, 0, -35, 0xe74c3c);
  createHouse(25, 0, -15, 0x3498db);
  createHouse(25, 0, 25, 0xf1c40f);

  // 🏪 LOCAL DE AREPAS
  createArepaShop(25, 0, 5);

  // 🍳 ZONAS DE PRODUCCIÓN
  createProductionArea(-5, 0, 5);

  // 🧍 JUGADOR
  createPlayer(0, 0);

  // 👨‍🍳 ROLES DIVERSIFICADOS
  createBakerNPC(-9, 0, 3, "Maestro Amasador", "Mezclo la harina con agua en el platón grande para hacer la masa suave.");
  createGrillerNPC(-5, 0, 10, "Chef Asador", "Recibo la masa y aso las arepas en este horno con fuego vivo.");
  createShopkeeperNPC(22, 0, 5, "Don Ramón (Tendero)", "¡Deposita las arepas aquí! Yo las vendo inmediatamente a la gente.");
}

function createCornPlant(x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.15, 2.5),
    new THREE.MeshStandardMaterial({ color: 0x2e8b57 })
  );
  stem.position.y = 1.25;
  stem.castShadow = true;
  group.add(stem);

  const cob = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 0.8),
    new THREE.MeshStandardMaterial({ color: 0xffd700 })
  );
  cob.position.set(0.2, 1.5, 0);
  cob.rotation.z = -0.3;
  cob.castShadow = true;
  group.add(cob);

  scene.add(group);
  cornPlants.push(group);
}

function createTractor(x, z) {
  tractorGroup = new THREE.Group();
  tractorGroup.position.set(x, 0, z);

  const body = new THREE.Mesh(new THREE.BoxGeometry(3, 1.6, 2), new THREE.MeshStandardMaterial({ color: 0xd32f2f }));
  body.position.y = 1.1;
  body.castShadow = true;
  tractorGroup.add(body);

  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.4, 1.8), new THREE.MeshStandardMaterial({ color: 0x222222 }));
  cab.position.set(-0.5, 2.3, 0);
  tractorGroup.add(cab);

  scene.add(tractorGroup);
}

// 👨‍🌾 Sembrador de Maíz
function createSowerWorker(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 1.5), new THREE.MeshStandardMaterial({ color: 0x43a047 }));
  body.position.y = 0.9;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.35), new THREE.MeshStandardMaterial({ color: 0xffdbac }));
  head.position.y = 1.9;
  group.add(head);

  // Sombrero de Paja
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.05), new THREE.MeshStandardMaterial({ color: 0xfbc02d }));
  hat.position.y = 2.25;
  group.add(hat);

  // Regadera / Herramienta de Siembra
  const tool = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.4), new THREE.MeshStandardMaterial({ color: 0x0288d1 }));
  tool.position.set(0.5, 0.9, 0.3);
  group.add(tool);

  group.userData = { name: "Campesino Sembrador", text: "¡Sembro y riego las semillas de maíz para que siempre tengas cosecha!" };

  scene.add(group);
  sowers.push(group);
  npcs.push(group);
}

function createHouse(x, y, z, wallColor) {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const walls = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 8), new THREE.MeshStandardMaterial({ color: wallColor }));
  walls.position.y = 2.5;
  walls.castShadow = true;
  group.add(walls);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(6.5, 3, 4), new THREE.MeshStandardMaterial({ color: 0x8d6e63 }));
  roof.position.y = 6.5;
  roof.rotation.y = Math.PI / 4;
  group.add(roof);

  scene.add(group);
}

function createArepaShop(x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const storeBody = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 12), new THREE.MeshStandardMaterial({ color: 0xffecb3 }));
  storeBody.position.y = 3;
  storeBody.castShadow = true;
  group.add(storeBody);

  const awning = new THREE.Mesh(new THREE.BoxGeometry(11, 0.4, 4), new THREE.MeshStandardMaterial({ color: 0xe65100 }));
  awning.position.set(-2, 4.5, 0);
  group.add(awning);

  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 8), new THREE.MeshStandardMaterial({ color: 0x8d6e63 }));
  counter.position.set(-4.2, 0.7, 0);
  counter.castShadow = true;
  group.add(counter);

  shopDepositZone = new THREE.Group();
  shopDepositZone.position.set(x - 4.2, 1.4, 0);
  scene.add(shopDepositZone);

  scene.add(group);
}

function createProductionArea(x, y, z) {
  farmBasketZone = new THREE.Group();
  farmBasketZone.position.set(-14, 0, -20);
  const basketMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.2, 1.2, 16), new THREE.MeshStandardMaterial({ color: 0x8b5a2b }));
  basketMesh.position.y = 0.6;
  farmBasketZone.add(basketMesh);
  scene.add(farmBasketZone);

  // Mesa de Amasado
  kneadingZone = new THREE.Group();
  kneadingZone.position.set(x - 4, y, z - 2);

  const table = new THREE.Mesh(new THREE.BoxGeometry(3, 1.2, 2), new THREE.MeshStandardMaterial({ color: 0x8d6e63 }));
  table.position.y = 0.6;
  kneadingZone.add(table);

  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.5, 0.5, 16), new THREE.MeshStandardMaterial({ color: 0xc0c0c0 }));
  bowl.position.set(0, 1.35, 0);
  kneadingZone.add(bowl);

  scene.add(kneadingZone);

  // Horno de Asar
  ovenZone = new THREE.Group();
  ovenZone.position.set(x - 4, y, z + 6);

  const ovenBase = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.5, 2.5), new THREE.MeshStandardMaterial({ color: 0xb71c1c }));
  ovenBase.position.y = 1.25;
  ovenBase.castShadow = true;
  ovenZone.add(ovenBase);

  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 2), new THREE.MeshStandardMaterial({ color: 0x424242 }));
  chimney.position.set(1, 3.25, 0);
  ovenZone.add(chimney);

  scene.add(ovenZone);
}

function createPlayer(x, z) {
  playerGroup = new THREE.Group();
  playerGroup.position.set(x, 0, z);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.6), new THREE.MeshStandardMaterial({ color: 0x2196f3 }));
  body.position.y = 1;
  body.castShadow = true;
  playerGroup.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.35), new THREE.MeshStandardMaterial({ color: 0xffdbac }));
  head.position.y = 2;
  playerGroup.add(head);

  scene.add(playerGroup);
}

function createBakerNPC(x, y, z, name, text) {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.6), new THREE.MeshStandardMaterial({ color: 0x1976d2 }));
  body.position.y = 1;
  group.add(body);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.3), new THREE.MeshStandardMaterial({ color: 0x0d47a1 }));
  cap.position.y = 2.25;
  group.add(cap);

  group.userData = { name: name, text: text };
  scene.add(group);
  npcs.push(group);
}

function createGrillerNPC(x, y, z, name, text) {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.6), new THREE.MeshStandardMaterial({ color: 0xd32f2f }));
  body.position.y = 1;
  group.add(body);

  const chefHat = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.35, 0.9, 16), new THREE.MeshStandardMaterial({ color: 0xffffff }));
  chefHat.position.y = 2.5;
  group.add(chefHat);

  group.userData = { name: name, text: text };
  scene.add(group);
  npcs.push(group);
}

function createShopkeeperNPC(x, y, z, name, text) {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.6), new THREE.MeshStandardMaterial({ color: 0x388e3c }));
  body.position.y = 1;
  group.add(body);

  group.userData = { name: name, text: text };
  scene.add(group);
  npcs.push(group);
}

// ==========================================
// CONTROLES E INTERACCIÓN
// ==========================================
function setupInputs() {
  window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key) || keys.hasOwnProperty(e.key.toLowerCase())) {
      keys[e.key] = true;
      keys[e.key.toLowerCase()] = true;
    }
    if (e.key.toLowerCase() === 'e') performAction();
  });

  window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key) || keys.hasOwnProperty(e.key.toLowerCase())) {
      keys[e.key] = false;
      keys[e.key.toLowerCase()] = false;
    }
  });

  setupTouchButton('btn-up', 'w');
  setupTouchButton('btn-down', 's');
  setupTouchButton('btn-left', 'a');
  setupTouchButton('btn-right', 'd');

  document.getElementById('btn-action').addEventListener('click', performAction);
  document.getElementById('interaction-prompt').addEventListener('click', performAction);
}

function setupTouchButton(id, key) {
  const btn = document.getElementById(id);
  btn.addEventListener('touchstart', (e) => { e.preventDefault(); keys[key] = true; });
  btn.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; });
  btn.addEventListener('mousedown', () => { keys[key] = true; });
  btn.addEventListener('mouseup', () => { keys[key] = false; });
}

function performAction() {
  const p = playerGroup.position;

  // 1. Recoger Maíz
  if (p.distanceTo(farmBasketZone.position) < 4) {
    if (gameState.farmCorn > 0 && gameState.playerCorn < 10) {
      const take = Math.min(gameState.farmCorn, 10 - gameState.playerCorn);
      gameState.farmCorn -= take;
      gameState.playerCorn += take;
      setGuideStep(2, "2. Lleva el maíz al Maestro Amasador.");
      updateUI();
    }
  }
  // 2. Amasar Masa
  else if (p.distanceTo(kneadingZone.position) < 4) {
    if (gameState.playerCorn > 0) {
      gameState.dough += gameState.playerCorn;
      gameState.playerCorn = 0;
      setGuideStep(3, "3. Lleva la masa al Chef Asador en el horno.");
      updateUI();
    }
  }
  // 3. Asar Arepas
  else if (p.distanceTo(ovenZone.position) < 4) {
    if (gameState.dough > 0) {
      gameState.arepas += gameState.dough;
      gameState.dough = 0;
      setGuideStep(4, "4. Deposita las arepas en el Local de Don Ramón.");
      updateUI();
    }
  }
  // 4. Depositar en el Local con Notificación Visibles
  else if (p.distanceTo(shopDepositZone.position) < 4) {
    if (gameState.arepas > 0) {
      const delivered = gameState.arepas;
      gameState.shopArepas += delivered;
      gameState.arepas = 0;

      // NOTIFICACIÓN FLOTANTE EN 3D
      showFloatingText(shopDepositZone.position.x, shopDepositZone.position.y + 4, shopDepositZone.position.z, `¡+${delivered} Arepas Entregadas! 🫓`);

      setGuideStep(1, "5. ¡Excelente! El tendero venderá las arepas. ¡Contrata más sembradores con tus ganancias!");
      updateUI();
    }
  }
}

// Comprar Sembradores
function buyFarmerWorker() {
  if (gameState.coins >= gameState.sowerCost) {
    gameState.coins -= gameState.sowerCost;
    gameState.sowersCount += 1;

    const rx = -35 + Math.random() * 15;
    const rz = -28 + Math.random() * 15;
    createSowerWorker(rx, rz);

    gameState.sowerCost = Math.floor(gameState.sowerCost * 1.5);
    updateUI();
  }
}

function setGuideStep(stepNum, text) {
  gameState.step = stepNum;
  document.getElementById('guide-step').innerText = text;
}

// Bucle de siembra automática por los trabajadores
function sowAndHarvestLoop() {
  gameState.farmCorn += gameState.sowersCount * 2;
  updateUI();
}

// Bucle de ventas
function shopSalesLoop() {
  if (gameState.shopArepas > 0) {
    gameState.shopArepas -= 1;
    gameState.coins += 25;

    showFloatingText(22, 3, 5, `+$25 🪙`);
    updateUI();
  }
}

function updateUI() {
  document.getElementById('farm-corn').innerText = gameState.farmCorn;
  document.getElementById('player-corn').innerText = gameState.playerCorn;
  document.getElementById('dough-count').innerText = gameState.dough;
  document.getElementById('arepas-count').innerText = gameState.arepas;
  document.getElementById('shop-arepas').innerText = gameState.shopArepas;
  document.getElementById('coins-count').innerText = gameState.coins;

  const btn = document.getElementById('buy-worker-btn');
  btn.innerText = `👨‍🌾 Contratar Sembrador ($${gameState.sowerCost})`;
  btn.disabled = gameState.coins < gameState.sowerCost;
}

// Carteles / Notificaciones Flotantes en 3D
function showFloatingText(x, y, z, text) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 300;
  canvas.height = 120;

  ctx.font = 'Bold 28px sans-serif';
  ctx.fillStyle = '#ffea00';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  ctx.textAlign = 'center';
  ctx.strokeText(text, 150, 60);
  ctx.fillText(text, 150, 60);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.position.set(x, y, z);
  sprite.scale.set(5, 2.5, 1);
  scene.add(sprite);

  let opacity = 1.0;
  const interval = setInterval(() => {
    sprite.position.y += 0.08;
    opacity -= 0.04;
    spriteMat.opacity = opacity;

    if (opacity <= 0) {
      clearInterval(interval);
      scene.remove(sprite);
    }
  }, 30);
}

function checkProximity() {
  const p = playerGroup.position;
  const prompt = document.getElementById('interaction-prompt');
  const actionText = document.getElementById('action-text');
  const dialogueBox = document.getElementById('dialogue-box');

  let near = false;

  if (p.distanceTo(farmBasketZone.position) < 4) {
    actionText.innerText = "Recoger Maíz (🧺)";
    near = true;
  } else if (p.distanceTo(kneadingZone.position) < 4) {
    actionText.innerText = "Amasar (🥣)";
    near = true;
  } else if (p.distanceTo(ovenZone.position) < 4) {
    actionText.innerText = "Asar en Horno (🔥)";
    near = true;
  } else if (p.distanceTo(shopDepositZone.position) < 4) {
    actionText.innerText = "Entregar Arepas al Local (🏪)";
    near = true;
  }

  if (near) prompt.classList.remove('hidden');
  else prompt.classList.add('hidden');

  let nearNPC = false;
  npcs.forEach(npc => {
    if (p.distanceTo(npc.position) < 4) {
      document.getElementById('dialogue-speaker').innerText = npc.userData.name;
      document.getElementById('dialogue-text').innerText = `"${npc.userData.text}"`;
      dialogueBox.classList.remove('hidden');
      nearNPC = true;
    }
  });

  if (!nearNPC) dialogueBox.classList.add('hidden');
}

// ==========================================
// ANIMACIÓN Y RENDERIZADO
// ==========================================
function animate(time) {
  requestAnimationFrame(animate);

  const speed = 0.25;
  if (keys.w || keys.ArrowUp) playerGroup.position.z -= speed;
  if (keys.s || keys.ArrowDown) playerGroup.position.z += speed;
  if (keys.a || keys.ArrowLeft) playerGroup.position.x -= speed;
  if (keys.d || keys.ArrowRight) playerGroup.position.x += speed;

  camera.position.x = playerGroup.position.x + 14;
  camera.position.y = playerGroup.position.y + 16;
  camera.position.z = playerGroup.position.z + 20;
  camera.lookAt(playerGroup.position);

  // Animación del tractor
  if (tractorGroup) {
    const radius = 10;
    const tSpeed = time * 0.001;
    tractorGroup.position.x = -30 + Math.cos(tSpeed) * radius;
    tractorGroup.position.z = -20 + Math.sin(tSpeed) * radius;
    tractorGroup.rotation.y = -tSpeed + Math.PI / 2;
  }

  // Movimiento dinámico de los sembradores mientras riegan
  sowers.forEach((sower, idx) => {
    sower.position.y = Math.abs(Math.sin(time * 0.005 + idx)) * 0.2;
  });

  checkProximity();

  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.onload = init;