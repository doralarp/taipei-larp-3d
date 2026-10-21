/**
 * 台北劇本殺物語 3D (Taipei Murder Mystery 3D)
 * A 3D WebGL isometric LARP RPG built with Three.js.
 * Independent standalone 3D version without overwriting the original game.
 */

// ==========================================
// 1. DATA INITIALIZATION & CONSTANTS
// ==========================================
const GAMEDATA = JSON.parse(document.getElementById('gamedata-json').textContent);
const PEOPLEDATA = JSON.parse(document.getElementById('peopledata-json').textContent);
const AMENITIES = JSON.parse(document.getElementById('amenities-json').textContent);

const STORES = GAMEDATA;
const STORE_BY_ID = Object.fromEntries(STORES.map(s => [s.s, s]));
const MATES = PEOPLEDATA.mates;
const HOSTS = PEOPLEDATA.hosts;

const AXES = ['logic', 'heart', 'nerve', 'mech'];
const STAT_NAMES = { logic: '推理力', heart: '共情力', nerve: '膽識', mech: '策略力', rep: '名譽' };
const GENRE_LABELS = {
  all: '全部類型',
  logic: '推理還原',
  heart: '情感互動',
  nerve: '恐怖氛圍',
  mech: '機制陣營',
  fun: '歡樂搞笑',
  new: '新手入門',
  short: '4小時內'
};

const DIFF_LABELS = ['新手', '進階', '燒腦'];
const MONTHS = 36;
const RENT = 1000;

function getLevel(val) {
  return Math.min(10, Math.max(1, Math.floor(val / 10) + 1));
}

function getRepTitle(rep) {
  if (rep >= 85) return '【劇本殺傳奇 ★★★★★】';
  if (rep >= 70) return '【圈內名流 ★★★★】';
  if (rep >= 50) return '【常駐玩家 ★★★】';
  if (rep >= 30) return '【進階老手 ★★】';
  return '【入坑萌新 ★】';
}

function formatMoney(num) {
  return 'NT$ ' + Number(num).toLocaleString('en-US');
}

function formatClock(min) {
  const h = Math.floor(min / 60);
  const m = Math.floor(min % 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

function getDateLabel(day) {
  const m0 = 10 + day - 1;
  const y = 2026 + Math.floor(m0 / 12);
  const mo = (m0 % 12) + 1;
  return `${y}年${mo}月`;
}

// ==========================================
// 2. WEB AUDIO 8-BIT SYNTHESIZER
// ==========================================
const AudioEngine = {
  ctx: null,
  master: null,
  enabled: true,
  nextNoteTime: 0,
  step: 0,

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 0.35 : 0;
      this.master.connect(this.ctx.destination);
      setInterval(() => this.tickBgm(), 40);
    } catch (e) {
      this.ctx = null;
    }
  },

  toggle() {
    this.enabled = !this.enabled;
    if (this.master) this.master.gain.value = this.enabled ? 0.35 : 0;
    const btn = document.getElementById('btn-sound');
    if (btn) btn.textContent = this.enabled ? '♪ 音效 開' : '♪ 音效 關';
    showToast(this.enabled ? '聲音已開啟' : '聲音已靜音');
  },

  tone(freq, time, dur, type = 'square', vol = 0.1) {
    if (!this.ctx || !this.enabled) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(vol, time + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(time);
      osc.stop(time + dur + 0.03);
    } catch (e) {}
  },

  sfx(name) {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime + 0.01;
    const m2f = m => 440 * Math.pow(2, (m - 69) / 12);
    if (name === 'coin') {
      this.tone(m2f(83), now, 0.07, 'square', 0.12);
      this.tone(m2f(88), now + 0.07, 0.2, 'square', 0.12);
    } else if (name === 'levelup') {
      this.tone(m2f(72), now, 0.09, 'square', 0.14);
      this.tone(m2f(76), now + 0.09, 0.09, 'square', 0.14);
      this.tone(m2f(79), now + 0.18, 0.09, 'square', 0.14);
      this.tone(m2f(84), now + 0.27, 0.38, 'square', 0.16);
    } else if (name === 'stamp') {
      this.tone(m2f(67), now, 0.1, 'square', 0.14);
      this.tone(m2f(72), now + 0.1, 0.1, 'square', 0.14);
      this.tone(m2f(76), now + 0.2, 0.1, 'square', 0.14);
      this.tone(m2f(84), now + 0.35, 0.45, 'triangle', 0.18);
    } else if (name === 'win') {
      this.tone(m2f(79), now, 0.1, 'triangle', 0.15);
      this.tone(m2f(84), now + 0.1, 0.1, 'triangle', 0.15);
      this.tone(m2f(88), now + 0.2, 0.1, 'triangle', 0.15);
      this.tone(m2f(91), now + 0.3, 0.5, 'square', 0.16);
    } else if (name === 'lose') {
      this.tone(m2f(52), now, 0.25, 'sawtooth', 0.12);
      this.tone(m2f(48), now + 0.25, 0.25, 'sawtooth', 0.12);
      this.tone(m2f(45), now + 0.5, 0.6, 'sawtooth', 0.14);
    } else if (name === 'click') {
      this.tone(m2f(84), now, 0.035, 'square', 0.06);
    }
  },

  tickBgm() {
    if (!this.ctx || !this.enabled || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (this.nextNoteTime < now) this.nextNoteTime = now + 0.05;
    const m2f = m => 440 * Math.pow(2, (m - 69) / 12);
    const spb = 60 / 112 / 2;
    const melody = [72, 0, 74, 76, 0, 77, 76, 74, 72, 0, 71, 72, 0, 74, 0, 0, 69, 0, 72, 74, 0, 77, 76, 72, 74, 0, 72, 71, 0, 67, 0, 0];
    const bass = [41, 0, 53, 0, 41, 0, 53, 41, 40, 0, 52, 0, 45, 0, 57, 45, 38, 0, 50, 0, 38, 0, 50, 38, 43, 0, 55, 0, 48, 0, 60, 48];
    while (this.nextNoteTime < now + 0.15) {
      const idx = this.step % melody.length;
      if (melody[idx]) this.tone(m2f(melody[idx]), this.nextNoteTime, spb * 1.6, 'square', 0.025);
      if (bass[idx]) this.tone(m2f(bass[idx]), this.nextNoteTime, spb * 0.9, 'triangle', 0.065);
      this.nextNoteTime += spb;
      this.step++;
    }
  }
};

window.addEventListener('pointerdown', () => AudioEngine.init(), { once: true });
window.addEventListener('keydown', () => AudioEngine.init(), { once: true });

// ==========================================
// 3. GAME STATE (3D VERSION SAVE)
// ==========================================
const SAVE_KEY_3D = 'tplarp-3d-save-v1';

function getDefaultState() {
  return {
    name: '哆啦',
    look: 'm',
    day: 1,
    min: 9 * 60,
    money: 1500,
    hp: 100,
    rep: 50,
    stats: { logic: 20, heart: 20, nerve: 20, mech: 20 },
    played: {},
    storePlays: {},
    aff: {},
    party: [],
    wins: 0,
    mvp: 0,
    sessions: 0,
    earned: 0,
    weather: 'sun',
    insideStore: null
  };
}

let S = getDefaultState();

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY_3D);
    if (raw) {
      S = Object.assign(getDefaultState(), JSON.parse(raw));
    }
  } catch (e) {}
}

function saveState() {
  try {
    localStorage.setItem(SAVE_KEY_3D, JSON.stringify(S));
  } catch (e) {}
}

loadState();

