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

  playClick() { this.sfx('click'); },
  playLevel() { this.sfx('levelup'); },
  playCoin() { this.sfx('coin'); },
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

// ---------- 2.0 抽屜式卡片管理 (Bottom Sheet Manager) ----------
const bottomSheet = document.getElementById('bottom-sheet');
const sheetScrim = document.getElementById('sheet-scrim');
const sheetCloseBtn = document.getElementById('sheet-close-btn');

function openBottomSheet(title, sub, bodyHtml, actionButtons = []) {
  if (!bottomSheet) return;
  const t = document.getElementById('sheet-title');
  const s = document.getElementById('sheet-sub');
  const b = document.getElementById('sheet-body');
  const f = document.getElementById('sheet-footer');
  if (t) t.textContent = title;
  if (s) s.textContent = sub || '';
  if (b) b.innerHTML = bodyHtml;
  if (f) {
    f.innerHTML = '';
    actionButtons.forEach(btnDef => {
      const btn = document.createElement('button');
      btn.className = btnDef.primary ? 'btn-primary' : 'btn-secondary';
      btn.textContent = btnDef.label || btnDef.text;
      btn.onclick = () => {
        if (btnDef.onClick) btnDef.onClick();
        if (!btnDef.preventClose) closeBottomSheet();
      };
      f.appendChild(btn);
    });
  }
  bottomSheet.hidden = false;
  requestAnimationFrame(() => {
    bottomSheet.classList.add('open');
  });
}

function closeBottomSheet() {
  if (!bottomSheet) return;
  bottomSheet.classList.remove('open');
  setTimeout(() => {
    bottomSheet.hidden = true;
  }, 320);
}

if (sheetCloseBtn) sheetCloseBtn.onclick = closeBottomSheet;
if (sheetScrim) sheetScrim.onclick = closeBottomSheet;

// ---------- 2.0 鏡頭平滑過渡 (Camera Lerp / Tween) ----------
let cameraAnim = null; // { startPos, endPos, startLook, endLook, startTime, duration, onComplete }

function smoothMoveCamera(endPos, endLook, duration = 0.8, onComplete = null) {
  cameraAnim = {
    startPos: camera.position.clone(),
    endPos: endPos.clone(),
    startLook: (typeof currentLookTarget !== 'undefined' ? currentLookTarget : player.pos).clone(),
    endLook: endLook.clone(),
    startTime: performance.now(),
    duration: duration * 1000,
    onComplete
  };
}

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
// ==========================================
// 5. THREE.JS 3D SCENE & ENGINE (TAIPEI NIGHT DIORAMA)
// ==========================================
const canvas = document.getElementById('webgl');
const scene = new THREE.Scene();
// 台北夜霓虹 / 微醺懸疑背景色與漸層霧氣
scene.background = new THREE.Color('#12121c');
scene.fog = new THREE.FogExp2('#0e0e16', 0.015);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
// DPR 上限鎖死 2.0，兼顧手機極致流暢與省電
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

// 微縮模型透視相機 (Toytown / Orthographic-like Perspective)
const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.5, 300);
const CAM_OFFSET = new THREE.Vector3(25, 30, 26);
let currentLookTarget = new THREE.Vector3(0, 0, 0);
camera.position.copy(CAM_OFFSET);
camera.lookAt(currentLookTarget);
let cameraMode = 'iso';
let controls = null;

// 行動端手勢與視角限制 (鎖定最美觀的微縮模型視角)
if (typeof THREE.OrbitControls !== 'undefined') {
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enabled = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minPolarAngle = 0.52;                 // 限制最小俯角，避免完全頂視
  controls.maxPolarAngle = 1.18;                 // 限制最大俯角，絕不穿透地表且保持立體感
  controls.minDistance = 14;                     // 限制最近距離
  controls.maxDistance = 55;                     // 限制最遠距離，避免迷失於虛無
}

// 輔助函式：建立接觸陰影 (Contact Shadow) 貼圖面片
function createContactShadow(radiusX = 4, radiusZ = 4, opacity = 0.52) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
  grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.65)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(c);
  const geo = new THREE.PlaneGeometry(radiusX, radiusZ);
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: opacity,
    depthWrite: false
  });
  const plane = new THREE.Mesh(geo, mat);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = 0.03;
  return plane;
}

// 輔助函式：建立 Fake Bloom (霓虹光暈精靈)
function createFakeBloom(colorHex = '#ffd25e', size = 3) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, colorHex);
  grad.addColorStop(0.35, colorHex);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    opacity: 0.78
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(size, size, 1);
  return sprite;
}

// 輔助函式：建立台北風格發光霓虹招牌材質 (Procedural CanvasTexture)
function createNeonSignTexture(text, fgColor = '#00f5d4', bgColor = '#090d18', isVertical = true) {
  const c = document.createElement('canvas');
  if (isVertical) {
    c.width = 128;
    c.height = 384;
  } else {
    c.width = 384;
    c.height = 128;
  }
  const ctx = c.getContext('2d');

  // 深色底板
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, c.width, c.height);

  // 霓虹邊框
  ctx.strokeStyle = fgColor;
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, c.width - 12, c.height - 12);

  // 內部白色高光細線
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 2;
  ctx.strokeRect(9, 9, c.width - 18, c.height - 18);

  // 霓虹文字發光
  ctx.shadowColor = fgColor;
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (isVertical) {
    ctx.font = 'bold 50px "Noto Sans TC", sans-serif';
    const chars = text.split('');
    const step = (c.height - 40) / chars.length;
    chars.forEach((ch, idx) => {
      ctx.fillText(ch, c.width / 2, 32 + step * (idx + 0.5));
    });
  } else {
    ctx.font = 'bold 46px "Noto Sans TC", sans-serif';
    ctx.fillText(text, c.width / 2, c.height / 2 + 2);
  }

  const texture = new THREE.CanvasTexture(c);
  texture.anisotropy = 4;
  return texture;
}