// ==========================================
// 4. UI MANAGERS & RE-DESIGNED HUD
// ==========================================
function updateHUD() {
  document.getElementById('hud-date').textContent = getDateLabel(S.day);
  document.getElementById('hud-clock').textContent = formatClock(S.min);
  document.getElementById('hud-weather').textContent = S.weather === 'rain' ? '🌧️' : '☀️';
  document.getElementById('hud-money').textContent = formatMoney(S.money);

  const hpFill = document.getElementById('hud-hp-bar');
  const hpNum = document.getElementById('hud-hp-num');
  const clampedHp = Math.max(0, Math.min(100, S.hp));
  hpFill.style.width = clampedHp + '%';
  hpNum.textContent = Math.round(clampedHp);
  if (clampedHp <= 25) hpFill.classList.add('hp-low');
  else hpFill.classList.remove('hp-low');

  document.getElementById('hud-rep-val').textContent = S.rep;
  document.getElementById('hud-rep-title').textContent = getRepTitle(S.rep);

  document.getElementById('stat-logic').textContent = `Lv.${getLevel(S.stats.logic)} (${Math.round(S.stats.logic)})`;
  document.getElementById('stat-heart').textContent = `Lv.${getLevel(S.stats.heart)} (${Math.round(S.stats.heart)})`;
  document.getElementById('stat-nerve').textContent = `Lv.${getLevel(S.stats.nerve)} (${Math.round(S.stats.nerve)})`;
  document.getElementById('stat-mech').textContent = `Lv.${getLevel(S.stats.mech)} (${Math.round(S.stats.mech)})`;
  document.getElementById('stat-rep').textContent = S.rep;

  saveState();
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.opacity = '0'; }, 2400);
}

function openModal(title, sub, contentHtml, actionButtons = []) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-sub').textContent = sub || '';
  document.getElementById('modal-content').innerHTML = contentHtml;
  const actContainer = document.getElementById('modal-actions');
  actContainer.innerHTML = '';

  actionButtons.forEach(btnDef => {
    const btn = document.createElement('button');
    btn.className = btnDef.primary ? 'btn-primary' : 'btn-secondary';
    btn.textContent = btnDef.label;
    btn.onclick = () => {
      if (btnDef.onClick) btnDef.onClick();
      if (!btnDef.preventClose) closeModal();
    };
    actContainer.appendChild(btn);
  });

  document.getElementById('common-modal').hidden = false;
}

function closeModal() {
  document.getElementById('common-modal').hidden = true;
}

document.getElementById('modal-close-btn').onclick = closeModal;

function showCinematicCard(tag, title, text, btnLabel = '確認', onConfirm = null) {
  AudioEngine.sfx('win');
  document.getElementById('event-card-tag').textContent = tag || 'MILESTONE · 重要時刻';
  document.getElementById('event-card-title').textContent = title;
  document.getElementById('event-card-text').innerHTML = text;
  const btn = document.getElementById('event-card-btn');
  btn.textContent = btnLabel;
  btn.onclick = () => {
    document.getElementById('event-card-overlay').hidden = true;
    if (onConfirm) onConfirm();
  };
  document.getElementById('event-card-overlay').hidden = false;
}

// ==========================================
// 5. THREE.JS 3D SCENE & ENGINE
// ==========================================
const canvas = document.getElementById('webgl');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#0a1124');
scene.fog = new THREE.FogExp2('#0a1124', 0.012);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.5, 300);
const CAM_OFFSET = new THREE.Vector3(22, 30, 24);
let cameraMode = 'iso';
let controls = null;
if (typeof THREE.OrbitControls !== 'undefined') {
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enabled = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
}

const ambientLight = new THREE.AmbientLight('#a5b4fc', 0.55);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight('#fff7ed', 1.25);
sunLight.position.set(30, 50, 30);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 160;
sunLight.shadow.camera.left = -45;
sunLight.shadow.camera.right = 45;
sunLight.shadow.camera.top = 45;
sunLight.shadow.camera.bottom = -45;
sunLight.shadow.bias = -0.0005;
scene.add(sunLight);

const hemiLight = new THREE.HemisphereLight('#818cf8', '#1e1b4b', 0.4);
scene.add(hemiLight);

function updateDayNightCycle() {
  const tFrac = (S.min - 9 * 60) / (15 * 60);
  const angle = Math.PI * 0.15 + tFrac * Math.PI * 0.7;
  sunLight.position.x = Math.cos(angle) * 60;
  sunLight.position.y = Math.sin(angle) * 55;
  sunLight.position.z = Math.sin(angle * 0.8) * 45;

  if (S.min < 11 * 60) {
    sunLight.color.set('#fde68a');
    ambientLight.color.set('#c7d2fe');
    sunLight.intensity = 1.1;
  } else if (S.min < 17 * 60) {
    sunLight.color.set('#ffffff');
    ambientLight.color.set('#e0e7ff');
    sunLight.intensity = 1.35;
  } else if (S.min < 19 * 60) {
    sunLight.color.set('#f97316');
    ambientLight.color.set('#a855f7');
    sunLight.intensity = 0.9;
  } else {
    sunLight.color.set('#38bdf8');
    ambientLight.color.set('#1e1b4b');
    sunLight.intensity = 0.35;
  }
}

// ==========================================
// 6. 3D CITY MAP BUILDER (TAIPEI DISTRICT)
// ==========================================
const cityGroup = new THREE.Group();
scene.add(cityGroup);
const interactiveObjects = [];

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(160, 160),
  new THREE.MeshStandardMaterial({ color: '#13192e', roughness: 0.88, metalness: 0.1 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
cityGroup.add(ground);

const roadMat = new THREE.MeshStandardMaterial({ color: '#1f293d', roughness: 0.9 });
const sidewalkMat = new THREE.MeshStandardMaterial({ color: '#2e3a59', roughness: 0.75 });

function createRoadSegment(x, z, w, h) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), roadMat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.02, z);
  mesh.receiveShadow = true;
  cityGroup.add(mesh);
}

createRoadSegment(0, 0, 150, 10);
createRoadSegment(0, 0, 10, 150);
createRoadSegment(0, -32, 150, 8);
createRoadSegment(0, 32, 150, 8);
createRoadSegment(-32, 0, 8, 150);
createRoadSegment(32, 0, 8, 150);

for (let bx = -48; bx <= 48; bx += 32) {
  for (let bz = -48; bz <= 48; bz += 32) {
    if (Math.abs(bx) === 0 && Math.abs(bz) === 0) continue;
    const sw = new THREE.Mesh(new THREE.BoxGeometry(22, 0.3, 22), sidewalkMat);
    sw.position.set(bx, 0.15, bz);
    sw.receiveShadow = true;
    cityGroup.add(sw);
  }
}

const treeTrunkMat = new THREE.MeshStandardMaterial({ color: '#543d2b', roughness: 0.9 });
const treeFoliageMat = new THREE.MeshStandardMaterial({ color: '#10b981', roughness: 0.6 });

function plantTree(x, z) {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.8, 6), treeTrunkMat);
  trunk.position.y = 0.9;
  trunk.castShadow = true;
  tree.add(trunk);

  const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4, 1), treeFoliageMat);
  foliage.position.y = 2.4;
  foliage.castShadow = true;
  tree.add(foliage);

  tree.position.set(x, 0, z);
  cityGroup.add(tree);
}

[[-8, -8], [8, -8], [-8, 8], [8, 8], [-24, 2], [24, 2], [2, 24], [2, -24]].forEach(([tx, tz]) => plantTree(tx, tz));

const bldMat1 = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.7 });
const bldMat2 = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.6 });

function buildBlockBuilding(x, z, w, d, h) {
  const bGroup = new THREE.Group();
  const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), Math.random() < 0.5 ? bldMat1 : bldMat2);
  baseMesh.position.y = h / 2;
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  bGroup.add(baseMesh);

  const parapet = new THREE.Mesh(new THREE.BoxGeometry(w, 0.4, d), new THREE.MeshStandardMaterial({ color: '#0f172a' }));
  parapet.position.y = h + 0.2;
  bGroup.add(parapet);

  const ac = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.2), new THREE.MeshStandardMaterial({ color: '#64748b' }));
  ac.position.set((Math.random() - 0.5) * (w - 2), h + 0.4, (Math.random() - 0.5) * (d - 2));
  ac.castShadow = true;
  bGroup.add(ac);

  bGroup.position.set(x, 0, z);
  cityGroup.add(bGroup);
}