// 輔助函式：建立 3D POI 懸浮標記 (面具 / 放大鏡 / 鑰匙)
const animatedPins = [];

function create3DPOIPin(type = 'mask', color = '#ffb703') {
  const pinGroup = new THREE.Group();

  // 1. 地面環形光圈 (Glowing Base Ring)
  const ringGeo = new THREE.RingGeometry(0.85, 1.45, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  pinGroup.add(ring);

  // 2. 懸浮主體 (Floating Stem & Icon)
  const stem = new THREE.Group();
  stem.position.y = 3.6;

  // 圓形發光背景盾牌 (Speech Bubble Badge)
  const badgeGeo = new THREE.CylinderGeometry(1.25, 1.25, 0.22, 24);
  badgeGeo.rotateX(Math.PI / 2);
  const badgeMat = new THREE.MeshStandardMaterial({
    color: '#16192b',
    emissive: color,
    emissiveIntensity: 0.22,
    roughness: 0.35,
    metalness: 0.3
  });
  const badge = new THREE.Mesh(badgeGeo, badgeMat);
  stem.add(badge);

  // 盾牌外圍發光環
  const rimGeo = new THREE.TorusGeometry(1.28, 0.07, 8, 32);
  const rimMat = new THREE.MeshBasicMaterial({ color: color, blending: THREE.AdditiveBlending });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  stem.add(rim);

  // 下方小指標箭頭
  const tipGeo = new THREE.ConeGeometry(0.35, 0.7, 16);
  tipGeo.rotateZ(Math.PI);
  const tipMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.3 });
  const tip = new THREE.Mesh(tipGeo, tipMat);
  tip.position.y = -1.45;
  stem.add(tip);

  // 3. 3D 立體圖標 (Drama Mask / Magnifier / Key)
  if (type === 'mask') {
    // 🎭 3D 戲劇面具
    const maskGrp = new THREE.Group();
    const faceGeo = new THREE.SphereGeometry(0.72, 16, 12, 0, Math.PI, 0, Math.PI * 0.85);
    const faceMat = new THREE.MeshStandardMaterial({
      color: '#fef08a',
      emissive: '#d97706',
      emissiveIntensity: 0.35,
      roughness: 0.3
    });
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.rotation.y = -Math.PI / 2;
    face.scale.set(0.55, 1.15, 0.8);
    face.position.z = 0.15;
    maskGrp.add(face);

    // 雙眼孔 (暗色凹槽)
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#090d16' });
    const eyeGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.24, 8);
    const e1 = new THREE.Mesh(eyeGeo, eyeMat);
    e1.position.set(-0.24, 0.18, 0.4);
    e1.rotation.z = 0.25;
    const e2 = new THREE.Mesh(eyeGeo, eyeMat);
    e2.position.set(0.24, 0.18, 0.4);
    e2.rotation.z = -0.25;
    maskGrp.add(e1, e2);

    // 微笑嘴唇弧線
    const smileGeo = new THREE.TorusGeometry(0.22, 0.045, 8, 12, Math.PI * 0.85);
    const smile = new THREE.Mesh(smileGeo, eyeMat);
    smile.rotation.x = Math.PI;
    smile.position.set(0, -0.15, 0.4);
    maskGrp.add(smile);

    stem.add(maskGrp);
  } else if (type === 'magnifier') {
    // 🔍 3D 放大鏡
    const magGrp = new THREE.Group();
    const rimMGeo = new THREE.TorusGeometry(0.52, 0.07, 8, 24);
    const goldMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.8, roughness: 0.2 });
    const magRim = new THREE.Mesh(rimMGeo, goldMat);
    magRim.position.z = 0.18;
    magGrp.add(magRim);

    const lensGeo = new THREE.CircleGeometry(0.5, 20);
    const lensMat = new THREE.MeshStandardMaterial({ color: '#38bdf8', transparent: true, opacity: 0.65, roughness: 0.1 });
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.position.z = 0.18;
    magGrp.add(lens);

    const handleGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.65, 8);
    const woodMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.5 });
    const handle = new THREE.Mesh(handleGeo, woodMat);
    handle.rotation.z = -Math.PI / 4;
    handle.position.set(0.5, -0.5, 0.18);
    magGrp.add(handle);

    stem.add(magGrp);
  } else if (type === 'key') {
    // 🗝️ 3D 金色鑰匙
    const keyGrp = new THREE.Group();
    const bowGeo = new THREE.TorusGeometry(0.28, 0.06, 8, 20);
    const keyMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.8, roughness: 0.2 });
    const bow = new THREE.Mesh(bowGeo, keyMat);
    bow.position.set(0, 0.38, 0.18);
    keyGrp.add(bow);

    const shaftGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.85, 8);
    const shaft = new THREE.Mesh(shaftGeo, keyMat);
    shaft.position.set(0, -0.12, 0.18);
    keyGrp.add(shaft);

    const bit1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.07, 0.05), keyMat);
    bit1.position.set(0.1, -0.4, 0.18);
    keyGrp.add(bit1);

    stem.add(keyGrp);
  }

  pinGroup.add(stem);
  pinGroup.stem = stem;
  animatedPins.push(pinGroup);
  return pinGroup;
}