const bldBlocks = [
  [-48, -48], [-16, -48], [16, -48], [48, -48],
  [-48, -16], [48, -16],
  [-48, 16], [48, 16],
  [-48, 48], [-16, 48], [16, 48], [48, 48]
];
bldBlocks.forEach(([bx, bz]) => {
  const h = 8 + Math.floor(Math.random() * 12);
  buildBlockBuilding(bx, bz, 16, 16, h);
});

// ==========================================
// 7. 14 REAL LARP STORES (3D LANDMARKS)
// ==========================================
const storeMeshes = [];

STORES.forEach(st => {
  const sGroup = new THREE.Group();
  const sMat = new THREE.MeshStandardMaterial({ color: st.col, roughness: 0.5, metalness: 0.2 });
  const sBld = new THREE.Mesh(new THREE.BoxGeometry(7, 5.5, 7), sMat);
  sBld.position.y = 2.75;
  sBld.castShadow = true;
  sBld.receiveShadow = true;
  sGroup.add(sBld);

  const door = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 3.2),
    new THREE.MeshStandardMaterial({ color: '#ffd25e', emissive: '#ffd25e', emissiveIntensity: 0.6 })
  );
  door.position.set(0, 1.6, 3.52);
  sGroup.add(door);

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, 1.1, 0.4),
    new THREE.MeshStandardMaterial({ color: st.accent, emissive: st.accent, emissiveIntensity: 1.2 })
  );
  sign.position.set(0, 4.8, 3.7);
  sGroup.add(sign);

  const marker = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.7, 0),
    new THREE.MeshStandardMaterial({ color: st.accent, emissive: st.accent, emissiveIntensity: 1.5, wireframe: true })
  );
  marker.position.set(0, 7.2, 0);
  sGroup.add(marker);

  sGroup.position.set(st.x, 0, st.z);
  cityGroup.add(sGroup);

  const poiObj = {
    type: 'store',
    data: st,
    pos: new THREE.Vector3(st.x, 0, st.z),
    marker: marker,
    interact: () => enterStore(st)
  };
  interactiveObjects.push(poiObj);
  storeMeshes.push(poiObj);
});

// ==========================================
// 8. LIFE AMENITIES
// ==========================================
AMENITIES.forEach(am => {
  const aGroup = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: am.col, roughness: 0.4, emissive: am.col, emissiveIntensity: 0.35 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(4, 3.5, 4), mat);
  mesh.position.y = 1.75;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  aGroup.add(mesh);

  const ent = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 2.4),
    new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff', emissiveIntensity: 0.5 })
  );
  ent.position.set(0, 1.2, 2.02);
  aGroup.add(ent);

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(3, 0.7, 0.3),
    new THREE.MeshStandardMaterial({ color: '#fff', emissive: am.col, emissiveIntensity: 0.8 })
  );
  sign.position.set(0, 3.2, 2.1);
  aGroup.add(sign);

  aGroup.position.set(am.x, 0, am.z);
  cityGroup.add(aGroup);

  interactiveObjects.push({
    type: am.type,
    data: am,
    pos: new THREE.Vector3(am.x, 0, am.z),
    interact: () => interactAmenity(am)
  });
});

// ==========================================
// 9. 3D CHIBI CHARACTERS & ANIMATION
// ==========================================
function createChibiModel(hairColor = '#3b2818', jacketColor = '#3b82f6', isLongHair = false) {
  const model = new THREE.Group();

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshStandardMaterial({ color: '#ffe4c4', roughness: 0.8 }));
  head.position.y = 1.6;
  head.castShadow = true;
  model.add(head);

  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.86, isLongHair ? 0.7 : 0.4, 0.86), new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.6 }));
  hair.position.set(0, 1.85, isLongHair ? 0.05 : 0);
  model.add(hair);

  const eyeMat = new THREE.MeshBasicMaterial({ color: '#1e1b4b' });
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.05), eyeMat);
  eyeL.position.set(-0.2, 1.6, 0.41);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.2;
  model.add(eyeL);
  model.add(eyeR);

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.75, 0.45), new THREE.MeshStandardMaterial({ color: jacketColor, roughness: 0.7 }));
  body.position.y = 0.95;
  body.castShadow = true;
  model.add(body);

  const legMat = new THREE.MeshStandardMaterial({ color: '#1e293b' });
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.6, 0.25), legMat);
  legL.position.set(-0.18, 0.3, 0);
  legL.castShadow = true;
  const legR = legL.clone();
  legR.position.x = 0.18;
  model.add(legL);
  model.add(legR);

  const armMat = new THREE.MeshStandardMaterial({ color: jacketColor });
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.2), armMat);
  armL.position.set(-0.46, 0.9, 0);
  armL.castShadow = true;
  const armR = armL.clone();
  armR.position.x = 0.46;
  model.add(armL);
  model.add(armR);

  return {
    group: model,
    head, body, legL, legR, armL, armR,
    animTime: 0,
    animateWalk(speed = 1) {
      this.animTime += speed * 0.15;
      const swing = Math.sin(this.animTime);
      this.legL.rotation.x = swing * 0.65;
      this.legR.rotation.x = -swing * 0.65;
      this.armL.rotation.x = -swing * 0.55;
      this.armR.rotation.x = swing * 0.55;
      this.body.position.y = 0.95 + Math.abs(swing) * 0.08;
    },
    resetIdle() {
      this.legL.rotation.x = 0;
      this.legR.rotation.x = 0;
      this.armL.rotation.x = 0;
      this.armR.rotation.x = 0;
      this.body.position.y = 0.95;
    }
  };
}

const playerModel = createChibiModel('#3a2416', '#3b82f6', S.look === 'f');
playerModel.group.position.set(0, 0, 0);
scene.add(playerModel.group);

const player = {
  pos: new THREE.Vector3(0, 0, 0),
  targetPos: new THREE.Vector3(0, 0, 0),
  moving: false,
  speed: 7.5,
  model: playerModel
};

const MATE_COLORS = {
  'Mei': '#f59e0b', '智': '#14b8a6', '九九': '#f97316', '比爾': '#3b82f6',
  'Yuhan': '#a855f7', '樂': '#f43f5e', '大發': '#10b981', '瑄': '#eab308',
  '露露': '#ec4899', '琳琳': '#8b5cf6', 'Emo鴨': '#06b6d4', '一安': '#0284c7',
  'Lydia': '#6366f1', '枰梓': '#84cc16', '團子': '#38bdf8'
};

const npcList = [];
MATES.forEach((m, idx) => {
  const angle = (idx / MATES.length) * Math.PI * 2;
  const radius = 14 + (idx % 3) * 8;
  const nx = Math.cos(angle) * radius;
  const nz = Math.sin(angle) * radius;

  const col = MATE_COLORS[m.name] || '#64748b';
  const mModel = createChibiModel('#271b12', col, idx % 2 === 0);
  mModel.group.position.set(nx, 0, nz);
  scene.add(mModel.group);

  const npcObj = {
    name: m.name,
    data: m,
    model: mModel,
    pos: new THREE.Vector3(nx, 0, nz),
    targetPos: new THREE.Vector3(nx, 0, nz),
    homePos: new THREE.Vector3(nx, 0, nz),
    moving: false,
    patrolTimer: Math.random() * 5,
    interact: () => talkToMate(m)
  };
  npcList.push(npcObj);
  interactiveObjects.push(npcObj);
});

// ==========================================
// 10. 3D STORE INTERIOR SYSTEM (SEAMLESS ZOOM)
// ==========================================
let currentInsideStore = null;
const roomGroup = new THREE.Group();
roomGroup.position.set(0, -60, 0);
scene.add(roomGroup);