// 台北夜間氛圍光照配置 (微醺懸疑冷暖對比)
const ambientLight = new THREE.AmbientLight('#18182e', 0.85);
scene.add(ambientLight);

// 主方向月光與建築側光 (冷色調藍紫陰影)
const sunLight = new THREE.DirectionalLight('#6366f1', 1.05);
sunLight.position.set(35, 52, 35);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 160;
sunLight.shadow.camera.left = -50;
sunLight.shadow.camera.right = 50;
sunLight.shadow.camera.top = 50;
sunLight.shadow.camera.bottom = -50;
sunLight.shadow.bias = -0.0004;
scene.add(sunLight);

// 半球光 (天光深紫、地光墨黑)
const hemiLight = new THREE.HemisphereLight('#312e81', '#0a0a14', 0.55);
scene.add(hemiLight);

function updateDayNightCycle() {
  const tFrac = (S.min - 9 * 60) / (15 * 60);
  const angle = Math.PI * 0.15 + tFrac * Math.PI * 0.7;
  sunLight.position.x = Math.cos(angle) * 55;
  sunLight.position.y = Math.sin(angle) * 50;
  sunLight.position.z = Math.sin(angle * 0.8) * 40;

  if (S.min < 11 * 60) {
    sunLight.color.set('#fde68a');
    ambientLight.color.set('#272746');
    sunLight.intensity = 1.05;
  } else if (S.min < 17 * 60) {
    sunLight.color.set('#ffffff');
    ambientLight.color.set('#2e3058');
    sunLight.intensity = 1.25;
  } else if (S.min < 19 * 60) {
    sunLight.color.set('#f97316');
    ambientLight.color.set('#3b2d54');
    sunLight.intensity = 0.95;
  } else {
    // 台北夜間：深夜霓虹聚焦
    sunLight.color.set('#6366f1');
    ambientLight.color.set('#16162a');
    sunLight.intensity = 0.55;
  }
}

// ==========================================
// 6. 3D CITY MAP BUILDER (TAIPEI DISTRICT DIORAMA)
// ==========================================
const cityGroup = new THREE.Group();
scene.add(cityGroup);
const interactiveObjects = [];

// 1. 台北街區基座 (Diorama Base Platform)
const ground = new THREE.Mesh(
  new THREE.BoxGeometry(160, 1.2, 160),
  new THREE.MeshStandardMaterial({ color: '#0b0d17', roughness: 0.95, metalness: 0.05 })
);
ground.position.y = -0.6;
ground.receiveShadow = true;
cityGroup.add(ground);

// 柏油馬路材質 (深灰瀝青路面)
const roadMat = new THREE.MeshStandardMaterial({ color: '#161924', roughness: 0.92, metalness: 0.1 });
// 人行道材質 (台北經典灰色鋪面)
const sidewalkMat = new THREE.MeshStandardMaterial({ color: '#252a3a', roughness: 0.75, metalness: 0.1 });
// 路緣石 (Curb)
const curbMat = new THREE.MeshStandardMaterial({ color: '#383f56', roughness: 0.7 });

function createRoadSegment(x, z, w, h) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), roadMat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.02, z);
  mesh.receiveShadow = true;
  cityGroup.add(mesh);

  // 斑馬線 / 道路中心虛線 (Road markings)
  if (w > h) {
    const stripeCount = Math.floor(w / 6);
    for (let i = 0; i < stripeCount; i++) {
      const s = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 0.35),
        new THREE.MeshBasicMaterial({ color: '#cbd5e1' })
      );
      s.rotation.x = -Math.PI / 2;
      s.position.set(x - w / 2 + 3 + i * 6, 0.025, z);
      cityGroup.add(s);
    }
  } else {
    const stripeCount = Math.floor(h / 6);
    for (let i = 0; i < stripeCount; i++) {
      const s = new THREE.Mesh(
        new THREE.PlaneGeometry(0.35, 2.4),
        new THREE.MeshBasicMaterial({ color: '#cbd5e1' })
      );
      s.rotation.x = -Math.PI / 2;
      s.position.set(x, 0.025, z - h / 2 + 3 + i * 6);
      cityGroup.add(s);
    }
  }
}

// 主幹道十字交匯與次要巷弄
createRoadSegment(0, 0, 150, 11);
createRoadSegment(0, 0, 11, 150);
createRoadSegment(0, -32, 150, 8.5);
createRoadSegment(0, 32, 150, 8.5);
createRoadSegment(-32, 0, 8.5, 150);
createRoadSegment(32, 0, 8.5, 150);

// 人行道街區底座 (Sidewalk Blocks with Curb Bevel)
for (let bx = -48; bx <= 48; bx += 32) {
  for (let bz = -48; bz <= 48; bz += 32) {
    if (Math.abs(bx) === 0 && Math.abs(bz) === 0) continue;
    // 人行道厚度
    const sw = new THREE.Mesh(new THREE.BoxGeometry(21, 0.28, 21), sidewalkMat);
    sw.position.set(bx, 0.14, bz);
    sw.receiveShadow = true;
    cityGroup.add(sw);

    // 路緣石外框 (Curbs)
    const curb = new THREE.Mesh(new THREE.BoxGeometry(21.4, 0.3, 21.4), curbMat);
    curb.position.set(bx, 0.12, bz);
    cityGroup.add(curb);
  }
}