function buildStoreInteriorRoom() {
  roomGroup.clear();

  const rFloor = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), new THREE.MeshStandardMaterial({ color: '#271e1b', roughness: 0.6 }));
  rFloor.rotation.x = -Math.PI / 2;
  rFloor.receiveShadow = true;
  roomGroup.add(rFloor);

  const wallMat = new THREE.MeshStandardMaterial({ color: '#16192b', roughness: 0.8 });
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(18, 7, 0.4), wallMat);
  backWall.position.set(0, 3.5, -9);
  backWall.receiveShadow = true;
  roomGroup.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7, 18), wallMat);
  leftWall.position.set(-9, 3.5, 0);
  leftWall.receiveShadow = true;
  roomGroup.add(leftWall);

  const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 0.3, 24), new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.5 }));
  tableTop.position.y = 1.4;
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  roomGroup.add(tableTop);

  const tableLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 1.4, 12), new THREE.MeshStandardMaterial({ color: '#291104' }));
  tableLeg.position.y = 0.7;
  roomGroup.add(tableLeg);

  const scriptCardMat = new THREE.MeshStandardMaterial({ color: '#ffd25e' });
  for (let i = 0; i < 6; i++) {
    const sc = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 1.1), scriptCardMat);
    const a = (i / 6) * Math.PI * 2;
    sc.position.set(Math.cos(a) * 2.2, 1.58, Math.sin(a) * 2.2);
    sc.rotation.y = -a;
    roomGroup.add(sc);
  }

  const hostModel = createChibiModel('#1e1b4b', '#d97706', true);
  hostModel.group.position.set(0, 0, -2.6);
  roomGroup.add(hostModel.group);

  const spotLight = new THREE.SpotLight('#fde047', 2.2, 25, Math.PI / 4, 0.4);
  spotLight.position.set(0, 9, 0);
  spotLight.target = tableTop;
  spotLight.castShadow = true;
  roomGroup.add(spotLight);
}
buildStoreInteriorRoom();

function enterStore(st) {
  AudioEngine.sfx('stamp');
  currentInsideStore = st;
  S.insideStore = st.s;
  S.storePlays[st.s] = (S.storePlays[st.s] || 0);

  document.getElementById('room-ui').hidden = false;
  document.getElementById('hud-location').textContent = st.n + ' · 店內';
  showToast(`歡迎來到「${st.n}」！`);
}

function exitStore() {
  AudioEngine.sfx('click');
  currentInsideStore = null;
  S.insideStore = null;
  document.getElementById('room-ui').hidden = true;
  document.getElementById('hud-location').textContent = '台北車站 · 忠孝西路';
  showToast('回到了台北街頭。');
}

document.getElementById('btn-room-exit').onclick = exitStore;
document.getElementById('btn-room-scripts').onclick = () => {
  if (currentInsideStore) openScriptBrowser(currentInsideStore);
};
document.getElementById('btn-room-host').onclick = () => {
  if (currentInsideStore) {
    const host = HOSTS.find(h => (h.venues || []).includes(currentInsideStore.n)) || HOSTS[0];
    talkToHost(host, currentInsideStore);
  }
};
document.getElementById('btn-room-job').onclick = () => {
  if (currentInsideStore) doStaffJob(currentInsideStore);
};

// ==========================================
// 11. SCRIPT BROWSING, PLAYING & CRITICAL MOMENT
// ==========================================
let currentFilter = 'all';

function openScriptBrowser(st) {
  AudioEngine.sfx('click');
  const scripts = st.c || [];

  const renderCards = (filt) => {
    const filtered = scripts.filter(sc => {
      const tags = (sc[1] || '').split(',');
      const dur = sc[2] || 4;
      const df = sc[3];
      if (filt === 'short' && dur > 4) return false;
      if (filt === 'new' && df !== 0 && !tags.some(t => /新手/.test(t))) return false;
      if (filt === 'logic' && !tags.some(t => /推理|還原|本格|硬核/.test(t))) return false;
      if (filt === 'heart' && !tags.some(t => /情感|沉浸|立意|哭/.test(t))) return false;
      if (filt === 'nerve' && !tags.some(t => /恐怖|驚悚|微恐|靈異/.test(t))) return false;
      if (filt === 'mech' && !tags.some(t => /機制|陣營|博弈/.test(t))) return false;
      if (filt === 'fun' && !tags.some(t => /歡樂|搞笑|鬧/.test(t))) return false;
      return true;
    });

    return filtered.slice(0, 80).map((sc, i) => {
      const title = sc[0];
      const tags = sc[1] || '劇本殺';
      const dur = sc[2] || 4;
      const price = Math.round(dur * 160);
      const isPlayed = S.played[title];
      return `
        <div class="script-card" onclick="inspectScript('${st.s}', ${i})">
          <div>
            <div class="t">${title} ${isPlayed ? '<span style="color:#10b981;font-size:12px">✓ 玩過</span>' : ''}</div>
            <div class="meta">${tags.split(',').slice(0, 3).join('・')} · ${dur}小時</div>
          </div>
          <div class="price">NT$ ${price}</div>
        </div>
      `;
    }).join('');
  };

  const chipsHtml = Object.entries(GENRE_LABELS).map(([k, label]) => `
    <button class="chip ${currentFilter === k ? 'active' : ''}" onclick="filterScripts('${st.s}', '${k}')">${label}</button>
  `).join('');

  const bodyHtml = `
    <div class="chips-bar" id="script-chips">${chipsHtml}</div>
    <div class="script-list" id="script-cards-container">${renderCards(currentFilter)}</div>
  `;

  openModal(st.n + ' · 劇本庫', `共收錄 ${scripts.length} 本劇本`, bodyHtml, [
    { label: '關閉', primary: false }
  ]);
}

window.filterScripts = function(storeId, filt) {
  AudioEngine.sfx('click');
  currentFilter = filt;
  const st = STORE_BY_ID[storeId];
  if (st) openScriptBrowser(st);
};

window.inspectScript = function(storeId, idx) {
  AudioEngine.sfx('click');
  const st = STORE_BY_ID[storeId];
  const sc = st.c[idx];
  const title = sc[0];
  const tags = sc[1] || '經典';
  const dur = sc[2] || 4;
  const df = sc[3] != null ? sc[3] : 1;
  const price = Math.round(dur * 160);
  const costHp = Math.round(dur * 9);

  const baseChance = 0.55 + (getLevel(S.stats.logic) - 1) * 0.05;
  const winPercent = Math.min(95, Math.max(30, Math.round(baseChance * 100)));

  const detailHtml = `
    <div style="display:flex;flex-direction:column;gap:10px">
      <div style="font-size:16px;color:#fff;font-weight:700">《${title}》</div>
      <div style="color:var(--text-dim)">標籤：${tags}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;background:rgba(255,255,255,0.04);padding:12px;border-radius:10px">
        <div>時長：<b style="color:#fff">${dur} 小時</b></div>
        <div>難度：<b style="color:#fff">${DIFF_LABELS[df]}</b></div>
        <div>費用：<b style="color:var(--gold)">NT$ ${price}</b></div>
        <div>體力消耗：<b style="color:#f43f5e">-${costHp}</b></div>
        <div>預估破案把握：<b style="color:#10b981">${winPercent}%</b></div>
        <div>同車車友：<b style="color:#a855f7">${S.party.length ? S.party.join('、') : '路人拼車'}</b></div>
      </div>
      ${S.hp < costHp ? '<p style="color:#f43f5e">⚠️ 體力不足，請先吃便當或回家休息！</p>' : ''}
      ${S.money < price ? '<p style="color:#f43f5e">⚠️ 金錢不足，請先打工賺錢！</p>' : ''}
    </div>
  `;

  openModal('劇本詳情', st.n, detailHtml, [
    {
      label: '開本遊玩！',
      primary: true,
      onClick: () => triggerPlayScript(st, sc, price, costHp, winPercent),
      preventClose: true
    },
    { label: '返回列表', primary: false, onClick: () => openScriptBrowser(st) }
  ]);
};

function triggerPlayScript(st, sc, price, costHp, winChance) {
  S.money -= price;
  S.hp -= costHp;
  S.min += Math.round(sc[2] * 60);
  updateHUD();

  const dilemmas = [
    {
      q: '【關鍵一刻 · 盤凶驗證】命案現場桌上有一杯剛沖好的熱咖啡與半燃的雪茄，死者脖子上有勒痕，死者究竟死於何時？',
      opts: [
        { t: '兇手刻意佈置延遲機關，利用冰塊融化爭取不在場證明！', winBonus: 25 },
        { t: '死者死前有第二位密訪者，抽雪茄的是另一個人。', winBonus: 10 },
        { t: '看同車老手的臉色，跟著全場一起投嫌疑最大的人。', winBonus: -5 }
      ]
    },
    {
      q: '【關鍵一刻 · 靈魂獨白】最後一幕，面對與你訣別的至親，你的最後一句獨白是……',
      opts: [
        { t: '笑著流淚，默默把溫熱的圍巾披在對方肩上。（全場淚目）', winBonus: 20 },
        { t: '聲嘶力竭質問命運的殘酷，將積壓十年的悔恨傾瀉而出！', winBonus: 15 },
        { t: '低頭不敢直視，尷尬地念完了角色台詞。', winBonus: 0 }
      ]
    },
    {
      q: '【關鍵一刻 · 談判背刺】最後一輪陣營決戰，敵方代表偷偷塞給你 3 枚籌碼要你倒戈背刺……',
      opts: [
        { t: '信守盟約！當場揭穿敵方陰謀，率領隊友絕地反攻！', winBonus: 20 },
        { t: '果斷背刺！收下籌碼暗算隊友，奪下全場唯一生存獎盃！', winBonus: 25 },
        { t: '猶豫不決，錯過投票時機，兩邊討好反而全盤皆輸。', winBonus: -15 }
      ]
    }
  ];

  const dilemma = dilemmas[Math.floor(Math.random() * dilemmas.length)];

  const optsHtml = dilemma.opts.map((op) => `
    <button class="dialog-opt-btn" onclick="resolveCriticalMoment('${st.s}', '${sc[0]}', ${winChance}, ${op.winBonus})">
      ${op.t}
    </button>
  `).join('');

  openModal('劇本殺進行中……', sc[0], `
    <div style="font-size:15px;line-height:1.7;color:#fff">
      <p style="margin-bottom:12px">${dilemma.q}</p>
      <div class="dialog-options">${optsHtml}</div>
    </div>
  `, []);
}

window.resolveCriticalMoment = function(storeId, title, winChance, bonus) {
  closeModal();
  const st = STORE_BY_ID[storeId];
  const finalPercent = Math.min(95, Math.max(10, winChance + bonus));
  const isWin = Math.random() * 100 < finalPercent;
  const isMvp = isWin && Math.random() < 0.35;

  S.stats.logic += isWin ? 6 : 3;
  S.stats.heart += isWin ? 5 : 2;
  S.stats.nerve += isWin ? 4 : 2;
  S.stats.mech += isWin ? 5 : 2;
  S.rep = Math.min(100, S.rep + (isWin ? 2 : 1) + (isMvp ? 2 : 0));
  S.played[title] = (S.played[title] || 0) + 1;
  S.sessions++;
  if (isWin) S.wins++;
  if (isMvp) S.mvp++;

  S.party.forEach(name => {
    S.aff[name] = Math.min(100, (S.aff[name] || 0) + 8);
  });

  AudioEngine.sfx(isWin ? 'win' : 'lose');

  showCinematicCard(
    isWin ? '🏆 破案成功 · 完美結局' : '🌧️ 兇手逃逸 · 遺憾結算',
    `《${title}》復盤散場！`,
    `
      <p style="margin-bottom:10px">${isWin ? '你敏銳洞察真相，精準鎖凶，同桌玩家紛紛為你鼓掌！' : '關鍵時刻差了一步，真兇帶走秘密銷聲匿跡……但依然是一場精彩的體驗。'}</p>
      ${isMvp ? '<p style="color:var(--gold);font-weight:700">★ 全桌投票一致推選你為本場 MVP！</p>' : ''}
      <div style="margin-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;text-align:left;background:rgba(0,0,0,0.3);padding:10px;border-radius:10px">
        <div>推理力：+${isWin ? 6 : 3}</div>
        <div>共情力：+${isWin ? 5 : 2}</div>
        <div>名譽：+${isWin ? 2 : 1}</div>
        <div>獲得印章：<b>${st.n}</b></div>
      </div>
    `,
    '散場打卡',
    () => {
      updateHUD();
      AudioEngine.sfx('stamp');
      showToast(`已蓋上「${st.n}」店章！`);
    }
  );
};

// ==========================================
// 12. LIFE ACTIVITIES & AMENITIES
// ==========================================
function interactAmenity(am) {
  AudioEngine.sfx('click');
  if (am.type === 'home') {
    openModal('你的雅房', '台北車站旁的小房間', `
      <p style="margin-bottom:12px">月租 NT$ ${RENT.toLocaleString()}。在這裡可以小睡 2 小時或直接睡到下個月出門。</p>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="dialog-opt-btn" onclick="doNap()">小睡 2 小時（恢復 25 體力）</button>
        <button class="dialog-opt-btn" onclick="doSleepMonth()">睡到下個月（付房租 NT$1,000，體力回滿）</button>
      </div>
    `, [{ label: '出門' }]);
  } else if (am.type === 'food') {
    openModal('排骨便當店', '台北道地便當', `
      <p style="margin-bottom:12px">老闆：「吃飽才有力氣盤邏輯！要點什麼？」</p>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="dialog-opt-btn" onclick="eatFood(100, 25, '排骨便當')">排骨便當 (NT$100，+25 體力)</button>
        <button class="dialog-opt-btn" onclick="eatFood(130, 35, '雞腿便當')">雞腿便當 (NT$130，+35 體力)</button>
      </div>
    `, [{ label: '離開' }]);
  } else if (am.type === 'tea') {
    openModal('手搖飲料店', '波霸鮮奶茶', `
      <p style="margin-bottom:12px">店員：「大杯波霸奶茶，甜度冰塊可以調整喔！」</p>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="dialog-opt-btn" onclick="drinkBoba()">買珍奶喝 (NT$65，+12 體力)</button>
        <button class="dialog-opt-btn" onclick="workShift(205, 10, '手搖飲店')">手搖店打工 4 小時 (賺 NT$820)</button>
      </div>
    `, [{ label: '離開' }]);
  } else if (am.type === 'conv') {
    openModal('7-ELEVEN', '24 小時便利商店', `
      <p style="margin-bottom:12px">店員：「歡迎光臨！」</p>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="dialog-opt-btn" onclick="eatFood(45, 10, '鮪魚御飯糰')">買御飯糰 (NT$45，+10 體力)</button>
        <button class="dialog-opt-btn" onclick="workShift(196, 8, '便利商店')">大夜打工 4 小時 (賺 NT$784)</button>
      </div>
    `, [{ label: '離開' }]);
  } else if (am.type === 'tutor') {
    const canTutor = getLevel(S.stats.logic) >= 3;
    openModal('南陽街家教中心', '數理家教職缺', `
      <p style="margin-bottom:12px">班主任：「我們需要推理邏輯強的老師，教國中生數理解題。」</p>
      <p style="color:var(--text-dim);margin-bottom:12px">條件：推理力需達 Lv.3 (你目前 Lv.${getLevel(S.stats.logic)})</p>
      ${canTutor ? '<button class="btn-primary" onclick="doTutor()">開始上課 2 小時 (賺 NT$1,100)</button>' : '<p style="color:#f43f5e">尚未達到推理力門檻，多玩推理本再來吧！</p>'}
    `, [{ label: '離開' }]);
  } else if (am.type === 'deli') {
    openModal('外送接單站', '台北外送機車特遣隊', `
      <p style="margin-bottom:12px">站長：「今天有一批中山區急單，騎車跑一趟大概 2 小時，賺 NT$650。」</p>
      <button class="btn-primary" onclick="doDelivery()">接單出發！(耗費 18 體力)</button>
    `, [{ label: '先不接' }]);
  } else if (am.type === 'mrt') {
    openModal('台北捷運站', '悠遊卡刷卡進站', `
      <p style="margin-bottom:12px">選擇捷運目的地站點快速傳送（車資 NT$25）：</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <button class="dialog-opt-btn" onclick="mrtTravel(-20, -10, '中山站')">中山站 (近 夢迴)</button>
        <button class="dialog-opt-btn" onclick="mrtTravel(16, 8, '松江南京站')">松江南京站 (近 410檔案室)</button>
        <button class="dialog-opt-btn" onclick="mrtTravel(24, -12, '忠孝復興站')">忠孝復興站 (近 玩硬)</button>
        <button class="dialog-opt-btn" onclick="mrtTravel(-12, 16, '西門站')">西門站 (近 優雅謀殺)</button>
      </div>
    `, [{ label: '不搭了' }]);
  }
}