// 台北街頭特徵物件產生器 (Street Furniture)
// 1. 機車 (Scooter)
function createScooter(col = '#06b6d4') {
  const sGrp = new THREE.Group();
  const bMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.35 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.42, 1.2), bMat);
  body.position.y = 0.35;
  body.castShadow = true;
  sGrp.add(body);

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.65), new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.8 }));
  seat.position.set(0, 0.58, -0.15);
  sGrp.add(seat);

  const front = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.6, 0.28), bMat);
  front.position.set(0, 0.6, 0.45);
  sGrp.add(front);

  const headLight = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshBasicMaterial({ color: '#fef08a' }));
  headLight.position.set(0, 0.72, 0.6);
  sGrp.add(headLight);

  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.68, 6), new THREE.MeshStandardMaterial({ color: '#475569' }));
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, 0.95, 0.42);
  sGrp.add(bar);

  const wMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.9 });
  const wFront = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 10), wMat);
  wFront.rotation.z = Math.PI / 2;
  wFront.position.set(0, 0.18, 0.48);
  const wRear = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 10), wMat);
  wRear.rotation.z = Math.PI / 2;
  wRear.position.set(0, 0.18, -0.42);
  sGrp.add(wFront, wRear);

  sGrp.add(createContactShadow(0.8, 1.6, 0.4));
  return sGrp;
}

// 2. 台電彩繪變電箱 (Utility Power Box)
function createUtilityBox(col = '#2563eb') {
  const uGrp = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.25, 0.65), new THREE.MeshStandardMaterial({ color: col, roughness: 0.5 }));
  box.position.y = 0.65;
  box.castShadow = true;
  uGrp.add(box);

  const base = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.16, 0.75), new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.6 }));
  base.position.y = 0.08;
  uGrp.add(base);

  uGrp.add(createContactShadow(1.3, 1.1, 0.4));
  return uGrp;
}

// 3. 黃色工程路障 (Yellow Road Barrier)
function createRoadBarrier() {
  const bGrp = new THREE.Group();
  const barMat = new THREE.MeshStandardMaterial({ color: '#facc15', metalness: 0.4, roughness: 0.3 });

  const rTop = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 8), barMat);
  rTop.rotation.z = Math.PI / 2;
  rTop.position.y = 0.75;
  const rBot = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 8), barMat);
  rBot.rotation.z = Math.PI / 2;
  rBot.position.y = 0.25;
  bGrp.add(rTop, rBot);

  const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshStandardMaterial({ color: '#ca8a04', roughness: 0.5, side: THREE.DoubleSide }));
  panel.position.y = 0.5;
  bGrp.add(panel);

  const l1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.85, 8), barMat);
  l1.position.set(-0.85, 0.42, 0);
  const l2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.85, 8), barMat);
  l2.position.set(0.85, 0.42, 0);
  bGrp.add(l1, l2);

  return bGrp;
}

// 4. 台北溫暖路燈 (Taipei Warm Streetlamp with Light Cone)
function createStreetlamp(x, z) {
  const lGrp = new THREE.Group();
  lGrp.position.set(x, 0, z);

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.14, 4.8, 8),
    new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.7, roughness: 0.3 })
  );
  pole.position.y = 2.4;
  pole.castShadow = true;
  lGrp.add(pole);

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.2, 0.9),
    new THREE.MeshStandardMaterial({ color: '#1e293b' })
  );
  head.position.set(0, 4.8, 0.3);
  lGrp.add(head);

  // 暖光燈泡
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({ color: '#ffbe0b' }));
  bulb.position.set(0, 4.68, 0.3);
  lGrp.add(bulb);

  // Fake Bloom 暖色光暈
  const bloom = createFakeBloom('#ffbe0b', 2.8);
  bloom.position.set(0, 4.68, 0.3);
  lGrp.add(bloom);

  lGrp.add(createContactShadow(1.8, 1.8, 0.4));
  cityGroup.add(lGrp);
}

// 沿主要街道佈設路燈
[[-18, -6.5], [18, -6.5], [-18, 6.5], [18, 6.5], [-6.5, -18], [-6.5, 18], [6.5, -18], [6.5, 18]].forEach(([lx, lz]) => createStreetlamp(lx, lz));

// 5. 街頭機車海與變電箱造景佈置
const scooterColors = ['#06b6d4', '#ef4444', '#f59e0b', '#3b82f6', '#ec4899', '#f8fafc'];
[
  [12, 6.5, 0], [13.4, 6.5, 0.1], [14.8, 6.5, -0.05],
  [-12, -6.5, Math.PI], [-13.4, -6.5, Math.PI + 0.1],
  [6.5, 12, Math.PI / 2], [6.5, 13.5, Math.PI / 2 - 0.08],
  [-6.5, 20, -Math.PI / 2], [-6.5, 21.5, -Math.PI / 2]
].forEach(([sx, sz, rot], idx) => {
  const sc = createScooter(scooterColors[idx % scooterColors.length]);
  sc.position.set(sx, 0.15, sz);
  sc.rotation.y = rot;
  cityGroup.add(sc);
});