window.doNap = function() {
  closeModal();
  S.min += 120;
  S.hp = Math.min(100, S.hp + 25);
  updateHUD();
  showToast('小睡了一覺，精神好多了！(+25 體力)');
};

window.doSleepMonth = function() {
  closeModal();
  S.money -= RENT;
  S.hp = 100;
  S.day++;
  S.min = 9 * 60;
  S.weather = Math.random() < 0.3 ? 'rain' : 'sun';
  updateHUD();
  AudioEngine.sfx('levelup');

  if (S.day > MONTHS) {
    triggerGameEnding();
  } else {
    showCinematicCard(
      '📅 新的月份開始',
      `${getDateLabel(S.day)} 清晨`,
      `<p>已繳納本月房租 NT$ 1,000。體力全數回滿，整裝出發！</p>`
    );
  }
};

window.eatFood = function(price, hpGain, name) {
  closeModal();
  if (S.money < price) {
    showToast('錢不夠！先去打工賺錢吧。');
    return;
  }
  S.money -= price;
  S.hp = Math.min(100, S.hp + hpGain);
  S.min += 30;
  AudioEngine.sfx('coin');
  updateHUD();
  showToast(`享用了「${name}」！(+${hpGain} 體力)`);
};

window.drinkBoba = function() {
  closeModal();
  if (S.money < 65) return showToast('錢不夠！');
  S.money -= 65;
  S.hp = Math.min(100, S.hp + 12);
  S.min += 20;
  AudioEngine.sfx('coin');
  updateHUD();
  showToast('甜甜的珍奶讓人心情大好！(+12 體力)');
};

window.workShift = function(wage, hpCost, name) {
  closeModal();
  if (S.hp < hpCost * 4) return showToast('體力太低了，無法打工！');
  const pay = wage * 4;
  S.money += pay;
  S.earned += pay;
  S.hp -= hpCost * 4;
  S.min += 240;
  AudioEngine.sfx('coin');
  updateHUD();
  showToast(`完成 ${name} 打工！領取薪資 NT$ ${pay.toLocaleString()}`);
};

window.doTutor = function() {
  closeModal();
  if (S.hp < 18) return showToast('體力太低了！');
  S.money += 1100;
  S.earned += 1100;
  S.hp -= 18;
  S.min += 120;
  S.stats.logic += 3;
  AudioEngine.sfx('coin');
  updateHUD();
  showToast('家教順利結束！領取報酬 NT$ 1,100 (推理力 +3)');
};

window.doDelivery = function() {
  closeModal();
  if (S.hp < 18) return showToast('體力太低了！');
  S.money += 650;
  S.earned += 650;
  S.hp -= 18;
  S.min += 120;
  AudioEngine.sfx('coin');
  updateHUD();
  showToast('外送成功送達！賺取 NT$ 650');
};

window.mrtTravel = function(tx, tz, name) {
  closeModal();
  if (S.money < 25) return showToast('悠遊卡餘額不足！');
  S.money -= 25;
  S.min += 15;
  player.pos.set(tx, 0, tz);
  player.targetPos.set(tx, 0, tz);
  playerModel.group.position.set(tx, 0, tz);
  AudioEngine.sfx('click');
  updateHUD();
  showToast(`搭乘捷運抵達「${name}」！`);
};

// ==========================================
// 13. COMPANIONS (MATES) & HOSTS DIALOGUE
// ==========================================
function talkToMate(m) {
  AudioEngine.sfx('click');
  const aff = S.aff[m.name] || 0;
  const inParty = S.party.includes(m.name);

  openModal(m.name, `車友 · 好感度 ♥ ${aff}`, `
    <div class="dialog-layout">
      <div class="avatar-col">
        <div class="avatar-box">🎭</div>
        <div class="avatar-name">${m.name}</div>
        <div class="avatar-role">${m.pp ? m.pp.title : '常駐車友'}</div>
      </div>
      <div class="dialog-content">
        <p>「嗨！最近在台北玩了什麼好本嗎？有好玩的硬核本或陣營本記得揪我喔！」</p>
        <div class="dialog-options">
          <button class="dialog-opt-btn" onclick="togglePartyMate('${m.name}')">
            ${inParty ? '❌ 從同車隊伍中移除' : '✨ 邀請加入本月同車隊伍！'}
          </button>
          <button class="dialog-opt-btn" onclick="chatWithMate('${m.name}')">
            💬 閒聊劇本殺八卦（好感度 +5，時間 +30分）
          </button>
        </div>
      </div>
    </div>
  `, [{ label: '下次聊', primary: false }]);
}

window.togglePartyMate = function(name) {
  closeModal();
  if (S.party.includes(name)) {
    S.party = S.party.filter(n => n !== name);
    showToast(`已將 ${name} 從組隊名單移除。`);
  } else {
    if (S.party.length >= 3) {
      showToast('隊伍已滿（最多攜帶 3 位車友同行）！');
      return;
    }
    S.party.push(name);
    AudioEngine.sfx('levelup');
    showToast(`成功邀請 ${name} 加入隊伍！同桌玩本將有默契加成。`);
  }
  updateHUD();
};

window.chatWithMate = function(name) {
  closeModal();
  S.aff[name] = Math.min(100, (S.aff[name] || 0) + 5);
  S.min += 30;
  AudioEngine.sfx('coin');
  updateHUD();
  showToast(`與 ${name} 相談甚歡！(好感度 +5)`);
};

function talkToHost(h, st) {
  AudioEngine.sfx('click');
  openModal(h.name, `主持人 · ${st.n}`, `
    <div class="dialog-layout">
      <div class="avatar-col">
        <div class="avatar-box">🎩</div>
        <div class="avatar-name">${h.name}</div>
        <div class="avatar-role">專業劇本殺主持人</div>
      </div>
      <div class="dialog-content">
        <p>「歡迎來到 ${st.n}！每一本劇本都是一段不同的人生，祝你們今晚能在故事裡找到答案。」</p>
        <p style="color:var(--gold)">主持人私房密技：開場認真讀本，線索不要藏，復盤時往往有意想不到的彩蛋！</p>
      </div>
    </div>
  `, [{ label: '謝謝主持人', primary: true }]);
}

function doStaffJob(st) {
  closeModal();
  if (S.hp < 22) return showToast('體力不夠，無法當場務！');
  S.money += 1000;
  S.earned += 1000;
  S.hp -= 22;
  S.min += 240;
  S.stats.logic += 3;
  S.stats.heart += 3;
  S.rep = Math.min(100, S.rep + 1);
  AudioEngine.sfx('coin');
  updateHUD();
  showToast(`在「${st.n}」擔任場務客串 NPC！獲得 NT$ 1,000 (推理+3, 共情+3, 名譽+1)`);
}

// ==========================================
// 14. ADVENTURE JOURNAL & ONE-CLICK IG STORY CARD
// ==========================================
document.getElementById('btn-menu').onclick = openAdventureJournal;

function openAdventureJournal() {
  AudioEngine.sfx('click');
  const stampsHtml = STORES.map(st => {
    const isGot = S.storePlays[st.s] > 0;
    return `
      <div class="stamp-item ${isGot ? 'got' : ''}">
        <b>${isGot ? '★' : '☆'} ${st.short}</b>
        <span>${isGot ? '已解鎖' : '未造訪'}</span>
      </div>
    `;
  }).join('');

  const matesHtml = MATES.map(m => `
    <div style="font-size:13px;display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
      <span>${m.name}</span>
      <span style="color:#f43f5e">♥ ${S.aff[m.name] || 0}</span>
    </div>
  `).join('');

  const journalHtml = `
    <div style="display:flex;flex-direction:column;gap:14px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;background:rgba(255,255,255,0.04);padding:14px;border-radius:12px">
        <div>總遊玩場次：<b style="color:var(--gold)">${S.sessions} 本</b></div>
        <div>破案成功次數：<b style="color:#10b981">${S.wins} 次</b></div>
        <div>個人 MVP 次數：<b style="color:var(--gold)">${S.mvp} 次</b></div>
        <div>累計本錢收入：<b style="color:#38bdf8">NT$ ${S.earned.toLocaleString()}</b></div>
      </div>
      <div>
        <div style="font-weight:700;color:var(--gold);margin-bottom:6px">14 家台北劇本殺店章冊：</div>
        <div class="stamps-grid">${stampsHtml}</div>
      </div>
      <div>
        <div style="font-weight:700;color:var(--gold);margin-bottom:6px">車友羈絆好感度：</div>
        <div style="max-height:160px;overflow-y:auto">${matesHtml}</div>
      </div>
    </div>
  `;

  openModal('📱 冒險手冊 · 車友履歷', `${S.name} 的劇本殺生涯`, journalHtml, [
    {
      label: '📸 匯出個人履歷 (IG 限動 9:16 卡片)',
      primary: true,
      onClick: exportSocialCard,
      preventClose: true
    },
    { label: '關閉', primary: false }
  ]);
}

function exportSocialCard() {
  AudioEngine.sfx('levelup');
  const cv = document.createElement('canvas');
  cv.width = 1080;
  cv.height = 1920;
  const ctx = cv.getContext('2d');

  const bgGrad = ctx.createLinearGradient(0, 0, 0, 1920);
  bgGrad.addColorStop(0, '#0a1024');
  bgGrad.addColorStop(0.5, '#121b38');
  bgGrad.addColorStop(1, '#1e1136');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1080, 1920);

  ctx.strokeStyle = '#ffd25e';
  ctx.lineWidth = 6;
  ctx.strokeRect(40, 40, 1000, 1840);

  ctx.fillStyle = '#ffd25e';
  ctx.font = 'bold 36px "Noto Sans TC", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('DORA LARP · 劇本迷哆啦 3D', 540, 140);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 64px "Noto Sans TC", sans-serif';
  ctx.fillText('台北劇本殺人物履歷卡', 540, 230);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.fillRect(100, 300, 880, 240);
  ctx.strokeStyle = 'rgba(255, 210, 94, 0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(100, 300, 880, 240);

  ctx.fillStyle = '#ffd25e';
  ctx.font = 'bold 52px "Noto Sans TC", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(S.name, 160, 390);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '32px "Noto Sans TC", sans-serif';
  ctx.fillText(getRepTitle(S.rep), 160, 470);

  const stats = [
    ['推理力', `Lv.${getLevel(S.stats.logic)} (${Math.round(S.stats.logic)})`],
    ['共情力', `Lv.${getLevel(S.stats.heart)} (${Math.round(S.stats.heart)})`],
    ['膽識', `Lv.${getLevel(S.stats.nerve)} (${Math.round(S.stats.nerve)})`],
    ['策略力', `Lv.${getLevel(S.stats.mech)} (${Math.round(S.stats.mech)})`],
    ['總場次', `${S.sessions} 本`],
    ['勝率', `${S.sessions ? Math.round(S.wins / S.sessions * 100) : 0}%`]
  ];

  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.fillRect(100, 580, 880, 320);
  ctx.strokeRect(100, 580, 880, 320);

  stats.forEach(([label, val], i) => {
    const rx = 160 + (i % 2) * 440;
    const ry = 660 + Math.floor(i / 2) * 85;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '28px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, rx, ry);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(val, rx + 160, ry);
  });

  ctx.fillStyle = '#ffd25e';
  ctx.font = 'bold 38px "Noto Sans TC", sans-serif';
  ctx.fillText('14 家台北劇本殺店探索徽章', 100, 970);

  const stampsUnlocked = STORES.filter(s => S.storePlays[s.s] > 0).length;
  ctx.fillStyle = '#94a3b8';
  ctx.font = '28px "Noto Sans TC", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`已解鎖 ${stampsUnlocked} / 14 家`, 980, 970);

  STORES.forEach((st, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const sx = 100 + col * 225;
    const sy = 1010 + row * 100;
    const isGot = S.storePlays[st.s] > 0;

    ctx.fillStyle = isGot ? 'rgba(255, 210, 94, 0.16)' : 'rgba(255, 255, 255, 0.03)';
    ctx.fillRect(sx, sy, 205, 80);
    ctx.strokeStyle = isGot ? '#ffd25e' : 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, 205, 80);

    ctx.fillStyle = isGot ? '#ffffff' : '#64748b';
    ctx.font = 'bold 24px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(st.short, sx + 102, sy + 48);
  });

  ctx.fillStyle = '#ffd25e';
  ctx.font = 'bold 38px "Noto Sans TC", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('最佳默契車友 Top 3', 100, 1440);

  const sortedMates = MATES.slice().sort((a, b) => (S.aff[b.name] || 0) - (S.aff[a.name] || 0)).slice(0, 3);
  sortedMates.forEach((m, i) => {
    const mx = 100 + i * 300;
    const my = 1480;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(mx, my, 280, 140);
    ctx.strokeStyle = 'rgba(255, 210, 94, 0.3)';
    ctx.strokeRect(mx, my, 280, 140);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(m.name, mx + 140, my + 60);

    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 28px "Noto Sans TC", sans-serif';
    ctx.fillText(`♥ ${S.aff[m.name] || 0}`, mx + 140, my + 105);
  });

  ctx.fillStyle = '#94a3b8';
  ctx.font = '26px "Noto Sans TC", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('台北劇本殺物語 3D · 探索真實台北劇本世界', 540, 1760);
  ctx.fillStyle = '#6366f1';
  ctx.font = 'bold 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('dora-larp.dorashiue.workers.dev/game3d/', 540, 1810);

  const dataUrl = cv.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `台北劇本殺物語3D_${S.name}的車友履歷.png`;
  a.click();
  showToast('✓ 已成功生成並下載 9:16 IG 限動履歷圖！');
}

function triggerGameEnding() {
  S.ended = true;
  let endingTitle = '週末常駐玩家';
  let endingDesc = '三年來，你穿梭於台北的大街小巷，劇本殺早已成為你生活中最精彩的冒險。';

  const stampsCount = Object.keys(S.storePlays).length;
  if (stampsCount >= 14 && S.rep >= 70) {
    endingTitle = '台北劇本殺傳奇 KOL';
    endingDesc = '14 家店印章全部蓋滿！你的每一篇劇本心得都被各大劇團轉發，成為台北劇本殺圈的傳奇玩家。';
  } else if (getLevel(S.stats.logic) >= 8) {
    endingTitle = '本格派推土機名偵探';
    endingDesc = '三年來盤破上百條狡猾時間線，任何詭計在你眼前都無所遁形。店家遇到最難的密室都會請你來測本！';
  } else if (getLevel(S.stats.heart) >= 8) {
    endingTitle = '沉浸劇場金牌戲精';
    endingDesc = '你的每段獨白都讓全桌同車玩家為之動容、泣不成聲，被譽為「全台北最想同桌飆戲的催淚戰神」。';
  } else if (S.money >= 25000) {
    endingTitle = '劇本殺連鎖店老闆';
    endingDesc = '憑藉精準的商業眼光與好人緣，你在中山區開了自己的第一家劇本殺實境館，第一個月場次便全數爆滿！';
  }

  showCinematicCard(
    '🏁 三年旅程終局達成',
    endingTitle,
    `<p style="font-size:16px;line-height:1.8">${endingDesc}</p>`,
    '領取專屬履歷卡',
    () => {
      exportSocialCard();
    }
  );
}