// 台電彩繪變電箱
const ub1 = createUtilityBox('#2563eb');
ub1.position.set(9.5, 0.15, 6.5);
const ub2 = createUtilityBox('#10b981');
ub2.position.set(10.6, 0.15, 6.5);
const ub3 = createUtilityBox('#f59e0b');
ub3.position.set(11.7, 0.15, 6.5);
cityGroup.add(ub1, ub2, ub3);

// 工程路障
const bar1 = createRoadBarrier();
bar1.position.set(-10, 0.15, 6.5);
const bar2 = createRoadBarrier();
bar2.position.set(-12, 0.15, 6.5);
cityGroup.add(bar1, bar2);

// 6. 街樹與盆栽造景
const treeTrunkMat = new THREE.MeshStandardMaterial({ color: '#452b1b', roughness: 0.9 });
const treeFoliageMat = new THREE.MeshStandardMaterial({ color: '#166534', roughness: 0.65 });

function plantTree(x, z) {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 2.2, 6), treeTrunkMat);
  trunk.position.y = 1.1;
  trunk.castShadow = true;
  tree.add(trunk);

  const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(1.5, 1), treeFoliageMat);
  foliage.position.y = 2.8;
  foliage.castShadow = true;
  tree.add(foliage);

  // 花台石座
  const planter = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 1.6), new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.7 }));
  planter.position.y = 0.2;
  tree.add(planter);

  tree.add(createContactShadow(3.2, 3.2, 0.45));
  tree.position.set(x, 0.15, z);
  cityGroup.add(tree);
}

[[-7, -7], [7, -7], [-7, 7], [7, 7], [-24, 6.5], [24, -6.5], [6.5, 24], [-6.5, -24]].forEach(([tx, tz]) => plantTree(tx, tz));

// 7. 台北背景建築群 (Background Shophouse Blocks)
const bldMat1 = new THREE.MeshStandardMaterial({ color: '#1e2436', roughness: 0.7 });
const bldMat2 = new THREE.MeshStandardMaterial({ color: '#272d42', roughness: 0.65 });
const bldMat3 = new THREE.MeshStandardMaterial({ color: '#191e2e', roughness: 0.75 });

function buildBlockBuilding(x, z, w, d, h) {
  const bGrp = new THREE.Group();
  const mat = [bldMat1, bldMat2, bldMat3][Math.floor(Math.random() * 3)];
  const bldg = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  bldg.position.y = h / 2;
  bldg.castShadow = true;
  bldg.receiveShadow = true;
  bGrp.add(bldg);

  // 女兒牆
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), new THREE.MeshStandardMaterial({ color: '#0f172a' }));
  parapet.position.y = h + 0.25;
  bGrp.add(parapet);

  // 屋頂設施：圓柱形白鐵水塔
  const tank = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 1.4, 12),
    new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.8, roughness: 0.2 })
  );
  tank.position.set((Math.random() - 0.5) * (w - 3), h + 0.9, (Math.random() - 0.5) * (d - 3));
  bGrp.add(tank);

  // 冷氣室外機
  const ac = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.8), new THREE.MeshStandardMaterial({ color: '#64748b' }));
  ac.position.set((Math.random() - 0.5) * (w - 3), h + 0.5, (Math.random() - 0.5) * (d - 3));
  bGrp.add(ac);

  bGrp.add(createContactShadow(w + 3, d + 3, 0.5));
  bGrp.position.set(x, 0, z);
  cityGroup.add(bGrp);
}

const bldBlocks = [
  [-48, -48], [-16, -48], [16, -48], [48, -48],
  [-48, -16], [48, -16],
  [-48, 16], [48, 16],
  [-48, 48], [-16, 48], [16, 48], [48, 48]
];
bldBlocks.forEach(([bx, bz]) => {
  const h = 9 + Math.floor(Math.random() * 11);
  buildBlockBuilding(bx, bz, 16, 16, h);
});

// ==========================================
// 7. 14 REAL LARP STORES (TAIPEI SHOPHOUSE ARCADES)
// ==========================================
const storeMeshes = [];