// ==========================================
// 15. INPUT CONTROLS & CAMERA
// ==========================================
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === ' ' || e.key === 'Enter') {
    checkImmediateInteraction();
  }
});
window.addEventListener('keyup', e => {
  keys[e.key.toLowerCase()] = false;
});

document.querySelectorAll('.d-btn').forEach(btn => {
  btn.addEventListener('pointerdown', e => {
    e.preventDefault();
    const dir = btn.dataset.dir;
    if (dir === 'up') keys['w'] = true;
    if (dir === 'down') keys['s'] = true;
    if (dir === 'left') keys['a'] = true;
    if (dir === 'right') keys['d'] = true;
  });
  const cancelTouch = () => {
    const dir = btn.dataset.dir;
    if (dir === 'up') keys['w'] = false;
    if (dir === 'down') keys['s'] = false;
    if (dir === 'left') keys['a'] = false;
    if (dir === 'right') keys['d'] = false;
  };
  btn.addEventListener('pointerup', cancelTouch);
  btn.addEventListener('pointerleave', cancelTouch);
});

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('pointerdown', e => {
  if (e.target.closest('#hud') || e.target.closest('#mobile-pad') || e.target.closest('.modal-overlay') || e.target.closest('#room-ui')) return;
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects([ground]);
  if (intersects.length > 0) {
    const pt = intersects[0].point;
    player.targetPos.set(pt.x, 0, pt.z);
    player.moving = true;
  }
});

function checkImmediateInteraction() {
  if (currentInsideStore) return;
  let nearest = null;
  let minDist = 3.6;

  interactiveObjects.forEach(poi => {
    const d = poi.pos.distanceTo(player.pos);
    if (d < minDist) {
      minDist = d;
      nearest = poi;
    }
  });

  if (nearest && nearest.interact) {
    nearest.interact();
  }
}

document.getElementById('btn-cam').onclick = () => {
  if (cameraMode === 'iso') {
    cameraMode = 'orbit';
    if (controls) controls.enabled = true;
    document.getElementById('btn-cam').textContent = '📷 自由';
    showToast('切換為自由旋轉視角 (可用滑鼠旋轉縮放)');
  } else if (cameraMode === 'orbit') {
    cameraMode = 'top';
    if (controls) controls.enabled = false;
    document.getElementById('btn-cam').textContent = '📷 頂視';
    showToast('切換為戰術頂視圖');
  } else {
    cameraMode = 'iso';
    if (controls) controls.enabled = false;
    document.getElementById('btn-cam').textContent = '📷 俯視';
    showToast('切換為 45° 經典俯視視角');
  }
};

document.getElementById('btn-sound').onclick = () => AudioEngine.toggle();

// ==========================================
// 16. MAIN 3D RENDER LOOP
// ==========================================
let lastTime = performance.now();
const promptBubble = document.getElementById('prompt-bubble');
const promptText = document.getElementById('prompt-text');

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  updateDayNightCycle();

  if (currentInsideStore) {
    camera.position.lerp(new THREE.Vector3(0, -48, 14), 0.08);
    camera.lookAt(new THREE.Vector3(0, -58.5, 0));
    renderer.render(scene, camera);
    return;
  }

  const moveDir = new THREE.Vector3(0, 0, 0);
  if (keys['w'] || keys['arrowup']) moveDir.z -= 1;
  if (keys['s'] || keys['arrowdown']) moveDir.z += 1;
  if (keys['a'] || keys['arrowleft']) moveDir.x -= 1;
  if (keys['d'] || keys['arrowright']) moveDir.x += 1;

  if (moveDir.lengthSq() > 0) {
    moveDir.normalize();
    player.pos.addScaledVector(moveDir, player.speed * dt);
    player.targetPos.copy(player.pos);
    player.moving = true;

    const angle = Math.atan2(moveDir.x, moveDir.z);
    playerModel.group.rotation.y = angle;
    playerModel.animateWalk(player.speed);

    S.min += dt * 0.8;
  } else if (player.moving) {
    const diff = new THREE.Vector3().subVectors(player.targetPos, player.pos);
    const dist = diff.length();
    if (dist > 0.2) {
      diff.normalize();
      player.pos.addScaledVector(diff, player.speed * dt);
      playerModel.group.rotation.y = Math.atan2(diff.x, diff.z);
      playerModel.animateWalk(player.speed);
      S.min += dt * 0.8;
    } else {
      player.moving = false;
      playerModel.resetIdle();
    }
  } else {
    playerModel.resetIdle();
  }

  player.pos.x = Math.max(-65, Math.min(65, player.pos.x));
  player.pos.z = Math.max(-65, Math.min(65, player.pos.z));
  playerModel.group.position.copy(player.pos);

  if (cameraMode === 'iso') {
    const targetCam = player.pos.clone().add(CAM_OFFSET);
    camera.position.lerp(targetCam, 0.08);
    camera.lookAt(player.pos);
  } else if (cameraMode === 'top') {
    const targetCam = player.pos.clone().add(new THREE.Vector3(0, 48, 0.1));
    camera.position.lerp(targetCam, 0.08);
    camera.lookAt(player.pos);
  } else if (cameraMode === 'orbit') {
    if (controls) {
      controls.target.lerp(player.pos, 0.05);
      controls.update();
    }
  }

  npcList.forEach(npc => {
    npc.patrolTimer -= dt;
    if (npc.patrolTimer <= 0) {
      npc.patrolTimer = 3 + Math.random() * 6;
      npc.targetPos.set(
        npc.homePos.x + (Math.random() - 0.5) * 6,
        0,
        npc.homePos.z + (Math.random() - 0.5) * 6
      );
    }
    const d = npc.targetPos.distanceTo(npc.pos);
    if (d > 0.2) {
      const step = new THREE.Vector3().subVectors(npc.targetPos, npc.pos).normalize().multiplyScalar(2.4 * dt);
      npc.pos.add(step);
      npc.model.group.position.copy(npc.pos);
      npc.model.group.rotation.y = Math.atan2(step.x, step.z);
      npc.model.animateWalk(2.4);
    } else {
      npc.model.resetIdle();
    }
  });

  storeMeshes.forEach(sm => {
    if (sm.marker) sm.marker.rotation.y += dt * 1.5;
  });

  let nearestPoi = null;
  let minDist = 3.6;

  interactiveObjects.forEach(poi => {
    const d = poi.pos.distanceTo(player.pos);
    if (d < minDist) {
      minDist = d;
      nearestPoi = poi;
    }
  });

  if (nearestPoi) {
    const label = nearestPoi.type === 'store' ? `進入 ${nearestPoi.data.short}` :
                  nearestPoi.type === 'home' ? '回雅房休息' :
                  nearestPoi.name ? `與 ${nearestPoi.name} 交談` :
                  `使用 ${nearestPoi.data.name}`;
    promptText.textContent = label;

    const screenPos = nearestPoi.pos.clone().add(new THREE.Vector3(0, 3.2, 0)).project(camera);
    const sx = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-(screenPos.y * 0.5) + 0.5) * window.innerHeight;
    promptBubble.style.left = sx + 'px';
    promptBubble.style.top = sy + 'px';
    promptBubble.classList.add('show');
  } else {
    promptBubble.classList.remove('show');
  }

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

updateHUD();
animate();
showToast('✨ 歡迎來到《台北劇本殺物語 3D》！WASD 或點擊地面自由移動。');