// 建立台北特色騎樓街屋 (Taipei Shophouse with Arcade & Neon Signs)
function createTaipeiStoreBuilding(st) {
  const bGrp = new THREE.Group();
  const w = 8.2;
  const d = 8.6;
  const h = 13.0; // 4 層樓高

  const wallMat = new THREE.MeshStandardMaterial({
    color: st.bgCol || '#1b2030',
    roughness: 0.65,
    metalness: 0.1
  });

  // 1. 一樓騎樓退縮空間 (Covered Arcade Walkway)
  // 後方內縮店面玻璃門
  const storeFront = new THREE.Mesh(
    new THREE.BoxGeometry(w, 3.4, d - 3.2),
    new THREE.MeshStandardMaterial({ color: '#131826', roughness: 0.5 })
  );
  storeFront.position.set(0, 1.7, -1.6);
  storeFront.castShadow = true;
  storeFront.receiveShadow = true;
  bGrp.add(storeFront);

  // 門口玻璃發光大門
  const door = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 2.8),
    new THREE.MeshStandardMaterial({
      color: '#fef08a',
      emissive: st.accent || '#f59e0b',
      emissiveIntensity: 0.75,
      roughness: 0.2
    })
  );
  door.position.set(0, 1.45, d / 2 - 3.19);
  bGrp.add(door);

  // 騎樓頂部天花板
  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(w, 0.35, 3.4), wallMat);
  ceiling.position.set(0, 3.3, d / 2 - 1.7);
  bGrp.add(ceiling);

  // 騎樓支撐方柱 (Square Pillars)
  const pMat = new THREE.MeshStandardMaterial({ color: '#2d3748', roughness: 0.7 });
  const pLeft = new THREE.Mesh(new THREE.BoxGeometry(0.55, 3.3, 0.55), pMat);
  pLeft.position.set(-w / 2 + 0.45, 1.65, d / 2 - 0.35);
  const pRight = new THREE.Mesh(new THREE.BoxGeometry(0.55, 3.3, 0.55), pMat);
  pRight.position.set(w / 2 - 0.45, 1.65, d / 2 - 0.35);
  bGrp.add(pLeft, pRight);

  // 騎樓盆栽造景
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.42, 8), new THREE.MeshStandardMaterial({ color: '#b45309' }));
  pot.position.set(-w / 2 + 1.1, 0.21, d / 2 - 0.35);
  const plant = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32), new THREE.MeshStandardMaterial({ color: '#15803d' }));
  plant.position.set(-w / 2 + 1.1, 0.52, d / 2 - 0.35);
  bGrp.add(pot, plant);

  // 2. 二至四樓公寓立面 (2F ~ 4F Facade)
  const upperGeo = new THREE.BoxGeometry(w, h - 3.4, d);
  const upper = new THREE.Mesh(upperGeo, wallMat);
  upper.position.set(0, 3.4 + (h - 3.4) / 2, 0);
  upper.castShadow = true;
  upper.receiveShadow = true;
  bGrp.add(upper);

  // 深開窗與暖黃夜間窗光
  const winGeo = new THREE.BoxGeometry(1.6, 1.5, 0.08);
  const winMatOn = new THREE.MeshStandardMaterial({
    color: '#fef08a',
    emissive: '#d97706',
    emissiveIntensity: 0.65,
    roughness: 0.2
  });
  const winMatOff = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    emissive: '#0f172a',
    emissiveIntensity: 0.1,
    roughness: 0.5
  });

  for (let fl = 0; fl < 3; fl++) {
    const yWin = 4.8 + fl * 2.8;
    const w1 = new THREE.Mesh(winGeo, Math.random() > 0.35 ? winMatOn : winMatOff);
    w1.position.set(-2.2, yWin, d / 2 + 0.02);
    const w2 = new THREE.Mesh(winGeo, Math.random() > 0.35 ? winMatOn : winMatOff);
    w2.position.set(2.2, yWin, d / 2 + 0.02);
    bGrp.add(w1, w2);

    // 冷氣室外機 (AC Units)
    if (fl % 2 === 0) {
      const ac = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 0.6, 0.45),
        new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.4, metalness: 0.3 })
      );
      ac.position.set(-0.6, yWin - 0.35, d / 2 + 0.25);
      bGrp.add(ac);
    }
  }

  // 3. 頂樓女兒牆與水塔
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.65, d + 0.2), wallMat);
  parapet.position.set(0, h + 0.32, 0);
  bGrp.add(parapet);

  const tank = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 0.75, 1.5, 14),
    new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.85, roughness: 0.2 })
  );
  tank.position.set(-2.1, h + 1.1, -1.6);
  bGrp.add(tank);

  // 4. 台北靈魂：凸出式直立懸掛霓虹招牌 (Vertical Blade Sign)
  const neonCol = st.col || '#00f5d4';
  const bladeTex = createNeonSignTexture(st.short, neonCol, '#090d16', true);
  const bladeGeo = new THREE.BoxGeometry(0.12, 5.0, 1.4);
  const bladeMat = new THREE.MeshStandardMaterial({
    map: bladeTex,
    emissive: neonCol,
    emissiveIntensity: 0.8,
    roughness: 0.2
  });
  const bladeSign = new THREE.Mesh(bladeGeo, bladeMat);
  bladeSign.position.set(w / 2 + 0.08, 7.5, d / 2 - 0.6);
  bGrp.add(bladeSign);

  // 招牌金屬固定橫桿 (Mounting Struts)
  const strutMat = new THREE.MeshStandardMaterial({ color: '#475569', metalness: 0.8 });
  const sTop = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.85, 6), strutMat);
  sTop.rotation.z = Math.PI / 2;
  sTop.position.set(w / 2 + 0.42, 9.4, d / 2 - 0.6);
  const sBot = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.85, 6), strutMat);
  sBot.rotation.z = Math.PI / 2;
  sBot.position.set(w / 2 + 0.42, 5.6, d / 2 - 0.6);
  bGrp.add(sTop, sBot);

  // 5. 頂樓橫式發光霓虹大燈箱 (Rooftop Lightbox Sign)
  const roofSignTex = createNeonSignTexture(`🎭 ${st.short}`, st.accent || '#ffd25e', '#0b0f19', false);
  const roofSignMat = new THREE.MeshStandardMaterial({
    map: roofSignTex,
    emissive: st.accent || '#ffd25e',
    emissiveIntensity: 0.85,
    roughness: 0.2
  });
  const roofSign = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.35, 0.35), roofSignMat);
  roofSign.position.set(0, h + 1.15, d / 2 - 0.2);
  bGrp.add(roofSign);

  // 6. 接觸陰影 (Contact Shadow)
  bGrp.add(createContactShadow(w + 3.5, d + 3.5, 0.55));

  // 7. 3D POI 懸浮標記 (門口前方的立體面具)
  const poiPin = create3DPOIPin('mask', neonCol);
  poiPin.position.set(0, 0, d / 2 + 2.2);
  bGrp.add(poiPin);

  // 8. 霓虹光柱 (供劇本類型篩選聯動)
  const beaconGeo = new THREE.CylinderGeometry(0.8, 1.4, 45, 16, 1, true);
  const beaconMat = new THREE.MeshBasicMaterial({
    color: st.accent || '#ffd25e',
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const beacon = new THREE.Mesh(beaconGeo, beaconMat);
  beacon.position.y = h + 22.5;
  beacon.visible = false;
  bGrp.add(beacon);

  bGrp.position.set(st.x, 0, st.z);
  cityGroup.add(bGrp);

  return {
    group: bGrp,
    bldgMat: wallMat,
    poiPin: poiPin,
    beacon: beacon,
    beaconMat: beaconMat
  };
}

STORES.forEach(st => {
  const bldgObj = createTaipeiStoreBuilding(st);

  const poiObj = {
    type: 'store',
    data: st,
    pos: new THREE.Vector3(st.x, 0, st.z),
    group: bldgObj.group,
    bldgMat: bldgObj.bldgMat,
    poiPin: bldgObj.poiPin,
    beacon: bldgObj.beacon,
    beaconMat: bldgObj.beaconMat,
    interact: () => {
      openStoreBottomSheet(st);
    }
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
// 8.5 空間微探索線索系統 (MINI-LARP CLUES)
// ==========================================
const CLUE_DEFINITIONS = [
  {
    id: 'clue_magnifier',
    name: '福爾摩斯的黃銅放大鏡',
    icon: '🔍',
    x: 18, z: 12,
    stat: 'logic',
    val: 5,
    col: '#38bdf8',
    desc: '在410檔案室後巷石階發現的微型放大鏡，鏡片依稀映著未解之謎。'
  },
  {
    id: 'clue_letter',
    name: '泛黃的告白手寫信',
    icon: '✉️',
    x: 6, z: -25,
    stat: 'heart',
    val: 5,
    col: '#f43f5e',
    desc: '從前從前門口櫻花樹下撿到的情書，字跡溫柔卻未曾寄出。'
  },
  {
    id: 'clue_cipher',
    name: '達文西機關密碼盒',
    icon: '🔐',
    x: 15, z: -21,
    stat: 'mech',
    val: 5,
    col: '#f59e0b',
    desc: '衛斯理天祥石柱旁遺落的黃銅齒輪盒，轉動時發出清脆金屬聲。'
  },
  {
    id: 'clue_candle',
    name: '不熄之微恐燭台',
    icon: '🕯️',
    x: 26, z: -15,
    stat: 'nerve',
    val: 5,
    col: '#10b981',
    desc: '玩硬劇本巷口的微恐道具燭台，在風中幽幽散發綠色微光。'
  }
];

const clueMeshes = [];

CLUE_DEFINITIONS.forEach(cDef => {
  const cGroup = new THREE.Group();
  cGroup.position.set(cDef.x, 0, cDef.z);

  // 浮動基座光環
  const ringGeo = new THREE.RingGeometry(0.3, 0.7, 24);
  const ringMat = new THREE.MeshBasicMaterial({ color: cDef.col, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  cGroup.add(ring);

  // 道具模型 (以低多邊形組合)
  const itemGeo = new THREE.OctahedronGeometry(0.45, 0);
  const itemMat = new THREE.MeshStandardMaterial({
    color: cDef.col,
    emissive: cDef.col,
    emissiveIntensity: 0.35,
    roughness: 0.3
  });
  const itemMesh = new THREE.Mesh(itemGeo, itemMat);
  itemMesh.position.y = 1.1;
  cGroup.add(itemMesh);

  // Fake Bloom
  const halo = createFakeBloom(cDef.col, 2.2);
  halo.position.y = 1.1;
  cGroup.add(halo);

  // 接觸陰影
  const cs = createContactShadow(1.4, 1.4, 0.5);
  cGroup.add(cs);

  scene.add(cGroup);

  const isCollected = S.clues && S.clues.includes(cDef.id);
  if (isCollected) cGroup.visible = false;

  const clueObj = {
    def: cDef,
    group: cGroup,
    itemMesh: itemMesh,
    pos: new THREE.Vector3(cDef.x, 0, cDef.z),
    interact: () => collectClue(cDef, clueObj)
  };

  clueMeshes.push(clueObj);

  interactiveObjects.push({
    type: 'clue',
    name: cDef.name,
    pos: clueObj.pos,
    interact: clueObj.interact
  });
});

function collectClue(cDef, clueObj) {
  if (!S.clues) S.clues = [];
  if (S.clues.includes(cDef.id)) return;

  S.clues.push(cDef.id);
  S[cDef.stat] = (S[cDef.stat] || 20) + cDef.val;
  clueObj.group.visible = false;
  AudioEngine.playLevel();
  saveState();
  updateHUD();

  showToast(`✨ 拾獲線索【${cDef.name}】！${STAT_NAMES[cDef.stat]} +${cDef.val}`);

  // 檢查是否集滿 4 個線索
  if (S.clues.length >= CLUE_DEFINITIONS.length) {
    setTimeout(() => {
      openEventCard(
        '🏆 解謎大師 · 全線索收集完成',
        '你在台北劇本殺街區成功破解了所有微型線索道具！獲得圈內傳奇稱號與專屬 9 折優惠代碼：【DORA3D90】。快向店家主持人出示領取專屬福利！',
        'MINI-LARP EASTER EGG'
      );
      S.rep = Math.min(100, S.rep + 15);
      saveState();
      updateHUD();
    }, 600);
  }
}

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


// 2.0 篩選視角聯動：劇本標籤聯動 3D 霓虹光柱與半透明聚焦
function apply3DFilterBeacons(filterType) {
  S.activeFilter = filterType;
  storeMeshes.forEach(sm => {
    const st = sm.data;
    if (filterType === 'all') {
      sm.bldgMat.opacity = 1.0;
      sm.bldgMat.transparent = false;
      if (sm.beacon) {
        sm.beacon.visible = false;
        sm.beaconMat.opacity = 0;
      }
      return;
    }

    // 檢查是否有對應類型的劇本
    const hasMatch = st.c && st.c.some(item => {
      const tags = (item[1] || '').toLowerCase();
      if (filterType === 'logic' && (tags.includes('推理') || tags.includes('還原') || tags.includes('硬核'))) return true;
      if (filterType === 'heart' && (tags.includes('情感') || tags.includes('沉浸') || tags.includes('立意'))) return true;
      if (filterType === 'nerve' && (tags.includes('恐怖') || tags.includes('驚悚') || tags.includes('變格'))) return true;
      if (filterType === 'mech' && (tags.includes('機制') || tags.includes('陣營') || tags.includes('博弈'))) return true;
      return false;
    });

    if (hasMatch) {
      sm.bldgMat.opacity = 1.0;
      sm.bldgMat.transparent = false;
      if (sm.beacon) {
        sm.beacon.visible = true;
        sm.beaconMat.opacity = 0.65;
        // 依類型改變光柱色彩
        if (filterType === 'logic') sm.beaconMat.color.set('#38bdf8');
        else if (filterType === 'heart') sm.beaconMat.color.set('#f43f5e');
        else if (filterType === 'nerve') sm.beaconMat.color.set('#a855f7');
        else if (filterType === 'mech') sm.beaconMat.color.set('#f59e0b');
      }
    } else {
      // 非選中店家半透明暗化
      sm.bldgMat.transparent = true;
      sm.bldgMat.opacity = 0.32;
      if (sm.beacon) {
        sm.beacon.visible = false;
        sm.beaconMat.opacity = 0;
      }
    }
  });
}

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


// 2.0 右下角「重設視角」一鍵復位
document.getElementById('btn-reset-cam').onclick = () => {
  cameraMode = 'iso';
  if (controls) controls.enabled = false;
  document.getElementById('btn-cam').textContent = '📷 俯視';
  smoothMoveCamera(
    player.pos.clone().add(CAM_OFFSET),
    player.pos.clone(),
    0.75
  );
  showToast('🧭 視角已重設為最佳等角視角。');
};

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

  // 2.0 相機平滑插值動畫 (Camera Tween)
  if (cameraAnim) {
    const elapsed = performance.now() - cameraAnim.startTime;
    const progress = Math.min(elapsed / cameraAnim.duration, 1.0);
    // Ease-in-out cosine curve
    const ease = 0.5 - 0.5 * Math.cos(progress * Math.PI);

    camera.position.lerpVectors(cameraAnim.startPos, cameraAnim.endPos, ease);
    currentLookTarget.lerpVectors(cameraAnim.startLook, cameraAnim.endLook, ease);
    camera.lookAt(currentLookTarget);

    if (progress >= 1.0) {
      if (cameraAnim.onComplete) cameraAnim.onComplete();
      cameraAnim = null;
    }
  } else if (cameraMode === 'iso') {
    const targetCam = player.pos.clone().add(CAM_OFFSET);
    camera.position.lerp(targetCam, 0.08);
    currentLookTarget.lerp(player.pos, 0.08);
    camera.lookAt(currentLookTarget);
  } else if (cameraMode === 'top') {
    const targetCam = player.pos.clone().add(new THREE.Vector3(0, 48, 0.1));
    camera.position.lerp(targetCam, 0.08);
    currentLookTarget.lerp(player.pos, 0.08);
    camera.lookAt(currentLookTarget);
  } else if (cameraMode === 'orbit') {
    if (controls) {
      controls.target.lerp(player.pos, 0.05);
      controls.update();
    }
  }

  // 2.0 3D POI 互動標記立體懸浮浮動動效
  animatedPins.forEach((pin, pIdx) => {
    if (pin.stem) {
      pin.stem.position.y = 3.6 + Math.sin(now * 0.0028 + pIdx * 0.8) * 0.22;
      pin.stem.rotation.y = Math.sin(now * 0.0015 + pIdx) * 0.25;
    }
  });

  // 2.0 線索道具微旋轉與懸浮動效
  clueMeshes.forEach(cm => {
    if (cm.group.visible) {
      cm.itemMesh.rotation.y += dt * 2.2;
      cm.itemMesh.position.y = 1.1 + Math.sin(now * 0.003 + cm.pos.x) * 0.12;
    }
  });

  // 2.0 霓虹光柱動態脈衝
  storeMeshes.forEach(sm => {
    if (sm.beacon && sm.beacon.visible) {
      sm.beacon.rotation.y += dt * 0.6;
      sm.beaconMat.opacity = 0.5 + Math.sin(now * 0.004) * 0.22;
    }
  });

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
