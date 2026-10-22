/* Kencana Melati · tur 3D V4.0 (three.js r170, modul ES; dependensi dipetakan oleh importmap di tur-3d.html) */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const RENDER = location.hash === '#render';
if (RENDER) document.body.classList.add('render');
const msgEl = document.getElementById('msg');
const fail = t => { msgEl.textContent = t; };
try { await Promise.race([Promise.all(['600 40px "Cormorant Garamond"', '500 20px Jost'].map(f => document.fonts.load(f))), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}

/* ================= DATA RUANG (dari denah "Lantai 3", AutoCAD 1:100) — REVISI 2 =================
   Sumbu x = kiri → kanan gambar (eskalator → inti lift), z = atas → bawah gambar, y = tinggi.
   Titik nol = sudut dalam kiri-atas Ruang Balai Pertemuan (garis dalam dinding kiri).
   Semua angka diukur ulang dari denah 400 dpi; toleransi pembacaan ±0,1–0,2 m.              */
const CH = 5.0;                           // tinggi plafon Balai & Serbaguna: ASUMSI, tidak ada di denah
const CHL = 3.6;                          // tinggi plafon foyer, lobi lift, restoran: ASUMSI
const BL = 32.67, BZ0 = 0.2, BD = 13.8;   // Balai: x 0–32,67, z 0,2–13,8 (muka dalam)
const PT = 0.32, SZ0 = 14.12, SZ1 = 22.63, SX1 = 32.6; // partisi 13,8–14,12; Serbaguna z 14,12–22,63
const DOORS = [10.89, 19.53], DW = 1.9;  // Pintu 1 (kiri, sekunder) & Pintu 2 (kanan, utama): bukaan bersih 1 900 mm
const SVC = [2.45, 4.25];                 // pintu servis di dinding kanan Balai (ke koridor pantry)
const ESC = { x0: 0.78, x1: 4.52, z0: 12.56, z1: 20.1 }; // sumur eskalator (menjorok ke sudut kiri-bawah Balai)
const PIER = { x0: 1.03, x1: 1.56, z0: 11.22, z1: 12.56 }; // pilaster di sudut kiri-bawah Balai
const COLR = [[1.6,1.6],[6.55,1.6],[15.2,1.6],[23.75,1.6],[6.55,12.15],[15.2,12.15],[23.8,12.15]]; // kolom bulat Ø0,95
const COLE = [[32.45,1.6],[32.45,12.15]];  // kolom menempel dinding kanan Balai
const COLS = [[6.55,20.8],[15.2,20.8],[24.0,20.8]]; // kolom persegi Serbaguna ±0,8 m
const VOID = { x0: 23.5, x1: 29.3, z0: 22.85, z1: 29.2 };
const LOBBY = { x0: 29.3, x1: 32.5, z0: 20.45, z1: 29.4 }; // lobi lift 3,23 m
const CORE = { x0: 32.5, x1: 41.3, z0: 20.45, z1: 30.3 };
const LIFTZ = [22.25, 25.1, 27.9];          // tiga lift orang, pintu menghadap ke kiri (ke void)
const FOY = { x0: 32.6, x1: 38.5, z0: 12.0, z1: 20.45 };  // foyer depan tangga oval
const OVAL = { x0: 38.5, x1: 46.6, z0: 12.7, z1: 20.45, m0: 15.45, m1: 17.7 }; // ruang tangga oval, mulut di sisi kiri
const REST = { x0: 23.6, x1: 50.0, z0: 29.4, z1: 38.3 };  // Restoran Spesial
const ZC = 6.9;                            // sumbu tengah aisle & panggung
const ST = { x0: 2.1, x1: 6.1, z0: 2.4, z1: 11.4, h: 0.6 }; // panggung 4,0 × 9,0 × 0,6 m di ujung KIRI Balai
const STX = 7.15;                          // kaki tangga depan (3 anak tangga 350 mm, 4 tanjakan 150 mm)
const BAND = { x0: 8.4, x1: 13.2, z0: 10.4, z1: 12.8, h: 0.4 }; // V4.0: band 4,8 × 2,4 m (5–6 personel), punggung ke Pintu 1; jalur tamu salaman di depannya
const VVIPT = [[30.1,2.3],[27.0,4.1],[30.1,5.9],[27.0,7.7],[30.1,9.5],[27.0,11.3]]; // V3.0: 6 meja Ø1,8 m zigzag (denah moodboard hlm 3), jarak antarmeja ±3,6 m
const RESTT = [28.2,32.6,37.0,41.4,45.8];  // 5 meja restoran pada z 33,9
const AK = { ox: 0, oz: 46, L: 8.0, D: 9.0, H: 3.4 };         // V4.0: ruang akad ±72 m² (taksiran pemilik), 40 tamu

/* ================= RENDERER ================= */
const stage = document.getElementById('stage');
let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: RENDER }); }
catch (e) { fail('Perangkat ini tidak mendukung WebGL. Buka di laptop atau PC dengan Chrome atau Edge terbaru.'); throw e; }
const coarse = matchMedia('(pointer:coarse)').matches || Math.min(innerWidth, innerHeight) < 600;
let hiQ = !coarse || RENDER; // V3.0: render selalu kualitas tinggi (pantulan melamin aktif)
renderer.setPixelRatio(Math.min(devicePixelRatio, hiQ ? 2 : 1.25));
renderer.setSize(stage.clientWidth, stage.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping; // V3.0: netral (ACES menggeser merah ke oranye-cokelat)
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e0306);
scene.fog = new THREE.FogExp2(0x1c0609, 0.0045);
const camera = new THREE.PerspectiveCamera(50, stage.clientWidth / stage.clientHeight, 0.05, 300);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI / 2 + 0.2; controls.minDistance = 0.25; controls.maxDistance = 80;
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.16;

/* ================= UTIL ================= */
const V3 = THREE.Vector3;
let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const rr = (a, b) => a + rnd() * (b - a);
function cnv(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h, c); return c; }
function tex(c, { srgb = true, rep = null } = {}) { const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; }
const col = h => new THREE.Color(h);

/* palet moodboard (disampel dari kolom COLOR PALETTE pada moodboard dekor) */
const P = { wine: '#51051A', mauve: '#9A585D', blush: '#D4A59D', ivory: '#DFCDBA', gold: '#987E55',
  burg: '#75162D', deep: '#3B010B', champ: '#F2E5C6', sand: '#F2D9A0', petal: '#EDE3D3', green: '#455747', green2: '#33402F',
  // palet pemilik (moodboard PPTX slide 4): primer cream/maroon/emas karamel, sekunder dusty rose & hijau hutan
  cream: '#F4E8D8', maroon: '#5A1F22', caramel: '#C8A26A', rose: '#C79B9A', forest: '#203F09',
  // token revisi V2.0
  darkMaroon: '#560818', champBeige: '#E8DCCB', sandGold: '#E2D9A0', antique: '#987E55', foliage: '#455747' };

/* ================= TEKSTUR PROSEDURAL ================= */
// ukiran filigri: topeng putih (bagian kayu) di atas hitam (lubang tembus)
function filigreeMask(w, h, { cell = 120, border = 30, tree = false, arch = null, dense = 1 } = {}) {
  return cnv(w, h, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
    const archPath = (inset) => { // kontur pelengkung mengikuti bentuk panel
      g.beginPath();
      if (arch === 'kayon') { const hw = w / 2 - inset; g.moveTo(w / 2 - hw, h - inset); g.lineTo(w / 2 - hw, h * 0.5); g.bezierCurveTo(w / 2 - hw, h * 0.22, w / 2 - w * 0.16 + inset * 0.3, h * 0.14 + inset * 0.6, w / 2, inset * 1.2); g.bezierCurveTo(w / 2 + w * 0.16 - inset * 0.3, h * 0.14 + inset * 0.6, w / 2 + hw, h * 0.22, w / 2 + hw, h * 0.5); g.lineTo(w / 2 + hw, h - inset); g.closePath(); }
      else if (arch === 'round') { const r = w / 2 - inset; g.moveTo(inset, h - inset); g.lineTo(inset, w / 2); g.arc(w / 2, w / 2, r, Math.PI, 0, false); g.lineTo(w - inset, h - inset); g.closePath(); }
      else { g.rect(inset, inset, w - inset * 2, h - inset * 2); }
    };
    g.lineWidth = border; archPath(border / 2); g.stroke();
    g.lineWidth = 7; archPath(border * 1.7); g.stroke();
    // butiran manik di dalam bingkai
    // isian pola: dihitung separuh kiri lalu dicerminkan
    g.save(); archPath(border * 2.1); g.clip();
    const x0 = 0, y0 = 0;
    for (let r = 0, y = y0 - cell / 2; y < h + cell; r++, y += cell * 0.86) {
      for (let x = x0 - cell / 2 + (r % 2) * cell / 2; x < w / 2 + cell; x += cell) {
        const R = cell * 0.27;
        g.lineWidth = 7 * dense;
        for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; g.beginPath(); g.arc(x + Math.cos(a) * R * 0.9, y + Math.sin(a) * R * 0.9, R, 0, Math.PI * 2); g.stroke(); }
        g.beginPath(); g.arc(x, y, R * 0.32, 0, Math.PI * 2); g.fill();
        g.lineWidth = 5 * dense; g.beginPath(); g.moveTo(x + R * 1.5, y); g.bezierCurveTo(x + cell * 0.45, y - cell * 0.3, x + cell * 0.55, y + cell * 0.3, x + cell, y); g.stroke();
        g.beginPath(); g.ellipse(x + cell * 0.5, y + cell * 0.43, cell * 0.07, cell * 0.16, 0.6, 0, Math.PI * 2); g.fill();
      }
    }
    if (tree) { // gunungan: batang, cabang bergelung, daun
      const cx = w / 2; g.lineWidth = 26; g.beginPath(); g.moveTo(cx, h * 0.96); g.lineTo(cx, h * 0.2); g.stroke();
      for (let i = 0; i < 9; i++) {
        const yb = h * (0.86 - i * 0.075), len = w * (0.36 - i * 0.025), lw = 14 - i;
        for (const sgn of [-1, 1]) {
          g.lineWidth = lw; g.beginPath(); g.moveTo(cx, yb);
          const ex = cx + sgn * len, ey = yb - h * 0.07;
          g.bezierCurveTo(cx + sgn * len * 0.3, yb - h * 0.06, cx + sgn * len * 0.8, yb + h * 0.02, ex, ey); g.stroke();
          g.lineWidth = Math.max(4, lw - 6); g.beginPath(); g.arc(ex - sgn * len * 0.08, ey + len * 0.02, len * 0.09, 0, Math.PI * 2); g.stroke();
          g.beginPath(); g.ellipse(cx + sgn * len * 0.55, yb - h * 0.045, len * 0.08, len * 0.03, -sgn * 0.5, 0, Math.PI * 2); g.fill();
        }
      }
      g.lineWidth = 10; g.beginPath(); g.arc(cx, h * 0.17, w * 0.06, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(cx, h * 0.17, w * 0.025, 0, Math.PI * 2); g.fill();
    }
    g.restore();
    // cerminkan separuh kiri ke kanan supaya simetris
    g.save(); g.translate(w, 0); g.scale(-1, 1); g.drawImage(g.canvas, 0, 0, w / 2, h, 0, 0, w / 2, h); g.restore();
  });
}
function goldCanvas(w, h, base = [168, 136, 88]) {
  return cnv(w, h, (g) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, `rgb(${base[0] + 20},${base[1] + 16},${base[2] + 10})`); gr.addColorStop(0.5, `rgb(${base})`); gr.addColorStop(1, `rgb(${base[0] - 30},${base[1] - 28},${base[2] - 20})`);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '60,38,16' : '255,236,190'},${rnd() * 0.09})`; g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 5, 2 + rnd() * 5); }
  });
}
function blurCanvas(src, px) { return cnv(src.width, src.height, (g) => { g.filter = `blur(${px}px)`; g.drawImage(src, 0, 0); }); }
const carveCache = {};
// V3.0: serat kayu jati untuk gebyok, kursi ukir, bingkai cermin (ukiran kayu, bukan logam)
function woodCanvas(w, h, base = [150, 96, 48]) {
  return cnv(w, h, (g) => {
    g.fillStyle = `rgb(${base})`; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 150; i++) { const y = rnd() * h, a = 0.04 + rnd() * 0.1, ph = rnd() * 6.28; g.strokeStyle = `rgba(${rnd() < 0.55 ? '58,30,10' : '214,166,108'},${a})`; g.lineWidth = 1 + rnd() * 3; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 12) g.lineTo(x, y + Math.sin(x * 0.018 + ph) * 5 + Math.sin(x * 0.05 + ph * 2) * 1.5); g.stroke(); }
    for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(40,20,8,${rnd() * 0.07})`; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 2 + rnd() * 5); }
  });
}
function carveMat(kind, { arch = null, tree = false, w = 512, h = 1024, cell = 110, base, rep = null, wood = false } = {}) {
  const key = kind + arch + tree + w + h + cell + (base || '') + (rep || '') + (wood ? 'W' : 'G');
  if (carveCache[key]) return carveCache[key];
  const mask = filigreeMask(w, h, { arch, tree, cell });
  const bump = blurCanvas(mask, wood ? 4 : 3);
  const m = new THREE.MeshStandardMaterial({ map: tex(wood ? woodCanvas(256, 512, base) : goldCanvas(256, 512, base), { rep }), alphaMap: tex(mask, { srgb: false, rep }), bumpMap: tex(bump, { srgb: false, rep }), bumpScale: wood ? 3.4 : 2.2, alphaTest: 0.5, metalness: wood ? 0.04 : 0.78, roughness: wood ? 0.56 : 0.34, side: THREE.DoubleSide });
  carveCache[key] = m; return m;
}
// lipatan kain (normal map garis vertikal)
const foldNrm = tex(cnv(512, 8, (g, w, h) => { const img = g.createImageData(w, h); for (let x = 0; x < w; x++) { const t = x / w * Math.PI * 2 * 7, n = Math.sin(t) * 0.55 + Math.sin(t * 2.3 + 1) * 0.25; for (let y = 0; y < h; y++) { const i = (y * w + x) * 4; img.data[i] = (n * 0.5 + 0.5) * 255; img.data[i + 1] = 128; img.data[i + 2] = Math.sqrt(1 - n * n * 0.6) * 255; img.data[i + 3] = 255; } } g.putImageData(img, 0, 0); }), { srgb: false, rep: [6, 1] });
// karpet ballroom (asumsi, motif venue belum diketahui)
const carpetTex = tex(cnv(1024, 1024, (g, w, h) => { g.fillStyle = '#2E2320'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '20,12,10' : '80,62,52'},${rnd() * 0.18})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } g.strokeStyle = 'rgba(120,96,72,.16)'; g.lineWidth = 3; for (let y = 0; y < h; y += 256) for (let x = 0; x < w; x += 256) { g.beginPath(); g.ellipse(x + 128, y + 128, 80, 46, 0, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.ellipse(x + 128, y + 128, 46, 80, 0, 0, Math.PI * 2); g.stroke(); } }), { rep: [BL / 4, BD / 4] });
const wallTex = tex(cnv(256, 256, (g, w, h) => { g.fillStyle = '#5B4A42'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '40,30,26' : '120,104,92'},${rnd() * 0.1})`; g.fillRect(rnd() * w, rnd() * h, 3, 3); } }), { rep: [10, 2] });
const latticeTex = tex(cnv(256, 256, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = 10; for (let i = -w; i < w * 2; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.stroke(); } g.lineWidth = 18; g.beginPath(); g.moveTo(0, 6); g.lineTo(w, 6); g.moveTo(0, h - 6); g.lineTo(w, h - 6); g.stroke(); }), { srgb: false });
const upGrad = tex(cnv(4, 256, (g, w, h) => { const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, '#ffb066'); gr.addColorStop(0.35, '#6a2f12'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }));
function textCanvas(w, h, draw) { return tex(cnv(w, h, draw)); }

/* ================= MATERIAL ================= */
const std = o => new THREE.MeshStandardMaterial(o);
const phy = o => new THREE.MeshPhysicalMaterial(o);
const velvet = (hex, folds = false, rep = 6) => { const m = phy({ color: hex, roughness: 0.85, sheen: 0.55, sheenRoughness: 0.5, sheenColor: col(hex).lerp(col('#ffffff'), 0.3) }); if (folds) { m.normalMap = foldNrm.clone(); m.normalMap.repeat.set(rep, 1); m.normalMap.needsUpdate = true; m.normalScale = new THREE.Vector2(1.4, 1.4); } return m; };
const M = {
  carpet: std({ map: carpetTex, roughness: 0.95 }),
  wall: std({ map: wallTex, roughness: 0.9 }),
  ceil: std({ color: 0x241a17, roughness: 0.95 }),
  dl: std({ color: 0xffffff, emissive: 0xffe2b8, emissiveIntensity: 1.6 }),
  stageTop: std({ color: 0xD6C9B6, roughness: 0.9 }),
  stageFace: velvet(P.ivory, true, 14),
  gold: std({ color: 0xB08F5E, metalness: 0.85, roughness: 0.3 }),
  goldDark: std({ color: 0x8A6E46, metalness: 0.8, roughness: 0.42 }),
  wood: std({ color: 0x3A1F12, roughness: 0.6 }),
  backer: std({ color: 0x2A0F0A, roughness: 0.85 }),
  glow: std({ color: 0x000000, emissive: 0xffbf86, emissiveIntensity: 1.2 }), // V3.0: kurang oranye
  champVel: velvet(P.champ),
  champDrape: velvet('#E9D9BC', true, 16),
  burgDrape: velvet(P.wine, true, 4),
  mauveVel: velvet(P.mauve),
  runner: phy({ color: 0xF1EAE0, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }),
  cloth: phy({ color: 0xF0E8DC, roughness: 0.9, sheen: 0.6, sheenColor: col('#ffffff') }),
  napkin: velvet(P.wine),
  glass: std({ color: 0xffffff, transparent: true, opacity: 0.13, roughness: 0.05, depthWrite: false }),
  candle: std({ color: 0xF4EADB, roughness: 0.55, emissive: 0x6b3a10, emissiveIntensity: 0.25 }),
  flame: std({ color: 0xffc070, emissive: 0xff9840, emissiveIntensity: 7 }),
  bulb: std({ color: 0xffd8a0, emissive: 0xffb060, emissiveIntensity: 4 }),
  black: std({ color: 0x141012, roughness: 0.6 }),
  screen: null,
  fig: std({ color: 0x6E625B, roughness: 0.85 }),
  figH: std({ color: 0x8A786E, roughness: 0.85 }),
  thread: new THREE.LineBasicMaterial({ color: 0xE8DCC6, transparent: true, opacity: 0.35 }),
  lattice: std({ color: 0xB89660, metalness: 0.8, roughness: 0.35, alphaMap: latticeTex, alphaTest: 0.5, side: THREE.DoubleSide, emissive: 0x3a1c06, emissiveIntensity: 0.4 }),
  colWrap: velvet('#E2D2BA', true, 3),
};
M.colWrap.emissiveMap = upGrad; M.colWrap.emissive = col('#ffffff'); M.colWrap.emissiveIntensity = 0.9;

/* ================= GRUP ================= */
const G = { res: new THREE.Group(), akad: new THREE.Group(), gal: new THREE.Group() };
scene.add(G.res, G.akad, G.gal);
const wallsG = { res: new THREE.Group(), akad: new THREE.Group() };
const ceilG = { res: new THREE.Group(), akad: new THREE.Group() };
const figG = { res: new THREE.Group(), akad: new THREE.Group(), gal: new THREE.Group() };
G.res.add(wallsG.res, ceilG.res, figG.res); G.akad.add(wallsG.akad, ceilG.akad, figG.akad); G.gal.add(figG.gal); G.gal.visible = false;
G.akad.position.set(AK.ox, 0, AK.oz);
figG.res.visible = figG.akad.visible = figG.gal.visible = false;

function box(w, h, d, mat, x, y, z, parent, { cast = false, recv = true, ry = 0 } = {}) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = cast; m.receiveShadow = recv; parent.add(m); return m; }
function cyl(rt, rb, h, mat, x, y, z, parent, seg = 24, { open = false, cast = false } = {}) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m; }

/* ================= BUNGA (instanced) ================= */
function roseGeo() {
  const parts = [];
  const bud = new THREE.SphereGeometry(0.016, 8, 6); bud.scale(1, 1.3, 1); bud.translate(0, 0.016, 0); parts.push(bud);
  const ring = (n, r, tilt, ht, sz, off) => { for (let i = 0; i < n; i++) { const g = new THREE.SphereGeometry(sz, 5, 3, 0, Math.PI * 0.95, 0, Math.PI * 0.55); g.scale(1, 0.85, 0.42); g.rotateX(-tilt); g.translate(0, ht, r); g.rotateY(i / n * Math.PI * 2 + off); parts.push(g); } };
  ring(3, 0.011, 0.3, 0.014, 0.022, 0); ring(5, 0.02, 0.7, 0.008, 0.028, 0.5); ring(6, 0.028, 1.15, 0.0, 0.031, 1.0);
  const m = mergeGeometries(parts); m.computeVertexNormals(); return m;
}
const GEO = {
  rose: roseGeo(),
  filler: new THREE.IcosahedronGeometry(0.014, 0),
  leaf: (() => { const g = new THREE.CircleGeometry(0.05, 8); g.scale(0.42, 1, 1); g.translate(0, 0.045, 0); return g; })(),
  jas: new THREE.IcosahedronGeometry(0.0135, 0),
};
class Batch {
  constructor() { this.rose = []; this.filler = []; this.leaf = []; this.jas = []; this.lines = []; }
  add(arr, p, nrm, s, c, twist = rnd() * 6.28) { const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), nrm); const q2 = new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), twist); q.multiply(q2); const m = new THREE.Matrix4().compose(p, q, new V3(s, s, s)); arr.push([m, c]); }
  build(parent) {
    const mk = (arr, geo, mat) => { if (!arr.length) return; const im = new THREE.InstancedMesh(geo, mat, arr.length); arr.forEach(([m, c], i) => { im.setMatrixAt(i, m); im.setColorAt(i, c); }); im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.frustumCulled = false; parent.add(im); };
    mk(this.rose, GEO.rose, std({ roughness: 0.62, side: THREE.DoubleSide }));
    mk(this.filler, GEO.filler, std({ roughness: 0.7 }));
    mk(this.leaf, GEO.leaf, std({ roughness: 0.7, side: THREE.DoubleSide }));
    mk(this.jas, GEO.jas, std({ roughness: 0.5, emissive: 0x2a2014, emissiveIntensity: 0.35 }));
    if (this.lines.length) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.lines, 3)); parent.add(new THREE.LineSegments(g, M.thread)); }
  }
}
const MIX = {
  // bunga di luar pelaminan: dominan merah, tetap ada cream & aksen (slide 2)
  resepsi: [[P.maroon, 0.3], [P.wine, 0.14], ['#7A1E2A', 0.08], [P.cream, 0.26], [P.rose, 0.12], ['#E9D4B0', 0.1]],
  // pelaminan: cream champagne dominan, burgundy hanya aksen (baju pengantin maroon)
  pelaminan: [[P.champBeige, 0.3], ['#F4EEE4', 0.2], [P.blush, 0.18], [P.ivory, 0.08], [P.wine, 0.14], ['#6A0E26', 0.06], [P.mauve, 0.04]],
  photobooth: [[P.wine, 0.24], ['#6A0E26', 0.16], [P.champBeige, 0.26], [P.blush, 0.2], ['#F4EEE4', 0.14]],
  welcome: [[P.wine, 0.22], ['#6A0E26', 0.14], [P.champBeige, 0.24], [P.blush, 0.2], ['#F6F1E8', 0.2]],
  galeri: [[P.wine, 0.28], ['#6A0E26', 0.2], [P.darkMaroon, 0.14], [P.champBeige, 0.16], [P.blush, 0.12], ['#EFE6DA', 0.1]],
  juntai: [[P.maroon, 0.45], ['#F8F4EC', 0.4], [P.cream, 0.15]],
  booth: [[P.cream, 0.55], ['#E9D4B0', 0.2], [P.maroon, 0.15], [P.rose, 0.1]],
  pagar: [[P.cream, 0.4], ['#F8F4EC', 0.3], [P.maroon, 0.3]],
  akad: [[P.cream, 0.42], ['#F6F1E8', 0.12], [P.rose, 0.2], ['#E3C9A8', 0.14], [P.maroon, 0.08], [P.caramel, 0.04]],
};
function pick(mix) { let r = rnd(), acc = 0; for (const [c, w] of mix) { acc += w; if (r <= acc) return c; } return mix[0][0]; }
function vary(hex, amt = 0.06) { const c = col(hex); const hsl = {}; c.getHSL(hsl); c.setHSL(hsl.h + rr(-0.01, 0.01), Math.min(1, hsl.s * rr(0.9, 1.05)), Math.min(1, Math.max(0, hsl.l + rr(-amt, amt)))); return c; }
// gundukan bunga: titik acak di permukaan ellipsoid (setengah atas)
const DENS = RENDER ? 1 : (coarse ? 0.42 : 0.72);
function mound(B, c, r, n0, mix, { full = false, leaf = 0.35, filler = 0.5, size = [0.85, 1.25] } = {}) {
  const n = Math.max(6, Math.round(n0 * DENS));
  for (let i = 0; i < n; i++) {
    const u = full ? rr(-0.6, 1) : Math.pow(rnd(), 0.7), th = rnd() * Math.PI * 2, s = Math.sqrt(Math.max(0, 1 - u * u));
    const d = new V3(s * Math.cos(th), u, s * Math.sin(th));
    const p = new V3(c.x + d.x * r.x, c.y + d.y * r.y, c.z + d.z * r.z);
    const nrm = new V3(d.x / r.x, d.y / r.y, d.z / r.z).normalize();
    B.add(B.rose, p, nrm, rr(size[0], size[1]), vary(pick(mix)));
    if (rnd() < leaf) { const p2 = p.clone().addScaledVector(nrm, -0.02); B.add(B.leaf, p2, nrm.clone().add(new V3(rr(-0.6, 0.6), rr(-0.3, 0.3), rr(-0.6, 0.6))).normalize(), rr(0.9, 1.4), vary(rnd() < 0.6 ? P.green : P.green2, 0.04)); }
    if (rnd() < filler) { const p3 = p.clone().addScaledVector(nrm, 0.01).add(new V3(rr(-0.04, 0.04), rr(-0.03, 0.03), rr(-0.04, 0.04))); for (let k = 0; k < 3; k++) B.add(B.filler, p3.clone().add(new V3(rr(-0.02, 0.02), rr(-0.02, 0.02), rr(-0.02, 0.02))), nrm, rr(0.6, 1), vary(rnd() < 0.7 ? '#F3EEE6' : P.blush, 0.03)); }
  }
}
// air terjun bunga: tulang belakang melengkung ke bawah
function cascadeCluster(B, top, dir, len, r0, n0, mix) {
  const n = Math.round(n0 * DENS);
  for (let i = 0; i < n; i++) {
    const t = Math.pow(rnd(), 1.4), rad = r0 * (1 - t * 0.75);
    const base = new V3(top.x + dir.x * t * len, top.y - t * len * 1.0, top.z + dir.z * t * len);
    const th = rnd() * Math.PI * 2, rr2 = rad * Math.sqrt(rnd());
    const p = base.clone().add(new V3(Math.cos(th) * rr2 * 0.7, Math.sin(th) * rr2 * 0.5, Math.sin(th) * rr2));
    const nrm = new V3(-0.8 + rr(-0.3, 0.3), rr(-0.4, 0.5), rr(-0.5, 0.5)).normalize();
    B.add(B.rose, p, nrm, rr(0.85, 1.25), vary(pick(t > 0.6 ? mix.filter(([c]) => c !== P.wine && c !== '#6A0E26') : mix)));
    if (rnd() < 0.3) B.add(B.leaf, p.clone().add(new V3(0.02, 0, 0)), nrm, rr(0.9, 1.3), vary(P.green, 0.04));
  }
}
// untaian melati: kuntum setiap ±3,3 cm
function strand(B, top, len, { sway = 0.02, bud = 7 } = {}) {
  const ph = rnd() * 6.28, n = Math.floor(len / 0.033);
  for (let i = 0; i < n; i++) {
    const t = i / n, p = new V3(top.x + Math.sin(ph + t * 5) * sway * t + rr(-0.004, 0.004), top.y - i * 0.033, top.z + Math.cos(ph + t * 4) * sway * t + rr(-0.004, 0.004));
    B.add(B.jas, p, new V3(rr(-1, 1), rr(-1, 1), rr(-1, 1)).normalize(), i % bud === 0 ? 0.8 : rr(0.95, 1.2), vary(i % bud === 0 ? '#E3E6CF' : '#F7F1E6', 0.02));
  }
  B.lines.push(top.x, top.y, top.z, top.x, top.y - len, top.z);
}
function strandCurtain(B, x, y, z0, z1, gap, lenFn, opts) { for (let z = z0; z <= z1 + 1e-6; z += gap) strand(B, new V3(x + rr(-0.03, 0.03), y, z + rr(-0.015, 0.015)), lenFn(z), opts); }

/* ================= LILIN (instanced) ================= */
class Candles {
  constructor() { this.c = []; this.g = []; }
  add(x, y, z, h = rr(0.1, 0.32), r = rr(0.03, 0.045), glass = true) { this.c.push([x, y, z, h, r]); if (glass) this.g.push([x, y, z, h + 0.12, r + 0.035]); }
  build(parent) {
    if (!this.c.length) return;
    const body = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 12), M.candle, this.c.length);
    const flame = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), M.flame, this.c.length);
    const m = new THREE.Matrix4();
    this.c.forEach(([x, y, z, h, r], i) => { m.compose(new V3(x, y + h / 2, z), new THREE.Quaternion(), new V3(r, h, r)); body.setMatrixAt(i, m); m.compose(new V3(x, y + h + 0.022, z), new THREE.Quaternion(), new V3(0.008, 0.02, 0.008)); flame.setMatrixAt(i, m); });
    parent.add(body, flame);
    if (this.g.length) { const gl = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 16, 1, true), M.glass, this.g.length); this.g.forEach(([x, y, z, h, r], i) => { m.compose(new V3(x, y + h / 2, z), new THREE.Quaternion(), new V3(r, h, r)); gl.setMatrixAt(i, m); }); gl.renderOrder = 2; parent.add(gl); }
  }
}

/* ================= KOMPONEN DEKOR ================= */
function archShape(w, h, type, dx = 0, dy = 0, PathCls = THREE.Shape) {
  const s = new PathCls(), hw = w / 2;
  s.moveTo(-hw + dx, dy);
  if (type === 'kayon') { s.lineTo(-hw + dx, h * 0.5 + dy); s.bezierCurveTo(-hw + dx, h * 0.78 + dy, -w * 0.16 + dx, h * 0.86 + dy, dx, h + dy); s.bezierCurveTo(w * 0.16 + dx, h * 0.86 + dy, hw + dx, h * 0.78 + dy, hw + dx, h * 0.5 + dy); }
  else if (type === 'round') { s.lineTo(-hw + dx, h - hw + dy); s.absarc(dx, h - hw + dy, hw, Math.PI, 0, true); }
  else { s.lineTo(-hw + dx, h + dy); s.lineTo(hw + dx, h + dy); }
  s.lineTo(hw + dx, dy); s.lineTo(-hw + dx, dy);
  return s;
}
function normUV(geo, w, h) { const p = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / w, p.getY(i) / h); uv.needsUpdate = true; }
// panel ukir: kisi filigri + bingkai (emas, atau kayu jati bila wood) + latar (bercahaya atau gelap)
function carvedPanel(parent, { w, h, type, x, y, z, ry = 0, glow = false, tree = false, base, frame = 0.07, wood = false, backMat = null }) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = -Math.PI / 2 + ry; parent.add(g);
  const sg = new THREE.ShapeGeometry(archShape(w, h, type), 32); normUV(sg, w, h);
  const lat = new THREE.Mesh(sg, carveMat('panel', { arch: type, tree, w: 512, h: Math.round(512 * h / w), cell: tree ? 96 : 110, base, wood }));
  lat.position.z = 0.03; g.add(lat);
  const back = new THREE.Mesh(sg, backMat || (glow ? M.glow : M.backer)); back.position.z = -0.03; g.add(back);
  const outer = archShape(w, h, type); outer.holes.push(archShape(w - frame * 2, h - frame * 2, type, 0, frame, THREE.Path));
  const fr = new THREE.Mesh(new THREE.ExtrudeGeometry(outer, { depth: 0.09, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.012, bevelSegments: 2, curveSegments: 32 }), wood ? M.teak : M.gold);
  fr.position.z = -0.045; fr.castShadow = wood; g.add(fr);
  return g;
}
function frieze(parent, { x, y, z0, z1, h = 0.32, d = 0.22 }) {
  const len = z1 - z0; box(d, h, len, M.backer, x, y + h / 2, (z0 + z1) / 2, parent);
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(len, h * 0.8), carveMat('frieze', { w: 1024, h: 256, cell: 90, rep: [Math.max(1, Math.round(len / 1.2)), 1] }));
  pl.rotation.y = -Math.PI / 2; pl.position.set(x - d / 2 - 0.006, y + h / 2, (z0 + z1) / 2); parent.add(pl);
  box(d + 0.04, 0.035, len + 0.04, M.gold, x, y + h, (z0 + z1) / 2, parent); box(d + 0.04, 0.035, len + 0.04, M.gold, x, y, (z0 + z1) / 2, parent);
}
// tirai bergelombang
function drape(parent, { x, z0, z1, y0 = 0, y1, mat, ry = -Math.PI / 2, rep }) {
  const len = Math.abs(z1 - z0); const m = new THREE.Mesh(new THREE.PlaneGeometry(len, y1 - y0, 1, 1), mat.clone());
  if (mat.normalMap) { m.material.normalMap = mat.normalMap.clone(); m.material.normalMap.repeat.set(rep || len * 2.2, 1); m.material.normalMap.needsUpdate = true; }
  m.rotation.y = ry; m.position.set(x, (y0 + y1) / 2, (z0 + z1) / 2); m.receiveShadow = true; parent.add(m); return m;
}
// payung susun emas (3 tingkat) dengan rumbai manik
const LIGHTS = { ambient: [], candle: [], payung: [], back: [], key: [], akad: [], zone: [], photo: [], gal: [] };
function payung(parent, B, x, y, z, scale = 1, lightArr = LIGHTS.payung) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(scale); parent.add(g);
  cyl(0.02, 0.025, 2.9, M.gold, 0, 1.45, 0, g, 10);
  cyl(0.2, 0.26, 0.06, M.gold, 0, 0.03, 0, g, 20);
  const tiers = [[0.62, 2.35], [0.5, 2.68], [0.38, 2.98]];
  tiers.forEach(([r, ty]) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, 0.26, 28, 1, true), M.lattice); cone.position.y = ty; g.add(cone);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 6, 40), M.gold); rim.rotation.x = Math.PI / 2; rim.position.y = ty - 0.13; g.add(rim);
    for (let k = 0; k < 22; k++) { const a = k / 22 * Math.PI * 2; for (let b = 0; b < 4; b++) B.add(B.jas, new V3(x + Math.cos(a) * r * scale, y + (ty - 0.15 - b * 0.035) * scale, z + Math.sin(a) * r * scale), new V3(0, 1, 0), 0.9, col('#F2E6CC')); }
  });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), M.bulb); bulb.position.y = 2.42; g.add(bulb);
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.24, 12), M.gold); fin.position.y = 3.22; g.add(fin);
  if (lightArr) { const L = new THREE.PointLight(0xffb36b, 3, 3.0, 2); L.position.set(0, 2.4, 0); g.add(L); lightArr.push(L); }
  return g;
}
function lantern(parent, x, y, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); parent.add(g);
  box(0.26, 0.03, 0.26, M.gold, 0, 0.015, 0, g); box(0.26, 0.03, 0.26, M.gold, 0, 0.52, 0, g);
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(0.02, 0.5, 0.02, M.gold, a * 0.12, 0.27, b * 0.12, g);
  box(0.23, 0.48, 0.23, M.glass, 0, 0.27, 0, g);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.18, 4), M.gold); roof.rotation.y = Math.PI / 4; roof.position.y = 0.62; g.add(roof);
  const rg = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 16), M.gold); rg.position.y = 0.74; g.add(rg);
  cyl(0.035, 0.035, 0.16, M.candle, 0, 0.11, 0, g, 12);
  const f = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), M.flame); f.scale.set(0.012, 0.028, 0.012); f.position.y = 0.21; g.add(f);
  return g;
}
// lampion anyaman emas gantung (bentuk bawang)
const lampionGeo = new THREE.LatheGeometry([[0.001, -0.32], [0.12, -0.28], [0.21, -0.16], [0.24, 0], [0.2, 0.14], [0.1, 0.26], [0.03, 0.3], [0.001, 0.32]].map(([a, b]) => new THREE.Vector2(a, b)), 24);
function lampion(parent, x, y, z, s = 1, top = CH) { const m = new THREE.Mesh(lampionGeo, M.lattice); m.position.set(x, y, z); m.scale.setScalar(s); parent.add(m); const b = new THREE.Mesh(new THREE.SphereGeometry(0.07 * s, 10, 8), M.bulb); b.position.set(x, y, z); parent.add(b); const w = cyl(0.004, 0.004, top - y - 0.32 * s, M.black, x, (top + y + 0.32 * s) / 2, z, parent, 4); return m; }
// sofa
function sofa(parent, { x, y, z, len, ry = 0, mat = M.champVel, pil = M.mauveVel }) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g);
  const add = (geo, m, px, py, pz) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };
  add(new RoundedBoxGeometry(0.8, 0.2, len, 3, 0.05), mat, 0, 0.36, 0);
  add(new RoundedBoxGeometry(0.22, 0.62, len, 3, 0.08), mat, 0.32, 0.66, 0);
  add(new RoundedBoxGeometry(0.72, 0.28, 0.16, 3, 0.06), mat, 0.02, 0.56, len / 2 - 0.06);
  add(new RoundedBoxGeometry(0.72, 0.28, 0.16, 3, 0.06), mat, 0.02, 0.56, -len / 2 + 0.06);
  add(new RoundedBoxGeometry(0.06, 0.08, len + 0.1, 2, 0.02), M.gold, 0.43, 0.98, 0);
  for (const sx of [-0.34, 0.34]) for (const sz of [-len / 2 + 0.08, len / 2 - 0.08]) add(new THREE.CylinderGeometry(0.025, 0.018, 0.26, 8), M.gold, sx, 0.13, sz);
  for (let k = 0; k < Math.round(len / 0.7); k++) add(new RoundedBoxGeometry(0.16, 0.36, 0.42, 3, 0.07), pil, 0.16, 0.66, -len / 2 + 0.45 + k * (len - 0.9) / Math.max(1, Math.round(len / 0.7) - 1));
  return g;
}
// kursi chiavari emas (instanced)
const chairGeo = (() => { const parts = []; const b = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); parts.push(g); };
  b(0.42, 0.04, 0.4, 0, 0.45, 0); for (const sx of [-0.19, 0.19]) for (const sz of [-0.17, 0.17]) b(0.025, 0.45, 0.025, sx, 0.225, sz);
  for (const sx of [-0.19, 0.19]) b(0.025, 0.52, 0.025, sx, 0.72, -0.18); for (const y of [0.62, 0.74, 0.86, 0.96]) b(0.4, 0.02, 0.02, 0, y, -0.18);
  return mergeGeometries(parts); })();
const cushionGeo = new RoundedBoxGeometry(0.4, 0.05, 0.38, 2, 0.02);
class Chairs { constructor() { this.t = []; } add(x, z, ry) { this.t.push([x, z, ry]); } build(parent) { if (!this.t.length) return; const a = new THREE.InstancedMesh(chairGeo, M.gold, this.t.length), b = new THREE.InstancedMesh(cushionGeo, M.cloth, this.t.length); const m = new THREE.Matrix4(); this.t.forEach(([x, z, ry], i) => { const q = new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), ry); m.compose(new V3(x, 0, z), q, new V3(1, 1, 1)); a.setMatrixAt(i, m); m.compose(new V3(x, 0.495, z), q, new V3(1, 1, 1)); b.setMatrixAt(i, m); }); parent.add(a, b); } }
// figur skala
const figBody = new THREE.CapsuleGeometry(0.17, 1.05, 4, 10), figHead = new THREE.SphereGeometry(0.11, 12, 10), figHij = (() => { const g = new THREE.SphereGeometry(0.15, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62); g.scale(1, 1.15, 1); return g; })();
function figure(parent, x, y, z, { hijab = false, h = 1.7, mat = M.fig } = {}) { const s = h / 1.7; const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); const b = new THREE.Mesh(figBody, mat); b.position.y = 0.72; b.castShadow = true; g.add(b); const hd = new THREE.Mesh(figHead, M.figH); hd.position.y = 1.56; g.add(hd); if (hijab) { const hj = new THREE.Mesh(figHij, mat); hj.position.y = 1.5; g.add(hj); } parent.add(g); return g; }
// label
const LBL = { res: [], akad: [], gal: [] };
function mkLabel(key, t, s, x, y, z, ctx) { const el = document.createElement('div'); el.className = 'lbl' + (ctx ? ' ctx' : ''); el.innerHTML = t + (s ? `<small>${s}</small>` : ''); el.style.opacity = 0; document.body.appendChild(el); LBL[key].push({ el, v: new V3(x, y, z) }); }

/* ================= KOMPONEN TAMBAHAN REVISI 2 ================= */
M.stone = std({ map: tex(cnv(512, 512, (g, w, h) => { g.fillStyle = '#CDBBA6'; g.fillRect(0, 0, w, h); for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '150,128,104' : '236,226,212'},${rnd() * 0.12})`; g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 3, 2 + rnd() * 3); } g.strokeStyle = 'rgba(120,98,76,.25)'; g.lineWidth = 2; for (let x = 0; x <= w; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); g.beginPath(); g.moveTo(0, x); g.lineTo(w, x); g.stroke(); } }), { rep: [10, 10] }), roughness: 0.32, metalness: 0.05 });
M.vvipCarpet = std({ color: 0x8C7258, roughness: 0.95 });
M.mirror = std({ color: 0xE6D8C6, metalness: 1.0, roughness: 0.07, envMapIntensity: 0.4 });
M.ledStrip = std({ color: 0xffe2b0, emissive: 0xffc27a, emissiveIntensity: 1.2 });
M.softbox = std({ color: 0xffffff, emissive: 0xfff4e6, emissiveIntensity: 1.6 });
M.metalDoor = std({ color: 0xC9B28C, metalness: 0.75, roughness: 0.3 });
M.boothVel = velvet('#4A0418', true, 26);
M.fhr = std({ color: 0x9A1B1B, roughness: 0.5 });
M.sign = std({ color: 0x2A0A12, roughness: 0.6 });
M.overlay = velvet('#E9DCC4');

// monogram NZ terpilih (Konsep B, emblem gunungan simetris) — digambar ulang di kanvas untuk tekstur
// monogram NZ V2.0: N dan Z serif bertaut (over-under) dalam bingkai gunungan — satu desain untuk seluruh venue
function monoCanvas(W, H, { bg = '#51051A', date = true, flat = null } = {}) {
  return cnv(W, H, (g, w, h) => {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
    const s = Math.min(w / 240, h / 300); g.save(); g.translate((w - 240 * s) / 2, (h - 300 * s) / 2); g.scale(s, s);
    const gr = g.createLinearGradient(0, 0, 240, 300); gr.addColorStop(0, '#E2CC98'); gr.addColorStop(0.5, '#A88C5D'); gr.addColorStop(1, '#CDB07A');
    const gold = flat || gr; g.strokeStyle = gold; g.fillStyle = gold; g.lineJoin = 'round';
    const kay = (i) => { g.beginPath(); g.moveTo(30 + i, 282 - i); g.lineTo(30 + i, 150); g.bezierCurveTo(30 + i, 78 + i, 91 + i * 0.6, 58 + i, 120, 18 + i * 1.9); g.bezierCurveTo(149 - i * 0.6, 58 + i, 210 - i, 78 + i, 210 - i, 150); g.lineTo(210 - i, 282 - i); g.closePath(); };
    g.lineWidth = 3; kay(0); g.stroke(); g.lineWidth = 1.2; kay(8); g.stroke();
    g.lineWidth = 1.4; g.beginPath(); g.moveTo(22, 282); g.lineTo(218, 282); g.moveTo(30, 288); g.lineTo(210, 288); g.stroke();
    const petal = flat || '#F2E5C6';
    g.save(); g.translate(120, 60); g.fillStyle = petal; for (let k = 0; k < 5; k++) { g.save(); g.rotate(k * Math.PI * 2 / 5); g.beginPath(); g.ellipse(0, -5.1, 2.6, 4.4, 0, 0, Math.PI * 2); g.fill(); g.restore(); } g.beginPath(); g.arc(0, 0, 2.1, 0, Math.PI * 2); g.fill(); g.restore();
    g.fillStyle = gold; for (const sg of [-1, 1]) { g.beginPath(); g.moveTo(120, 84); g.quadraticCurveTo(120 + sg * 10, 82, 120 + sg * 15, 73); g.quadraticCurveTo(120 + sg * 5, 74, 120, 84); g.fill(); }
    // N dan Z serif bertaut: Z melintas di atas N; kaki kanan N kembali di atas palang atas Z (over-under)
    g.textAlign = 'center'; g.font = '600 118px "Cormorant Garamond", Garamond, serif';
    const halo = (fn) => { g.save(); if (bg) g.strokeStyle = bg; else { g.globalCompositeOperation = 'destination-out'; g.strokeStyle = '#000'; } g.lineWidth = 7; g.lineJoin = 'round'; fn(); g.restore(); };
    const NX = 99, ZX = 143, BY = 206;
    g.fillStyle = gold; g.fillText('N', NX, BY);
    halo(() => g.strokeText('Z', ZX, BY)); g.fillStyle = gold; g.fillText('Z', ZX, BY);
    g.save(); g.beginPath(); g.rect(122, 110, 30, 34); g.clip(); halo(() => g.strokeText('N', NX, BY)); g.fillStyle = gold; g.fillText('N', NX, BY); g.restore();
    if (date) { g.fillStyle = flat || '#E7D3B0'; g.font = '500 10.5px Jost, sans-serif'; try { g.letterSpacing = '3px'; } catch (e) {} g.fillText('12 · XII · 2026', 121, 248); try { g.letterSpacing = '0px'; } catch (e) {} g.fillStyle = gold; g.fillRect(96, 259.6, 16, 0.9); g.fillRect(128, 259.6, 16, 0.9); g.beginPath(); g.arc(120, 260, 1.8, 0, Math.PI * 2); g.fill(); }
    g.restore();
  });
}
const MONO = {
  wine: tex(monoCanvas(480, 600, { bg: '#51051A' })),
  clear: tex(monoCanvas(480, 600, { bg: null, date: false })),
  clearDate: tex(monoCanvas(480, 600, { bg: null })),
};
const monoMat = (t, o = {}) => std({ map: t, transparent: true, alphaTest: 0.08, roughness: 0.38, metalness: 0.45, ...o });
const menuTex = textCanvas(220, 340, (g, w, h) => { g.fillStyle = '#F4EDE3'; g.fillRect(0, 0, w, h); g.strokeStyle = '#987E55'; g.lineWidth = 3; g.strokeRect(9, 9, w - 18, h - 18); g.drawImage(monoCanvas(120, 150, { bg: null, date: false, flat: '#987E55' }), 50, 22); g.fillStyle = '#51051A'; g.textAlign = 'center'; g.font = 'italic 600 30px "Cormorant Garamond", serif'; g.fillText('Menu', w / 2, 210); g.fillStyle = '#9A585D'; for (let i = 0; i < 4; i++) g.fillRect(60, 232 + i * 18, 100, 3); });
const photoTex = (hue, label = 'FOTO CONTOH') => textCanvas(300, 450, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#2A0610'); gr.addColorStop(0.55, hue); gr.addColorStop(1, '#DFCDBA'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(24,5,10,.55)'; for (const [cx, s] of [[0.42, 1], [0.62, 0.94]]) { g.beginPath(); g.ellipse(w * cx, h * 0.42, 26 * s, 32 * s, 0, 0, 6.3); g.fill(); g.beginPath(); g.ellipse(w * cx, h * 0.84, 60 * s, 118 * s, 0, 0, 6.3); g.fill(); } g.fillStyle = 'rgba(242,229,198,.9)'; g.font = '500 15px Jost, sans-serif'; g.textAlign = 'center'; g.fillText(label, w / 2, h - 18); });

function friezeAt(parent, { cx, cz, y, len, h = 0.32, d = 0.22, ry = 0 }) { const g = new THREE.Group(); g.position.set(cx, 0, cz); g.rotation.y = ry; parent.add(g); frieze(g, { x: 0, y, z0: -len / 2, z1: len / 2, h, d }); return g; }
function drapeX(parent, { z, x0, x1, y0 = 0, y1, mat, ry = 0, rep }) { const len = Math.abs(x1 - x0); const m = new THREE.Mesh(new THREE.PlaneGeometry(len, y1 - y0), mat.clone()); if (mat.normalMap) { m.material.normalMap = mat.normalMap.clone(); m.material.normalMap.repeat.set(rep || len * 2.2, 1); m.material.normalMap.needsUpdate = true; } m.rotation.y = ry; m.position.set((x0 + x1) / 2, (y0 + y1) / 2, z); m.receiveShadow = true; parent.add(m); return m; }
function plane(parent, w, h, mat, x, y, z, ry = 0) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.y = ry; parent.add(m); return m; }
function floorRect(parent, x0, x1, z0, z1, mat, y = 0) { const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), mat); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.receiveShadow = true; parent.add(m); return m; }
function ceilRect(parent, x0, x1, z0, z1, y, mat = M.ceil) { const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), mat); m.rotation.x = Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); parent.add(m); return m; }
function wallX(parent, x0, x1, z, h, mat = M.wall, t = 0.2) { return box(Math.abs(x1 - x0), h, t, mat, (x0 + x1) / 2, h / 2, z, parent); }
function wallZ(parent, z0, z1, x, h, mat = M.wall, t = 0.2) { return box(t, h, Math.abs(z1 - z0), mat, x, h / 2, (z0 + z1) / 2, parent); }
function glassRail(parent, a, b) { const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const g = new THREE.Group(); g.position.set((a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2); g.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]); parent.add(g); box(L, 1.0, 0.02, M.glass, 0, 0.55, 0, g); box(L, 0.05, 0.07, M.goldDark, 0, 1.08, 0, g); return g; }
function stanchionLine(parent, pts) { pts.forEach(([x, z]) => { cyl(0.02, 0.02, 0.95, M.gold, x, 0.475, z, parent, 8); cyl(0.14, 0.16, 0.03, M.gold, x, 0.015, z, parent, 16); cyl(0.035, 0.035, 0.05, M.gold, x, 0.97, z, parent, 10); }); for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const g = new THREE.Group(); g.position.set((a[0] + b[0]) / 2, 0.86, (a[1] + b[1]) / 2); g.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]); const r = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, L, 6), M.napkin); r.rotation.z = Math.PI / 2; g.add(r); parent.add(g); } }
function rod(parent, a, b, r, mat) { const d = new V3().subVectors(b, a); const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 8), mat); m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.clone().normalize()); parent.add(m); return m; }
// tangga panggung: 3 anak tangga 350 mm, tanjakan 150 mm, pegangan di kedua sisi, lampu nosing
function stageStair(parent, z0, z1, { rails = true } = {}) {
  const w = z1 - z0, zc = (z0 + z1) / 2;
  for (let k = 1; k <= 3; k++) { const run = 0.35 * (4 - k); box(run, 0.15 * k, w, k === 3 ? M.stageFace : M.stageTop, ST.x1 + run / 2, 0.075 * k, zc, parent); box(0.025, 0.012, w - 0.08, M.ledStrip, ST.x1 + run - 0.03, 0.15 * k + 0.007, zc, parent); box(0.02, 0.012, w + 0.01, M.gold, ST.x1 + run - 0.005, 0.15 * k - 0.006, zc, parent); }
  if (rails) for (const z of [z0 + 0.03, z1 - 0.03]) { const top = new V3(ST.x1 + 0.05, ST.h + 0.92, z), bot = new V3(STX - 0.06, 0.92, z); rod(parent, top, bot, 0.022, M.gold); rod(parent, bot, new V3(STX + 0.25, 0.92, z), 0.022, M.gold); cyl(0.025, 0.025, 0.92, M.gold, ST.x1 + 0.05, ST.h + 0.46, z, parent, 10); cyl(0.025, 0.025, 0.92, M.gold, STX - 0.06, 0.46, z, parent, 10); cyl(0.025, 0.025, 0.92, M.gold, STX + 0.25, 0.46, z, parent, 10); }
}
// kursi eksekutif VVIP (instanced): jok & sandaran velvet champagne, kaki emas
const execGeo = (() => { const parts = []; const b = (w, h, d, x, y, z) => { const g = new RoundedBoxGeometry(w, h, d, 2, 0.03); g.translate(x, y, z); parts.push(g); }; b(0.56, 0.12, 0.54, 0, 0.47, 0.02); b(0.58, 0.7, 0.11, 0, 0.88, -0.25); b(0.07, 0.2, 0.46, -0.3, 0.63, 0.0); b(0.07, 0.2, 0.46, 0.3, 0.63, 0.0); return mergeGeometries(parts); })();
const execLegGeo = (() => { const parts = []; for (const sx of [-0.24, 0.24]) for (const sz of [-0.22, 0.22]) { const g = new THREE.CylinderGeometry(0.02, 0.014, 0.41, 8); g.translate(sx, 0.205, sz); parts.push(g); } const t = new THREE.CylinderGeometry(0.018, 0.018, 0.6, 8); t.rotateZ(Math.PI / 2); t.translate(0, 1.24, -0.25); parts.push(t); return mergeGeometries(parts); })();
class ExecChairs { constructor() { this.t = []; } add(x, z, ry) { this.t.push([x, z, ry]); } build(parent) { if (!this.t.length) return; const a = new THREE.InstancedMesh(execGeo, M.champVel, this.t.length), b = new THREE.InstancedMesh(execLegGeo, M.gold, this.t.length); const m = new THREE.Matrix4(); this.t.forEach(([x, z, ry], i) => { m.compose(new V3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), ry), new V3(1, 1, 1)); a.setMatrixAt(i, m); b.setMatrixAt(i, m); }); a.castShadow = true; parent.add(a, b); } }
// perlengkapan meja (instanced): charger emas, napkin wine, kartu menu bermonogram
class Places { constructor() { this.c = []; this.n = []; this.m = []; } seat(cx, cz, a) { const px = cx + Math.cos(a) * 0.68, pz = cz + Math.sin(a) * 0.68; this.c.push([px, pz]); this.n.push([px, pz, -a]); this.m.push([cx + Math.cos(a) * 0.62, cz + Math.sin(a) * 0.62, Math.PI / 2 - a]); }
  build(parent) { const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new V3(1, 1, 1);
    const ch = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.16, 0.012, 24), M.gold, this.c.length); this.c.forEach(([x, z], i) => { m.compose(new V3(x, 0.768, z), q.identity(), one); ch.setMatrixAt(i, m); });
    const np = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.02, 0.2), M.napkin, this.n.length); this.n.forEach(([x, z, r], i) => { m.compose(new V3(x, 0.785, z), q.setFromAxisAngle(new V3(0, 1, 0), r), one); np.setMatrixAt(i, m); });
    const mg = new THREE.PlaneGeometry(0.1, 0.155); mg.rotateX(-Math.PI / 2); const mn = new THREE.InstancedMesh(mg, std({ map: menuTex, roughness: 0.8 }), this.m.length); this.m.forEach(([x, z, r], i) => { m.compose(new V3(x, 0.797, z), q.setFromAxisAngle(new V3(0, 1, 0), r), one); mn.setMatrixAt(i, m); });
    parent.add(ch, np, mn); } }
// kios / gubukan: dibangun menghadap +z lokal (konter di depan, staf di belakang)
function gubuk(parent, x, z, ry, { w = 2.2, label = null, roof = true } = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g);
  box(w, 0.92, 0.72, M.cloth, 0, 0.46, 0, g); box(w + 0.02, 0.05, 0.74, M.gold, 0, 0.945, 0, g); box(w - 0.1, 0.012, 0.28, M.napkin, 0, 0.976, 0.12, g);
  box(w - 0.2, 0.86, 0.5, M.black, 0, 0.43, -0.85, g);
  for (const dx of [-w / 2 + 0.05, w / 2 - 0.05]) for (const dz of [-1.0, 0.32]) cyl(0.035, 0.035, 2.5, M.wood, dx, 1.25, dz, g, 8);
  if (roof) { const rfg = new THREE.CylinderGeometry(0.2, 1.6, 0.46, 4, 1); rfg.rotateY(Math.PI / 4); const rf = new THREE.Mesh(rfg, M.wood); rf.scale.set(w / 2.15, 1, 0.68); rf.position.set(0, 2.71, -0.34); g.add(rf); }
  box(w, 0.26, 0.02, M.burgDrape, 0, 2.36, 0.33, g);
  if (label) { const t = textCanvas(512, 96, (c, W, H) => { c.fillStyle = '#51051A'; c.fillRect(0, 0, W, H); c.strokeStyle = '#987E55'; c.lineWidth = 4; c.strokeRect(6, 6, W - 12, H - 12); c.fillStyle = '#E8D3A8'; c.font = '600 50px "Cormorant Garamond", serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, W / 2, H / 2 + 3); }); plane(g, w * 0.82, w * 0.82 * 96 / 512, std({ map: t, roughness: 0.7 }), 0, 2.36, 0.345); }
  lantern(g, w / 2 - 0.28, 0.97, 0.2, 0.62);
  return g;
}
function easel(parent, x, z, ry, map, w = 0.6, h = 0.9) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g);
  for (const sx of [-1, 1]) { const l = box(0.028, 1.8, 0.028, M.gold, sx * 0.26, 0.88, 0.04, g); l.rotation.z = sx * 0.07; }
  const bk = box(0.028, 1.7, 0.028, M.gold, 0, 0.8, -0.3, g); bk.rotation.x = -0.19;
  box(w + 0.12, 0.035, 0.09, M.gold, 0, 0.62, 0.1, g);
  box(w + 0.07, h + 0.07, 0.03, M.gold, 0, 0.64 + (h + 0.07) / 2, 0.08, g);
  plane(g, w, h, std({ map, roughness: 0.75 }), 0, 0.675 + h / 2, 0.097);
  return g;
}
function softbox(parent, x, z, target) { const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g); cyl(0.018, 0.018, 2.0, M.black, 0, 1.0, 0, g, 6); for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; rod(g, new V3(0, 0.55, 0), new V3(Math.cos(a) * 0.35, 0.02, Math.sin(a) * 0.35), 0.012, M.black); } const h = new THREE.Group(); h.position.set(0, 2.0, 0); g.add(h); h.lookAt(target); box(0.62, 0.62, 0.32, M.black, 0, 0, -0.16, h); const f = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.58), M.softbox); f.position.z = 0.005; h.add(f); return g; }
// tangga oval (pendekatan geometris dari denah; dua lengan naik dari mulut kiri, bertemu di kanan)
function ovalStair(parent) {
  const cx = (OVAL.x0 + OVAL.x1) / 2 + 0.05, cz = (OVAL.z0 + OVAL.z1) / 2, ao = 3.85, bo = 3.55, ai = 2.0, bi = 1.05, n = 17, riseTot = 2.9;
  const P = (a, b, t) => new V3(cx + a * Math.cos(t), 0, cz + b * Math.sin(t));
  for (const sgn of [-1, 1]) for (let i = 0; i < n; i++) {
    const t0 = Math.PI + sgn * (i / n) * Math.PI, t1 = Math.PI + sgn * ((i + 1) / n) * Math.PI, tm = (t0 + t1) / 2;
    const pi = P(ai, bi, tm), po = P(ao, bo, tm); const c = pi.clone().add(po).multiplyScalar(0.5); const L = pi.distanceTo(po);
    const wdt = (P(ao, bo, t0).distanceTo(P(ao, bo, t1)) + P(ai, bi, t0).distanceTo(P(ai, bi, t1))) / 2 + 0.02; const hgt = (i + 1) * riseTot / n;
    const s = box(L, hgt, wdt, i % 2 ? M.stageTop : M.stageFace, c.x, hgt / 2, c.z, parent); s.rotation.y = -Math.atan2(po.z - pi.z, po.x - pi.x);
  }
  const pts = []; for (let k = 0; k <= 64; k++) { const t = k / 64 * Math.PI * 2; const h = riseTot * Math.abs((t % (Math.PI * 2)) - Math.PI) / Math.PI; pts.push(new V3(cx + ai * Math.cos(t), h + 0.95, cz + bi * Math.sin(t))); }
  parent.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 128, 0.03, 6, true), M.gold));
}

/* ---------- material & elemen bersama (Revisi 2). V2.0: gonjong & valance segitiga dihapus; lemari songket hanya dipakai di scene akad ---------- */
M.roofGold = std({ color: 0x9C7C4C, metalness: 0.75, roughness: 0.38 });
M.lacquer = std({ color: 0x2B0F0B, roughness: 0.35, metalness: 0.1 });
M.forestVel = velvet('#1E3A12', true, 26);
M.leaf = std({ color: 0x2F4A1E, roughness: 0.8 });
M.bark = std({ color: 0x4A3424, roughness: 0.9 });
M.coupleFig = std({ color: 0x6B1724, roughness: 0.7 });
M.parentFig = std({ color: 0x87603F, roughness: 0.8 });
const songketTex = textCanvas(256, 256, (g, w, h) => { g.fillStyle = '#5A1F22'; g.fillRect(0, 0, w, h); g.strokeStyle = '#C8A26A'; g.lineWidth = 3; for (let y = 8; y < h; y += 32) { g.beginPath(); for (let x = 0; x <= w; x += 16) { g.lineTo(x, y + ((x / 16) % 2 ? 8 : 0)); } g.stroke(); } g.fillStyle = '#C8A26A'; for (let y = 24; y < h; y += 32) for (let x = 8; x < w; x += 32) { g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + 6, y); g.lineTo(x, y + 6); g.lineTo(x - 6, y); g.fill(); } });
M.songket = std({ map: songketTex, roughness: 0.55, metalness: 0.2 });
// lemari songket Palembang: kabinet lak gelap, bingkai ukir emas, pintu kaca berisi lipatan songket (menghadap −x lokal)
function lemariSongket(parent, { x, y, z, w = 1.25, h = 2.05, d = 0.5 }) {
  box(d, h, w, M.lacquer, x, y + h / 2, z, parent, { cast: true });
  box(d + 0.06, 0.12, w + 0.08, M.gold, x, y + 0.06, z, parent); box(d + 0.06, 0.1, w + 0.08, M.gold, x, y + h - 0.05, z, parent);
  const cr = new THREE.Mesh(new THREE.ShapeGeometry(archShape(w + 0.1, 0.42, 'kayon'), 16), carveMat('crown', { arch: 'kayon', w: 512, h: 220, cell: 70, base: [190, 156, 100] })); cr.rotation.y = -Math.PI / 2; cr.position.set(x - d / 2 + 0.02, y + h, z); parent.add(cr);
  for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.16, h - 0.3), carveMat('lemariSide', { w: 128, h: 1024, cell: 60, base: [184, 150, 96] })); f.rotation.y = -Math.PI / 2; f.position.set(x - d / 2 - 0.005, y + h / 2, z + s * (w / 2 - 0.08)); parent.add(f); }
  for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) { const sb = box(0.3, 0.12, 0.38, M.songket, x - 0.02, y + 0.3 + r * 0.42, z + (c - 0.5) * 0.44, parent); sb.rotation.y = Math.PI / 2; }
  box(0.01, h - 0.4, w - 0.36, M.glass, x - d / 2 - 0.01, y + h / 2, z, parent);
  box(0.02, h - 0.36, 0.03, M.gold, x - d / 2 - 0.015, y + h / 2, z, parent);
}
// standing flower: tiang emas, mangkuk bunga, juntaian bunga maroon/putih
function standingFlower(parent, B, x, z, { h = 1.55, mix = MIX.resepsi } = {}) {
  cyl(0.045, 0.07, h, M.gold, x, h / 2, z, parent, 12); cyl(0.24, 0.24, 0.02, M.gold, x, 0.01, z, parent, 20); cyl(0.22, 0.12, 0.12, M.gold, x, h + 0.04, z, parent, 18);
  mound(B, new V3(x, h + 0.08, z), new V3(0.38, 0.3, 0.38), 230, mix, { full: true });
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; cascadeCluster(B, new V3(x + Math.cos(a) * 0.3, h + 0.02, z + Math.sin(a) * 0.3), new V3(Math.cos(a) * 0.08, 0, Math.sin(a) * 0.08), rr(0.55, 0.9), 0.1, 34, MIX.juntai); }
}
// payung dengan bunga menjuntai (aisle)
function payungFlower(parent, B, x, z, s = 1) { payung(parent, B, x, 0, z, s, null); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; cascadeCluster(B, new V3(x + Math.cos(a) * 0.6 * s, 2.2 * s, z + Math.sin(a) * 0.6 * s), new V3(0, 0, 0), rr(0.45, 0.8), 0.07, 24, MIX.juntai); } }
// pohon dekoratif pengganti pergola: batang dibalut, tajuk daun hijau tua + bunga
function decoTree(parent, B, x, z, h = 2.9) {
  cyl(0.07, 0.11, h * 0.62, M.bark, x, h * 0.31, z, parent, 10); cyl(0.36, 0.3, 0.42, M.gold, x, 0.21, z, parent, 20); mound(B, new V3(x, 0.42, z), new V3(0.32, 0.12, 0.32), 40, MIX.resepsi);
  for (let i = 0; i < 9; i++) { const p = new V3(x + rr(-0.45, 0.45), h * 0.7 + rr(-0.15, 0.35), z + rr(-0.45, 0.45)); const r = rr(0.28, 0.42); const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), M.leaf); ball.position.copy(p); parent.add(ball); mound(B, p, new V3(r * 1.02, r * 1.02, r * 1.02), 26, MIX.resepsi, { full: true, leaf: 0.6, filler: 0.3, size: [0.9, 1.3] }); }
}
// segmen runner berputar (cabang aisle)
function runnerSeg(parent, a, b, w) { const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const g = new THREE.Group(); g.position.set((a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2); g.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]); parent.add(g); box(L, 0.02, w, M.runner, 0, 0.011, 0, g); for (const s of [-1, 1]) box(L, 0.025, 0.04, M.gold, 0, 0.013, s * (w / 2 + 0.02), g); return g; }
// deretan lilin berjajar + gundukan bunga rendah di kedua tepi segmen
function edgeDecor(B, CN, a, b, w, { skip = () => false, step = 0.42 } = {}) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, nx = -uz, nz = ux;
  for (let d = 0.3; d < L - 0.2; d += step) for (const s of [-1, 1]) { const x = a[0] + ux * d + nx * s * (w / 2 + 0.18), z = a[1] + uz * d + nz * s * (w / 2 + 0.18); if (skip(x, z)) continue; CN.add(x, 0, z, (Math.round(d / step) % 3) * 0.12 + 0.12, 0.035); if (Math.round(d / step) % 3 === 1) mound(B, new V3(x + nx * s * 0.2, 0, z + nz * s * 0.2), new V3(0.26, 0.18, 0.2), 30, MIX.resepsi, { leaf: 0.5 }); }
}

/* ================= REVISI V2.0 — KOMPONEN BARU =================
   Konstanta & komponen untuk: layar LED 3 × 4 m, kanopi pelaminan Sunda modern, siger,
   galeri foto berdiri (data-driven), lilin silinder kaca, scene galeri outdoor. */
M.champGold = std({ color: 0xC4AE84, metalness: 0.62, roughness: 0.44 });
M.ivoryVel = velvet('#EFE6D8');
M.winePil = velvet(P.wine);
M.boothVel = velvet('#51051A', true, 22);
M.board = std({ color: 0xE8DCCB, roughness: 0.9 });
M.boardBack = std({ color: 0xCFC2AE, roughness: 0.9 });
M.mount = std({ color: 0xC9B27E, metalness: 0.35, roughness: 0.5 });
M.glowSoft = std({ color: 0x000000, emissive: 0xffc58a, emissiveIntensity: 0.9 });
M.foliage = std({ color: 0x4E6347, roughness: 0.85 });
M.foliage2 = std({ color: 0x3C4F38, roughness: 0.85 });
M.trunk = std({ color: 0x5B4636, roughness: 0.95 });
M.plinth = std({ color: 0xE3D9CB, roughness: 0.6 });
const SCR = { cx: 19.5, w: 3.0, h: 4.0, y0: 0.45, z: 0.95 };   // layar 3 m (lebar) × 4 m (tinggi), portrait
const GAL_V = { x: 28.85, z: SZ0 + 0.35 };                      // V3.0: galeri di sebelah timur penerima tamu (denah hlm 3), menghadap selatan
const WM = { x: 29.78, z: 25.1, w: 1.3, h: 2.3, y0: 0.22 };       // cermin selamat datang di lobi lift, menghadap pintu lift
const GO = { x: 0, z: -48 };                                    // titik nol scene galeri outdoor (terpisah dari denah)

// konten layar portrait: monogram + nama + area foto/feed (konten contoh)
M.screenTall = std({ color: 0x000000, emissive: 0xffffff, emissiveIntensity: 0.5, emissiveMap: textCanvas(600, 800, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2A0610'); gr.addColorStop(1, '#51051A'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.drawImage(monoCanvas(200, 250, { bg: null, date: false }), w / 2 - 100, 40);
  g.fillStyle = '#E7D3B0'; g.textAlign = 'center'; g.font = 'italic 600 54px "Cormorant Garamond", serif'; g.fillText('Zakky & Nadia', w / 2, 340);
  g.font = '500 20px Jost, sans-serif'; try { g.letterSpacing = '6px'; } catch (e) {} g.fillText('12 · 12 · 2026', w / 2, 380); try { g.letterSpacing = '0px'; } catch (e) {}
  const pg = g.createLinearGradient(0, 420, 0, 740); pg.addColorStop(0, '#6E4A3A'); pg.addColorStop(1, '#C9A57E'); g.fillStyle = pg; g.fillRect(70, 420, 460, 320);
  g.fillStyle = 'rgba(30,8,12,.55)'; for (const [cx, s] of [[0.44, 1], [0.58, 0.95]]) { g.beginPath(); g.ellipse(70 + 460 * cx, 520, 22 * s, 27 * s, 0, 0, 6.3); g.fill(); g.beginPath(); g.ellipse(70 + 460 * cx, 660, 50 * s, 100 * s, 0, 0, 6.3); g.fill(); }
  g.fillStyle = '#F2E5C6'; g.font = '500 16px Jost, sans-serif'; g.fillText('PHOTOLOOP / LIVE FEED · KONTEN CONTOH', w / 2, 775);
}) });

// kanopi terinspirasi atap julang ngapak (Sunda: "burung mengepakkan sayap") — pelana rendah, sayap landai, tanpa ujung naik
function julangCanopy(parent, { x, zc, y0, w = 3.9, rise = 0.6, depth = 0.75, t = 0.09, k = 0.6 }) {
  const hw = w / 2, s = new THREE.Shape();
  s.moveTo(-hw, -0.03); s.lineTo(-hw * k, 0.06); s.lineTo(0, rise); s.lineTo(hw * k, 0.06); s.lineTo(hw, -0.03);
  s.lineTo(hw, -0.03 - t); s.lineTo(hw * k, 0.06 - t); s.lineTo(0, rise - t * 1.6); s.lineTo(-hw * k, 0.06 - t); s.lineTo(-hw, -0.03 - t); s.closePath();
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2 }), M.champGold);
  m.rotation.y = -Math.PI / 2; m.position.set(x, y0, zc); m.castShadow = true; parent.add(m);
  const tri = new THREE.Shape(); tri.moveTo(-hw * k + 0.14, 0.02); tri.lineTo(0, rise - 0.2); tri.lineTo(hw * k - 0.14, 0.02); tri.closePath();
  const tg = new THREE.ShapeGeometry(tri); normUV(tg, w, rise);
  const tm = new THREE.Mesh(tg, carveMat('tympanum', { w: 1024, h: 160, cell: 56, base: [200, 172, 120] })); tm.rotation.y = -Math.PI / 2; tm.position.set(x - depth - 0.025, y0, zc); parent.add(tm);
  const tb = new THREE.Mesh(tg, M.glow); tb.rotation.y = -Math.PI / 2; tb.position.set(x - depth + 0.03, y0, zc); parent.add(tb);
  box(0.14, 0.11, w * k * 2 - 0.1, M.champGold, x - depth + 0.08, y0 - 0.055, zc, parent);
  return m;
}
// siger Sunda sebagai mahkota dekoratif (interpretasi modern): garis lengkung bertingkat memuncak di tengah + 7 kembang goyang
function sigerCrest(parent, { x, zc, y0, w = 1.15, h = 0.5 }) {
  const hw = w / 2, N = 56, top = u => { const a = Math.abs(u) / hw; return h * (0.3 + 0.7 * Math.pow(1 - a, 1.25)) * (0.86 + 0.14 * Math.cos(a * Math.PI * 6)); };
  const s = new THREE.Shape(); s.moveTo(-hw, 0); for (let i = 0; i <= N; i++) { const u = -hw + 2 * hw * i / N; s.lineTo(u, top(u)); } s.lineTo(hw, 0); s.closePath();
  const g = new THREE.Group(); g.position.set(x, y0, zc); g.rotation.y = -Math.PI / 2; parent.add(g);
  const sg = new THREE.ShapeGeometry(s); normUV(sg, w, h);
  const f = new THREE.Mesh(sg, carveMat('siger', { w: 512, h: 224, cell: 44, base: [214, 186, 130] })); f.position.z = 0.02; g.add(f);
  const bk = new THREE.Mesh(sg, M.winePil); bk.position.z = -0.015; g.add(bk);
  const edge = []; for (let i = 0; i <= N; i++) { const u = -hw + 2 * hw * i / N; edge.push(new V3(u, top(u), 0.03)); }
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge), 90, 0.013, 6), M.gold));
  const base = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.05, 0.06), M.gold); base.position.set(0, 0.02, 0.02); g.add(base);
  for (let i = 0; i < 7; i++) {
    const u = (i - 3) / 3 * hw * 0.8, ty = top(u), lean = -u * 0.6;
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.13, 5), M.gold); st.position.set(u + Math.sin(-lean) * 0.065, ty + 0.06, 0.035); st.rotation.z = lean; g.add(st);
    const fl = new THREE.Mesh(new THREE.CircleGeometry(0.034, 10), M.gold); fl.position.set(u + Math.sin(-lean) * 0.13, ty + 0.125, 0.04); g.add(fl);
    const bd = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), M.bulb); bd.position.set(fl.position.x, fl.position.y, 0.05); g.add(bd);
  }
  return g;
}
// lilin pilar krem dalam silinder kaca bening (tinggi campuran)
function hurricane(parent, x, y, z, h, r = 0.075) {
  cyl(r, r, h, M.glass, x, y + h / 2, z, parent, 18, { open: true }); cyl(r, r, 0.012, M.glass, x, y + 0.006, z, parent, 18);
  const ch = Math.min(0.2, h * 0.45); cyl(0.045, 0.045, ch, M.candle, x, y + 0.012 + ch / 2, z, parent, 14);
  const f = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), M.flame); f.scale.set(0.009, 0.022, 0.009); f.position.set(x, y + 0.012 + ch + 0.022, z); parent.add(f);
}
// galeri foto berdiri: papan vertikal bertingkat & bertumpuk (data-driven)
const GAL_BOARDS = [
  { x: -1.95, dz: 0.0, w: 0.9, h: 2.1, tone: 'warm', cap: 'Kampong Glam', sub: 'SINGAPURA · BABAK I · PAGI' },
  { x: -1.05, dz: 0.38, w: 1.0, h: 2.3, tone: 'bw', cap: 'National Gallery', sub: 'SINGAPURA · BABAK II · SIANG' },
  { x: 0.0, dz: 0.0, w: 1.25, h: 2.5, tone: 'main', main: true },
  { x: 1.05, dz: 0.38, w: 1.0, h: 2.3, tone: 'dusk', cap: 'Cavenagh Bridge', sub: 'SINGAPURA · BABAK III · SENJA' },
  { x: 1.95, dz: 0.0, w: 0.9, h: 2.1, tone: 'bw2', cap: 'Silih Asih', sub: 'SALING MENGASIHI' },
];
const GAL_DIM = { w: 4.8, d: 1.6, h: 2.56 };
const galPhoto = (tone) => textCanvas(400, 500, (g, w, h) => {
  const T = { warm: ['#E3C8A4', '#7A5844'], bw: ['#C9C9C6', '#3A3A39'], main: ['#E9D9C2', '#8C6A60'], dusk: ['#D5B2A5', '#4A2C35'], bw2: ['#DADAD7', '#545452'] }[tone];
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, T[0]); gr.addColorStop(1, T[1]); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, h * 0.62, w, 3);
  g.fillStyle = tone.startsWith('bw') ? 'rgba(20,20,20,.55)' : 'rgba(40,14,16,.5)';
  for (const [cx, s] of [[0.43, 1], [0.59, 0.94]]) { g.beginPath(); g.ellipse(w * cx, h * 0.4, 24 * s, 30 * s, 0, 0, 6.3); g.fill(); g.beginPath(); g.ellipse(w * cx, h * 0.8, 56 * s, 120 * s, 0, 0, 6.3); g.fill(); }
  g.fillStyle = 'rgba(255,250,240,.9)'; g.font = '500 13px Jost, sans-serif'; g.textAlign = 'center'; g.fillText('PLACEHOLDER · FOTO PREWEDDING', w / 2, h - 16);
});
const galText = (b) => textCanvas(512, b.main ? 420 : 200, (g, w, h) => {
  g.fillStyle = '#E8DCCB'; g.fillRect(0, 0, w, h); g.textAlign = 'center'; g.fillStyle = '#560818';
  if (b.main) {
    g.font = '600 40px "Cormorant Garamond", serif'; try { g.letterSpacing = '3px'; } catch (e) {}
    ['LOOK AT YOU', 'AND SEE THE REST', 'OF MY LIFE', 'IN FRONT OF MY EYES'].forEach((t, i) => g.fillText(t, w / 2, 60 + i * 52));
    try { g.letterSpacing = '0px'; } catch (e) {} g.fillStyle = '#B49B66'; g.fillRect(w / 2 - 70, 282, 140, 2);
    g.fillStyle = '#560818'; g.font = '500 19px Jost, sans-serif'; try { g.letterSpacing = '7px'; } catch (e) {} g.fillText('ZAKKY & NADIA', w / 2, 322); try { g.letterSpacing = '0px'; } catch (e) {}
    g.drawImage(monoCanvas(60, 75, { bg: null, date: false, flat: '#560818' }), w / 2 - 30, 338);
  } else {
    g.font = 'italic 600 50px "Cormorant Garamond", serif'; g.fillText(b.cap, w / 2, 76);
    g.fillStyle = '#B49B66'; g.fillRect(w / 2 - 50, 102, 100, 2);
    g.fillStyle = '#560818'; g.font = '500 17px Jost, sans-serif'; try { g.letterSpacing = '5px'; } catch (e) {} g.fillText(b.sub, w / 2, 142); try { g.letterSpacing = '0px'; } catch (e) {}
  }
});
function photoBoard(parent, b, y0) {
  const g = new THREE.Group(); g.position.set(b.x, y0, b.dz); parent.add(g);
  box(b.w, b.h, 0.04, M.board, 0, b.h / 2, 0, g, { cast: true });
  box(b.w - 0.02, b.h - 0.02, 0.005, M.boardBack, 0, b.h / 2, -0.023, g);
  const pw = b.w * (b.main ? 0.6 : 0.74), ph = pw * 1.25, top = b.w * (b.main ? 0.1 : 0.12), pyc = b.h - top - ph / 2;
  box(pw + 0.03, ph + 0.03, 0.006, M.mount, 0, pyc, 0.022, g);
  plane(g, pw, ph, std({ map: galPhoto(b.tone), roughness: 0.75 }), 0, pyc, 0.027);
  const th = b.main ? b.w * 0.82 * 420 / 512 : b.w * 0.82 * 200 / 512, tyc = pyc - ph / 2 - 0.05 - th / 2;
  plane(g, b.w * 0.82, th, std({ map: galText(b), roughness: 0.9 }), 0, tyc, 0.022);
  for (const sx of [-0.28, 0.28]) { const st = box(0.03, b.h * 0.72, 0.03, M.black, sx * b.w, b.h * 0.36, -0.25, g); st.rotation.x = Math.asin(0.19 / (b.h * 0.36)); } // penyangga miring di belakang papan (puncak z≈-0,06, kaki z≈-0,44)
  box(b.w * 0.8, 0.02, 0.5, M.black, 0, 0.01, -0.28, g);
  return g;
}
// V3.0 (hlm 8): galeri foto MINIMALIS — dinding gading berdiri dengan tinggi & kedalaman berbeda, bingkai foto hitam/emas,
// lampu gambar di atas tiap dinding, lilin terbatas di kaki dinding, bunga dalam pot besar (peach 20 · merah terang 30 · putih 20 · merah gelap 20 · daun 10)
const GAL_WALLS = [
  { x: -1.9, dz: 0.4, w: 1.2, h: 1.9, frames: [[0, 1.3, 0.5, 0.62, 'bw', 'black'], [0, 0.62, 0.5, 0.4, 'warm', 'black']] },
  { x: -0.35, dz: 0.0, w: 1.8, h: 2.5, frames: [[-0.3, 1.5, 0.8, 1.0, 'main', 'gold'], [0.42, 1.86, 0.3, 0.38, 'warm', 'black'], [0.74, 1.86, 0.22, 0.3, 'bw', 'black'], [0.42, 1.36, 0.3, 0.38, 'bw2', 'black'], [0.74, 1.36, 0.22, 0.3, 'dusk', 'black'], [-0.3, 0.68, 0.46, 0.36, 'warm', 'black']] },
  { x: 1.35, dz: 0.32, w: 1.35, h: 2.15, frames: [[0, 1.45, 0.7, 0.86, 'dusk', 'black']], quote: true },
];
const urnGeo = new THREE.LatheGeometry([[0.001, 0], [0.16, 0], [0.2, 0.05], [0.29, 0.24], [0.33, 0.42], [0.3, 0.57], [0.22, 0.67], [0.25, 0.72], [0.23, 0.74], [0.001, 0.74]].map(([a, b]) => new THREE.Vector2(a, b)), 32);
M.passe = std({ color: 0xF4EFE6, roughness: 0.9 });
function buildGallery(parent, B, { x, z, ry = 0, lights = null, spotY = 4.9 }) {
  const G2 = new THREE.Group(); G2.position.set(x, 0, z); G2.rotation.y = ry; parent.add(G2);
  const wp = (lx, ly, lz) => { const c = Math.cos(ry), s = Math.sin(ry); return new V3(x + lx * c + lz * s, ly, z - lx * s + lz * c); };
  GAL_WALLS.forEach(W => {
    const wg = new THREE.Group(); wg.position.set(W.x, 0, W.dz); G2.add(wg);
    box(W.w, W.h, 0.14, M.wallIvory, 0, W.h / 2, 0, wg, { cast: true });
    box(W.w + 0.03, 0.05, 0.17, M.wallIvory, 0, 0.025, 0, wg);
    for (const sx of [-1, 1]) box(0.05, 0.035, 0.52, M.frameBlack, sx * (W.w / 2 - 0.12), 0.018, -0.26, wg);
    W.frames.forEach(([cx, cy, fw, fh, tone, kind]) => {
      box(fw + 0.07, fh + 0.07, 0.035, kind === 'gold' ? M.gold : M.frameBlack, cx, cy, 0.088, wg);
      plane(wg, fw, fh, M.passe, cx, cy, 0.107);
      plane(wg, fw * 0.8, fh * 0.8, std({ map: galPhoto(tone), roughness: 0.6 }), cx, cy, 0.109);
    });
    if (W.quote) plane(wg, 0.6, 0.49, std({ map: galText({ main: true }), roughness: 0.9 }), 0, 0.62, 0.072);
    // lampu gambar (picture light) di puncak dinding
    const bw = Math.min(0.55, W.w * 0.42);
    rod(wg, new V3(0, W.h - 0.05, 0.075), new V3(0, W.h + 0.07, 0.25), 0.008, M.frameBlack);
    box(bw, 0.045, 0.07, M.frameBlack, 0, W.h + 0.075, 0.27, wg); box(bw - 0.04, 0.006, 0.04, M.glowSoft, 0, W.h + 0.05, 0.27, wg);
    if (lights) { const S = new THREE.SpotLight(0xffe6cc, 8, 0, 0.62, 0.8, 2); S.position.copy(wp(W.x, W.h + 0.06, W.dz + 0.3)); S.target.position.copy(wp(W.x, W.h * 0.48, W.dz)); parent.add(S, S.target); lights.push(S); S.userData = { amb: 6, doc: 8, k: 0.5 }; }
  });
  // bunga dalam pot besar (gerabah krem) — kanan depan sepasang, kiri satu
  [[2.32, 0.78, 1.0], [1.8, 1.16, 0.74], [-2.72, 0.95, 0.82]].forEach(([lx, lz, s], i) => {
    const p = wp(lx, 0, lz); const u = new THREE.Mesh(urnGeo, M.urn); u.position.copy(p); u.scale.setScalar(s); u.castShadow = true; parent.add(u);
    const top = 0.73 * s;
    mound(B, wp(lx, top, lz), new V3(0.5 * s + 0.08, 0.46 * s, 0.46 * s), Math.round(520 * s), MIX.galV3, { full: true, leaf: 0.14, filler: 0.22, size: [0.95, 1.4] });
    foliage(B, wp(lx, top + 0.05, lz), new V3(0.55 * s, 0.45 * s, 0.5 * s), Math.round(60 * s), { fern: 2, tall: 0.9 });
    for (let k = 0; k < 4; k++) { const a = rr(-0.6, 0.9) + (i === 2 ? Math.PI : 0); cascadeCluster(B, wp(lx + Math.cos(a) * 0.32 * s, top + 0.08, lz + Math.sin(a) * 0.3 * s), new V3(Math.cos(a) * 0.06, 0, Math.sin(a) * 0.06), rr(0.35, 0.6) * s, 0.09, 30, MIX.galV3); }
    if (i === 0) for (let k = 0; k < 3; k++) cascadeCluster(B, wp(lx - 0.25 + k * 0.05, top + 0.2, lz + 0.22), new V3(0.02, 0, 0.05), rr(0.6, 0.85), 0.07, 34, [['#F8F3EA', 0.8], ['#EEE5D6', 0.2]]);
  });
  // gundukan bunga rendah di lantai (sebagian), bukan hamparan penuh
  for (const [lx, lz, rx, ry2, n] of [[2.8, 1.25, 0.32, 0.3, 130], [1.15, 1.45, 0.22, 0.18, 60], [-2.35, 1.3, 0.26, 0.22, 80], [-0.6, 0.62, 0.2, 0.16, 50]]) mound(B, wp(lx, 0, lz), new V3(rx, ry2, rx * 0.85), n, MIX.galV3, { leaf: 0.2, filler: 0.25 });
  // lilin terbatas (7 buah) di kaki dinding
  [[-1.15, 0.78, 0.3], [-0.98, 0.66, 0.18], [0.12, 0.56, 0.36], [0.3, 0.7, 0.22], [1.42, 1.0, 0.28], [-2.2, 1.0, 0.24], [-2.02, 1.12, 0.16]].forEach(([lx, lz, h]) => { const p = wp(lx, 0, lz); hurricane(parent, p.x, 0, p.z, h, 0.06); });
  { const p = wp(3.0, 0, 0.42), d = wp(2.2, 0, 0.42); janurLengkung(parent, B, p.x, p.z, d.x - p.x, d.z - p.z, { h: 2.9, reach: 0.5, mix: MIX.galV3, tassel: 0.8 }); }
  // lampu sorot umum (plafon) untuk foto
  if (lights) { const S = new THREE.SpotLight(0xffe8d0, 22, 0, 0.6, 0.85, 2); S.position.copy(wp(0, spotY - 0.1, 2.8)); S.target.position.copy(wp(0, 1.1, 0.3)); parent.add(S, S.target); lights.push(S); S.userData = { amb: 14, doc: 26, k: 1.4 }; }
  return G2;
}

/* =====================================================================
   REVISI V3.0 — MOODBOARD 12 HALAMAN (Zakky & Nadia Wedding (1).pdf)
   Komponen baru: lantai melamin hitam (reflektif) + inisial N&Z, tiang chandelier berbunga setengah,
   payung berjuntai berdaun hijau tua, rak mini berkain putih, gebyok Jawa + gunungan + juntaian melati,
   kursi pelaminan kayu ukir, payung bertingkat + janur, welcome mirror berbingkai ukir + fabric hanging,
   backdrop penerima tamu drapery emerald, galeri foto minimalis, photobooth velvet maroon/ivory.
   ===================================================================== */
M.teak = std({ map: tex(woodCanvas(256, 512, [112, 68, 34])), roughness: 0.52, metalness: 0.05 });
M.teakDark = std({ map: tex(woodCanvas(256, 512, [60, 35, 16])), roughness: 0.6 });
M.prada = std({ color: 0xC9A15E, metalness: 0.7, roughness: 0.35 });
M.cushionCream = velvet('#EFE4CF');
M.whiteCloth = phy({ color: 0xF6F2EA, roughness: 0.82, sheen: 0.55, sheenColor: col('#ffffff'), side: THREE.DoubleSide });
M.emerald = velvet('#0D4A2C'); M.emerald.side = THREE.DoubleSide;
M.emeraldSwag = velvet('#12573A'); M.emeraldSwag.side = THREE.DoubleSide;
M.maroonVel = velvet('#4E0717'); M.maroonVel.side = THREE.DoubleSide; M.maroonVel.sheenColor = col('#7A2434'); M.maroonVel.sheen = 0.45;
M.ivoryVelV3 = velvet('#EEE2CB'); M.ivoryVelV3.side = THREE.DoubleSide;
M.crystal = std({ color: 0xffffff, metalness: 0.1, roughness: 0.08, transparent: true, opacity: 0.55, emissive: 0xfff4e6, emissiveIntensity: 0.22, depthWrite: false });
M.parasol = std({ color: 0xF2EADB, roughness: 0.7, side: THREE.DoubleSide, emissive: 0x3a2e20, emissiveIntensity: 0.12 });
M.globe = std({ color: 0xfff6e8, emissive: 0xffe2b8, emissiveIntensity: 1.4 });
M.wallIvory = std({ color: 0xF0E9DE, roughness: 0.88 });
M.frameBlack = std({ color: 0x1B1715, roughness: 0.42, metalness: 0.25 });
M.urn = std({ map: tex(cnv(256, 256, (g, w, h) => { g.fillStyle = '#BFA88E'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '120,98,78' : '232,220,204'},${rnd() * 0.16})`; g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 4, 2 + rnd() * 4); } })), roughness: 0.92 });
M.ribbon = std({ color: 0x5C2A1E, roughness: 0.32, metalness: 0.12, side: THREE.DoubleSide });
M.theater = velvet('#5A1220');
M.janur = std({ map: tex(cnv(256, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#E2DCB4'); gr.addColorStop(0.5, '#F3EFD2'); gr.addColorStop(1, '#DCD4A8'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(150,130,50,.35)'; g.lineWidth = 2; for (let x = 6; x < w; x += 12) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } })), roughness: 0.5, side: THREE.DoubleSide, emissive: 0x2a2610, emissiveIntensity: 0.12 });
LIGHTS.chand = [];

// proporsi warna bunga dari teks moodboard
MIX.pelV3 = [['#4E0A1A', 0.22], ['#5E0B1F', 0.2], ['#7A1428', 0.18], ['#F2B49A', 0.11], ['#E8A487', 0.09], ['#F8F3EA', 0.13], ['#EEE5D6', 0.07]]; // hlm 11: maroon 60 · peach 20 · putih 20 (+ daun)
MIX.galV3 = [['#F2B49A', 0.15], ['#EBA88C', 0.07], ['#C8102E', 0.2], ['#D61F2C', 0.13], ['#F8F3EA', 0.16], ['#EEE5D6', 0.06], ['#5A0A1A', 0.13], ['#6E0F22', 0.1]]; // hlm 8: peach 20 · merah terang 30 · putih 20 · merah gelap 20 (+ daun 10)
MIX.aisleV3 = [['#5A0A1A', 0.24], ['#B5122A', 0.2], ['#F2B49A', 0.18], ['#F8F3EA', 0.26], ['#7A1428', 0.12]]; // hlm 9 foto referensi (teks warna terpotong)
MIX.receptV3 = [['#F8F3EA', 0.42], ['#EFE6D8', 0.12], ['#5A0A1A', 0.14], ['#9E1530', 0.14], ['#C8102E', 0.08], ['#F2C2B0', 0.1]]; // hlm 7 gambar 3: putih dominan + merah/burgundy
MIX.boothV3 = [['#4E0A1A', 0.38], ['#7A1428', 0.34], ['#9E1530', 0.14], ['#F8F3EA', 0.14]]; // hlm 10: maroon, burgundy, sedikit putih
MIX.welcomeV3 = [['#5A0A1A', 0.3], ['#7A1428', 0.15], ['#F2B49A', 0.2], ['#F8F3EA', 0.25], ['#E8C9B0', 0.1]]; // hlm 6

// --- dedaunan hijau tua (paku, daun lebar) ---
const DARKG = [['#1E3A24', 0.35], ['#264A2E', 0.35], ['#33553A', 0.2], ['#3F5F3C', 0.1]];
function foliage(B, c, r, n, { tall = 1, fern = 0 } = {}) {
  const N = Math.max(8, Math.round(n * DENS));
  for (let i = 0; i < N; i++) {
    const u = Math.pow(rnd(), 0.6), th = rnd() * Math.PI * 2, s = Math.sqrt(Math.max(0, 1 - u * u));
    const p = new V3(c.x + s * Math.cos(th) * r.x * rr(0.55, 1), c.y + u * r.y * rr(0.5, 1), c.z + s * Math.sin(th) * r.z * rr(0.55, 1));
    const nrm = new V3(s * Math.cos(th) + rr(-0.4, 0.4), u * 0.8 + rr(0.15, 0.65), s * Math.sin(th) + rr(-0.4, 0.4)).normalize();
    B.add(B.leaf, p, nrm, rr(2.2, 4.0) * tall, vary(pick(DARKG), 0.05));
  }
  const NF = Math.round(fern * Math.max(0.6, DENS));
  for (let f = 0; f < NF; f++) {
    const th = rnd() * Math.PI * 2, L = rr(0.45, 0.85) * tall, up = rr(0.45, 0.95);
    const base = new V3(c.x + Math.cos(th) * r.x * 0.2, c.y + r.y * 0.35, c.z + Math.sin(th) * r.z * 0.2);
    const dir = new V3(Math.cos(th), up, Math.sin(th)).normalize();
    for (let k = 1; k <= 13; k++) { const t = k / 13; const p = base.clone().addScaledVector(dir, L * t); p.y -= t * t * L * 0.55;
      for (const sd of [-1, 1]) { const side = new V3(-Math.sin(th) * sd, 0, Math.cos(th) * sd); B.add(B.leaf, p.clone().addScaledVector(side, 0.025), side.clone().add(new V3(0, 0.5, 0)).normalize(), rr(0.9, 1.35) * (1 - t * 0.5), vary('#244A2C', 0.05)); } }
  }
}
// untaian daun hijau menjuntai (amaranthus hijau) untuk photobooth
function leafStrand(B, top, len) {
  const n = Math.floor(len / 0.04), ph = rnd() * 6.28;
  for (let i = 0; i < n; i++) { const t = i / n, p = new V3(top.x + Math.sin(ph + t * 4) * 0.025 * t, top.y - i * 0.04, top.z + Math.cos(ph + t * 3) * 0.025 * t);
    B.add(B.filler, p, new V3(0, 1, 0), rr(1.1, 1.6) * (1 - t * 0.4), vary('#5B8A3A', 0.06));
    if (i % 2 === 0) B.add(B.leaf, p.clone().add(new V3(rr(-0.02, 0.02), 0, rr(-0.02, 0.02))), new V3(rr(-1, 1), rr(-1.3, -0.3), rr(-1, 1)).normalize(), rr(0.8, 1.2), vary('#3E6B2E', 0.05)); }
  B.lines.push(top.x, top.y, top.z, top.x, top.y - len, top.z);
}

// --- kain berlipit nyata (geometri), swag melengkung, cakram velvet berlipit ---
function pleatGeo(w, h, { folds = Math.max(3, Math.round(w * 3.2)), depth = 0.055, segY = 1, flare = 0 } = {}) {
  const sx = Math.max(16, Math.round(folds * 10)); const g = new THREE.PlaneGeometry(w, h, sx, Math.max(1, segY)); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); const v = 0.5 - y / h; const t = (x / w + 0.5) * folds * Math.PI * 2; const d = depth * (1 + flare * v); p.setZ(i, Math.sin(t) * d + Math.sin(t * 2.3 + 1.3) * d * 0.25); }
  g.computeVertexNormals(); return g;
}
function curtain(parent, w, h, mat, x, y, z, ry = 0, o = {}) { const m = new THREE.Mesh(pleatGeo(w, h, { segY: o.flare ? 6 : 1, ...o }), mat); m.position.set(x, y + h / 2, z); m.rotation.y = ry; m.receiveShadow = true; parent.add(m); return m; }
function swag(parent, mat, a, b, { drop = 0.6, bulge = 0.14, folds = 5 } = {}) {
  const L = a.distanceTo(b), g = new THREE.PlaneGeometry(1, 1, 48, 18), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const u = p.getX(i) + 0.5, v = 0.5 - p.getY(i), s4 = 4 * u * (1 - u);
    const y = -v * drop * (0.16 + 0.84 * s4) - 0.07 * s4; const zz = bulge * Math.sin(Math.PI * Math.min(1, v * 1.1)) * s4 + 0.02 * Math.sin(v * folds * Math.PI * 2 + u * 3) * s4;
    p.setXYZ(i, (u - 0.5) * L, y, zz); }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.position.copy(a).add(b).multiplyScalar(0.5);
  m.rotation.set(0, -Math.atan2(b.z - a.z, b.x - a.x), Math.atan2(b.y - a.y, Math.hypot(b.x - a.x, b.z - a.z))); parent.add(m); return m;
}
function velvetDisc(parent, mat, x, y, z, r, { rx = 0, ry = 0 } = {}) {
  const g = new THREE.RingGeometry(0.015, r, 120, 6), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getY(i), p.getX(i)), q = Math.hypot(p.getX(i), p.getY(i)) / r; p.setZ(i, Math.sin(a * 24) * 0.02 * q + (1 - q) * 0.05); }
  g.computeVertexNormals(); const grp = new THREE.Group(); grp.position.set(x, y, z); grp.rotation.set(rx, ry, 0); parent.add(grp);
  const m = new THREE.Mesh(g, mat); grp.add(m);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.025, 8, 64), mat); grp.add(rim);
  const bt = new THREE.Mesh(new THREE.SphereGeometry(r * 0.13, 16, 10), mat); bt.position.z = 0.06; bt.scale.z = 0.6; grp.add(bt);
  return grp;
}

// --- lantai melamin hitam reflektif (satu bidang, bentuk Y dari mask) ---
const MelamineShader = {
  name: 'MelamineShader',
  uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, tMask: { value: null }, refl: { value: 0.4 } },
  vertexShader: /* glsl */`
    uniform mat4 textureMatrix; varying vec4 vUv; varying vec2 vUv2; varying vec3 vWp;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main() { vUv = textureMatrix * vec4( position, 1.0 ); vUv2 = uv; vWp = ( modelMatrix * vec4( position, 1.0 ) ).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    #include <logdepthbuf_vertex>
    }`,
  fragmentShader: /* glsl */`
    uniform vec3 color; uniform sampler2D tDiffuse; uniform sampler2D tMask; uniform float refl; varying vec4 vUv; varying vec2 vUv2; varying vec3 vWp;
    #include <logdepthbuf_pars_fragment>
    void main() {
    #include <logdepthbuf_fragment>
      if ( texture2D( tMask, vUv2 ).r < 0.5 ) discard;
      vec4 base = texture2DProj( tDiffuse, vUv );
      float ct = abs( normalize( cameraPosition - vWp ).y ); float k = refl * ( 0.62 + 0.38 * pow( 1.0 - ct, 3.0 ) );
      gl_FragColor = vec4( color + base.rgb * k, 1.0 );
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`
};
const AISLE_FX = { refl: null, flat: null };

// --- chandelier kristal ---
function chandelier(parent, x, y, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); parent.add(g);
  cyl(0.006, 0.006, 0.22, M.gold, 0, -0.11, 0, g, 6);
  cyl(0.02, 0.03, 0.62, M.gold, 0, -0.53, 0, g, 12);
  for (const [r, yy] of [[0.3, -0.62], [0.19, -0.42]]) { const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.008, 6, 40), M.gold); t.rotation.x = Math.PI / 2; t.position.y = yy; g.add(t); }
  for (const [n, r, yy] of [[8, 0.3, -0.62], [5, 0.19, -0.42]]) for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, bx = Math.cos(a) * r, bz = Math.sin(a) * r; cyl(0.012, 0.012, 0.07, M.candle, bx, yy + 0.045, bz, g, 8); const f = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), M.bulb); f.position.set(bx, yy + 0.1, bz); g.add(f); }
  const pts = [];
  for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2; for (let j = 0; j < 5; j++) pts.push([Math.cos(a) * (0.31 - j * 0.012), -0.66 - j * 0.045, Math.sin(a) * (0.31 - j * 0.012)]); }
  for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2; for (let j = 0; j < 4; j++) pts.push([Math.cos(a) * 0.2, -0.46 - j * 0.04, Math.sin(a) * 0.2]); }
  for (let j = 0; j < 36; j++) { const t = j / 36, a = j * 2.4, r2 = 0.27 * Math.sin(Math.PI * (0.12 + 0.88 * t)); pts.push([Math.cos(a) * r2 * 0.55, -0.9 - t * 0.26, Math.sin(a) * r2 * 0.55]); }
  const im = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.016, 0), M.crystal, pts.length); const mm = new THREE.Matrix4();
  pts.forEach(([a, b, c], i) => { mm.compose(new V3(a, b, c), new THREE.Quaternion(), new V3(1, 1.6, 1)); im.setMatrixAt(i, mm); }); im.renderOrder = 3; g.add(im);
  const fin = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), M.crystal); fin.position.y = -1.2; g.add(fin);
  return g;
}
// tiang chandelier (lengkung emas) — bunga hanya di setengah bawah tiang + mahkota kecil di puncak (hlm 9)
function chandelierArch(parent, B, x, z, ry, { h = 3.0, span = 1.2 } = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g);
  const r = span / 2;
  for (const sx of [-r, r]) { cyl(0.022, 0.022, h, M.gold, sx, h / 2, 0, g, 10); box(0.3, 0.025, 0.3, M.gold, sx, 0.012, 0, g); }
  const arc = new THREE.Mesh(new THREE.TorusGeometry(r, 0.022, 8, 48, Math.PI), M.gold); arc.position.y = h; g.add(arc);
  chandelier(g, 0, h + r - 0.03, 0, 0.82);
  const W = (lx, ly, lz) => { const c = Math.cos(ry), s = Math.sin(ry); return new V3(x + lx * c + lz * s, ly, z - lx * s + lz * c); };
  mound(B, W(0, h + r + 0.02, 0), new V3(0.32, 0.2, 0.26), 210, MIX.aisleV3, { full: true, leaf: 0.4, filler: 0.25 });
  for (let k = 0; k < 4; k++) cascadeCluster(B, W(rr(-0.18, 0.18), h + r - 0.04, rr(-0.08, 0.08)), new V3(0, 0, 0), rr(0.3, 0.55), 0.08, 24, MIX.aisleV3);
  for (const sx of [-r, r]) {
    mound(B, W(sx, 0, 0), new V3(0.44, 0.48, 0.4), 260, MIX.aisleV3, { leaf: 0.45, filler: 0.25 });
    mound(B, W(sx, 0.5, 0), new V3(0.3, 0.55, 0.3), 220, MIX.aisleV3, { full: true, leaf: 0.45, filler: 0.25 });
    mound(B, W(sx, 1.05, 0), new V3(0.21, 0.36, 0.21), 110, MIX.aisleV3, { full: true, leaf: 0.5, filler: 0.2 });
  }
  return g;
}
// payung berjuntai: payung kertas gading, juntaian melati, kaki dedaunan hijau tua dominan (hlm 9)
function payungJuntai(parent, B, x, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); parent.add(g);
  cyl(0.016, 0.02, 2.55, M.teakDark, 0, 1.275, 0, g, 8);
  const R = 0.7; const cone = new THREE.Mesh(new THREE.ConeGeometry(R, 0.3, 36, 1, true), M.parasol); cone.position.y = 2.5; g.add(cone);
  for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; rod(g, new V3(0, 2.64, 0), new V3(Math.cos(a) * R, 2.35, Math.sin(a) * R), 0.004, M.teakDark); }
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.16, 10), M.gold); fin.position.y = 2.72; g.add(fin);
  const top = 2.35 * s;
  for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, a2 = (k + 1) / 16 * Math.PI * 2;
    if (k % 2) leafStrandDark(B, new V3(x + Math.cos(a) * R * s, top, z + Math.sin(a) * R * s), rr(0.6, 1.05) * s); else strand(B, new V3(x + Math.cos(a) * R * s, top, z + Math.sin(a) * R * s), rr(0.55, 1.0) * s, { sway: 0.01, bud: 9 });
    for (let t = 0.06; t < 0.95; t += 0.055) { const aa = a + (a2 - a) * t, sag = 0.17 * Math.sin(Math.PI * t); B.add(B.jas, new V3(x + Math.cos(aa) * R * s, top - sag * s, z + Math.sin(aa) * R * s), new V3(0, 1, 0), 0.95, col('#F6F0E2')); } }
  foliage(B, new V3(x, 0, z), new V3(0.72 * s, 0.85 * s, 0.72 * s), 440, { fern: 16, tall: s });
  mound(B, new V3(x + 0.26 * s, 0.32 * s, z + 0.18 * s), new V3(0.22, 0.18, 0.2), 46, MIX.aisleV3, { full: true, leaf: 0.6, filler: 0.2 });
  mound(B, new V3(x - 0.28 * s, 0.22 * s, z - 0.16 * s), new V3(0.18, 0.14, 0.18), 30, MIX.aisleV3, { full: true, leaf: 0.6, filler: 0.2 });
  const gl = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), M.globe); gl.position.set(0.48, 0.13, 0.36); g.add(gl);
  return g;
}
// rak / meja mini berkain putih: vas berisi bunga ATAU lilin (menggantikan lampu bunga, hlm 9)
function miniRack(parent, B, x, z, ry, kind) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g);
  const w = 0.55, d = 0.38, h = 0.78;
  box(w + 0.03, 0.03, d + 0.03, M.whiteCloth, 0, h, 0, g);
  for (const [px, pz, ww, r3] of [[0, d / 2 + 0.014, w, 0], [0, -d / 2 - 0.014, w, Math.PI], [w / 2 + 0.014, 0, d, Math.PI / 2], [-w / 2 - 0.014, 0, d, -Math.PI / 2]]) { const m = new THREE.Mesh(pleatGeo(ww + 0.03, h, { folds: Math.round(ww * 9), depth: 0.007, flare: 1.6, segY: 6 }), M.whiteCloth); m.position.set(px, h / 2, pz); m.rotation.y = r3; g.add(m); }
  const W = (lx, ly, lz) => { const c = Math.cos(ry), s = Math.sin(ry); return new V3(x + lx * c + lz * s, ly, z - lx * s + lz * c); };
  if (kind === 'vase') { for (const [lx, vh, rad] of [[-0.12, 0.34, 0.06], [0.14, 0.24, 0.05]]) { const p = W(lx, h, 0); cyl(rad, rad * 0.85, vh, M.glass, p.x, h + 0.015 + vh / 2, p.z, parent, 16, { open: true }); mound(B, new V3(p.x, h + vh, p.z), new V3(0.17, 0.15, 0.17), 90, MIX.aisleV3, { full: true, leaf: 0.4, filler: 0.25 }); } }
  else { [[-0.17, 0.3], [-0.05, 0.2], [0.07, 0.42], [0.19, 0.26]].forEach(([lx, hh]) => { const p = W(lx, 0, rr(-0.06, 0.06)); hurricane(parent, p.x, h + 0.015, p.z, hh, 0.055); }); }
  return g;
}

// --- gebyok Jawa: kayu ukir (bukan logam) ---
function woodFrieze(parent, { x, y, z0, z1, h = 0.3, d = 0.22 }) {
  const len = z1 - z0; box(d, h, len, M.teakDark, x, y + h / 2, (z0 + z1) / 2, parent);
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(len, h * 0.78), carveMat('friezeWood', { w: 1024, h: 256, cell: 80, wood: true, base: [134, 86, 44], rep: [Math.max(1, Math.round(len / 1.1)), 1] }));
  pl.rotation.y = -Math.PI / 2; pl.position.set(x - d / 2 - 0.006, y + h / 2, (z0 + z1) / 2); parent.add(pl);
  box(d + 0.04, 0.035, len + 0.04, M.prada, x, y + h, (z0 + z1) / 2, parent); box(d + 0.04, 0.035, len + 0.04, M.teak, x, y, (z0 + z1) / 2, parent);
}
// --- gunungan wayang (kayon) berukir: bingkai berlapis, rumbai api di tepi, gapura (kori) + penjaga di bawah, pohon hayat bercabang ukel ---
function gununganMask(w, h) {
  return cnv(w, h, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
    const cx = w / 2;
    const kay = (i) => { const hw = w / 2 - i; g.beginPath(); g.moveTo(cx - hw, h - i); g.lineTo(cx - hw, h * 0.5); g.bezierCurveTo(cx - hw, h * 0.22 + i * 0.3, cx - w * 0.16 + i * 0.3, h * 0.14 + i * 0.6, cx, i * 1.2); g.bezierCurveTo(cx + w * 0.16 - i * 0.3, h * 0.14 + i * 0.6, cx + hw, h * 0.22 + i * 0.3, cx + hw, h * 0.5); g.lineTo(cx + hw, h - i); g.closePath(); };
    g.lineWidth = 26; kay(13); g.stroke(); g.lineWidth = 6; kay(36); g.stroke();
    g.setLineDash([12, 9]); g.lineWidth = 12; kay(50); g.stroke(); g.setLineDash([]);
    g.save(); kay(60); g.clip();
    // latar renda ukel halus (krawangan) agar ukiran padat seperti gebyok asli
    g.lineWidth = 3.2; for (let y = 30, r = 0; y < h; y += 26, r++) { g.beginPath(); for (let x = 0; x <= w; x += 4) g.lineTo(x, y + Math.sin((x + r * 16) / 32 * Math.PI * 2) * 7); g.stroke(); for (let x = (r % 2) * 16 + 8; x < w; x += 32) { g.beginPath(); g.arc(x, y + 13, 2.6, 0, Math.PI * 2); g.fill(); } }
    // gapura (kori) bertingkat di bawah tengah
    const gw = w * 0.34, gh = h * 0.15, gy = h - 62 - gh;
    g.fillRect(cx - gw / 2, gy, gw, gh);
    for (let k = 0; k < 3; k++) { const tw = gw * (1.08 - k * 0.26), ty = gy - (k + 1) * h * 0.028; g.beginPath(); g.moveTo(cx - tw / 2, ty + h * 0.028); g.lineTo(cx - tw / 2 + 10, ty); g.lineTo(cx + tw / 2 - 10, ty); g.lineTo(cx + tw / 2, ty + h * 0.028); g.closePath(); g.fill(); }
    g.fillStyle = '#000'; g.fillRect(cx - gw * 0.2, gy + gh * 0.22, gw * 0.4, gh * 0.78); g.fillStyle = '#fff'; g.fillRect(cx - 3, gy + gh * 0.22, 6, gh * 0.78);
    for (const sg of [-1, 1]) { const px = cx + sg * gw * 0.72; g.beginPath(); g.ellipse(px, gy + gh * 0.45, w * 0.045, gh * 0.55, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(px, gy - gh * 0.18, w * 0.03, 0, Math.PI * 2); g.fill(); }
    // pohon hayat: batang + cabang ukel + daun
    const top = h * 0.1, base = gy - h * 0.09;
    g.lineWidth = 20; g.beginPath(); g.moveTo(cx, base); g.lineTo(cx, top); g.stroke();
    for (let i = 0; i < 9; i++) {
      const yb = base - (base - top) * (0.06 + i * 0.1), len = w * (0.34 - i * 0.032), lw = Math.max(5, 13 - i);
      for (const sg of [-1, 1]) {
        const ex = cx + sg * len, ey = yb - h * 0.055;
        g.lineWidth = lw; g.beginPath(); g.moveTo(cx, yb); g.bezierCurveTo(cx + sg * len * 0.35, yb - h * 0.045, cx + sg * len * 0.75, yb + h * 0.02, ex, ey); g.stroke();
        const r = len * 0.12; g.lineWidth = Math.max(4, lw - 4); g.beginPath(); g.arc(ex - sg * r, ey + r * 0.2, r, sg > 0 ? -Math.PI * 0.9 : Math.PI * 1.9, sg > 0 ? Math.PI * 0.8 : Math.PI * 0.2, sg < 0); g.stroke();
        g.beginPath(); g.arc(ex - sg * r * 0.9, ey + r * 0.25, r * 0.45, 0, Math.PI * 2); g.stroke();
        for (const t of [0.35, 0.62]) { g.beginPath(); g.ellipse(cx + sg * len * t, yb - h * 0.032 - h * 0.012 * t, len * 0.07, len * 0.028, -sg * 0.6, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(cx + sg * len * t, yb + h * 0.008, len * 0.06, len * 0.022, sg * 0.5, 0, Math.PI * 2); g.fill(); }
      }
    }
    // kuncup api di puncak
    g.beginPath(); g.moveTo(cx, top - h * 0.05); g.quadraticCurveTo(cx + w * 0.05, top + h * 0.01, cx, top + h * 0.03); g.quadraticCurveTo(cx - w * 0.05, top + h * 0.01, cx, top - h * 0.05); g.fill();
    g.restore();
  });
}
function gununganMat(base) {
  const mask = gununganMask(512, 768), bump = blurCanvas(mask, 4);
  return new THREE.MeshStandardMaterial({ map: tex(woodCanvas(256, 512, base)), alphaMap: tex(mask, { srgb: false }), bumpMap: tex(bump, { srgb: false }), bumpScale: 3.6, alphaTest: 0.5, metalness: 0.08, roughness: 0.5, side: THREE.DoubleSide });
}
// kursi pelaminan tradisional kayu ukir (hlm 12) — menghadap −x lokal seperti sofa lama
const benchLegGeo = new THREE.LatheGeometry([[0.001, 0], [0.04, 0], [0.046, 0.04], [0.03, 0.1], [0.042, 0.18], [0.028, 0.28], [0.037, 0.36], [0.03, 0.43], [0.001, 0.43]].map(([a, b]) => new THREE.Vector2(a, b)), 12);
function carvedBench(parent, { x, y, z, len, ry = 0 }) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g);
  const d = 0.62, bh = 0.62, wood = { wood: true, base: [128, 80, 40] };
  for (const sx of [-d / 2 + 0.05, d / 2 - 0.05]) for (const sz of [-len / 2 + 0.06, len / 2 - 0.06]) { const m = new THREE.Mesh(benchLegGeo, M.teak); m.position.set(sx, 0, sz); m.castShadow = true; g.add(m); }
  box(d, 0.09, len, M.teak, 0, 0.47, 0, g, { cast: true });
  const ap = new THREE.Mesh(new THREE.PlaneGeometry(len - 0.12, 0.13), carveMat('benchApron', { w: 1024, h: 128, cell: 40, rep: [Math.max(1, Math.round(len)), 1], ...wood })); ap.rotation.y = -Math.PI / 2; ap.position.set(-d / 2 - 0.004, 0.36, 0); g.add(ap);
  const cu = new THREE.Mesh(new RoundedBoxGeometry(d - 0.1, 0.09, len - 0.18, 3, 0.035), M.cushionCream); cu.position.set(-0.03, 0.56, 0); cu.castShadow = true; g.add(cu);
  for (const sz of [-len / 2 + 0.04, len / 2 - 0.04]) box(0.07, bh + 0.12, 0.07, M.teak, d / 2 - 0.04, 0.52 + (bh + 0.12) / 2, sz, g);
  box(0.08, 0.07, len, M.teak, d / 2 - 0.04, 0.52 + bh, 0, g); box(0.06, 0.05, len, M.teak, d / 2 - 0.04, 0.54, 0, g);
  const bp = new THREE.Mesh(new THREE.PlaneGeometry(len - 0.12, bh - 0.06), carveMat('benchBack', { w: 1024, h: 384, cell: 64, ...wood })); bp.rotation.y = -Math.PI / 2; bp.position.set(d / 2 - 0.04, 0.53 + bh / 2, 0); g.add(bp);
  const crs = new THREE.ShapeGeometry(archShape(len * 0.62, 0.26, 'kayon'), 16); normUV(crs, len * 0.62, 0.26);
  const cr = new THREE.Mesh(crs, carveMat('benchCrown', { arch: 'kayon', w: 512, h: 200, cell: 48, wood: true, base: [140, 90, 46] })); cr.rotation.y = -Math.PI / 2; cr.position.set(d / 2 - 0.04, 0.55 + bh, 0); g.add(cr);
  for (const sz of [-len / 2 + 0.035, len / 2 - 0.035]) {
    box(d - 0.06, 0.05, 0.075, M.teak, -0.01, 0.78, sz, g);
    const sc = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.028, 8, 20, Math.PI * 1.35), M.teak); sc.position.set(-d / 2 + 0.03, 0.74, sz); sc.rotation.z = 0.6; g.add(sc);
    box(0.06, 0.26, 0.06, M.teak, -d / 2 + 0.06, 0.64, sz, g);
    const sp = new THREE.Mesh(new THREE.PlaneGeometry(d - 0.18, 0.22), carveMat('benchSide', { w: 512, h: 192, cell: 48, ...wood })); sp.position.set(0, 0.64, sz); g.add(sp);
  }
  const nP = Math.max(1, Math.round(len / 0.75)); for (let k = 0; k < nP; k++) { const zz = -len / 2 + (k + 0.5) * len / nP; const pl = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.34, 0.4, 3, 0.06), k % 2 ? M.cushionCream : M.winePil); pl.position.set(d / 2 - 0.15, 0.77, zz); pl.rotation.z = 0.14; g.add(pl); }
  return g;
}
function barrelStool(parent, B, x, y, z) {
  const h = 0.5; const m = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, h, 28, 1, true), carveMat('barrel', { w: 1024, h: 256, cell: 64, wood: true, base: [128, 80, 40] })); m.position.set(x, y + h / 2, z); parent.add(m);
  cyl(0.165, 0.165, h - 0.04, M.teakDark, x, y + h / 2, z, parent, 20);
  for (const yy of [0.02, h - 0.02]) cyl(0.205, 0.205, 0.04, M.teak, x, y + yy, z, parent, 24);
  mound(B, new V3(x, y + h + 0.02, z), new V3(0.12, 0.1, 0.12), 40, MIX.pelV3, { full: true, filler: 0.2 });
}
// janur & payung bertingkat untuk sisi/ujung panggung (hlm 12)
const janurRingGeo = (() => { const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push(new THREE.Vector2(0.06 + 0.94 * Math.sin(Math.PI * t) * (0.92 + 0.08 * t), t - 0.5)); } return new THREE.LatheGeometry(pts, 28); })();
const janurBlade = (() => { const s = new THREE.Shape(); s.moveTo(-0.022, 0); s.lineTo(0.022, 0); s.lineTo(0.03, 0.8); s.lineTo(0, 1.0); s.lineTo(-0.03, 0.8); s.closePath(); return new THREE.ShapeGeometry(s); })();
function janurFan(parent, x, y, z, r, ry = 0) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g); for (let k = 0; k < 30; k++) { const m = new THREE.Mesh(janurBlade, M.janur); m.scale.set(1, r, 1); m.rotation.z = k / 30 * Math.PI * 2; m.position.z = (k % 2) * 0.012; g.add(m); } const c = new THREE.Mesh(new THREE.SphereGeometry(r * 0.15, 12, 8), M.prada); c.scale.z = 0.5; g.add(c); return g; }
function janurTower(parent, B, x, z, h = 2.0) {
  cyl(0.022, 0.026, h, M.teak, x, h / 2, z, parent, 8);
  [[0.32, 0.4, 0.5], [0.27, 0.34, 0.88], [0.22, 0.29, 1.21], [0.17, 0.24, 1.49], [0.12, 0.18, 1.72]].forEach(([r, hh, yy]) => { const m = new THREE.Mesh(janurRingGeo, M.janur); m.scale.set(r, hh, r); m.position.set(x, yy, z); parent.add(m); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; strand(B, new V3(x + Math.cos(a) * r * 0.9, yy - hh * 0.35, z + Math.sin(a) * r * 0.9), rr(0.12, 0.3), { sway: 0.004, bud: 8 }); } });
  janurFan(parent, x, h + 0.08, z, 0.24, Math.PI / 2);
}
function payungAdat(parent, B, x, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); parent.add(g);
  cyl(0.02, 0.026, 3.3, M.gold, 0, 1.65, 0, g, 10); cyl(0.2, 0.26, 0.06, M.gold, 0, 0.03, 0, g, 20);
  [[0.66, 2.45], [0.52, 2.8], [0.38, 3.12]].forEach(([r, ty]) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, 0.24, 36, 1, true), M.parasol); cone.position.y = ty; g.add(cone);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.014, 6, 40), M.gold); rim.rotation.x = Math.PI / 2; rim.position.y = ty - 0.12; g.add(rim);
    for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2; strand(B, new V3(x + Math.cos(a) * r * s, (ty - 0.13) * s, z + Math.sin(a) * r * s), rr(0.25, 0.55) * s * (r / 0.66), { sway: 0.006, bud: 9 }); }
  });
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.24, 12), M.gold); fin.position.y = 3.38; g.add(fin);
  return g;
}
function janurEnsemble(parent, B, { pay, tower, fans, base, s = 1 }) {
  payungAdat(parent, B, pay[0], pay[1], s);
  janurTower(parent, B, tower[0], tower[1], 2.0);
  fans.forEach(([fx, fy, fz, r]) => { cyl(0.012, 0.012, fy, M.teak, fx, fy / 2, fz, parent, 6); janurFan(parent, fx, fy, fz, r, Math.PI / 2); });
  cyl(0.34, 0.26, 0.42, M.urn, base[0], 0.21, base[1], parent, 20);
  foliage(B, new V3(base[0], 0.38, base[1]), new V3(0.45, 0.5, 0.45), 160, { fern: 6 });
  mound(B, new V3(base[0], 0.45, base[1]), new V3(0.34, 0.32, 0.34), 170, MIX.pelV3, { full: true, filler: 0.2 });
}

// --- welcome sign: cermin berbingkai kayu ukir + fabric hanging (hlm 6) ---
const WS = { x: 31.15, z: 19.45 };   // menghadap selatan, ke mulut lobi lift (posisi tidak ada di denah: asumsi titik kedatangan)
const welcomeTextTex = textCanvas(640, 1200, (c, w, h) => {
  c.textAlign = 'center'; c.fillStyle = '#FBF7EF'; c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 6;
  c.font = 'italic 600 168px "Cormorant Garamond", serif'; c.fillText('Welcome', w / 2, 330);
  c.font = '500 34px Jost, sans-serif'; try { c.letterSpacing = '7px'; } catch (e) {} c.fillText('TO THE WEDDING OF', w / 2, 430); try { c.letterSpacing = '0px'; } catch (e) {}
  c.font = 'italic 600 96px "Cormorant Garamond", serif'; c.fillText('Nadia & Zakky', w / 2, 600);
  c.fillRect(w / 2 - 70, 650, 140, 3);
  c.font = '600 50px "Cormorant Garamond", serif'; c.fillText('December 12nd, 2026', w / 2, 745);
  c.font = '500 32px Jost, sans-serif'; try { c.letterSpacing = '6px'; } catch (e) {} c.fillText('MANHATTAN HOTEL', w / 2, 820); try { c.letterSpacing = '0px'; } catch (e) {}
});
const fabricTex = textCanvas(600, 1240, (c, w, h) => {
  c.fillStyle = '#F4EEE3'; c.fillRect(0, 0, w, h);
  c.textAlign = 'center'; c.fillStyle = '#3B1A12';
  c.font = 'italic 600 92px "Cormorant Garamond", serif'; ['These kids', 'are getting', 'married'].forEach((t, i) => c.fillText(t, w / 2, 170 + i * 92));
  // dua foto masa kecil (PLACEHOLDER — ganti dengan foto asli)
  for (const [cx, tone] of [[w / 2 - 118, '#C9B49A'], [w / 2 + 118, '#BFA992']]) { c.fillStyle = tone; c.fillRect(cx - 105, 470, 210, 270); c.fillStyle = 'rgba(70,45,35,.55)'; c.beginPath(); c.ellipse(cx, 560, 42, 50, 0, 0, 6.3); c.fill(); c.beginPath(); c.ellipse(cx, 700, 82, 70, 0, 0, 6.3); c.fill(); }
  c.fillStyle = '#7A6252'; c.font = '500 18px Jost, sans-serif'; c.fillText('FOTO KECIL KEDUA MEMPELAI · PLACEHOLDER', w / 2, 775);
  c.fillStyle = '#3B1A12'; c.font = 'italic 600 88px "Cormorant Garamond", serif'; c.fillText('Nadia & Zakky', w / 2, 920);
  c.fillRect(w / 2 - 60, 960, 120, 2);
  c.font = '500 36px Jost, sans-serif'; try { c.letterSpacing = '8px'; } catch (e) {} c.fillText('12.12.2026', w / 2, 1040); try { c.letterSpacing = '0px'; } catch (e) {}
});
function welcomeSign(R, B) {
  const g = new THREE.Group(); g.position.set(WS.x, 0, WS.z); R.add(g);
  const W2 = (lx, ly, lz) => new V3(WS.x + lx, ly, WS.z + lz);
  // cermin
  const mx = 0.52, mw = 0.98, mh = 1.86, y0 = 0.16, fw = 0.13;
  const mg = new THREE.Group(); mg.position.set(mx, 0, 0); mg.rotation.x = -0.05; g.add(mg);
  const outer = archShape(mw + fw * 2, mh + fw * 2, 'round'); outer.holes.push(archShape(mw, mh, 'round', 0, fw, THREE.Path));
  const fr = new THREE.Mesh(new THREE.ExtrudeGeometry(outer, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 40 }), M.teakDark); fr.position.set(0, y0, -0.02); fr.castShadow = true; mg.add(fr);
  const og = new THREE.ShapeGeometry(outer, 40); normUV(og, mw + fw * 2, mh + fw * 2);
  const ov = new THREE.Mesh(og, carveMat('mirrorFrame', { arch: 'round', w: 512, h: 1024, cell: 60, wood: true, base: [156, 102, 52] })); ov.position.set(0, y0, 0.072); mg.add(ov);
  const cs = archShape(0.78, 0.46, 'kayon'); const cg = new THREE.ShapeGeometry(cs, 24); normUV(cg, 0.78, 0.46);
  const crest = new THREE.Mesh(cg, carveMat('mirrorCrest', { arch: 'kayon', w: 512, h: 300, cell: 46, wood: true, base: [134, 84, 42] })); crest.position.set(0, y0 + mh + fw * 2 - 0.12, 0.045); mg.add(crest);
  const crb = new THREE.Mesh(cg, M.teakDark); crb.position.set(0, y0 + mh + fw * 2 - 0.12, 0.02); mg.add(crb);
  const gl = new THREE.Mesh(new THREE.ShapeGeometry(archShape(mw, mh, 'round'), 40), M.mirror); gl.position.set(0, y0 + fw, 0.03); mg.add(gl); MIRROR.mesh = gl; MIRROR.pos = new V3(WS.x + mx, 1.25, WS.z + 0.25);
  plane(mg, mw * 0.9, mw * 0.9 * 1200 / 640, std({ map: welcomeTextTex, transparent: true, alphaTest: 0.12, roughness: 0.5 }), 0, y0 + fw + 0.15 + mw * 0.9 * 1200 / 640 / 2, 0.036);
  for (const sx of [-0.38, 0.38]) { box(0.16, 0.12, 0.36, M.teakDark, sx, 0.06, -0.02, mg); }
  rod(mg, new V3(0, 1.3, -0.04), new V3(0, 0.02, -0.55), 0.018, M.teakDark);
  // fabric hanging (kiri cermin)
  const fx = -0.92, fwid = 0.8, ftop = 2.08, flen = 1.65;
  for (const sx of [fx - 0.46, fx + 0.46]) { cyl(0.018, 0.022, 2.2, M.gold, sx, 1.1, -0.05, g, 8); cyl(0.14, 0.16, 0.03, M.gold, sx, 0.015, -0.05, g, 16); }
  rod(g, new V3(fx - 0.5, ftop + 0.04, -0.05), new V3(fx + 0.5, ftop + 0.04, -0.05), 0.014, M.gold);
  const fb = new THREE.Mesh(pleatGeo(fwid, flen, { folds: 3, depth: 0.006, segY: 4 }), std({ map: fabricTex, roughness: 0.85, side: THREE.DoubleSide })); fb.position.set(fx, ftop - flen / 2, -0.04); g.add(fb);
  rod(g, new V3(fx - fwid / 2 - 0.02, ftop - flen, -0.035), new V3(fx + fwid / 2 + 0.02, ftop - flen, -0.035), 0.01, M.gold);
  for (const sx of [-1, 1]) { const rb = new THREE.Mesh(pleatGeo(0.07, 2.0, { folds: 1, depth: 0.012, segY: 10 }), M.ribbon); rb.position.set(fx + sx * (fwid / 2 + 0.05), ftop - 0.96, -0.02 + 0.05); rb.rotation.z = sx * 0.05; g.add(rb); }
  // bunga & lilin secukupnya
  mound(B, W2(mx - 0.56, y0 + mh + 0.05, 0.12), new V3(0.3, 0.26, 0.2), 260, MIX.welcomeV3, { full: true, leaf: 0.55, filler: 0.25 });
  for (let k = 0; k < 4; k++) cascadeCluster(B, W2(mx - 0.6 + rr(-0.08, 0.08), y0 + mh, 0.12), new V3(0.02, 0, 0.03), rr(0.4, 0.75), 0.1, 36, MIX.welcomeV3);
  foliage(B, W2(mx - 0.62, y0 + mh - 0.15, 0.1), new V3(0.32, 0.3, 0.16), 70, { fern: 4, tall: 0.8 });
  mound(B, W2(mx + 0.55, 0, 0.22), new V3(0.36, 0.52, 0.3), 230, MIX.welcomeV3, { leaf: 0.5, filler: 0.25 });
  foliage(B, W2(mx + 0.62, 0, 0.18), new V3(0.4, 0.62, 0.3), 120, { fern: 6, tall: 0.9 });
  [[0.12, 0.42], [0.28, 0.28], [0.44, 0.18], [-1.22, 0.3], [-1.38, 0.2]].forEach(([lx, hh]) => { const p = W2(lx, 0, 0.42); hurricane(R, p.x, 0, p.z, hh, 0.06); });
  const S = new THREE.SpotLight(0xffe8cc, 30, 0, 0.6, 0.85, 2); S.position.set(WS.x - 0.2, CHL - 0.1, WS.z + 2.2); S.target.position.set(WS.x - 0.2, 1.2, WS.z); R.add(S, S.target); LIGHTS.zone.push(S); S.userData = { amb: 30, doc: 46 };
}

// --- backdrop penerima tamu: drapery emerald + bunga vertikal satu sisi + 2 meja/kursi usher berkain putih (hlm 7) ---
const RT = { x0: 20.95, x1: 25.55, z: SZ0 + 0.16, h: 3.05 };
function receptionV3(R, B) {
  const xc = (RT.x0 + RT.x1) / 2, w = RT.x1 - RT.x0;
  box(w + 0.1, 0.06, 0.06, M.black, xc, RT.h + 0.03, RT.z, R); for (const x of [RT.x0 - 0.02, RT.x1 + 0.02]) box(0.05, RT.h, 0.05, M.black, x, RT.h / 2, RT.z, R);
  curtain(R, w, RT.h, M.emerald, xc, 0, RT.z + 0.06, 0, { folds: 15, depth: 0.065 });
  swag(R, M.emeraldSwag, new V3(RT.x0, RT.h - 0.02, RT.z + 0.16), new V3(xc + 0.55, RT.h - 0.06, RT.z + 0.16), { drop: 0.95, bulge: 0.16 });
  swag(R, M.emeraldSwag, new V3(xc - 0.55, RT.h - 0.06, RT.z + 0.2), new V3(RT.x1, RT.h - 0.02, RT.z + 0.2), { drop: 0.8, bulge: 0.15 });
  plane(R, 0.62, 0.775, monoMat(MONO.clear), xc, 1.78, RT.z + 0.13);
  // karangan bunga vertikal (sisi barat saja)
  const fx = RT.x0 + 0.42, fz = RT.z + 0.42;
  mound(B, new V3(fx, 0, fz), new V3(0.58, 0.42, 0.45), 300, MIX.receptV3, { leaf: 0.5, filler: 0.7 });
  for (const [yy, rx, n] of [[0.55, 0.42, 260], [1.05, 0.36, 230], [1.55, 0.32, 200], [2.05, 0.27, 160], [2.5, 0.2, 110]]) mound(B, new V3(fx + rr(-0.06, 0.06), yy, fz - 0.05), new V3(rx, 0.34, rx * 0.8), n, MIX.receptV3, { full: true, leaf: 0.6, filler: 0.5 });
  foliage(B, new V3(fx, 0.6, fz - 0.05), new V3(0.4, 2.0, 0.32), 160, { fern: 8 });
  // dua meja usher + kursi berkain putih
  for (const dx of [-0.85, 0.85]) {
    const tx = xc + dx, tz = RT.z + 1.2;
    box(1.2, 0.04, 0.6, M.whiteCloth, tx, 0.76, tz, R);
    for (const [px, pz, ww, r3] of [[0, 0.315, 1.2, 0], [0, -0.315, 1.2, Math.PI], [0.615, 0, 0.6, Math.PI / 2], [-0.615, 0, 0.6, -Math.PI / 2]]) { const m = new THREE.Mesh(pleatGeo(ww + 0.03, 0.76, { folds: Math.round(ww * 8), depth: 0.008, flare: 1.4, segY: 6 }), M.whiteCloth); m.position.set(tx + px, 0.38, tz + pz); m.rotation.y = r3; R.add(m); }
    mound(B, new V3(tx + 0.36, 0.78, tz - 0.05), new V3(0.12, 0.09, 0.1), 46, MIX.receptV3, { full: true, leaf: 0.5, filler: 0.5 });
    const tb = box(0.25, 0.015, 0.18, M.black, tx - 0.2, 0.8, tz + 0.05, R); tb.rotation.y = 0.15;
    // kursi usher (sarung putih), menghadap tamu (selatan)
    const cz = RT.z + 0.58; box(0.46, 0.06, 0.44, M.whiteCloth, tx, 0.47, cz, R); box(0.46, 0.55, 0.06, M.whiteCloth, tx, 0.78, cz - 0.21, R);
    const sk = new THREE.Mesh(pleatGeo(0.5, 0.45, { folds: 4, depth: 0.008, flare: 1.4, segY: 4 }), M.whiteCloth); sk.position.set(tx, 0.225, cz + 0.23); R.add(sk);
  }
  // kotak angpao (kayu berukir) di sisi timur
  box(0.42, 0.85, 0.42, M.whiteCloth, RT.x1 - 0.25, 0.425, RT.z + 1.25, R); box(0.36, 0.3, 0.3, M.teak, RT.x1 - 0.25, 1.0, RT.z + 1.25, R); box(0.38, 0.03, 0.32, M.prada, RT.x1 - 0.25, 1.16, RT.z + 1.25, R);
  for (const x of [xc - 1.5, xc - 0.2, xc + 0.2, xc + 1.5]) stanchionLine(R, [[x, RT.z + 2.2], [x, RT.z + 3.4]]);
  const S = new THREE.SpotLight(0xffecd6, 60, 0, 0.62, 0.85, 2); S.position.set(xc, CH - 0.1, RT.z + 4.0); S.target.position.set(xc, 1.4, RT.z + 0.2); R.add(S, S.target); LIGHTS.zone.push(S); S.userData = { amb: 36, doc: 64 };
}

// --- photobooth: velvet maroon + velvet ivory atas & samping, NZ merah, bunga samping dengan untaian daun hijau, cakram velvet (hlm 10) ---
const monoRedTex = textCanvas(800, 600, (g, w, h) => { g.textAlign = 'center'; g.font = '600 380px "Cormorant Garamond", Garamond, serif'; const BY = h * 0.74; const dr = (t, x) => { g.lineWidth = 12; g.lineJoin = 'round'; g.strokeStyle = '#F1E4CC'; g.strokeText(t, x, BY); g.fillStyle = '#B5182B'; g.fillText(t, x, BY); }; dr('N', w / 2 - 92); dr('Z', w / 2 + 92); g.save(); g.beginPath(); g.rect(w / 2 - 40, 0, 80, h * 0.42); g.clip(); dr('N', w / 2 - 92); g.restore(); });
function photoboothV3(R, B, { px, zc }) {
  const BG = new THREE.Group(); BG.position.set(px, 0, zc); BG.rotation.y = -Math.PI / 2; R.add(BG);
  const W = (lx, ly, lz) => new V3(px - lz, ly, zc + lx);
  box(3.1, 3.0, 0.1, M.black, 0, 1.5, -0.08, BG);
  curtain(BG, 3.0, 2.9, M.maroonVel, 0, 0, 0.0, 0, { folds: 11, depth: 0.04 });
  for (const sx of [-1, 1]) curtain(BG, 0.55, 2.9, M.ivoryVelV3, sx * 1.25, 0, 0.09, 0, { folds: 4, depth: 0.065, flare: 0.6 });
  box(3.05, 0.22, 0.08, M.ivoryVelV3, 0, 2.86, 0.1, BG);
  swag(BG, M.ivoryVelV3, new V3(-1.52, 2.84, 0.16), new V3(0.02, 2.72, 0.16), { drop: 0.6, bulge: 0.16 });
  swag(BG, M.ivoryVelV3, new V3(-0.02, 2.72, 0.17), new V3(1.52, 2.84, 0.17), { drop: 0.6, bulge: 0.16 });
  plane(BG, 1.0, 0.75, std({ map: monoRedTex, transparent: true, alphaTest: 0.12, roughness: 0.42, metalness: 0.12 }), 0, 1.7, 0.08);
  velvetDisc(BG, M.maroonVel, -1.12, 2.36, 0.24, 0.36, { ry: 0.12 }); velvetDisc(BG, M.maroonVel, -0.6, 2.6, 0.2, 0.26, { ry: 0.08 }); velvetDisc(BG, M.ivoryVelV3, -1.42, 1.86, 0.27, 0.21, { ry: 0.15 });
  for (const sx of [-1, 1]) {
    const lx = sx * 1.68;
    mound(B, W(lx, 0, 0.25), new V3(0.46, 0.5, 0.38), 260, MIX.boothV3, { leaf: 0.55, filler: 0.2 });
    cyl(0.02, 0.02, 1.55, M.black, W(lx, 0, 0.12).x, 0.78, W(lx, 0, 0.12).z, R, 6);
    mound(B, W(lx, 1.55, 0.14), new V3(0.34, 0.3, 0.3), 220, MIX.boothV3, { full: true, leaf: 0.55, filler: 0.2 });
    foliage(B, W(lx, 1.4, 0.12), new V3(0.36, 0.4, 0.3), 90, { fern: 5 });
    for (let k = 0; k < 16; k++) leafStrand(B, W(lx + rr(-0.32, 0.32), 1.7 + rr(-0.12, 0.15), 0.18 + rr(-0.12, 0.12)), rr(0.6, 1.25));
  }
  [[-0.95, 0.38], [-0.75, 0.24], [0.8, 0.3], [1.0, 0.2]].forEach(([lx, hh]) => { const p = W(lx, 0, 0.42); hurricane(R, p.x, 0, p.z, hh, 0.06); });
}

// --- kursi teater di lobi lift (hlm 3: "Kursi Teater") — sisi void, menghadap pintu lift ---
function kursiTeater(R, x, z0, n) {
  box(0.12, 0.1, n * 0.6, M.black, x - 0.02, 0.05, z0 + (n - 1) * 0.3, R);
  for (let k = 0; k < n; k++) { const z = z0 + k * 0.6; const s = box(0.46, 0.09, 0.5, M.theater, x + 0.12, 0.45, z, R); s.rotation.z = -0.05; const b = box(0.08, 0.66, 0.5, M.theater, x - 0.16, 0.82, z, R); b.rotation.z = 0.12; box(0.4, 0.38, 0.06, M.black, x + 0.05, 0.22, z - 0.27, R); }
  box(0.4, 0.38, 0.06, M.black, x + 0.05, 0.22, z0 + (n - 1) * 0.6 + 0.27, R);
}

/* =====================================================================
   REVISI V4.0 — MOODBOARD 19 HALAMAN + INSTRUKSI PEMILIK (20 Okt 2026)
   Komponen baru: lengkung janur hias bulat, backdrop akad (3 gunungan wayang, putih–hijau) yang dipakai di ruang akad
   dan dipindah ke VIP dining sisi void, kursi rotan, kursi berkain putih + kartu nomor meja (hlm 14), layar LED landscape
   berangka baja (foto pemilik), meja usher berdiri, welcome sign menghadap pintu lift.
   ===================================================================== */
M.bone = std({ color: 0xEDE4D6, roughness: 0.7 });
M.akadFloor = std({ map: tex(cnv(512, 512, (g, w, h) => { g.fillStyle = '#EAE5DC'; g.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(160,150,135,${0.05 + rnd() * 0.08})`; g.lineWidth = 1 + rnd() * 2; g.beginPath(); let x = rnd() * w, y = rnd() * h; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += rr(-40, 40); y += rr(-20, 60); g.lineTo(x, y); } g.stroke(); } g.strokeStyle = 'rgba(150,140,125,.3)'; g.lineWidth = 2; for (let x = 0; x <= w; x += 256) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); g.beginPath(); g.moveTo(0, x); g.lineTo(w, x); g.stroke(); } }), { rep: [5, 5] }), roughness: 0.18, metalness: 0.04 });
M.akadWall = std({ color: 0xE5DACB, roughness: 0.9 });
M.akadCeil = std({ color: 0xEFE8DE, roughness: 0.95 });
M.akadRunner = phy({ color: 0xF7F5F0, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.06 });
M.sheer = std({ color: 0xFBF8F2, roughness: 0.8, transparent: true, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false });
M.caneWood = std({ map: tex(woodCanvas(256, 256, [176, 136, 92])), roughness: 0.55 });
M.cane = std({ color: 0xDCC59A, roughness: 0.8, side: THREE.DoubleSide, alphaTest: 0.5, alphaMap: tex(cnv(256, 256, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#000'; for (let y = 0; y < h; y += 16) for (let x = (y / 16 % 2) * 8; x < w; x += 16) { g.beginPath(); g.arc(x + 4, y + 4, 4.2, 0, Math.PI * 2); g.fill(); } }), { srgb: false, rep: [3, 4] }) });
M.steel = std({ color: 0x1A1A1C, roughness: 0.45, metalness: 0.6 });
M.porcelain = std({ color: 0xF8F6F1, roughness: 0.25 });
M.laneRunner = std({ color: 0xC9B596, roughness: 0.95 });
M.janurBall = std({ map: tex(cnv(128, 128, (g, w, h) => { g.fillStyle = '#E8E0B4'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(150,132,64,.55)'; g.lineWidth = 3; for (let i = -w; i < w * 2; i += 14) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.stroke(); } }), { rep: [3, 2] }), roughness: 0.6, emissive: 0x2a2610, emissiveIntensity: 0.12 });
M.janurTassel = std({ color: 0xEDE6C0, roughness: 0.6, side: THREE.DoubleSide, alphaTest: 0.5, emissive: 0x2a2610, emissiveIntensity: 0.12, alphaMap: tex(cnv(256, 32, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 5, h); }), { srgb: false, rep: [3, 1] }) });

// palet akad (hlm 16): putih, brie, parchment, elise, sage, tea leaves, moss
MIX.akadV4 = [['#FFFFFF', 0.3], ['#F7F4EA', 0.18], ['#EDE7D2', 0.12], ['#E5DCB1', 0.07], ['#C9D6A8', 0.13], ['#DCE5C8', 0.12], ['#A9B98A', 0.08]];
MIX.vipV4 = [['#4E0A1A', 0.35], ['#5E0B1F', 0.3], ['#7A1428', 0.2], ['#3E5F3A', 0.15]]; // hlm 14: bunga maroon + daun hijau
const GREENL = [['#5E7A4E', 0.3], ['#6F8A5C', 0.3], ['#889063', 0.25], ['#4F5141', 0.15]];

function foliageTone(B, c, r, n, pal, { tall = 1 } = {}) {
  const N = Math.max(8, Math.round(n * DENS));
  for (let i = 0; i < N; i++) {
    const u = Math.pow(rnd(), 0.6), th = rnd() * Math.PI * 2, s = Math.sqrt(Math.max(0, 1 - u * u));
    const p = new V3(c.x + s * Math.cos(th) * r.x * rr(0.55, 1), c.y + u * r.y * rr(0.5, 1), c.z + s * Math.sin(th) * r.z * rr(0.55, 1));
    B.add(B.leaf, p, new V3(s * Math.cos(th) + rr(-0.4, 0.4), u * 0.8 + rr(0.15, 0.65), s * Math.sin(th) + rr(-0.4, 0.4)).normalize(), rr(1.8, 3.2) * tall, vary(pick(pal), 0.05));
  }
}
// baby's breath: ribuan kuntum kecil putih
function babyBreath(B, c, r, n) {
  const N = Math.max(10, Math.round(n * DENS));
  for (let i = 0; i < N; i++) { const u = Math.pow(rnd(), 0.5), th = rnd() * Math.PI * 2, s = Math.sqrt(Math.max(0, 1 - u * u));
    B.add(B.filler, new V3(c.x + s * Math.cos(th) * r.x * rr(0.4, 1), c.y + u * r.y, c.z + s * Math.sin(th) * r.z * rr(0.4, 1)), new V3(0, 1, 0), rr(0.45, 0.75), vary(rnd() < 0.86 ? '#FCFBF7' : '#E3EAD3', 0.02)); }
}
// tangkai bunga tegak (delphinium / larkspur putih)
function spike(B, base, len) { const n = Math.round(len / 0.035); for (let i = 0; i < n; i++) { const t = i / n; B.add(B.filler, new V3(base.x + rr(-0.012, 0.012), base.y + t * len, base.z + rr(-0.012, 0.012)), new V3(rr(-1, 1), rr(-0.2, 1), rr(-1, 1)).normalize(), (2.4 - t * 1.3) * rr(0.9, 1.1), vary(t > 0.85 ? '#DCE5C8' : '#FBFAF4', 0.02)); if (i % 4 === 0) B.add(B.leaf, new V3(base.x, base.y + t * len * 0.6, base.z), new V3(rr(-1, 1), 0.6, rr(-1, 1)).normalize(), 0.9, vary('#6F8A5C', 0.04)); } }
// untaian daun hijau tua (payung berjuntai: dominan daun hijau tua, hlm 9)
function leafStrandDark(B, top, len) {
  const n = Math.floor(len / 0.045), ph = rnd() * 6.28;
  for (let i = 0; i < n; i++) { const t = i / n, p = new V3(top.x + Math.sin(ph + t * 4) * 0.02 * t, top.y - i * 0.045, top.z + Math.cos(ph + t * 3) * 0.02 * t);
    B.add(B.leaf, p, new V3(rr(-1, 1), rr(-1.2, -0.2), rr(-1, 1)).normalize(), rr(1.1, 1.6) * (1 - t * 0.35), vary(pick(DARKG), 0.04)); }
  B.lines.push(top.x, top.y, top.z, top.x, top.y - len, top.z);
}

// --- lengkung janur hias bulat (hlm 9, 15, 18–19): tiang janur melengkung, rumbai janur, bola janur + sampian di ujung ---
const janurBladeSm = (() => { const s = new THREE.Shape(); s.moveTo(-0.011, 0); s.lineTo(0.011, 0); s.lineTo(0.015, 0.15); s.lineTo(0, 0.21); s.lineTo(-0.015, 0.15); s.closePath(); return new THREE.ShapeGeometry(s); })();
const janurBallGeo = new THREE.SphereGeometry(1, 18, 12);
function janurLengkung(parent, B, x, z, dx, dz, { h = 3.1, reach = 0.55, s = 1, mix = MIX.aisleV3, light = false, tassel = 0.75 } = {}) {
  const L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L;
  const P = (a, y) => new V3(x + ux * a * s, y * s, z + uz * a * s);
  const curve = new THREE.CatmullRomCurve3([P(0, 0.3), P(0, h * 0.45), P(0.02, h * 0.76), P(reach * 0.28, h * 0.94), P(reach * 0.62, h), P(reach * 0.93, h * 0.94), P(reach, h * 0.84)]);
  parent.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.03 * s, 8), M.janur));
  const parts = [], N = 52;
  for (let i = 2; i < N; i++) { const t = i / N, p = curve.getPoint(t), tg = curve.getTangent(t);
    let side = new V3().crossVectors(tg, new V3(0, 1, 0)); if (side.lengthSq() < 1e-4) side = new V3(uz, 0, -ux); side.normalize();
    for (const sd of [-1, 1]) { const dir = side.clone().multiplyScalar(sd).add(new V3(0, -0.45, 0)).add(tg.clone().multiplyScalar(-0.25)).normalize();
      const g = janurBladeSm.clone(); g.applyMatrix4(new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), dir), new V3(s, s * (0.8 + 0.45 * Math.abs(Math.sin(i * 1.7))), s))); parts.push(g); } }
  parent.add(new THREE.Mesh(mergeGeometries(parts), M.janur));
  const tip = curve.getPoint(1);
  rod(parent, tip, tip.clone().add(new V3(0, -0.2 * s, 0)), 0.004, M.janur);
  const ball = new THREE.Mesh(janurBallGeo, M.janurBall); ball.scale.setScalar(0.11 * s); ball.position.copy(tip).add(new V3(0, -0.31 * s, 0)); parent.add(ball);
  if (tassel > 0) {
    const ts = new THREE.Mesh(new THREE.ConeGeometry(0.1 * s, tassel * s, 22, 1, true), M.janurTassel); ts.rotation.x = Math.PI; ts.position.copy(tip).add(new V3(0, -0.42 * s - tassel * s / 2, 0)); parent.add(ts);
    for (let k = 0; k < 5; k++) strand(B, tip.clone().add(new V3(rr(-0.05, 0.05), -0.4 * s, rr(-0.05, 0.05))), rr(0.35, 0.7) * s * tassel, { sway: 0.005, bud: 8 });
  }
  const mid = curve.getPoint(0.4); janurFan(parent, mid.x + ux * 0.04, mid.y, mid.z + uz * 0.04, 0.2 * s, Math.atan2(ux, uz));
  const mid2 = curve.getPoint(0.6); const b2 = new THREE.Mesh(janurBallGeo, M.janurBall); b2.scale.setScalar(0.085 * s); b2.position.copy(mid2).add(new V3(ux * 0.05, -0.1, uz * 0.05)); parent.add(b2);
  // pot & rangkaian di kaki
  cyl(0.2 * s, 0.15 * s, 0.34 * s, M.urn, x, 0.17 * s, z, parent, 18);
  mound(B, new V3(x, 0.33 * s, z), new V3(0.26 * s, 0.24 * s, 0.26 * s), 90, mix, { full: true, leaf: 0.5, filler: light ? 0.6 : 0.25 });
  if (light) { babyBreath(B, new V3(x, 0.3 * s, z), new V3(0.3, 0.3, 0.3), 120); foliageTone(B, new V3(x, 0.3 * s, z), new V3(0.32, 0.35, 0.32), 40, GREENL); }
  else foliage(B, new V3(x, 0.3 * s, z), new V3(0.32, 0.36, 0.32), 45, { fern: 2, tall: 0.8 });
}

// --- gunungan wayang panel berukir (lokal: menghadap +z) ---
const gunMatCache = {};
function gununganPanel(g, w, h, lx, ly, lz, base, back = M.teakDark) {
  const key = base.join(','); const mat = gunMatCache[key] || (gunMatCache[key] = gununganMat(base));
  const sg = new THREE.ShapeGeometry(archShape(w, h, 'kayon'), 32); normUV(sg, w, h);
  const m = new THREE.Mesh(sg, mat); m.position.set(lx, ly, lz + 0.03); g.add(m);
  const b = new THREE.Mesh(sg, back); b.position.set(lx, ly, lz - 0.02); g.add(b);
  const outer = archShape(w, h, 'kayon'); outer.holes.push(archShape(w - 0.14, h - 0.14, 'kayon', 0, 0.07, THREE.Path));
  const fr = new THREE.Mesh(new THREE.ExtrudeGeometry(outer, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 2, curveSegments: 24 }), M.teak); fr.position.set(lx, ly, lz - 0.03); fr.castShadow = true; g.add(fr);
  box(0.08, 0.5, 0.3, M.teakDark, lx, ly + 0.2, lz - 0.2, g); // penyangga belakang
}
// --- backdrop akad (hlm 17 & 19): 3 gunungan wayang kayu ukir, bunga putih–hijau, sedikit janur bulat, payung bertingkat + janur lengkung ---
// dipakai di ruang akad, lalu dipindah ke VIP dining sisi void (instruksi pemilik)
function akadBackdrop(parent, B, { x, z, ry, sides = true, curtains = false, H = 3.4 }) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g);
  const c = Math.cos(ry), sn = Math.sin(ry), W = (lx, ly, lz) => new V3(x + lx * c + lz * sn, ly, z - lx * sn + lz * c);
  box(4.4, 0.16, 0.75, M.bone, 0, 0.08, 0.02, g);
  gununganPanel(g, 2.0, 2.95, 0, 0.16, 0, [168, 116, 62]);
  for (const sx of [-1, 1]) gununganPanel(g, 1.45, 2.3, sx * 1.32, 0.16, -0.16, [150, 100, 52]);
  for (const sx of [-1, 1]) {
    mound(B, W(sx * 0.95, 0.16, 0.36), new V3(0.5, 0.78, 0.36), 420, MIX.akadV4, { leaf: 0.45, filler: 0.6 });
    foliageTone(B, W(sx * 1.05, 0.2, 0.22), new V3(0.62, 0.95, 0.38), 130, GREENL);
    babyBreath(B, W(sx * 0.9, 0.45, 0.46), new V3(0.48, 0.5, 0.24), 280);
    for (let k = 0; k < 5; k++) spike(B, W(sx * (0.62 + k * 0.13), 0.7, 0.18 + rr(-0.05, 0.05)), rr(0.85, 1.45));
    mound(B, W(sx * 1.98, 0.16, 0.3), new V3(0.36, 0.5, 0.3), 220, MIX.akadV4, { leaf: 0.5, filler: 0.6 });
    babyBreath(B, W(sx * 2.0, 0.3, 0.38), new V3(0.34, 0.36, 0.22), 140);
    janurFan(g, sx * 0.64, 1.5, 0.16, 0.26, 0); janurFan(g, sx * 1.72, 1.08, 0.1, 0.2, 0);
  }
  mound(B, W(0, 0.16, 0.44), new V3(0.56, 0.3, 0.24), 200, MIX.akadV4, { leaf: 0.5, filler: 0.6 }); babyBreath(B, W(0, 0.2, 0.5), new V3(0.6, 0.26, 0.2), 160);
  // V4.0b: rangkaian lebih rimbun seperti hlm 19 — pilar bunga putih di sambungan panel, hamparan baby's breath sepanjang kaki backdrop
  for (const sx of [-1, 1]) {
    mound(B, W(sx * 0.62, 0.9, 0.3), new V3(0.26, 0.42, 0.22), 200, MIX.akadV4, { full: true, leaf: 0.4, filler: 0.55 });
    foliageTone(B, W(sx * 0.6, 0.75, 0.22), new V3(0.3, 0.6, 0.22), 60, GREENL, { tall: 0.9 });
    mound(B, W(sx * 1.55, 0.16, 0.42), new V3(0.42, 0.62, 0.3), 260, MIX.akadV4, { leaf: 0.45, filler: 0.6 });
    for (let k = 0; k < 4; k++) spike(B, W(sx * (1.85 + k * 0.12), 0.5, 0.3 + rr(-0.05, 0.05)), rr(0.9, 1.5));
  }
  for (let k = -4; k <= 4; k++) babyBreath(B, W(k * 0.48, 0.16, 0.58 + rr(-0.04, 0.04)), new V3(0.28, 0.2, 0.16), 70);
  if (sides) for (const sx of [-1, 1]) {
    const pp = W(sx * 2.45, 0, 0.55); payungAdat(parent, B, pp.x, pp.z, 0.86);
    const jl = W(sx * 2.98, 0, 0.95), to = W(sx * 2.0, 0, 0.95); janurLengkung(parent, B, jl.x, jl.z, to.x - jl.x, to.z - jl.z, { h: 3.0, reach: 0.6, mix: MIX.akadV4, light: true, tassel: 0.7 });
  }
  if (curtains) for (const sx of [-1, 1]) curtain(g, 1.3, H - 0.05, M.sheer, sx * 3.4, 0, -0.05, 0, { folds: 6, depth: 0.05 });
  return g;
}

// --- kursi rotan (cane-back) untuk akad (hlm 17 & 19), instanced; menghadap +z lokal ---
const caneGeo = (() => { const fr = [], ca = [], cu = [];
  for (const [x, z] of [[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.2], [0.2, 0.2]]) { const g = new THREE.CylinderGeometry(0.019, 0.014, 0.45, 8); g.translate(x, 0.225, z); fr.push(g); }
  const sf = new THREE.BoxGeometry(0.48, 0.05, 0.46); sf.translate(0, 0.45, 0.01); fr.push(sf);
  for (const sx of [-0.19, 0.19]) { const p = new THREE.CylinderGeometry(0.016, 0.016, 0.44, 8); p.translate(sx, 0.68, -0.21); fr.push(p); }
  const ring = new THREE.TorusGeometry(0.2, 0.019, 8, 36); ring.scale(1, 1.25, 1); ring.translate(0, 0.9, -0.22); fr.push(ring);
  const cn = new THREE.CircleGeometry(0.195, 36); cn.scale(1, 1.25, 1); cn.translate(0, 0.9, -0.22); ca.push(cn);
  const k = new THREE.BoxGeometry(0.44, 0.07, 0.42); k.translate(0, 0.505, 0.02); cu.push(k);
  return [mergeGeometries(fr), mergeGeometries(ca), mergeGeometries(cu)]; })();
class CaneChairs { constructor() { this.t = []; } add(x, z, ry, y = 0) { this.t.push([x, y, z, ry]); }
  build(parent) { if (!this.t.length) return; const ms = [M.caneWood, M.cane, M.cushionCream]; const m = new THREE.Matrix4();
    caneGeo.forEach((geo, gi) => { const im = new THREE.InstancedMesh(geo, ms[gi], this.t.length); this.t.forEach(([x, y, z, ry], i) => { m.compose(new V3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), ry), new V3(1, 1, 1)); im.setMatrixAt(i, m); }); if (gi === 0) im.castShadow = true; parent.add(im); }); } }
// --- kursi berkain putih (hlm 14), instanced; menghadap +z lokal ---
const coverChairGeo = (() => { const p = [];
  const sk = new THREE.CylinderGeometry(0.33, 0.355, 0.47, 4, 1, true); sk.rotateY(Math.PI / 4); sk.translate(0, 0.235, 0); p.push(sk);
  const st = new THREE.BoxGeometry(0.47, 0.06, 0.47); st.translate(0, 0.49, 0); p.push(st);
  const bk = new THREE.BoxGeometry(0.45, 0.6, 0.08); bk.translate(0, 0.82, -0.2); p.push(bk);
  const tp = new THREE.CylinderGeometry(0.04, 0.04, 0.45, 10); tp.rotateZ(Math.PI / 2); tp.translate(0, 1.12, -0.2); p.push(tp);
  return mergeGeometries(p.map(g => g.toNonIndexed())); })();
class CoverChairs { constructor() { this.t = []; } add(x, z, ry) { this.t.push([x, z, ry]); }
  build(parent) { if (!this.t.length) return; const im = new THREE.InstancedMesh(coverChairGeo, M.whiteCloth, this.t.length), m = new THREE.Matrix4(); this.t.forEach(([x, z, ry], i) => { m.compose(new V3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), ry), new V3(1, 1, 1)); im.setMatrixAt(i, m); }); im.castShadow = true; parent.add(im); } }
// --- perlengkapan meja VIP (hlm 14): piring putih, napkin maroon, gelas ---
class PlacesV4 { constructor() { this.p = []; } seat(cx, cz, a) { this.p.push([cx, cz, a]); }
  build(parent) { if (!this.p.length) return; const n = this.p.length, m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new V3(1, 1, 1);
    const pl = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.135, 0.12, 0.014, 28), M.porcelain, n), np = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.02, 0.085), M.napkin, n), ct = new THREE.InstancedMesh(new THREE.BoxGeometry(0.15, 0.005, 0.011), M.cutlery || (M.cutlery = std({ color: 0xE4E2DD, metalness: 0.35, roughness: 0.3 })), n * 2), gl = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.03, 0.13, 14, 1, true), M.glass, n);
    this.p.forEach(([cx, cz, a], i) => { const px = cx + Math.cos(a) * 0.66, pz = cz + Math.sin(a) * 0.66;
      m.compose(new V3(px, 0.77, pz), q.identity(), one); pl.setMatrixAt(i, m);
      m.compose(new V3(px, 0.79, pz), q.setFromAxisAngle(new V3(0, 1, 0), -a), one); np.setMatrixAt(i, m);
      for (const d of [-0.017, 0.017]) { m.compose(new V3(px - Math.sin(a) * d, 0.8025, pz + Math.cos(a) * d), q.setFromAxisAngle(new V3(0, 1, 0), -a), one); ct.setMatrixAt(i * 2 + (d > 0 ? 1 : 0), m); }
      m.compose(new V3(cx + Math.cos(a + 0.22) * 0.5, 0.83, cz + Math.sin(a + 0.22) * 0.5), q.identity(), one); gl.setMatrixAt(i, m); });
    gl.renderOrder = 2; parent.add(pl, np, ct, gl); } }
const tableNoTex = (n) => textCanvas(256, 384, (g, w, h) => { g.fillStyle = '#5A0F1F'; g.fillRect(0, 0, w, h); g.fillStyle = '#F3E9DC'; g.textAlign = 'center';
  g.font = '600 30px "Cormorant Garamond", serif'; try { g.letterSpacing = '2px'; } catch (e) {} g.fillText('NADIA & ZAKKY', w / 2, 62); try { g.letterSpacing = '0px'; } catch (e) {}
  g.font = '500 20px Jost, sans-serif'; g.fillText('12.12.2026', w / 2, 96); g.font = 'italic 500 50px "Cormorant Garamond", serif'; g.fillText('Table', w / 2, 178); g.font = '600 150px "Cormorant Garamond", serif'; g.fillText(String(n), w / 2, 330); });
function vipTableV4(parent, B, CN, CC, PV, x, z, n) {
  cyl(0.9, 0.95, 0.75, M.whiteCloth, x, 0.375, z, parent, 48);
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + Math.PI / 10; CC.add(x + Math.cos(a) * 1.2, z + Math.sin(a) * 1.2, Math.atan2(-Math.cos(a), -Math.sin(a))); PV.seat(x, z, a); }
  cyl(0.07, 0.06, 0.1, M.glass, x, 0.8, z, parent, 16, { open: true });
  mound(B, new V3(x, 0.84, z), new V3(0.16, 0.12, 0.16), 60, MIX.vipV4, { full: true, leaf: 0.75, filler: 0.04 });
  foliageTone(B, new V3(x, 0.8, z), new V3(0.22, 0.12, 0.22), 26, [['#3E5F3A', 0.5], ['#4F6B45', 0.5]], { tall: 0.8 });
  for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2 + 0.5; CN.add(x + Math.cos(a) * 0.28, 0.755, z + Math.sin(a) * 0.28, 0.05, 0.025); }
  const card = new THREE.Group(); card.position.set(x + 0.2, 0.755, z - 0.14); card.rotation.y = 0.5; parent.add(card);
  box(0.12, 0.03, 0.05, M.teak, 0, 0.015, 0, card); const t = std({ map: tableNoTex(n), roughness: 0.6 }); plane(card, 0.12, 0.18, t, 0, 0.12, 0.012); plane(card, 0.12, 0.18, t, 0, 0.12, -0.012, Math.PI);
}

// --- layar LED landscape berangka baja hitam (foto referensi pemilik) ---
const SCR4 = { cx: 19.5, w: 4.0, h: 2.25, y0: 1.05, z: 0.95 };
M.ledWide = std({ color: 0x000000, emissive: 0xffffff, emissiveIntensity: 0.5, emissiveMap: textCanvas(1024, 576, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#E8D9C2'); gr.addColorStop(0.55, '#B99B7C'); gr.addColorStop(1, '#4A2C26'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(120,80,50,.35)'; for (let x = 60; x < w; x += 150) g.fillRect(x, 30, 70, h * 0.5);
  g.fillStyle = 'rgba(250,246,238,.9)'; for (const [cx, s] of [[0.44, 1], [0.56, 0.95]]) { g.beginPath(); g.ellipse(w * cx, h * 0.42, 40 * s, 48 * s, 0, 0, 6.3); g.fill(); g.beginPath(); g.ellipse(w * cx, h * 0.85, 92 * s, 190 * s, 0, 0, 6.3); g.fill(); }
  g.fillStyle = '#F7EFE2'; g.textAlign = 'center'; g.font = 'italic 600 46px "Cormorant Garamond", serif'; g.fillText('Nadia & Zakky', w / 2, 60);
  g.font = '500 16px Jost, sans-serif'; g.fillStyle = 'rgba(30,10,10,.75)'; g.fillText('LIVE FEED / PHOTOLOOP · KONTEN CONTOH', w / 2, h - 18); }) });
function ledV4(R) {
  const { cx, w, h, y0, z } = SCR4;
  box(w + 0.08, h + 0.08, 0.12, M.black, cx, y0 + h / 2, z - 0.06, R, { cast: true });
  plane(R, w, h, M.ledWide, cx, y0 + h / 2, z + 0.002);
  const xs = [-w / 2 + 0.05, -w / 6, w / 6, w / 2 - 0.05];
  for (const dx of xs) { box(0.06, y0, 0.06, M.steel, cx + dx, y0 / 2, z - 0.06, R); box(0.06, y0 + h + 0.1, 0.06, M.steel, cx + dx, (y0 + h + 0.1) / 2, z - 0.55, R); box(0.06, 0.06, 0.6, M.steel, cx + dx, 0.03, z - 0.33, R); rod(R, new V3(cx + dx, 0.08, z - 0.5), new V3(cx + dx, y0 - 0.1, z - 0.1), 0.02, M.steel); }
  for (const yy of [0.06, y0 * 0.5, y0 - 0.04]) box(w + 0.1, 0.06, 0.06, M.steel, cx, yy, z - 0.06, R);
  for (let k = 0; k < 3; k++) { const a = cx + xs[k], b = cx + xs[k + 1]; rod(R, new V3(a, 0.09, z - 0.06), new V3(b, y0 * 0.5 - 0.03, z - 0.06), 0.018, M.steel); rod(R, new V3(a, y0 * 0.5 + 0.03, z - 0.06), new V3(b, y0 - 0.07, z - 0.06), 0.018, M.steel); }
  for (const sx of [-1, 1]) { const px = cx + sx * (w / 2 + 0.55); box(0.5, 1.3, 0.45, M.black, px, 0.65, z + 0.05, R, { cast: true }); box(0.42, 1.0, 0.01, std({ color: 0x2a2a2c, roughness: 0.9 }), px, 0.72, z + 0.28, R); box(0.18, 0.12, 0.3, M.steel, px, 1.36, z + 0.05, R); }
}

// --- penerima tamu V4: drapery emerald, bunga vertikal sisi barat, 2 usher BERDIRI (instruksi pemilik), meja berkain putih ---
function receptionV4(R, B) {
  const xc = (RT.x0 + RT.x1) / 2, w = RT.x1 - RT.x0;
  box(w + 0.1, 0.06, 0.06, M.black, xc, RT.h + 0.03, RT.z, R); for (const x of [RT.x0 - 0.02, RT.x1 + 0.02]) box(0.05, RT.h, 0.05, M.black, x, RT.h / 2, RT.z, R);
  curtain(R, w, RT.h, M.emerald, xc, 0, RT.z + 0.06, 0, { folds: 15, depth: 0.065 });
  swag(R, M.emeraldSwag, new V3(RT.x0, RT.h - 0.02, RT.z + 0.16), new V3(xc + 0.55, RT.h - 0.06, RT.z + 0.16), { drop: 0.95, bulge: 0.16 });
  swag(R, M.emeraldSwag, new V3(xc - 0.55, RT.h - 0.06, RT.z + 0.2), new V3(RT.x1, RT.h - 0.02, RT.z + 0.2), { drop: 0.8, bulge: 0.15 });
  plane(R, 0.62, 0.775, monoMat(MONO.clear), xc, 1.85, RT.z + 0.13);
  const fx = RT.x0 + 0.42, fz = RT.z + 0.42;
  mound(B, new V3(fx, 0, fz), new V3(0.58, 0.42, 0.45), 300, MIX.receptV3, { leaf: 0.5, filler: 0.7 });
  for (const [yy, rx, n] of [[0.55, 0.42, 260], [1.05, 0.36, 230], [1.55, 0.32, 200], [2.05, 0.27, 160], [2.5, 0.2, 110]]) mound(B, new V3(fx + rr(-0.06, 0.06), yy, fz - 0.05), new V3(rx, 0.34, rx * 0.8), n, MIX.receptV3, { full: true, leaf: 0.6, filler: 0.5 });
  foliage(B, new V3(fx, 0.6, fz - 0.05), new V3(0.4, 2.0, 0.32), 160, { fern: 8 });
  for (let k = 0; k < 6; k++) strand(B, new V3(fx + rr(-0.25, 0.25), 2.55, fz + rr(-0.1, 0.15)), rr(0.6, 1.2), { sway: 0.01, bud: 9 });
  // dua meja usher setinggi meja berdiri (0,95 m), kain putih bersih, bunga meja minimalis + rangkaian juntai di muka meja
  const th = 0.95;
  for (const dx of [-0.85, 0.85]) {
    const tx = xc + dx, tz = RT.z + 1.05;
    box(1.2, 0.04, 0.6, M.whiteCloth, tx, th, tz, R);
    for (const [px, pz, ww, r3] of [[0, 0.315, 1.2, 0], [0, -0.315, 1.2, Math.PI], [0.615, 0, 0.6, Math.PI / 2], [-0.615, 0, 0.6, -Math.PI / 2]]) { const m = new THREE.Mesh(pleatGeo(ww + 0.03, th, { folds: Math.round(ww * 8), depth: 0.008, flare: 1.4, segY: 6 }), M.whiteCloth); m.position.set(tx + px, th / 2, tz + pz); m.rotation.y = r3; R.add(m); }
    mound(B, new V3(tx + 0.38, th + 0.02, tz - 0.08), new V3(0.11, 0.09, 0.09), 40, MIX.receptV3, { full: true, leaf: 0.5, filler: 0.5 });
    const tb = box(0.25, 0.015, 0.18, M.black, tx - 0.2, th + 0.03, tz + 0.05, R); tb.rotation.y = 0.15;
    mound(B, new V3(tx, th - 0.05, tz + 0.33), new V3(0.3, 0.12, 0.1), 90, MIX.receptV3, { full: true, leaf: 0.55, filler: 0.5 });
    for (let k = 0; k < 4; k++) cascadeCluster(B, new V3(tx + rr(-0.22, 0.22), th - 0.06, tz + 0.36), new V3(0, 0, 0.02), rr(0.35, 0.6), 0.07, 22, MIX.receptV3);
  }
  box(0.42, 0.85, 0.42, M.whiteCloth, RT.x1 - 0.25, 0.425, RT.z + 1.25, R); box(0.36, 0.3, 0.3, M.teak, RT.x1 - 0.25, 1.0, RT.z + 1.25, R); box(0.38, 0.03, 0.32, M.prada, RT.x1 - 0.25, 1.16, RT.z + 1.25, R);
  for (const x of [xc - 1.5, xc - 0.2, xc + 0.2, xc + 1.5]) stanchionLine(R, [[x, RT.z + 2.1], [x, RT.z + 3.3]]);
  // lengkung janur hias bulat di sisi timur (hlm 15)
  janurLengkung(R, B, RT.x1 + 0.12, RT.z + 0.42, -1, 0, { h: 3.0, reach: 0.5, mix: MIX.receptV3, tassel: 0.8 });
  const S = new THREE.SpotLight(0xffecd6, 60, 0, 0.62, 0.85, 2); S.position.set(xc, CH - 0.1, RT.z + 4.0); S.target.position.set(xc, 1.4, RT.z + 0.2); R.add(S, S.target); LIGHTS.zone.push(S); S.userData = { amb: 36, doc: 64 };
}

// --- welcome sign V4: menghadap pintu lift (langsung terlihat saat tamu keluar lift); kursi teater ditiadakan ---
const WS4 = { x: 29.95, z: 25.15, ry: Math.PI / 2 };
function welcomeSignV4(R, B) {
  const g = new THREE.Group(); g.position.set(WS4.x, 0, WS4.z); g.rotation.y = WS4.ry; R.add(g);
  const c = Math.cos(WS4.ry), sn = Math.sin(WS4.ry), W2 = (lx, ly, lz) => new V3(WS4.x + lx * c + lz * sn, ly, WS4.z - lx * sn + lz * c);
  const mx = 0.52, mw = 0.98, mh = 1.86, y0 = 0.16, fw = 0.13;
  const mg = new THREE.Group(); mg.position.set(mx, 0, 0); mg.rotation.x = -0.05; g.add(mg);
  const outer = archShape(mw + fw * 2, mh + fw * 2, 'round'); outer.holes.push(archShape(mw, mh, 'round', 0, fw, THREE.Path));
  const fr = new THREE.Mesh(new THREE.ExtrudeGeometry(outer, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 40 }), M.teakDark); fr.position.set(0, y0, -0.02); fr.castShadow = true; mg.add(fr);
  const og = new THREE.ShapeGeometry(outer, 40); normUV(og, mw + fw * 2, mh + fw * 2);
  const ov = new THREE.Mesh(og, carveMat('mirrorFrameV4', { arch: 'round', w: 512, h: 1024, cell: 60, wood: true, base: [184, 138, 70] })); ov.position.set(0, y0, 0.072); mg.add(ov);
  const cs = archShape(0.78, 0.46, 'kayon'), cg = new THREE.ShapeGeometry(cs, 24); normUV(cg, 0.78, 0.46);
  const crest = new THREE.Mesh(cg, carveMat('mirrorCrestV4', { arch: 'kayon', w: 512, h: 300, cell: 46, wood: true, base: [184, 138, 70] })); crest.position.set(0, y0 + mh + fw * 2 - 0.12, 0.045); mg.add(crest);
  const crb = new THREE.Mesh(cg, M.teakDark); crb.position.set(0, y0 + mh + fw * 2 - 0.12, 0.02); mg.add(crb);
  const gl = new THREE.Mesh(new THREE.ShapeGeometry(archShape(mw, mh, 'round'), 40), M.mirror); gl.position.set(0, y0 + fw, 0.03); mg.add(gl); MIRROR.mesh = gl; MIRROR.pos = W2(mx, 1.25, 0.25);
  plane(mg, mw * 0.9, mw * 0.9 * 1200 / 640, std({ map: welcomeTextTex, transparent: true, alphaTest: 0.12, roughness: 0.5 }), 0, y0 + fw + 0.15 + mw * 0.9 * 1200 / 640 / 2, 0.036);
  for (const sx of [-0.38, 0.38]) box(0.16, 0.12, 0.36, M.teakDark, sx, 0.06, -0.02, mg);
  rod(mg, new V3(0, 1.3, -0.04), new V3(0, 0.02, -0.5), 0.018, M.teakDark);
  // fabric hanging di samping cermin, tiang dibalut velvet maroon (hlm 15)
  const fx = -1.0, fwid = 0.8, ftop = 2.08, flen = 1.65;
  for (const sx of [fx - 0.58, fx + 0.58]) { cyl(0.018, 0.022, 2.2, M.gold, sx, 1.1, -0.05, g, 8); cyl(0.14, 0.16, 0.03, M.gold, sx, 0.015, -0.05, g, 16); const d = new THREE.Mesh(pleatGeo(0.24, 2.1, { folds: 2, depth: 0.03, segY: 8, flare: 0.8 }), M.maroonVel); d.position.set(sx, 1.08, -0.02); g.add(d); swag(g, M.maroonVel, new V3(sx - 0.12, 2.18, 0.0), new V3(sx + 0.12, 2.18, 0.0), { drop: 0.25, bulge: 0.06 }); }
  rod(g, new V3(fx - 0.6, ftop + 0.04, -0.05), new V3(fx + 0.6, ftop + 0.04, -0.05), 0.014, M.gold);
  const fb = new THREE.Mesh(pleatGeo(fwid, flen, { folds: 3, depth: 0.006, segY: 4 }), std({ map: fabricTex, roughness: 0.85, side: THREE.DoubleSide })); fb.position.set(fx, ftop - flen / 2, -0.04); g.add(fb);
  rod(g, new V3(fx - fwid / 2 - 0.02, ftop - flen, -0.035), new V3(fx + fwid / 2 + 0.02, ftop - flen, -0.035), 0.01, M.gold);
  // bunga, lilin, bejana kuningan
  mound(B, W2(mx - 0.56, y0 + mh + 0.05, 0.12), new V3(0.3, 0.26, 0.2), 260, MIX.welcomeV3, { full: true, leaf: 0.55, filler: 0.25 });
  for (let k = 0; k < 4; k++) cascadeCluster(B, W2(mx - 0.6 + rr(-0.08, 0.08), y0 + mh, 0.12), new V3(0.02, 0, 0.03), rr(0.4, 0.75), 0.1, 36, MIX.welcomeV3);
  foliage(B, W2(mx - 0.62, y0 + mh - 0.15, 0.1), new V3(0.32, 0.3, 0.16), 70, { fern: 4, tall: 0.8 });
  mound(B, W2(mx + 0.55, 0, 0.22), new V3(0.36, 0.52, 0.3), 230, MIX.welcomeV3, { leaf: 0.5, filler: 0.25 });
  foliage(B, W2(mx + 0.62, 0, 0.18), new V3(0.4, 0.62, 0.3), 120, { fern: 6, tall: 0.9 });
  [[0.12, 0.42], [0.28, 0.28], [0.44, 0.18], [-1.3, 0.3], [-1.46, 0.2]].forEach(([lx, hh]) => { const p = W2(lx, 0, 0.42); hurricane(R, p.x, 0, p.z, hh, 0.06); });
  for (const [lx, s] of [[-0.12, 1], [0.95, 0.8]]) { const p = W2(lx, 0, 0.3); const v = new THREE.Mesh(urnGeo, M.prada); v.scale.set(0.42 * s, 0.5 * s, 0.42 * s); v.position.copy(p); R.add(v); }
  const S = new THREE.SpotLight(0xffe8cc, 30, 0, 0.62, 0.85, 2); const sp = W2(-0.2, CHL - 0.1, 2.0); S.position.copy(sp); S.target.position.copy(W2(-0.2, 1.2, 0)); R.add(S, S.target); LIGHTS.zone.push(S); S.userData = { amb: 30, doc: 46 };
}

/* =====================================================================
   SCENE RESEPSI — REVISI 2 (+ V3.0) (+ V4.0)
   Balai Pertemuan + Serbaguna + foyer, lobi lift, void, Restoran Spesial
   ===================================================================== */
const MIRROR = {}; const STALLA = new THREE.Group(), STALLB = new THREE.Group(), FIG_A = new THREE.Group(), FIG_B = new THREE.Group(); FIG_B.visible = false;
{
  const R = G.res, B = new Batch(), CN = new Candles(), CH2 = new Chairs(), EX = new ExecChairs(), PL = new Places();
  const W = wallsG.res, C = ceilG.res, t = 0.2;

  /* ---------- KONTEKS BANGUNAN (dari denah) ---------- */
  floorRect(R, 0, BL, BZ0, BD, M.carpet);
  floorRect(R, 0, SX1, SZ0 - 0.32, SZ1, M.carpet);
  floorRect(R, SX1, FOY.x1, FOY.z0, FOY.z1, M.stone);
  floorRect(R, 32.9, 34.6, BZ0, FOY.z0, M.stone);
  floorRect(R, LOBBY.x0, LOBBY.x1, SZ1, LOBBY.z1, M.stone);
  floorRect(R, REST.x0, REST.x1, REST.z0, REST.z1, M.stone);
  floorRect(R, VOID.x0, VOID.x1, VOID.z0, VOID.z1, std({ color: 0x0c0405, roughness: 1 }), -4.6);
  // dinding Balai
  wallX(W, -0.2, BL + 0.25, BZ0 - t / 2, CH);
  wallZ(W, BZ0, SZ1, -t / 2, CH);
  wallZ(W, BZ0, SVC[0], BL + 0.11, CH, M.wall, 0.23); wallZ(W, SVC[1], BD + PT, BL + 0.11, CH, M.wall, 0.23);
  box(0.23, CH - 2.4, SVC[1] - SVC[0], M.wall, BL + 0.11, 2.4 + (CH - 2.4) / 2, (SVC[0] + SVC[1]) / 2, W);
  COLE.forEach(([x, z]) => cyl(0.47, 0.47, CH, M.wall, x, CH / 2, z, R, 24));
  // partisi Balai/Serbaguna dengan dua pintu ganda
  [[ESC.x1 - 0.17, DOORS[0] - DW / 2], [DOORS[0] + DW / 2, DOORS[1] - DW / 2], [DOORS[1] + DW / 2, BL + 0.2]].forEach(([a, b]) => wallX(W, a, b, BD + PT / 2, CH, M.wall, PT));
  DOORS.forEach(d => { box(DW, CH - 2.5, PT, M.wall, d, 2.5 + (CH - 2.5) / 2, BD + PT / 2, W); for (const s of [-1, 1]) { const lf = box(0.04, 2.45, DW / 2, M.wood, d + s * (DW / 2 - 0.06), 1.225, SZ0 + DW / 4 - 0.02, R); lf.rotation.y = s * 0.12; } });
  // sumur eskalator (menjorok ke sudut kiri-bawah Balai) + pilaster
  wallX(W, ESC.x0, ESC.x1, ESC.z0 + 0.09, CH, M.wall, 0.19); wallZ(W, ESC.z0, SZ0, ESC.x1 - 0.08, CH, M.wall, 0.17);
  box(PIER.x1 - PIER.x0, CH, PIER.z1 - PIER.z0, M.wall, (PIER.x0 + PIER.x1) / 2, CH / 2, (PIER.z0 + PIER.z1) / 2, R);
  for (const x of [1.64, 3.06]) { box(1.25, 0.95, ESC.z1 - 13.0, M.black, x + 0.62, 0.47, (13.0 + ESC.z1) / 2, R); box(0.03, 0.9, ESC.z1 - 13.0, M.glass, x, 1.4, (13.0 + ESC.z1) / 2, R); box(0.03, 0.9, ESC.z1 - 13.0, M.glass, x + 1.25, 1.4, (13.0 + ESC.z1) / 2, R); }
  glassRail(R, [ESC.x1 - 0.05, SZ0 + 0.1], [ESC.x1 - 0.05, ESC.z1]);
  // Serbaguna: dinding bawah sampai void
  wallX(W, -0.2, VOID.x0, SZ1 + 0.11, CH, M.wall, 0.22);
  // kolom
  COLR.forEach(([x, z]) => { cyl(0.47, 0.47, CH, M.wall, x, CH / 2, z, R, 24); cyl(0.51, 0.54, 3.6, M.colWrap, x, 1.8, z, R, 28, { open: true }); mound(B, new V3(x, 2.5, z), new V3(0.56, 0.18, 0.56), 70, MIX.resepsi, { full: true, leaf: 0.3, filler: 0.4 }); });
  COLS.forEach(([x, z]) => box(0.8, CH, 0.8, M.wall, x, CH / 2, z, R));
  // void (lubang lantai) + pagar kaca
  glassRail(R, [VOID.x0, VOID.z0], [VOID.x1, VOID.z0]); glassRail(R, [VOID.x1, VOID.z0], [VOID.x1, VOID.z1]); glassRail(R, [VOID.x1, VOID.z1], [VOID.x0 + 0.1, VOID.z1]);
  wallZ(W, SZ1, REST.z1, 23.45, CHL, M.wall, 0.2);
  for (const [a, b, c2, d2] of [[VOID.x0, VOID.x1, VOID.z0, VOID.z0], [VOID.x0, VOID.x1, VOID.z1, VOID.z1]]) box(b - a, 4.6, 0.05, M.black, (a + b) / 2, -2.3, c2, R);
  box(0.05, 4.6, VOID.z1 - VOID.z0, M.black, VOID.x1, -2.3, (VOID.z0 + VOID.z1) / 2, R); box(0.05, 4.6, VOID.z1 - VOID.z0, M.black, VOID.x0, -2.3, (VOID.z0 + VOID.z1) / 2, R);
  // inti lift: 3 lift orang menghadap ke kiri (ke void), FHR & pintu TG.9 di muka atas
  box(CORE.x1 - CORE.x0, CHL, CORE.z1 - CORE.z0, M.wall, (CORE.x0 + CORE.x1) / 2, CHL / 2, (CORE.z0 + CORE.z1) / 2, W);
  LIFTZ.forEach(z => { box(0.06, 2.4, 1.5, M.goldDark, CORE.x0 - 0.02, 1.2, z, W); plane(W, 1.1, 2.2, M.metalDoor, CORE.x0 - 0.06, 1.1, z, -Math.PI / 2); box(0.04, 0.08, 0.3, M.ledStrip, CORE.x0 - 0.06, 2.55, z, W); });
  box(0.7, 0.9, 0.18, M.fhr, 34.6, 1.15, CORE.z0 - 0.1, W); plane(W, 0.9, 2.1, M.wood, 36.2, 1.05, CORE.z0 - 0.02, Math.PI);
  // foyer, koridor pantry, blok toilet/pantry, ruang tangga oval, blok servis & dapur
  box(41.3 - 34.6, CHL, FOY.z0 - BZ0, M.wall, (34.6 + 41.3) / 2, CHL / 2, (BZ0 + FOY.z0) / 2, W);
  box(OVAL.x1 + 3.6 - 41.3, CHL, FOY.z0 - BZ0, M.wall, (41.3 + OVAL.x1 + 3.6) / 2, CHL / 2, (BZ0 + FOY.z0) / 2, W);
  wallZ(W, OVAL.z0, OVAL.m0, OVAL.x0 + 0.07, CHL, M.wall, 0.15); wallZ(W, OVAL.m1, OVAL.z1, OVAL.x0 + 0.07, CHL, M.wall, 0.15);
  wallX(W, OVAL.x0, OVAL.x1, OVAL.z0 - 0.07, CHL, M.wall, 0.15); wallZ(W, OVAL.z0, OVAL.z1, OVAL.x1 + 0.07, CHL, M.wall, 0.15);
  floorRect(R, OVAL.x0, OVAL.x1, OVAL.z0, OVAL.z1, M.stone); ovalStair(R);
  box(OVAL.x1 + 3.6 - CORE.x1, CHL, CORE.z1 - CORE.z0, M.wall, (CORE.x1 + OVAL.x1 + 3.6) / 2, CHL / 2, (CORE.z0 + CORE.z1) / 2, W);
  box(3.6, CHL, OVAL.z1 - FOY.z0, M.wall, OVAL.x1 + 1.8 + 0.07, CHL / 2, (FOY.z0 + OVAL.z1) / 2, W);
  // restoran: dinding kiri & kanan, fasad kaca bawah, pilar, pintu servis
  wallZ(W, CORE.z1, REST.z1, REST.x1 + 0.1, CHL);
  box(REST.x1 - REST.x0, 0.35, 0.12, M.wall, (REST.x0 + REST.x1) / 2, 0.175, REST.z1 + 0.08, W); box(REST.x1 - REST.x0, 0.3, 0.12, M.wall, (REST.x0 + REST.x1) / 2, CHL - 0.15, REST.z1 + 0.08, W);
  box(REST.x1 - REST.x0, CHL - 0.65, 0.03, std({ color: 0x1a0f14, metalness: 0.2, roughness: 0.1, transparent: true, opacity: 0.55 }), (REST.x0 + REST.x1) / 2, 0.35 + (CHL - 0.65) / 2, REST.z1 + 0.08, W);
  for (let x = 25.6; x < 48.1; x += 1.5) box(0.06, CHL, 0.1, M.goldDark, x, CHL / 2, REST.z1 + 0.08, W);
  box(2.1, CHL, 2.0, M.wall, 24.55, CHL / 2, 37.3, R); box(2.1, CHL, 2.0, M.wall, 49.0, CHL / 2, 37.3, R);
  for (const x of [32.5, 41.15]) box(1.1, CHL, 1.0, M.wall, x, CHL / 2, 37.8, R);
  plane(R, 1.0, 2.1, M.wood, 41.9, 1.05, CORE.z1 + 0.02);
  // plafon (tinggi ASUMSI) + downlight
  ceilRect(C, 0, BL, BZ0, SZ1, CH);
  ceilRect(C, SX1, FOY.x1, FOY.z0, FOY.z1, CHL); ceilRect(C, LOBBY.x0, LOBBY.x1, SZ1, LOBBY.z1, CHL); ceilRect(C, REST.x0, REST.x1, REST.z0, REST.z1, CHL);
  { const dlG = new THREE.CircleGeometry(0.09, 16); const dls = []; for (let x = 2; x < BL; x += 3.2) for (let z = 1.4; z < SZ1; z += 3.0) dls.push([x, z, CH]); for (let x = 25.2; x < 50; x += 2.6) for (const z of [31.2, 36.6]) dls.push([x, z, CHL]); for (let z = 21.4; z < 29; z += 2.2) dls.push([30.9, z, CHL]); for (const [x, z] of [[34, 14], [34, 18.5], [37, 14], [37, 18.5]]) dls.push([x, z, CHL]);
    const dli = new THREE.InstancedMesh(dlG, M.dl, dls.length); const mm = new THREE.Matrix4(); dls.forEach(([x, z, y], i) => { mm.compose(new V3(x, y - 0.01, z), new THREE.Quaternion().setFromAxisAngle(new V3(1, 0, 0), Math.PI / 2), new V3(1, 1, 1)); dli.setMatrixAt(i, mm); }); C.add(dli); }

  /* ---------- ZONA D · PELAMINAN (ujung kiri Balai, menghadap ke kanan) ----------
     Komponen pelaminan v1 dipakai ulang tanpa digambar ulang: disusun dalam koordinat lama lalu
     diputar 180° (bukan dicerminkan) sehingga panggung 27,8–31,8 lama menjadi 2,1–6,1. */
  const PG = new THREE.Group(); PG.position.set(33.9, 0, 2 * ZC); PG.rotation.y = Math.PI; R.add(PG); // x' = 33,9 − x, z' = 13,8 − z
  /* V3.0 (hlm 11–12): GEBYOK JAWA tradisional — dinding kayu jati berukir selebar panggung, GUNUNGAN WAYANG di tengah dengan cahaya
     hangat di belakang dan juntaian melati, bunga maroon 60 % · peach 20 % · putih 20 % + dedaunan, kursi pelaminan kayu ukir
     dengan bangku tong (barrel), payung bertingkat & janur di kedua ujung panggung. Siger, kanopi julang ngapak, sofa velvet dihapus. */
  {
    const OST = { x0: 27.8, x1: 31.8, z0: 2.4, z1: 11.4, h: 0.6 }, BP = new Batch(), CP = new Candles();
    box(OST.x1 - OST.x0, OST.h - 0.02, OST.z1 - OST.z0, M.stageFace, (OST.x0 + OST.x1) / 2, (OST.h - 0.02) / 2, ZC, PG, { recv: true });
    box(OST.x1 - OST.x0 + 0.02, 0.02, OST.z1 - OST.z0 + 0.02, M.stageTop, (OST.x0 + OST.x1) / 2, OST.h - 0.01, ZC, PG);
    box(0.03, 0.03, OST.z1 - OST.z0 + 0.03, M.gold, OST.x0 - 0.005, OST.h - 0.03, ZC, PG);
    // papan latar & umpak kayu gebyok
    box(0.14, 3.6, 8.8, M.teakDark, 31.92, OST.h + 1.8, ZC, PG);
    box(0.38, 0.16, 8.8, M.teak, 31.74, OST.h + 0.08, ZC, PG);
    // gunungan wayang (pusat) — ukiran kayu tembus, cahaya hangat di belakang
    const GN = carvedPanel(PG, { w: 2.5, h: 3.75, type: 'kayon', x: 31.62, y: OST.h + 0.16, z: ZC, glow: true, tree: true, wood: true, base: [172, 120, 64], frame: 0.09 });
    GN.children[0].material = gununganMat([176, 124, 64]);
    // panel gebyok samping (kayu jati ukir)
    for (const z of [4.85, 8.95]) carvedPanel(PG, { w: 1.3, h: 2.95, type: 'rect', x: 31.7, y: OST.h + 0.16, z, wood: true, base: [128, 80, 40], backMat: M.teakDark });
    for (const z of [3.35, 10.45]) carvedPanel(PG, { w: 1.3, h: 2.7, type: 'round', x: 31.7, y: OST.h + 0.16, z, wood: true, base: [128, 80, 40], backMat: M.teakDark });
    // tiang gebyok + kepala & umpak prada
    for (const z of [2.62, 4.1, 5.58, 8.22, 9.7, 11.18]) { box(0.2, 3.3, 0.17, M.teak, 31.66, OST.h + 1.65, z, PG, { cast: true }); box(0.26, 0.08, 0.23, M.prada, 31.66, OST.h + 3.1, z, PG); box(0.26, 0.1, 0.23, M.teak, 31.66, OST.h + 0.21, z, PG); }
    // lisplang ukir di atas panel samping
    woodFrieze(PG, { x: 31.68, y: OST.h + 3.14, z0: 2.5, z1: 5.68, h: 0.44, d: 0.26 }); woodFrieze(PG, { x: 31.68, y: OST.h + 3.14, z0: 8.12, z1: 11.3, h: 0.44, d: 0.26 });
    // juntaian melati: tirai di depan panel ujung, kolom melati mengapit gunungan, rumbai pendek mengikuti bahu gunungan
    strandCurtain(BP, 31.42, OST.h + 3.12, 2.75, 3.95, 0.075, z => 1.7 + 0.9 * Math.abs(Math.sin(z * 5.1)) + rr(0, 0.2), { sway: 0.012 });
    strandCurtain(BP, 31.42, OST.h + 3.12, 9.85, 11.05, 0.075, z => 1.7 + 0.9 * Math.abs(Math.sin(z * 5.1)) + rr(0, 0.2), { sway: 0.012 });
    strandCurtain(BP, 31.4, OST.h + 3.1, 5.4, 5.78, 0.045, z => 2.2 + rr(0, 0.3), { sway: 0.008 });
    strandCurtain(BP, 31.4, OST.h + 3.1, 8.02, 8.4, 0.045, z => 2.2 + rr(0, 0.3), { sway: 0.008 });
    { const bz = (t, a, b, c, d) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d, Wg = 2.5, Hg = 3.75, y0 = OST.h + 0.16;
      for (let k = 1; k < 12; k++) { const t = k / 12, u = bz(t, -Wg / 2, -Wg / 2, -0.16 * Wg, 0), v = bz(t, 0.5 * Hg, 0.78 * Hg, 0.86 * Hg, Hg) - 0.12;
        for (const sg of [-1, 1]) strand(BP, new V3(31.5, y0 + v, ZC + sg * (u + 0.06)), rr(0.2, 0.42) * (0.6 + 0.4 * t), { sway: 0.006, bud: 8 }); } }
    // bunga maroon/peach/putih + dedaunan: kepala tiang gunungan, ujung gebyok, kaki gebyok
    for (const [z, s] of [[5.58, -1], [8.22, 1]]) { mound(BP, new V3(31.3, OST.h + 3.3, z), new V3(0.46, 0.34, 0.5), 520, MIX.pelV3, { full: true, leaf: 0.45, filler: 0.25 }); foliage(BP, new V3(31.35, OST.h + 3.25, z), new V3(0.52, 0.3, 0.52), 70, { fern: 4, tall: 0.9 }); cascadeCluster(BP, new V3(31.25, OST.h + 3.15, z + s * 0.12), new V3(-0.04, 0, s * 0.1), 1.1, 0.28, 240, MIX.pelV3); }
    for (const z of [2.75, 11.05]) { mound(BP, new V3(31.32, OST.h + 3.1, z), new V3(0.4, 0.3, 0.45), 300, MIX.pelV3, { full: true, leaf: 0.45, filler: 0.25 }); foliage(BP, new V3(31.35, OST.h + 3.05, z), new V3(0.45, 0.28, 0.45), 50, { fern: 3, tall: 0.8 }); }
    for (const z of [3.0, 10.8]) { mound(BP, new V3(31.15, OST.h, z), new V3(0.52, 0.7, 0.6), 380, MIX.pelV3, { leaf: 0.45, filler: 0.25 }); foliage(BP, new V3(31.25, OST.h, z), new V3(0.62, 0.9, 0.62), 120, { fern: 6 }); }
    for (const z of [5.1, 8.7]) mound(BP, new V3(31.3, OST.h + 0.15, z), new V3(0.3, 0.42, 0.3), 160, MIX.pelV3, { leaf: 0.45, filler: 0.25 });
    for (const z of [4.65, 9.15]) { mound(BP, new V3(28.1, OST.h, z), new V3(0.24, 0.3, 0.2), 90, MIX.pelV3, { leaf: 0.4, filler: 0.25 }); hurricane(PG, 28.48, OST.h, z, 0.34, 0.05); }
    // kursi pelaminan tradisional kayu ukir (hlm 12) + bangku tong sebagai meja samping
    carvedBench(PG, { x: 30.45, y: OST.h, z: ZC, len: 2.1 });
    carvedBench(PG, { x: 30.7, y: OST.h, z: 4.3, len: 1.5, ry: -0.16 }); carvedBench(PG, { x: 30.7, y: OST.h, z: 9.5, len: 1.5, ry: 0.16 });
    for (const z of [5.5, 8.3]) barrelStool(PG, BP, 30.5, OST.h, z);
    // cahaya: hangat lembut di panel gebyok, sorot bunga kepala tiang, wash netral di gunungan
    for (const z of [4.6, 9.2]) { const L = new THREE.PointLight(0xffd2a6, 6, 2.4, 2); L.position.set(31.05, 2.5, z); PG.add(L); LIGHTS.back.push(L); }
    for (const z of [5.58, 8.22]) { const S = new THREE.SpotLight(0xffdcb6, 40, 0, 0.22, 0.7, 2); S.position.set(28.5, CH - 0.1, z); S.target.position.set(31.3, 3.8, z); PG.add(S, S.target); LIGHTS.back.push(S); }
    { const S = new THREE.SpotLight(0xffe4c4, 34, 0, 0.32, 0.8, 2); S.position.set(28.0, CH - 0.1, ZC); S.target.position.set(31.6, 2.4, ZC); PG.add(S, S.target); LIGHTS.back.push(S); }
    BP.build(PG); CP.build(PG);
  }
  // elemen yang bergantung pada ruangan baru: drapery ivory + maroon di belakang gebyok
  drape(R, { x: 1.75, z0: 2.15, z1: 12.3, y1: CH - 0.1, mat: M.champDrape, ry: Math.PI / 2 });
  for (const [a, b] of [[2.15, 2.9], [11.55, 12.3]]) drape(R, { x: 1.8, z0: a, z1: b, y1: CH - 0.1, mat: M.burgDrape, ry: Math.PI / 2, rep: 2 });
  // V3.0: payung bertingkat + janur di kedua ujung panggung (hlm 12, gambar paling kiri) — di lantai, tidak menutup tangga & landing
  janurEnsemble(R, B, { pay: [3.0, 1.3], tower: [4.4, 1.4], fans: [[5.5, 1.85, 1.75, 0.4], [3.75, 2.55, 0.72, 0.3]], base: [5.2, 0.95], s: 0.95 });
  janurEnsemble(R, B, { pay: [3.0, 11.95], tower: [4.4, 12.05], fans: [[5.4, 1.85, 12.3, 0.4], [3.75, 2.5, 11.72, 0.3]], base: [5.25, 12.95], s: 0.82 });
  janurLengkung(R, B, 5.0, 1.95, 0, 1, { h: 3.3, reach: 0.45, mix: MIX.pelV3, tassel: 0.8 }); janurLengkung(R, B, 5.0, 11.85, 0, -1, { h: 3.3, reach: 0.45, mix: MIX.pelV3, tassel: 0.8 });
  stageStair(R, 2.6, 4.4); stageStair(R, 4.9, 8.9); stageStair(R, 9.4, 11.2);
  for (const z of [4.65, 9.15]) { cyl(0.05, 0.08, 0.95, M.gold, 6.75, 0.475, z, R, 12); cyl(0.17, 0.12, 0.1, M.gold, 6.75, 0.99, z, R, 16); mound(B, new V3(6.75, 1.03, z), new V3(0.22, 0.22, 0.2), 120, MIX.pelV3, { full: true }); }
  // lampu depan dari truss depan (perlu rigging/izin venue)
  box(0.12, 0.12, 9.6, M.black, 11.5, 4.5, ZC, ceilG.res);
  for (const z of [3.2, 10.6]) { box(0.25, 0.3, 0.3, M.black, 11.5, 4.3, z, ceilG.res); const S = new THREE.SpotLight(0xffd7ad, 260, 0, 0.3, 0.6, 2); S.position.set(11.4, 4.3, z); S.target.position.set(3.9, 1.3, ZC); S.castShadow = true; S.shadow.mapSize.set(1024, 1024); S.shadow.bias = -0.0006; R.add(S, S.target); LIGHTS.key.push(S); }
  { const S = new THREE.SpotLight(0xffe2bd, 60, 0, 0.5, 0.8, 2); S.position.set(5.3, CH - 0.1, ZC); S.target.position.set(3.6, 0.6, ZC); R.add(S, S.target); LIGHTS.key.push(S); }

  /* ---------- AISLE V4.0 (hlm 9 & 15): lantai MELAMIN HITAM reflektif + inisial N&Z di tengah. Jalur pengantin disesuaikan
     (instruksi pemilik): Pintu 2 → lurus ke utara → lurus ke barat ke tangga TENGAH panggung; cabang Y dihapus karena sisi selatan
     kini dipakai jalur tamu salaman di depan band. Dekor: 4 tiang chandelier (bunga setengah tiang), 2 pasang lengkung janur
     hias bulat, payung berjuntai daun hijau tua, rak mini berkain putih (vas/lilin), standing gate janur lengkung di Pintu 2. ---------- */
  const LEGX = [DOORS[1] - 0.9, DOORS[1] + 0.9], TRZ = [5.8, 8.0];
  const AIS = { x0: 6.9, x1: 20.8, z0: 2.5, z1: 13.85, ppm: 40 }, aisW = AIS.x1 - AIS.x0, aisD = AIS.z1 - AIS.z0;
  const maskT = tex(cnv(Math.round(aisW * AIS.ppm), Math.round(aisD * AIS.ppm), (g, w, h) => {
    const P2 = (x, z) => [(x - AIS.x0) * AIS.ppm, (z - AIS.z0) * AIS.ppm];
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff';
    const rect = (x0, x1, z0, z1) => { const [a, b] = P2(x0, z0), [c, d] = P2(x1, z1); g.fillRect(a, b, c - a, d - b); };
    rect(STX, LEGX[1], TRZ[0], TRZ[1]); rect(LEGX[0], LEGX[1], TRZ[0], AIS.z1);
  }), { srgb: false });
  const aisGeo = new THREE.PlaneGeometry(aisW, aisD), aisPos = new V3((AIS.x0 + AIS.x1) / 2, 0.016, (AIS.z0 + AIS.z1) / 2);
  try {
    const rf = new Reflector(aisGeo, { shader: MelamineShader, color: 0x050505, textureWidth: RENDER ? 2048 : 1280, textureHeight: RENDER ? 1152 : 720, clipBias: 0.002, multisample: RENDER ? 4 : 0 });
    rf.material.uniforms.tMask.value = maskT; rf.material.uniforms.refl.value = 0.5;
    rf.rotation.x = -Math.PI / 2; rf.position.copy(aisPos); R.add(rf); AISLE_FX.refl = rf;
  } catch (e) { console.warn('reflector', e); }
  { const fm = new THREE.Mesh(aisGeo, phy({ color: 0x070707, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03, alphaMap: maskT, alphaTest: 0.5 })); fm.rotation.x = -Math.PI / 2; fm.position.copy(aisPos); fm.receiveShadow = true; R.add(fm); AISLE_FX.flat = fm; fm.visible = !AISLE_FX.refl; }
  const NZX = (STX + LEGX[1]) / 2;   // tengah aisle utama
  const nzTex = textCanvas(760, 1000, (g, w, h) => {
    g.textAlign = 'center'; g.fillStyle = '#F3ECDF';
    g.font = 'italic 500 360px "Cormorant Garamond", serif'; g.fillText('N', w / 2 - 150, 520); g.fillText('Z', w / 2 + 150, 650);
    g.font = 'italic 500 200px "Cormorant Garamond", serif'; g.fillText('&', w / 2 + 4, 600);
    g.fillRect(w / 2 - 120, 760, 240, 3);
    g.font = '500 46px Jost, sans-serif'; try { g.letterSpacing = '14px'; } catch (e) {} g.fillText('12 · 12 · 2026', w / 2 + 7, 850); try { g.letterSpacing = '0px'; } catch (e) {}
  });
  { const nz = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2.5), std({ map: nzTex, transparent: true, alphaTest: 0.04, roughness: 0.32, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    nz.rotation.set(-Math.PI / 2, 0, Math.PI / 2); nz.position.set(NZX, 0.021, ZC); nz.renderOrder = 2; R.add(nz); }
  const trim = (ax, az, bx, bz) => { const L2 = Math.hypot(bx - ax, bz - az); const m = box(L2, 0.024, 0.04, M.gold, (ax + bx) / 2, 0.012, (az + bz) / 2, R); m.rotation.y = -Math.atan2(bz - az, bx - ax); };
  trim(STX, TRZ[0] - 0.02, LEGX[1] + 0.02, TRZ[0] - 0.02); trim(STX, TRZ[1] + 0.02, LEGX[0] - 0.02, TRZ[1] + 0.02);
  trim(LEGX[1] + 0.02, TRZ[0] - 0.02, LEGX[1] + 0.02, BD); trim(LEGX[0] - 0.02, TRZ[1] + 0.02, LEGX[0] - 0.02, BD);
  const ZN = TRZ[0] - 0.55, ZS = TRZ[1] + 0.55;
  // 4 tiang chandelier (2 pasang) — bunga hanya di setengah bawah tiang
  for (const x of [9.9, 17.45]) for (const z of [ZN, ZS]) { chandelierArch(R, B, x, z, 0, { h: 3.0, span: 1.2 }); const L = new THREE.PointLight(0xffe6cc, 2.6, 5, 2); L.position.set(x, 2.15, z); R.add(L); LIGHTS.chand.push(L); }
  // 2 pasang lengkung janur hias bulat, melengkung ke arah jalur (rumbai berhenti di tepi jalur)
  for (const x of [11.75, 15.7]) { janurLengkung(R, B, x, TRZ[0] - 0.5, 0, 1, { h: 3.2, reach: 0.5 }); janurLengkung(R, B, x, TRZ[1] + 0.5, 0, -1, { h: 3.2, reach: 0.5 }); }
  // payung berjuntai (dominan daun hijau tua): sepasang mengapit inisial N&Z di sisi utara & ujung tangga, sepasang di kaki jalur Pintu 2
  for (const [x, z, s] of [[NZX, TRZ[0] - 0.95, 0.92], [LEGX[0] - 1.0, 11.0, 0.95], [LEGX[1] + 1.0, 11.0, 0.95]]) payungJuntai(R, B, x, z, s);
  // standing gate: sepasang lengkung janur di mulut aisle (Pintu 2), melengkung ke dalam
  janurLengkung(R, B, LEGX[0] - 0.42, 13.15, 1, 0, { h: 3.3, reach: 0.42 }); janurLengkung(R, B, LEGX[1] + 0.42, 13.15, -1, 0, { h: 3.3, reach: 0.42 });
  // rak / meja mini berkain putih (pengganti lampu bunga): vas bunga atau lilin
  for (const [x, z, ry, k] of [[8.25, TRZ[0] - 0.5, 0, 'vase'], [8.25, TRZ[1] + 0.5, 0, 'vase'], [13.75, TRZ[1] + 0.5, 0, 'candle'], [19.35, TRZ[0] - 0.5, 0, 'candle'], [LEGX[0] - 0.45, 9.35, Math.PI / 2, 'vase'], [LEGX[1] + 0.45, 9.35, Math.PI / 2, 'candle']]) miniRack(R, B, x, z, ry, k);
  // lilin lantai secukupnya di tepi melamin
  const nearX = x => [[9.9, 0.95], [17.45, 0.95], [11.75, 0.4], [15.7, 0.4], [NZX, 0.85], [8.25, 0.45], [13.75, 0.45], [19.35, 0.45]].some(([ex, r]) => Math.abs(x - ex) < r);
  for (let x = 7.6; x < LEGX[1] - 0.15; x += 0.5) for (const z of [TRZ[0] - 0.16, TRZ[1] + 0.16]) { if (nearX(x) || (z > ZC && x > LEGX[0] - 0.25)) continue; CN.add(x, 0, z, (Math.round(x / 0.5) % 3) * 0.07 + 0.09, 0.028); }
  for (let z = TRZ[1] + 0.55; z < BD - 0.35; z += 0.5) for (const x of [LEGX[0] - 0.16, LEGX[1] + 0.16]) { if (Math.abs(z - 9.35) < 0.42 || Math.abs(z - 11.0) < 0.85 || z > 12.6) continue; CN.add(x, 0, z, (Math.round(z / 0.5) % 3) * 0.07 + 0.09, 0.028); }

  /* ---------- ZONA E · BAND V4.0: 4,8 × 2,4 m untuk 5–6 personel, punggung ke Pintu 1; JALUR TAMU SALAMAN di depannya ---------- */
  { const bx = (BAND.x0 + BAND.x1) / 2, bz = (BAND.z0 + BAND.z1) / 2, bw = BAND.x1 - BAND.x0, bd = BAND.z1 - BAND.z0;
    box(bw, BAND.h, bd, M.black, bx, BAND.h / 2, bz, R); drapeX(R, { z: BAND.z0 - 0.01, x0: BAND.x0, x1: BAND.x1, y1: BAND.h, mat: M.burgDrape, ry: Math.PI, rep: 10 });
    drapeX(R, { z: BAND.z1 - 0.04, x0: BAND.x0 + 0.2, x1: BAND.x1 - 0.2, y0: 0, y1: 3.1, mat: M.burgDrape, ry: Math.PI, rep: 9 });
    friezeAt(R, { cx: bx, cz: BAND.z1 - 0.08, y: 3.0, len: bw - 0.3, h: 0.26, d: 0.16, ry: -Math.PI / 2 });
    for (const x of [BAND.x0 + 0.35, BAND.x1 - 0.35]) box(0.5, 1.3, 0.5, M.black, x, BAND.h + 0.95, BAND.z1 - 0.4, R);
    box(1.3, 0.06, 0.42, M.black, bx - 1.45, BAND.h + 0.8, BAND.z0 + 0.75, R); box(0.06, 0.8, 0.06, M.black, bx - 1.45, BAND.h + 0.4, BAND.z0 + 0.75, R);
    box(1.0, 0.75, 0.9, M.black, bx + 0.2, BAND.h + 0.38, BAND.z1 - 0.65, R); for (const d of [-0.3, 0.7]) cyl(0.18, 0.18, 0.02, M.goldDark, bx + d, BAND.h + 0.95, BAND.z1 - 0.95, R, 16);
    for (const x of [bx - 0.4, bx + 1.2]) cyl(0.012, 0.012, 1.45, M.black, x, BAND.h + 0.72, BAND.z0 + 0.45, R, 6);
    for (const x of [bx - 1.6, bx, bx + 1.6]) { const w = box(0.5, 0.28, 0.35, M.black, x, BAND.h + 0.14, BAND.z0 + 0.22, R); w.rotation.x = 0.35; }
    for (const x of [BAND.x0 + 0.28, BAND.x1 - 0.28]) mound(B, new V3(x, BAND.h, BAND.z0 + 0.28), new V3(0.26, 0.3, 0.22), 90, MIX.resepsi);
    const S = new THREE.SpotLight(0xffc68a, 55, 0, 0.55, 0.8, 2); S.position.set(bx, CH - 0.1, 8.2); S.target.position.set(bx, 1.2, bz); R.add(S, S.target); LIGHTS.zone.push(S); S.userData = { amb: 30, doc: 55 };
  }
  // jalur tamu salaman: dari area antre (timur band) menyusuri muka band, berbelok ke tangga naik salaman (kanan panggung)
  { const LZ0 = 9.15, LZ1 = BAND.z0 - 0.03, LX1 = 15.3;
    box(LX1 - STX, 0.012, LZ1 - LZ0, M.laneRunner, (STX + LX1) / 2, 0.006, (LZ0 + LZ1) / 2, R);
    box(BAND.x0 - 0.05 - STX, 0.012, 11.2 - LZ1, M.laneRunner, (STX + BAND.x0 - 0.05) / 2, 0.006, (LZ1 + 11.2) / 2, R);
    stanchionLine(R, [[8.75, LZ0], [11.0, LZ0], [13.25, LZ0], [LX1, LZ0]]);
    stanchionLine(R, [[LX1, LZ0], [LX1, 9.6]]); stanchionLine(R, [[LX1, 10.75], [LX1, 12.6]]); stanchionLine(R, [[BAND.x1 + 0.08, 12.6], [LX1, 12.6]]);
    stanchionLine(R, [[BAND.x0 - 0.1, 11.4], [BAND.x0 - 0.1, 12.75]]);   // lorong belakang band khusus kru (bukan jalan pintas antrean)
    const sg = textCanvas(256, 360, (g, w, h) => { g.fillStyle = '#2A0A12'; g.fillRect(0, 0, w, h); g.strokeStyle = '#987E55'; g.lineWidth = 4; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = '#E8D3A8'; g.textAlign = 'center'; g.font = '600 34px "Cormorant Garamond", serif'; g.fillText('Antrean', w / 2, 140); g.fillText('Salaman', w / 2, 180); g.font = '500 16px Jost, sans-serif'; g.fillText('← NAIK DI KANAN PANGGUNG', w / 2, 240); });
    const sp = new THREE.Group(); sp.position.set(LX1 + 0.35, 0, 10.2); sp.rotation.y = Math.PI / 2; R.add(sp); box(0.4, 0.58, 0.03, M.gold, 0, 1.0, -0.01, sp); plane(sp, 0.36, 0.52, std({ map: sg, roughness: 0.7 }), 0, 1.0, 0.007); cyl(0.02, 0.02, 0.72, M.gold, 0, 0.36, -0.03, sp, 8); cyl(0.15, 0.17, 0.03, M.gold, 0, 0.015, -0.03, sp, 16); }

  /* ---------- ZONA F · TANGGA TURUN + STALL (kiri panggung) ---------- */
  // Opsi A (direkomendasikan): satu stall gelato premium di dinding atas, antre ke kanan
  // V2.0: stall digeser ke x 11,8 → jarak kaki tangga–stall 3,45 m; landing 2,35 × 2,2 m bebas; antre sejajar muka konter (masuk barat, keluar timur)
  gubuk(R, 11.8, 1.56, 0, { w: 2.4, label: 'Gelato', roof: false }); friezeAt(R, { cx: 11.8, cz: 0.45, y: 2.35, len: 2.6, h: 0.24, d: 0.12, ry: Math.PI / 2 });
  R.add(STALLA); stanchionLine(STALLA, [[10.55, 2.95], [11.8, 2.95], [13.05, 2.95]]);
  // Opsi B (pembanding): stall kedua Chatime bersebelahan
  R.add(STALLB); STALLB.visible = false;
  gubuk(STALLB, 9.15, 1.56, 0, { w: 2.4, label: 'Chatime', roof: false });
  friezeAt(STALLB, { cx: 9.15, cz: 0.45, y: 2.35, len: 2.6, h: 0.24, d: 0.12, ry: Math.PI / 2 });
  for (const x of [8.4, 9.4]) stanchionLine(STALLB, [[x, 2.05], [x, 3.3], [x, 4.4]]);

  /* ---------- LAYAR LED V4.0: landscape 4,0 × 2,25 m di atas rangka baja hitam + speaker (mengikuti foto referensi pemilik) ----------
     Berdiri bebas di depan dinding atas Balai, tidak menutup panggung, pintu, atau lajur keluar dari tangga. */
  ledV4(R);
  [[15.9, 3.7]].forEach(([x, z]) => { cyl(0.36, 0.36, 0.03, M.cloth, x, 1.1, z, R, 24); cyl(0.12, 0.38, 1.08, M.cloth, x, 0.54, z, R, 24); mound(B, new V3(x, 1.12, z), new V3(0.09, 0.08, 0.09), 14, MIX.resepsi, { full: true }); CN.add(x + 0.12, 1.115, z, 0.1, 0.03); });

  /* ---------- ZONA G · VVIP (seperempat belakang Balai) ---------- */
  box(BL - 0.1 - 24.8, 0.012, 12.6, M.vvipCarpet, (24.8 + BL - 0.1) / 2, 0.006, ZC, R);
  // batas VVIP: bak tanaman + bunga di x 24,5 dengan bukaan di sumbu (garis sketsa pemilik)
  for (const [a, b] of [[0.6, 4.75], [9.05, 13.3]]) { box(0.36, 0.42, b - a, M.lacquer, 24.5, 0.21, (a + b) / 2, R); for (let z = a + 0.25; z < b - 0.1; z += 0.42) mound(B, new V3(24.5, 0.42, z), new V3(0.24, 0.2, 0.24), 22, MIX.pagar, { full: true, leaf: 0.9, filler: 0.3 }); }
  standingFlower(R, B, 24.5, 4.95); standingFlower(R, B, 24.5, 8.85);
  // V4.0 (hlm 14): meja & kursi berkain putih bersih, 1 rangkaian minimalis bunga maroon + daun hijau, kartu nomor meja (nama mempelai + tanggal)
  const CC = new CoverChairs(), PV = new PlacesV4();
  VVIPT.forEach(([x, z], i) => vipTableV4(R, B, CN, CC, PV, x, z, i + 1));
  { const S = new THREE.SpotLight(0xffd9b0, 60, 0, 0.75, 0.9, 2); S.position.set(28.3, CH - 0.1, ZC); S.target.position.set(28.3, 0.75, ZC); R.add(S, S.target); LIGHTS.zone.push(S); S.userData = { amb: 30, doc: 60 }; }

  /* ---------- ZONA I · SERBAGUNA: BUFFET OPSI A (linear perimeter + stall terbatas) ---------- */
  for (const [a, b] of [[7.2, 14.55], [15.85, 17.6]]) {
    const xc = (a + b) / 2, len = b - a;
    box(len, 0.88, 0.8, M.cloth, xc, 0.44, 20.4, R); box(len + 0.02, 0.04, 0.82, M.gold, xc, 0.9, 20.4, R); box(len - 0.1, 0.012, 0.3, M.napkin, xc, 0.925, 20.55, R);
    for (let x = a + 0.4; x < b - 0.2; x += 0.62) { cyl(0.2, 0.17, 0.16, M.gold, x, 1.0, 20.32, R, 16); cyl(0.2, 0.2, 0.03, M.goldDark, x, 1.09, 20.32, R, 16); }
    box(len - 0.1, 0.02, 0.4, M.glass, xc, 1.42, 20.25, R);
    drapeX(R, { z: SZ1 - 0.03, x0: a - 0.2, x1: b + 0.2, y1: 3.3, mat: M.champDrape, ry: Math.PI, rep: len * 2 });
    mound(B, new V3(a + 0.15, 0.9, 20.6), new V3(0.22, 0.24, 0.24), 90, MIX.resepsi); mound(B, new V3(b - 0.15, 0.9, 20.6), new V3(0.22, 0.24, 0.24), 90, MIX.resepsi);
    lantern(R, xc, 0.92, 20.62, 0.75);
  }
  // konter swalayan di partisi (sketsa pemilik), lajur pintu tetap kosong
  for (const [a, b] of [[5.0, 9.2], [12.8, 17.4]]) { const xc = (a + b) / 2, len = b - a; box(len, 0.88, 0.6, M.cloth, xc, 0.44, SZ0 + 0.33, R); box(len + 0.02, 0.04, 0.62, M.gold, xc, 0.9, SZ0 + 0.33, R); box(len - 0.1, 0.012, 0.25, M.napkin, xc, 0.925, SZ0 + 0.4, R); for (let x = a + 0.35; x < b - 0.2; x += 0.7) { cyl(0.16, 0.12, 0.05, M.gold, x, 0.95, SZ0 + 0.33, R, 16); cyl(0.03, 0.03, 0.18, M.gold, x, 1.04, SZ0 + 0.33, R, 8); cyl(0.14, 0.14, 0.02, M.gold, x, 1.14, SZ0 + 0.33, R, 16); } mound(B, new V3(a + 0.2, 0.9, SZ0 + 0.35), new V3(0.2, 0.22, 0.2), 70, MIX.resepsi); }
  gubuk(R, 5.92, 17.6, Math.PI / 2, { w: 2.0, label: 'Chatime' });
  M.screen = std({ color: 0x000000, emissive: 0xffffff, emissiveIntensity: 0.55, emissiveMap: textCanvas(800, 450, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#3B010B'); gr.addColorStop(1, '#75162D'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.drawImage(monoCanvas(150, 190, { bg: null, date: false }), w / 2 - 75, 60); g.fillStyle = '#F2D9A0'; g.textAlign = 'center'; g.font = '500 22px Jost, sans-serif'; g.fillText('PHOTOLOOP PRE-WEDDING · KONTEN CONTOH', w / 2, h - 60); }) });
  plane(R, 3.6, 2.03, M.screen, 15.1, 3.05, SZ0 + 0.04); box(3.75, 2.18, 0.06, M.black, 15.1, 3.05, SZ0 + 0.01, R);

  /* ---------- ZONA A · PENERIMA TAMU (V3.0, hlm 7) + GALERI FOTO MINIMALIS (hlm 8) — urutan sesuai denah hlm 3 ---------- */
  receptionV4(R, B);
  buildGallery(R, B, { x: GAL_V.x, z: GAL_V.z, ry: 0, lights: LIGHTS.zone, spotY: CH });

  // papan penunjuk arah di mulut lobi lift (tidak di dalam lobi)
  { const sg = textCanvas(256, 512, (g, w, h) => { g.fillStyle = '#2A0A12'; g.fillRect(0, 0, w, h); g.strokeStyle = '#987E55'; g.lineWidth = 5; g.strokeRect(10, 10, w - 20, h - 20); g.drawImage(monoCanvas(110, 138, { bg: null, date: false }), 73, 30); g.fillStyle = '#E8D3A8'; g.textAlign = 'center'; g.font = '600 30px "Cormorant Garamond", serif'; g.fillText('↑ Ballroom', w / 2, 250); g.fillText('& Penerima Tamu', w / 2, 286); g.font = '500 17px Jost, sans-serif'; g.fillText('↓ RESTORAN · VIP DINING', w / 2, 360); g.fillText('→ PHOTOBOOTH', w / 2, 400); });
    box(0.5, 1.0, 0.04, M.gold, 28.95, 1.05, 21.6, R).rotation.y = Math.PI / 2; plane(R, 0.46, 0.92, std({ map: sg, roughness: 0.7 }), 28.98, 1.05, 21.6, Math.PI / 2); cyl(0.02, 0.02, 0.55, M.gold, 28.95, 0.27, 21.6, R, 8); cyl(0.16, 0.18, 0.03, M.gold, 28.95, 0.015, 21.6, R, 16); }

  /* ---------- ZONA B · WELCOME SIGN V4.0: di sisi void lobi lift, menghadap pintu lift (langsung terlihat saat tamu keluar lift).
     Kursi teater ditiadakan (instruksi pemilik: tidak ada kursi di depan lift). ---------- */
  welcomeSignV4(R, B);

  /* ---------- ZONA C · PHOTOBOOTH DI DEPAN TANGGA OVAL (punggung ke tangga, menghadap Pintu 2) ---------- */
  { const px = 36.4, z0 = 15.05, z1 = 18.05, h = 2.9, zc = (z0 + z1) / 2;   // V2.0: beludru maroon #51051A
    photoboothV3(R, B, { px: 36.45, zc });
    const tgt = new V3(35.6, 1.5, zc);
    softbox(R, 34.05, 15.25, tgt); softbox(R, 34.05, 17.85, tgt);
    for (const z of [15.25, 17.85]) { const S = new THREE.SpotLight(0xfff2e4, 45, 0, 0.62, 1, 2); S.position.set(34.15, 2.0, z); S.target.position.copy(tgt); R.add(S, S.target); LIGHTS.photo.push(S); }
    { const S = new THREE.SpotLight(0xffc98e, 30, 0, 0.55, 0.9, 2); S.position.set(35.15, 1.95, 13.9); S.target.position.set(px, 1.3, 17.0); R.add(S, S.target); LIGHTS.photo.push(S); S.userData.k = 0.3; }
    { const S = new THREE.SpotLight(0xffe0b0, 30, 0, 0.16, 0.6, 2); S.position.set(34.9, CHL - 0.1, zc); S.target.position.set(px, 1.7, zc); R.add(S, S.target); LIGHTS.photo.push(S); S.userData.k = 0.22; }
    cyl(0.02, 0.02, 1.4, M.black, 33.3, 0.7, zc, R, 6); box(0.14, 0.1, 0.1, M.black, 33.3, 1.45, zc, R);
    box(1.2, 0.8, 0.5, M.cloth, 37.55, 0.4, 12.4, R); box(0.4, 0.25, 0.35, M.black, 37.35, 0.93, 12.4, R);
    for (const [a, b] of [[[35.35, zc - 0.25], [35.85, zc + 0.25]], [[35.35, zc + 0.25], [35.85, zc - 0.25]]]) { const g = new THREE.Group(); g.position.set((a[0] + b[0]) / 2, 0.004, (a[1] + b[1]) / 2); g.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]); box(0.7, 0.004, 0.04, M.gold, 0, 0, 0, g); R.add(g); }
    stanchionLine(R, [[33.2, 13.1], [35.0, 13.1]]);
  }

  /* ---------- ZONA H · RESTORAN SPESIAL (VIP dining, di kiri pintu lift lantai 5, di luar ballroom) ----------
     V4.0: panel ukir gunungan/wayang emas di dinding sisi void DIGANTI backdrop akad (3 gunungan wayang, bunga putih–hijau,
     janur bulat, payung bertingkat + janur lengkung) yang dipindah turun setelah akad selesai. Meja VIP dining mengikuti hlm 14. */
  drape(R, { x: REST.x0 + 0.03, z0: 29.9, z1: 35.95, y1: CHL - 0.05, mat: M.champDrape, ry: Math.PI / 2, rep: 14 });
  akadBackdrop(R, B, { x: REST.x0 + 0.35, z: 32.85, ry: Math.PI / 2, sides: true, curtains: false, H: CHL });
  { const S = new THREE.SpotLight(0xfff0de, 30, 0, 0.6, 0.85, 2); S.position.set(27.6, CHL - 0.1, 32.85); S.target.position.set(REST.x0 + 0.4, 1.4, 32.85); R.add(S, S.target); LIGHTS.zone.push(S); S.userData = { amb: 26, doc: 40 }; }
  RESTT.forEach((x, i) => { vipTableV4(R, B, CN, CC, PV, x, 33.9, 7 + i); lampion(R, x, 2.55, 33.9, 1.0, CHL); });
  CC.build(R); PV.build(R);
  box(0.55, 1.1, 0.45, M.wood, 33.6, 0.55, 30.85, R); plane(R, 0.36, 0.45, monoMat(MONO.wine, { transparent: false, alphaTest: 0 }), 33.6, 0.62, 31.08);
  { const x = 33.2, z = 31.6; cyl(0.05, 0.08, 0.95, M.gold, x, 0.475, z, R, 12); cyl(0.2, 0.14, 0.1, M.gold, x, 0.99, z, R, 16); mound(B, new V3(x, 1.03, z), new V3(0.3, 0.32, 0.3), 160, MIX.resepsi, { full: true }); cascadeCluster(B, new V3(x, 1.0, z), new V3(0.04, 0, 0.04), 0.6, 0.16, 60, MIX.resepsi); }

  /* ---------- CAHAYA UMUM ---------- */
  const amb = (x, y, z, k = 1, dist = 0) => { const L = new THREE.PointLight(0xffdcc0, 6, dist, 2); L.position.set(x, y, z); L.userData.k = k; R.add(L); LIGHTS.ambient.push(L); };
  amb(8, 4.5, 4.0); amb(8, 4.5, 9.8); amb(20, 4.5, 4.0); amb(20, 4.5, 9.8);
  amb(6, 4.4, 18.4, 1.6); amb(15, 4.4, 18.4, 1.6); amb(26, 4.4, 18.4, 1.5);
  amb(34.0, 3.3, 15.9, 0.8, 7.5); amb(30.9, 3.3, 25.2, 0.8, 7.0);
  amb(30.5, 3.3, 33.9, 0.6, 9); amb(39.2, 3.3, 33.9, 0.6, 9); amb(46.5, 3.3, 33.9, 0.55, 9);
  { const L = new THREE.PointLight(0xffa654, 2.5, 0, 2); L.position.set(7.6, 0.6, 6.9); R.add(L); LIGHTS.candle.push(L); }

  /* ---------- FIGUR SKALA (1,58–1,76 m) ---------- */
  const F = figG.res, fg = (x, y, z, i = 0, h) => figure(F, x, y, z, { hijab: i % 2 === 0, h: h || rr(1.58, 1.76) });
  figure(F, 4.4, ST.h, 6.45, { h: 1.72, mat: M.coupleFig }); figure(F, 4.4, ST.h, 7.35, { hijab: true, h: 1.62, mat: M.coupleFig }); [[4.15, 3.9], [4.15, 4.7], [4.15, 9.1], [4.15, 9.9]].forEach(([x, z], i) => figure(F, x, ST.h, z, { hijab: i % 2 === 1, h: rr(1.6, 1.72), mat: M.parentFig }));
  for (let i = 0; i < 6; i++) fg(11.2 + i * 0.8, 0, 6.9 + (i % 2 ? 0.25 : -0.25), i);
  [[14.7, 9.8], [13.7, 9.75], [12.7, 9.8], [11.7, 9.75], [10.7, 9.8], [9.7, 9.75], [7.8, 10.1]].forEach(([x, z], i) => fg(x, 0, z, i)); fg(19.5, 0, 12.4, 1); fg(19.6, 0, 10.6, 2); fg(6.65, 0.3, 10.3, 1); fg(6.7, 0.3, 3.5, 0); fg(7.8, 0, 3.6, 3);
  fg(11.4, 0, 0.75, 1, 1.66); fg(12.2, 0, 0.75, 0, 1.6);
  F.add(FIG_A, FIG_B); [[10.95, 2.45], [11.65, 2.45], [12.35, 2.5]].forEach(([x, z], i) => figure(FIG_A, x, 0, z, { hijab: i % 2 === 0, h: rr(1.58, 1.76) }));
  [[8.9, 2.3], [8.9, 3.0], [8.85, 3.7], [8.95, 4.3], [10.95, 2.45], [11.65, 2.45], [8.75, 0.9], [9.55, 0.9]].forEach(([x, z], i) => figure(FIG_B, x, 0, z, { hijab: i % 2 === 1, h: rr(1.58, 1.76) }));
  { const bx = (BAND.x0 + BAND.x1) / 2; [[bx - 0.4, 10.75], [bx + 1.3, 10.8], [bx - 1.45, 11.3], [bx + 1.9, 11.9], [bx + 0.2, 12.35], [bx - 1.2, 12.2]].forEach(([x, z], i) => fg(x, BAND.h, z, i + 1)); }
  fg(22.6, 0, 10.6, 0); fg(23.2, 0, 9.9, 1); fg(17.4, 0, 2.6, 0, 1.6);
  [[22.4, 14.75], [24.1, 14.75]].forEach(([x, z], i) => fg(x, 0, z, i, 1.62));
  [[22.8, 16.6], [22.8, 17.35], [24.0, 16.7], [25.2, 16.6], [25.2, 17.4], [21.2, 15.6]].forEach(([x, z], i) => fg(x, 0, z, i));
  fg(27.2, 0, 16.3, 0); fg(27.75, 0, 16.6, 1); fg(28.1, 0, 17.5, 2); fg(18.9, 0, 3.6, 3); fg(20.3, 0, 3.9, 0); fg(31.9, 0, 23.3, 2); fg(30.7, 0, 22.0, 3); fg(30.95, 0, 25.5, 0); fg(31.15, 0, 23.7, 1); fg(28.3, 0, 19.2, 0);
  figure(F, 35.6, 0, 16.2, { h: 1.72, mat: M.coupleFig }); figure(F, 35.6, 0, 16.9, { hijab: true, h: 1.62, mat: M.coupleFig }); fg(33.4, 0, 16.0, 1); fg(33.6, 0, 13.55, 2); fg(34.3, 0, 13.6, 3);
  for (let i = 0; i < 7; i++) fg(7.9 + i * 0.95, 0, 19.05 + (i % 2) * 0.3, i);
  fg(6.9, 0, 17.6, 2); fg(6.2, 0, 15.2, 1); fg(14.0, 0, 15.4, 0); fg(15.2, 0, 15.5, 3); fg(11.0, 0, 17.4, 0);
  fg(31.0, 0, 30.5, 0); fg(33.0, 0, 31.4, 1); fg(36.8, 0, 31.4, 2); fg(44.5, 0, 36.6, 3);

  B.build(R); CN.build(R); CH2.build(R); EX.build(R); PL.build(R);

  /* label */
  const L = (t, s, x, y, z, c) => mkLabel('res', t, s, x, y, z, c);
  L('Pelaminan', 'gebyok Jawa · 9,0 × 4,0 × 0,6 m', 4.1, 5.0, ZC);
  L('Gunungan wayang', 'kayu ukir · juntaian melati', 2.3, 4.35, ZC, true);
  L('Kursi pelaminan', 'kayu ukir tradisional + bangku tong', 3.4, 1.95, ZC, true);
  L('Payung bertingkat & janur', 'ujung panggung + lengkung janur', 3.7, 3.85, 1.3);
  L('Tangga turun', 'kiri panggung · tamu turun setelah salaman', 6.6, 1.5, 3.5, true);
  L('Tangga tengah', 'jalan masuk pengantin', 6.6, 1.5, ZC, true);
  L('Tangga naik salaman', 'kanan panggung · ujung jalur tamu', 6.6, 1.5, 10.3, true);
  L('Aisle melamin hitam', 'reflektif · inisial N&Z · lurus ke tangga tengah', NZX, 0.55, ZC);
  L('Tiang chandelier', '4 buah · bunga setengah tiang', 17.45, 4.15, ZN);
  L('Lengkung janur hias bulat', '2 pasang di aisle + standing gate', 11.75, 3.45, ZN);
  L('Payung berjuntai', 'dominan daun hijau tua', NZX, 3.05, TRZ[0] - 0.95);
  L('Rak mini berkain putih', 'vas bunga / lilin', 19.35, 1.45, TRZ[0] - 0.5, true);
  L('Standing gate', 'lengkung janur + payung di mulut aisle', DOORS[1], 3.5, 12.4);
  L('Jalur tamu salaman', 'di depan band → tangga kanan panggung', 12.0, 0.9, 9.8);
  L('Band', '4,8 × 2,4 m · 5–6 personel', (BAND.x0 + BAND.x1) / 2, 3.55, BAND.z1 - 0.3);
  L('Antrean', 'masuk dari sisi timur band', 15.9, 1.9, 10.2, true);
  L('Stall gelato', '3,45 m dari kaki tangga', 11.8, 2.9, 1.5);
  L('Landing tangga', 'bebas 2,35 × 2,2 m', 8.3, 0.4, 3.5, true);
  L('Layar LED 4,0 × 2,25 m', 'landscape · rangka baja hitam', SCR4.cx, SCR4.y0 + SCR4.h + 0.35, SCR4.z);
  L('VIP', '6 meja zigzag · kain putih · nomor meja', 28.55, 1.9, ZC);
  L('Pintu 1 · sekunder', 'kru band & jalur darurat', DOORS[0], 2.8, BD, true);
  L('Pintu 2 · utama', 'terdekat ke lift', DOORS[1], 2.8, BD, true);
  L('Pintu servis', 'koridor pantry · tidak dihalangi', BL, 2.7, (SVC[0] + SVC[1]) / 2, true);
  L('Penerima tamu', 'drapery emerald · 2 usher berdiri', (RT.x0 + RT.x1) / 2, 3.45, RT.z + 0.3);
  L('Galeri foto', 'minimalis · lengkung janur · bunga dalam pot', GAL_V.x, 2.95, GAL_V.z + 0.4);
  L('Welcome sign', 'menghadap pintu lift · cermin + fabric', WS4.x, 2.75, WS4.z);
  L('Lobi lift', 'tanpa kursi · 3 lift orang', 31.6, 2.8, 27.9, true);
  L('Void', 'pagar kaca eksisting', 26.4, 1.6, 26.0, true);
  L('Photobooth NZ', 'velvet maroon & ivory · NZ merah', 36.3, 3.35, 16.55);
  L('Tangga oval', 'ke lantai atas (akad)', 42.6, 3.3, 16.55, true);
  L('Restoran · VIP dining', '5 meja × 10 · gaya meja VIP hlm 14', 39.0, 2.6, 33.9);
  L('Backdrop akad', 'dipindah ke sini setelah akad', REST.x0 + 0.5, 3.35, 32.85);
  L('Buffet linear', '2 jalur + dessert · staf di belakang', 12.0, 2.0, 20.4);
  L('Chatime', 'stall di sisi eskalator', 5.9, 3.0, 17.6);
  L('Konter swalayan', 'di partisi · lajur pintu kosong', 15.1, 1.5, SZ0 + 0.4);
  L('Eskalator', 'arah naik/turun belum dipastikan', 2.7, 1.8, 16.5, true);
  L('Dapur', 'jalur katering perlu konfirmasi', 48.4, 2.4, 17.0, true);
}
/* =====================================================================
   SCENE AKAD V4.0 — ruang akad ±72 m² (8,0 × 9,0 m; taksiran pemilik) di lantai atas, kapasitas 40 tamu
   (20 kiri + 20 kanan). Baris terdepan ±2,7 m (±4 langkah) dari meja akad, bukan ruang luas berjarak jauh.
   Dekor hlm 16–19: palet putih–hijau, 3 gunungan wayang kayu ukir, sedikit janur bulat, kursi pelaminan rotan berhias,
   payung bertingkat + janur lengkung, 4 pasang rangkaian lantai dominan baby's breath, 2 pasang janur lengkung modifikasi.
   Setelah akad selesai, backdrop yang sama dipindah turun ke VIP dining (Restoran Spesial) sisi void.
   ===================================================================== */
{
  const A = G.akad, B = new Batch(), CN = new Candles(), CC = new CaneChairs(); const { L: Lx, D: Dz, H: Hy } = AK; const zc = Dz / 2;
  floorRect(A, 0, Lx, 0, Dz, M.akadFloor);
  const W = wallsG.akad;
  wallX(W, -0.2, Lx + 0.2, -0.1, Hy, M.akadWall); wallX(W, -0.2, Lx + 0.2, Dz + 0.1, Hy, M.akadWall);
  wallZ(W, 0, zc - 0.9, -0.1, Hy, M.akadWall); wallZ(W, zc + 0.9, Dz, -0.1, Hy, M.akadWall); box(0.2, Hy - 2.4, 1.8, M.akadWall, -0.1, 2.4 + (Hy - 2.4) / 2, zc, W);
  for (const s of [-1, 1]) box(0.24, 2.42, 0.08, M.teak, -0.1, 1.21, zc + s * 0.94, W);
  wallZ(W, 0, Dz, Lx + 0.1, Hy, M.akadWall);
  ceilRect(ceilG.akad, 0, Lx, 0, Dz, Hy, M.akadCeil);
  { const dlG = new THREE.CircleGeometry(0.08, 16), dls = []; for (let x = 1.0; x < Lx; x += 2.0) for (let z = 1.5; z < Dz; z += 2.0) dls.push([x, z]); const dli = new THREE.InstancedMesh(dlG, M.dl, dls.length), mm = new THREE.Matrix4(); dls.forEach(([x, z], i) => { mm.compose(new V3(x, Hy - 0.01, z), new THREE.Quaternion().setFromAxisAngle(new V3(1, 0, 0), Math.PI / 2), new V3(1, 1, 1)); dli.setMatrixAt(i, mm); }); ceilG.akad.add(dli); }
  // tirai putih tipis di dinding samping (hlm 19: bingkai tirai putih) — ruang terasa intim, bukan aula kosong
  for (const x of [1.0, 3.2, 5.4]) { curtain(W, 1.5, Hy - 0.06, M.sheer, x, 0, 0.08, 0, { folds: 7, depth: 0.05 }); curtain(W, 1.5, Hy - 0.06, M.sheer, x, 0, Dz - 0.08, Math.PI, { folds: 7, depth: 0.05 }); }
  // panggung rendah 0,2 m untuk meja akad
  const SX0 = 5.75, SX1 = 7.32, SZ = [2.4, 6.6];
  box(SX1 - SX0, 0.2, SZ[1] - SZ[0], M.bone, (SX0 + SX1) / 2, 0.1, zc, A, { recv: true });
  box(0.04, 0.012, SZ[1] - SZ[0], M.gold, SX0 + 0.02, 0.2, zc, A);
  // backdrop akad: 3 gunungan wayang + bunga putih–hijau + janur bulat; payung bertingkat & janur lengkung di kedua sisi; tirai putih
  akadBackdrop(A, B, { x: Lx - 0.25, z: zc, ry: -Math.PI / 2, sides: true, curtains: true, H: Hy });
  // meja akad berkain putih + rangkaian rendah dan juntaian hijau di muka meja
  const tx = 6.9, ty = 0.2, th = 0.75;
  box(0.75, 0.04, 1.6, M.whiteCloth, tx, ty + th, zc, A);
  for (const [px, pz, ww, r3] of [[-0.395, 0, 1.6, -Math.PI / 2], [0.395, 0, 1.6, Math.PI / 2], [0, 0.82, 0.75, 0], [0, -0.82, 0.75, Math.PI]]) { const m = new THREE.Mesh(pleatGeo(ww + 0.03, th, { folds: Math.round(ww * 8), depth: 0.008, flare: 1.2, segY: 6 }), M.whiteCloth); m.position.set(tx + px, ty + th / 2, zc + pz); m.rotation.y = r3; A.add(m); }
  mound(B, new V3(tx + 0.05, ty + th + 0.02, zc), new V3(0.14, 0.1, 0.42), 120, MIX.akadV4, { full: true, leaf: 0.5, filler: 0.6 });
  babyBreath(B, new V3(tx - 0.39, ty + th - 0.12, zc), new V3(0.08, 0.14, 0.5), 120);
  for (let k = 0; k < 7; k++) { const z = zc - 0.5 + k * 0.17; leafStrand(B, new V3(tx - 0.41, ty + th - 0.02, z), rr(0.35, 0.6)); }
  box(0.22, 0.05, 0.16, std({ color: 0x23402A, roughness: 0.5 }), tx + 0.12, ty + th + 0.045, zc - 0.25, A);   // mushaf / mahar (simbol)
  // 6 kursi rotan berhias: pengantin pria & wanita menghadap meja, wali + penghulu di ujung utara, 2 saksi di ujung selatan
  [[6.2, zc - 0.4, Math.PI / 2], [6.2, zc + 0.4, Math.PI / 2], [6.58, zc - 1.25, 0], [7.05, zc - 1.25, 0], [6.58, zc + 1.25, Math.PI], [7.05, zc + 1.25, Math.PI]].forEach(([x, z, ry]) => CC.add(x, z, ry, ty));
  for (const z of [zc - 0.4, zc + 0.4]) { mound(B, new V3(5.98, ty + 0.95, z), new V3(0.12, 0.1, 0.1), 40, MIX.akadV4, { full: true, leaf: 0.5, filler: 0.5 }); for (let k = 0; k < 3; k++) leafStrand(B, new V3(5.97, ty + 0.9, z + rr(-0.08, 0.08)), rr(0.35, 0.55)); }
  // 40 kursi tamu rotan: 4 baris × 5 kursi di kiri dan kanan lorong 1,8 m, menghadap backdrop
  const ROWS = [0.9, 1.8, 2.7, 3.6], NZ = [zc - 1.17, zc - 1.69, zc - 2.21, zc - 2.73, zc - 3.25], SZs = NZ.map(z => 2 * zc - z);
  ROWS.forEach(x => { for (const z of NZ.concat(SZs)) CC.add(x, z, Math.PI / 2); });
  // lorong putih glossy dari pintu ke panggung
  box(SX0 - 0.05, 0.012, 1.8, M.akadRunner, (SX0 - 0.05) / 2 + 0.025, 0.006, zc, A);
  // 4 pasang rangkaian lantai dominan baby's breath + 2 pasang janur lengkung modifikasi (membentuk lengkung di atas lorong)
  for (const x of [0.45, 1.35, 3.15, 5.25]) for (const s of [-1, 1]) { const z = zc + s * 0.62; babyBreath(B, new V3(x, 0, z), new V3(0.3, 0.42, 0.24), 230); foliageTone(B, new V3(x, 0, z), new V3(0.3, 0.36, 0.24), 50, GREENL, { tall: 0.8 }); mound(B, new V3(x, 0.05, z), new V3(0.2, 0.22, 0.18), 30, MIX.akadV4, { leaf: 0.4, filler: 0.7 }); }
  for (const x of [2.25, 4.45]) for (const s of [-1, 1]) janurLengkung(A, B, x, zc + s * 0.66, 0, -s, { h: 2.95, reach: 0.62, mix: MIX.akadV4, light: true, tassel: 0 });
  // cahaya pagi netral: ambient plafon, wash backdrop, key meja akad dari dua sisi depan
  for (const [x, z] of [[2, 2.2], [2, 6.8], [5.5, 2.2], [5.5, 6.8]]) { const L = new THREE.PointLight(0xfff4e6, 4, 0, 2); L.position.set(x, Hy - 0.25, z); A.add(L); LIGHTS.akad.push(L); L.userData = { amb: 2.7, doc: 3.6 }; }
  { const S = new THREE.SpotLight(0xfff1df, 40, 0, 0.6, 0.8, 2); S.position.set(4.6, Hy - 0.1, zc); S.target.position.set(Lx - 0.3, 1.5, zc); A.add(S, S.target); LIGHTS.akad.push(S); S.userData = { amb: 22, doc: 30 }; }
  for (const s of [-1, 1]) { const S = new THREE.SpotLight(0xfff4e8, 50, 0, 0.42, 0.7, 2); S.position.set(3.4, Hy - 0.15, zc + s * 3.2); S.target.position.set(tx, 0.95, zc); A.add(S, S.target); LIGHTS.akad.push(S); S.userData = { amb: 15, doc: 21 }; }
  const F = figG.akad;
  figure(F, 6.2, ty, zc - 0.4, { h: 1.72 }); figure(F, 6.2, ty, zc + 0.4, { hijab: true, h: 1.62 });
  figure(F, 6.58, ty, zc - 1.25, { h: 1.7, mat: M.parentFig }); figure(F, 7.05, ty, zc - 1.25, { h: 1.68 }); figure(F, 6.58, ty, zc + 1.25, { h: 1.66 }); figure(F, 7.05, ty, zc + 1.25, { h: 1.7 });
  [[0.9, zc - 2.2], [1.8, zc + 1.7], [2.7, zc - 1.7], [3.6, zc + 2.2], [0.3, zc + 3.9]].forEach(([x, z], i) => figure(F, x, 0, z, { hijab: i % 2 === 0, h: rr(1.58, 1.74) }));
  B.build(A); CN.build(A); CC.build(A);
  const L = (t, s, x, y, z, c) => mkLabel('akad', t, s, x + AK.ox, y, z + AK.oz, c);
  L('Backdrop akad', '3 gunungan wayang · bunga putih–hijau · janur bulat', Lx - 0.4, 3.25, zc);
  L('Meja akad', '6 kursi rotan: pengantin, wali, penghulu, 2 saksi', tx, 1.55, zc);
  L('Payung bertingkat & janur lengkung', 'kedua sisi backdrop', Lx - 1.2, 3.05, zc - 2.5, true);
  L('Kursi tamu 40', '20 kiri + 20 kanan · kursi rotan', 2.2, 1.35, zc - 2.2);
  L('±2,7 m (±4 langkah)', 'baris terdepan → meja akad', 4.7, 0.6, zc + 1.0, true);
  L('Rangkaian lantai baby’s breath', '4 pasang', 1.35, 0.8, zc + 0.62, true);
  L('Janur lengkung modifikasi', '2 pasang, melengkung di atas lorong', 2.25, 3.1, zc);
  L('Ruang ±72 m²', '8,0 × 9,0 m (taksiran)', 0.5, 3.0, 0.6, true);
  L('Pintu masuk', 'lorong 1,8 m', 0.0, 2.6, zc, true);
}
/* =====================================================================
   SCENE GALERI OUTDOOR (V2.0) — vignette editorial golden hour; komponen galeri identik dengan di venue
   ===================================================================== */
{
  const GG = G.gal, B = new Batch(), CN = new Candles(); GG.position.set(GO.x, 0, GO.z);
  const pav = tex(cnv(512, 512, (g, w, h) => { g.fillStyle = '#B9B2A6'; g.fillRect(0, 0, w, h); for (let r = 0; r < 8; r++) for (let c = -1; c < 5; c++) { const x = c * 128 + (r % 2) * 64, y = r * 64; const v = 205 + Math.round(rr(-12, 10)); g.fillStyle = `rgb(${v},${v - 6},${v - 16})`; g.fillRect(x + 2, y + 2, 124, 60); } for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '120,110,96' : '250,244,232'},${rnd() * 0.12})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } }), { rep: [7, 7] });
  floorRect(GG, -12, 12, -10, 10, std({ map: pav, roughness: 0.82 }));
  const leafy = (x, y, z, r, m = M.foliage) => { const s2 = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), m); s2.position.set(x, y, z); s2.castShadow = true; GG.add(s2); };
  for (let x = -11; x <= 11; x += 0.55) leafy(x + rr(-0.15, 0.15), rr(0.5, 1.1), -3.6 + rr(-0.3, 0.3), rr(0.45, 0.75), rnd() < 0.5 ? M.foliage : M.foliage2);
  for (let x = -11; x <= 11; x += 0.9) leafy(x + rr(-0.3, 0.3), rr(1.4, 2.0), -4.4 + rr(-0.3, 0.3), rr(0.6, 0.9), M.foliage2);
  for (const [tx, tz, th] of [[-7.5, -6.5, 5.5], [-3.2, -8.0, 6.5], [2.5, -7.2, 6.0], [7.2, -5.8, 5.2], [10.5, -8.5, 6.2], [-10.5, -8.8, 6.0]]) {
    cyl(0.14, 0.22, th, M.trunk, tx, th / 2, tz, GG, 10, { cast: true });
    for (let k = 0; k < 11; k++) leafy(tx + rr(-1.6, 1.6), th + rr(-0.6, 1.4), tz + rr(-1.4, 1.4), rr(0.9, 1.5), rnd() < 0.6 ? M.foliage : M.foliage2);
  }
  for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) leafy(sx * (3.4 + k * 0.45), 0.4, -0.6 + k * 0.5, rr(0.35, 0.5));
  buildGallery(GG, B, { x: 0, z: 0, ry: 0, plinth: false, lights: LIGHTS.gal, spotY: 3.6 });
  const sun = new THREE.DirectionalLight(0xffc27a, 3.0); sun.position.set(-7, 3.6, 5.5); sun.target.position.set(0, 1, 0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005;
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 0.5, far: 30 }); GG.add(sun, sun.target); LIGHTS.gal.push(sun); sun.userData = { sun: true };
  const fill = new THREE.DirectionalLight(0xffe4c8, 0.55); fill.position.set(6, 2.5, 7); GG.add(fill);
  const sky = new THREE.HemisphereLight(0xffe2bc, 0x6b5a44, 0.9); GG.add(sky);
  const F = figG.gal; figure(F, -3.35, 0, 1.0, { hijab: true, h: 1.62 }); figure(F, 3.3, 0, 1.35, { h: 1.74 }); figure(F, 3.85, 0, 1.05, { hijab: true, h: 1.6 });
  B.build(GG); CN.build(GG);
  const L = (t, s2, x, y, z) => mkLabel('gal', t, s2, x + GO.x, y, z + GO.z);
  L('Dinding foto utama', 'bingkai emas · lampu gambar', -0.35, 2.85, 0); L('Bunga dalam pot besar', 'peach · merah terang · putih · merah gelap · daun', 2.3, 1.75, 0.8); L('Lilin terbatas', 'LED bila api terbuka tidak diizinkan', -2.1, 0.7, 1.15);
}
const SKY_GAL = tex(cnv(16, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#B9C6C3'); gr.addColorStop(0.55, '#EBD3AC'); gr.addColorStop(1, '#E2C08E'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }));
const BG_DEF = scene.background, FOG_DEF = scene.fog, FOG_GAL = new THREE.Fog(0xE6CDA2, 9, 30);

/* ================= HEMI + MODE CAHAYA ================= */
const hemi = new THREE.HemisphereLight(0xffe1c0, 0x1a0608, 0.3); scene.add(hemi);
let mode = 'amb';
function setMode(m) {
  mode = m;
  const doc = m === 'doc';
  renderer.toneMappingExposure = doc ? 1.12 : 0.86;
  hemi.intensity = doc ? 0.6 : 0.26;
  LIGHTS.ambient.forEach(l => l.intensity = (doc ? 11 : 4) * (l.userData.k ?? 1));
  LIGHTS.key.forEach((l, i) => { l.intensity = (i < 2 ? (doc ? 320 : 80) : (doc ? 30 : 4)); l.color.set(doc ? 0xffeedd : 0xffdcc0); });
  LIGHTS.back.forEach(l => l.intensity = l.isSpotLight ? (doc ? 16 : 32) : (doc ? 3 : 8));
  LIGHTS.candle.forEach(l => l.intensity = doc ? 3 : 4.5);
  LIGHTS.payung.forEach(l => l.intensity = doc ? 0.8 : 1.3);
  LIGHTS.chand.forEach(l => l.intensity = doc ? 1.6 : 2.8);
  LIGHTS.zone.forEach(l => { l.intensity = doc ? l.userData.doc : l.userData.amb; l.color.set(doc ? 0xffeedd : 0xffdcbc); });
  LIGHTS.photo.forEach(l => l.intensity = (doc ? 32 : 20) * (l.userData.k ?? 1)); // V2.0: diturunkan agar beludru maroon tidak memerah dan wajah tidak terbakar
  LIGHTS.gal.forEach(l => { if (l.userData.sun) l.intensity = 3.0; else l.intensity = (doc ? 18 : 14) * (l.userData.k ?? 1); });
  if (curScene === 'gal') { renderer.toneMappingExposure = 1.0; hemi.intensity = 0.15; }
  M.glow.emissiveIntensity = doc ? 0.55 : 1.0; M.colWrap.emissiveIntensity = doc ? 0.55 : 1.0; M.softbox.emissiveIntensity = doc ? 2.0 : 1.1;
  LIGHTS.akad.forEach(l => { if (l.userData.amb !== undefined) l.intensity = doc ? l.userData.doc : l.userData.amb; else if (l.isSpotLight) l.intensity = doc ? 55 : 35; else if (l.isPointLight && l.color.getHex() !== 0xffb36b) l.intensity = doc ? 4.5 : 3; });
  document.getElementById('mAmb').setAttribute('aria-pressed', !doc); document.getElementById('mDoc').setAttribute('aria-pressed', doc);
}
let stallOpt = 'A';
function setStall(o) { stallOpt = o; STALLA.visible = FIG_A.visible = o === 'A'; STALLB.visible = FIG_B.visible = o === 'B'; document.getElementById('oA').setAttribute('aria-pressed', o === 'A'); document.getElementById('oB').setAttribute('aria-pressed', o === 'B'); }

/* ================= POST ================= */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bokeh = new BokehPass(scene, camera, { focus: 4.6, aperture: 0.0016, maxblur: 0.006 }); bokeh.enabled = false; composer.addPass(bokeh);
const bloom = new UnrealBloomPass(new THREE.Vector2(stage.clientWidth, stage.clientHeight), 0.5, 0.5, 1.4);
composer.addPass(bloom); composer.addPass(new OutputPass());
function applyQuality() { renderer.setPixelRatio(Math.min(devicePixelRatio, hiQ ? 2 : 1.1)); bloom.enabled = true; LIGHTS.key.forEach((l, i) => { l.castShadow = hiQ && i < 2; }); if (AISLE_FX.refl) { AISLE_FX.refl.visible = hiQ; AISLE_FX.flat.visible = !hiQ; } renderer.shadowMap.needsUpdate = true; document.getElementById('bQ').setAttribute('aria-pressed', hiQ); document.getElementById('qTxt').textContent = hiQ ? 'Kualitas tinggi' : 'Kualitas ringan'; resize(); }

/* ================= PERHENTIAN TUR ================= */
const STOPS_RES = [
  { z: '01 · Bird’s-eye', t: 'Seluruh venue dari atas', d: 'Revisi V4.0 (moodboard 19 halaman + instruksi pemilik): aisle melamin hitam lurus ke tangga tengah, jalur tamu salaman di depan band, layar LED landscape, meja VIP berkain putih bernomor, welcome sign menghadap pintu lift tanpa kursi di lobi, backdrop akad di VIP dining sisi void.', p: [45.5, 23.0, -5.5], t3: [17.5, 0, 11.5], cut: true, light: 'doc', fig: true },
  { z: '02 · Denah 3D', t: 'Tampak atas', d: 'Geometri bangunan sama dengan denah moodboard hlm 3. Perubahan tata letak V4.0: jalur pengantin lurus, jalur tamu salaman + band 4,8 × 2,4 m, welcome sign di depan lift, kursi teater ditiadakan.', p: [25.2, 64, 19.36], t3: [25.2, 0, 19.3], cut: true, light: 'doc', fov: 40 },
  { z: '03 · Kedatangan', t: 'Welcome sign di depan lift', d: 'Begitu pintu lift terbuka, tamu langsung melihat cermin berbingkai kayu ukir (Welcome / TO THE WEDDING OF / Nadia & Zakky / December 12nd, 2026 / Manhattan Hotel) dan fabric hanging “These kids are getting married” dengan foto kecil kedua mempelai. Tiang fabric berbalut velvet maroon, bunga, lilin, bejana kuningan. Tidak ada kursi di depan lift; 2,0 m bersih ke pintu lift.', p: [32.25, 1.62, 25.15], t3: [29.9, 1.3, 25.15], light: 'amb' },
  { z: '04 · Zona A', t: 'Backdrop penerima tamu', d: 'Drapery velvet emerald + swag + NZ emas, bunga vertikal hanya di sisi barat, lengkung janur hias bulat di sisi timur. Dua usher berdiri di meja setinggi 0,95 m berkain putih bersih, bunga meja minimalis, juntaian bunga di muka meja.', p: [23.25, 1.65, 19.6], t3: [23.25, 1.45, 14.4], light: 'doc', fig: true },
  { z: '05 · Galeri', t: 'Galeri foto minimalis', d: 'Dinding gading berdiri, bingkai foto (placeholder), lampu gambar, lilin terbatas, bunga dalam pot besar (peach 20 % · merah terang 30 % · putih 20 % · merah gelap 20 % · daun 10 %), lengkung janur di ujung (hlm 15).', p: [28.7, 1.65, 18.6], t3: [28.8, 1.25, 14.6], light: 'amb' },
  { z: '06 · Zona C', t: 'Photobooth NZ', d: 'Velvet maroon berlipit, velvet ivory di atas dan samping, inisial NZ merah, bunga samping dengan untaian daun hijau, hiasan bulat velvet di sudut atas.', p: [31.9, 1.62, 16.55], t3: [36.4, 1.55, 16.55], light: 'doc' },
  { z: '07 · Pintu 2', t: 'Standing gate', d: 'Dilihat dari dalam ballroom ke arah Pintu 2: sepasang lengkung janur hias bulat di mulut aisle sebagai gerbang, payung berjuntai daun hijau tua, rak mini berkain putih, lilin lantai di tepi melamin.', p: [19.53, 1.7, 8.6], t3: [19.53, 1.75, 13.8], light: 'amb' },
  { z: '08 · Hero', t: 'Aisle lurus ke pelaminan', d: 'Jalur pengantin kini lurus ke tangga tengah. Melamin hitam memantulkan chandelier, lilin, dan gebyok; 2 pasang tiang chandelier, 2 pasang lengkung janur hias bulat, payung berjuntai, inisial N&Z di tengah.', p: [20.0, 1.65, 6.9], t3: [3.0, 2.0, 6.9], light: 'amb' },
  { z: '09 · Pelaminan', t: 'Gebyok Jawa, tampak depan', d: 'Gebyok jati berukir, gunungan wayang + juntaian melati, bunga maroon 60 · peach 20 · putih 20, kursi kayu ukir, payung bertingkat + janur + lengkung janur di kedua ujung panggung (hlm 11–13, 15).', p: [11.2, 1.7, 6.9], t3: [3.2, 2.2, 6.9], light: 'amb' },
  { z: '10 · Detail', t: 'Gunungan & juntaian melati', d: 'Gunungan wayang kayu ukir tembus dengan cahaya hangat di belakang, rumbai melati, kolom melati.', p: [6.9, 2.5, 8.2], t3: [2.3, 2.8, 6.9], light: 'amb' },
  { z: '11 · Detail', t: 'Payung bertingkat, janur, lengkung janur', d: 'Di ujung panggung: payung tiga tingkat, menara & kipas janur, guci bunga, lengkung janur hias bulat.', p: [6.0, 2.1, 3.6], t3: [3.6, 1.8, 1.2], light: 'amb' },
  { z: '12 · Detail', t: 'Kursi pelaminan kayu ukir', d: 'Bangku jati berukir dengan jok krem dan bangku tong ukir.', p: [6.7, 1.6, 8.6], t3: [3.4, 1.05, 6.9], light: 'amb' },
  { z: '13 · Arah balik', t: 'Aisle dari pelaminan', d: 'Dari kursi pelaminan: aisle lurus, jalur tamu salaman di sisi kanan bersama band, Pintu 2 di ujung.', p: [4.6, 2.3, 6.9], t3: [18.0, 0.9, 7.6], light: 'amb' },
  { z: '14 · Detail', t: 'Melamin hitam & inisial N&Z', d: 'Inisial N&Z vinyl gading di tengah melamin hitam glossy, list emas tipis. Pantulan dihitung langsung di mode kualitas tinggi.', p: [16.4, 2.25, 7.65], t3: [13.8, 0.05, 6.9], light: 'amb' },
  { z: '15 · Detail', t: 'Chandelier, lengkung janur, payung, rak', d: 'Tiang chandelier (bunga setengah tiang), lengkung janur dengan bola janur dan sampian, payung berjuntai di atas semak daun hijau tua, rak mini berkain putih.', p: [14.9, 1.5, 7.5], t3: [11.6, 1.6, 5.0], light: 'amb' },
  { z: '16 · Zona E', t: 'Jalur tamu salaman & band', d: 'Tamu antre dari sisi timur band, berjalan di depan band (lajur ±1,2 m bertiang pembatas) lalu naik di tangga kanan panggung untuk salaman, turun di tangga kiri. Band 4,8 × 2,4 m untuk 5–6 personel, punggung ke Pintu 1, lorong kru 1,0 m di belakang.', p: [16.3, 1.7, 9.85], t3: [7.0, 1.0, 10.3], light: 'amb', fig: true },
  { z: '17 · Zona E', t: 'Band & jalur tamu dari atas', d: 'Pemisahan jelas: aisle pengantin (melamin), deret dekor sisi selatan, jalur tamu salaman, panggung band.', p: [11.4, 8.6, 5.6], t3: [11.3, 0, 10.4], cut: true, light: 'doc', fig: true },
  { z: '18 · Wide', t: 'Balai dari sudut VIP', d: 'Pelaminan gebyok di ujung, aisle melamin lurus, band dan jalur tamu di kiri, layar LED di kanan.', p: [30.8, 4.6, 3.7], t3: [6.0, 0.6, 7.6], fig: true, light: 'amb' },
  { z: '19 · Layar', t: 'Layar LED landscape', d: 'Layar LED 4,0 × 2,25 m (16:9) di atas rangka baja hitam berpalang seperti foto referensi pemilik, dua speaker di samping. Bawah layar 1,05 m, atas 3,3 m. Konten adalah contoh.', p: [19.5, 1.7, 7.0], t3: [19.5, 2.0, 0.9], light: 'amb' },
  { z: '20 · Zona G', t: 'VIP: 6 meja berkain putih', d: 'Enam meja Ø1,8 m zigzag × 10 kursi bersarung putih, satu rangkaian minimalis bunga maroon + daun hijau, kartu nomor meja “NADIA & ZAKKY · 12.12.2026 · Table n” (hlm 14).', p: [22.9, 2.8, 6.9], t3: [29.0, 0.5, 6.9], light: 'doc' },
  { z: 'Detail', t: 'Meja VIP & nomor meja', d: 'Piring putih, napkin maroon, gelas, rangkaian maroon + daun hijau, lilin votive, kartu nomor meja maroon.', p: [28.35, 1.4, 5.1], t3: [27.1, 0.82, 4.05], light: 'doc' },
  { z: '21 · Zona H', t: 'VIP dining + backdrop akad', d: 'Restoran Spesial di kiri pintu lift (di luar ballroom). Setelah akad, backdrop akad (3 gunungan wayang, bunga putih–hijau, payung bertingkat, janur lengkung) dipindah ke dinding sisi void, menggantikan panel wayang V3.0. Lima meja VIP dining bergaya hlm 14.', p: [31.0, 1.65, 31.1], t3: [23.9, 1.4, 32.9], light: 'doc' },
  { z: '22 · Zona H', t: 'Restoran dari ujung timur', d: 'Lima meja × 10 kursi bersarung putih, nomor meja 7–11, backdrop akad di ujung.', p: [48.6, 2.2, 31.0], t3: [26.0, 1.0, 34.0], fig: true },
  { z: '23 · Zona I', t: 'Ruang buffet (Serbaguna)', d: 'Buffet linear opsi A; tidak berubah.', p: [20.4, 2.2, 16.6], t3: [8.5, 0.9, 19.0], fig: true, light: 'doc' },
  { z: '24a · Zona F', t: 'Tangga turun & stall (opsi A)', d: 'Tamu turun di kiri panggung setelah salaman; stall gelato 3,45 m dari kaki tangga, landing tetap kosong.', p: [6.6, 3.3, 7.4], t3: [11.0, 0.5, 2.2], stall: 'A', fig: true },
  { z: '24b · Zona F', t: 'Pembanding opsi B: dua stall', d: 'Stall kedua memotong jalur turun. Tidak direkomendasikan.', p: [6.6, 3.3, 7.4], t3: [11.0, 0.5, 2.2], stall: 'B', fig: true },
  { z: '25 · Lobi', t: 'Lobi lift tanpa kursi', d: 'Kursi teater ditiadakan sesuai instruksi pemilik: lobi lift kosong dan lapang, welcome sign di sisi void menghadap pintu lift.', p: [31.6, 1.7, 28.6], t3: [30.4, 1.1, 22.0], fig: true, light: 'doc' },
  { z: 'Cahaya', t: 'Mode suasana', d: 'Hangat tetapi tidak kuning: maroon tetap maroon, emerald tetap hijau.', p: [15.6, 1.65, 6.4], t3: [3.0, 2.1, 6.9], light: 'amb' },
  { z: 'Cahaya', t: 'Mode fotografi', d: 'Netral-hangat: lampu depan dari truss naik, ambient naik, backlight turun.', p: [15.6, 1.65, 6.4], t3: [3.0, 2.1, 6.9], light: 'doc' },
];
const og = (x, y, z) => [x + GO.x, y, z + GO.z];
const STOPS_GAL = [
  { z: 'Galeri outdoor', t: 'Galeri foto Zakky & Nadia', d: 'Komponen galeri yang sama dengan di venue (dinding gading, bingkai foto, lampu gambar, bunga dalam pot besar, lilin terbatas, lengkung janur) di taman golden hour, mendekati referensi hlm 8. Simulasi gaya.', p: og(-1.6, 1.6, 4.6), t3: og(0.3, 1.25, 0.3), fig: true },
  { z: 'Galeri outdoor', t: 'Dinding utama & bunga pot', d: 'Bingkai emas untuk foto utama, bingkai hitam untuk foto pendukung. Foto adalah placeholder berlabel.', p: og(1.0, 1.55, 3.0), t3: og(0.2, 1.2, 0.3) },
  { z: 'Galeri outdoor', t: 'Tampak atas galeri', d: 'Tiga dinding bertingkat, pot bunga di kedua ujung, lengkung janur di ujung kanan.', p: og(0.01, 9.5, 3.4), t3: og(0, 0, 0.5), fov: 40 },
];
const o = (x, y, z) => [x + AK.ox, y, z + AK.oz];
const STOPS_AKAD = [
  { z: 'Akad', t: 'Ruang akad 72 m² · 40 tamu', d: 'Ruang ±8,0 × 9,0 m (taksiran pemilik) di lantai atas. 40 kursi rotan: 4 baris × 5 kursi di kiri dan kanan lorong 1,8 m. Baris terdepan ±2,7 m (±4 langkah) dari meja akad, sehingga tamu dekat dengan prosesi. Palet putih–hijau (hlm 16).', p: o(0.35, 1.62, 4.5), t3: o(7.6, 1.45, 4.5), light: 'doc' },
  { z: 'Akad', t: 'Backdrop akad', d: '3 gunungan wayang kayu ukir, bunga putih–hijau dominan dengan baby’s breath dan larkspur putih, sedikit janur bulat, payung bertingkat dan janur lengkung di kedua sisi, tirai putih (hlm 17 & 19). Backdrop ini dipindah ke VIP dining setelah akad.', p: o(3.3, 1.7, 4.5), t3: o(7.7, 1.45, 4.5), light: 'doc' },
  { z: 'Akad', t: 'Meja akad & kursi rotan', d: 'Meja berkain putih dengan rangkaian rendah dan juntaian hijau. Enam kursi rotan berhias: pengantin pria & wanita menghadap meja, wali + penghulu di ujung utara, dua saksi di ujung selatan (posisi final dari KUA/WO).', p: o(5.0, 1.75, 1.9), t3: o(6.85, 0.9, 4.6), light: 'doc' },
  { z: 'Akad', t: 'Lorong & dekor aisle akad', d: '4 pasang rangkaian lantai dominan baby’s breath dan 2 pasang janur lengkung modifikasi yang melengkung di atas lorong putih (hlm 18).', p: o(6.4, 1.75, 4.5), t3: o(0.5, 1.1, 4.5), light: 'doc' },
  { z: 'Akad', t: 'Tampak atas · 40 kursi', d: 'Denah ruang akad: pintu di barat, lorong 1,8 m, dua blok 20 kursi, panggung rendah 0,2 m, backdrop di dinding timur. Jalan samping 1,0 m di kedua sisi.', p: o(4.0, 13.5, 4.51), t3: o(4.0, 0, 4.5), cut: true, light: 'doc', fov: 42 },
  { z: 'Akad', t: 'Detail janur lengkung & baby’s breath', d: 'Janur lengkung dengan bola janur di ujung, rangkaian lantai baby’s breath dengan daun sage.', p: o(1.6, 1.35, 6.4), t3: o(2.6, 1.4, 4.1), light: 'doc' },
];

/* ================= NAVIGASI ================= */
let fovOverride = null, userFig = false, curScene = 'res', STOPS = STOPS_RES, cur = 0, tween = null, cutTarget = 1, cut = 1, showLbl = true, showFig = false, playing = false, playTimer = null, progT0 = 0, lastT = performance.now();
const stopsEl = document.getElementById('stops');
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function setScene(key, instant) {
  curScene = key; G.res.visible = key === 'res'; G.akad.visible = key === 'akad'; G.gal.visible = key === 'gal';
  Object.values(LBL).forEach(a => a.forEach(l => l.el.style.opacity = 0));
  for (const [id, k] of [['sRes', 'res'], ['sAkad', 'akad'], ['sGal', 'gal']]) document.getElementById(id).setAttribute('aria-pressed', key === k);
  document.getElementById('sub').textContent = { res: 'Resepsi · Balai Pertemuan + Serbaguna · 11.00', akad: 'Akad · ruang ±72 m² lantai atas · 40 tamu · 08.00', gal: 'Galeri foto · vignette editorial outdoor (simulasi gaya)' }[key];
  bloom.threshold = key === 'akad' ? 2.0 : 1.4; scene.background = key === 'gal' ? SKY_GAL : BG_DEF; scene.fog = key === 'gal' ? FOG_GAL : FOG_DEF; bokeh.enabled = key === 'gal'; setMode(mode);
  document.getElementById('oSeg').hidden = key !== 'res';
  STOPS = { res: STOPS_RES, akad: STOPS_AKAD, gal: STOPS_GAL }[key]; stopsEl.innerHTML = '';
  STOPS.forEach((s, i) => { const b = document.createElement('button'); b.type = 'button'; b.innerHTML = `<em>${i + 1}</em>${s.t}`; b.addEventListener('click', () => { stopPlay(); go(i); }); stopsEl.appendChild(b); });
  cur = 0; go(0, instant);
  if (!RENDER) try { history.replaceState(null, '', { res: '#resepsi', akad: '#akad', gal: '#galeri' }[key]); } catch (e) {}
}
function go(i, instant) {
  cur = (i + STOPS.length) % STOPS.length; const s = STOPS[cur];
  const p1 = new V3(...s.p), q1 = new V3(...s.t3);
  if (instant) { tween = null; camera.position.copy(p1); controls.target.copy(q1); }
  else tween = { t0: performance.now(), dur: matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 2200, p0: camera.position.clone(), q0: controls.target.clone(), p1, q1 };
  setCut(!!s.cut); if (instant) { cut = cutTarget; applyCut(); }
  if (curScene === 'res') setStall(s.stall || stallOpt); fovOverride = s.fov || null; resize();
  if (s.light) setMode(s.light);
  setFig(s.fig ? true : userFig);
  document.getElementById('cStep').textContent = `${cur + 1} / ${STOPS.length}`; document.getElementById('cZone').textContent = s.z;
  document.getElementById('cTitle').textContent = s.t; document.getElementById('cDesc').textContent = s.d;
  [...stopsEl.children].forEach((b, k) => b.setAttribute('aria-current', k === cur)); if (playing) schedule();
}
function setCut(on) { cutTarget = on ? 0.32 : 1; document.getElementById('bCut').setAttribute('aria-pressed', on); }
function applyCut() { wallsG.res.scale.y = wallsG.akad.scale.y = cut; ceilG.res.visible = ceilG.akad.visible = cut > 0.97; }
function setFig(on) { showFig = on; figG.res.visible = figG.akad.visible = figG.gal.visible = on; document.getElementById('bFig').setAttribute('aria-pressed', on); }
function schedule() { clearTimeout(playTimer); progT0 = performance.now(); playTimer = setTimeout(() => go(cur + 1), 9000); }
function stopPlay() { playing = false; clearTimeout(playTimer); document.getElementById('bPlay').setAttribute('aria-pressed', 'false'); document.getElementById('playTxt').textContent = 'Putar tur'; document.getElementById('playIcon').setAttribute('d', 'M4 2l10 6-10 6z'); document.getElementById('cProg').style.width = '0'; }
function startPlay() { playing = true; document.getElementById('bPlay').setAttribute('aria-pressed', 'true'); document.getElementById('playTxt').textContent = 'Jeda'; document.getElementById('playIcon').setAttribute('d', 'M3 2h4v12H3zm6 0h4v12H9z'); go(cur + 1); }
document.getElementById('sRes').onclick = () => { if (curScene !== 'res') { stopPlay(); setScene('res'); } };
document.getElementById('sAkad').onclick = () => { if (curScene !== 'akad') { stopPlay(); setScene('akad'); } };
document.getElementById('sGal').onclick = () => { if (curScene !== 'gal') { stopPlay(); setScene('gal'); } };
document.getElementById('mAmb').onclick = () => setMode('amb');
document.getElementById('mDoc').onclick = () => setMode('doc');
document.getElementById('oA').onclick = () => setStall('A');
document.getElementById('oB').onclick = () => setStall('B');
document.getElementById('bPlay').onclick = () => playing ? stopPlay() : startPlay();
document.getElementById('bNext').onclick = () => { stopPlay(); go(cur + 1); };
document.getElementById('bPrev').onclick = () => { stopPlay(); go(cur - 1); };
document.getElementById('bCut').onclick = () => setCut(cutTarget > 0.9);
document.getElementById('bFig').onclick = () => { userFig = !showFig; setFig(userFig); };
document.getElementById('bLbl').onclick = e => { showLbl = !showLbl; e.currentTarget.setAttribute('aria-pressed', showLbl); };
document.getElementById('bQ').onclick = () => { hiQ = !hiQ; applyQuality(); };
document.getElementById('bFull').onclick = () => { const el = document.documentElement; try { (document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen()).catch(() => {}); } catch (e) {} };
renderer.domElement.addEventListener('pointerdown', () => { tween = null; if (playing) stopPlay(); });
window.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { stopPlay(); go(cur + 1); } else if (e.key === 'ArrowLeft') { stopPlay(); go(cur - 1); } });

function resize() { const w = stage.clientWidth, h = stage.clientHeight; renderer.setSize(w, h); composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); camera.aspect = w / h; camera.fov = fovOverride || (w < h ? 68 : 50); camera.updateProjectionMatrix(); }
window.addEventListener('resize', resize);
setMode('amb'); applyQuality();
setScene(location.hash === '#akad' ? 'akad' : location.hash === '#galeri' ? 'gal' : 'res', true);
// pantulan cermin: tangkap ruang nyata sekali dari depan cermin (bukan HDR studio generik)
try { const rt = new THREE.WebGLCubeRenderTarget(512); const cc = new THREE.CubeCamera(0.1, 80, rt); cc.position.copy(MIRROR.pos); scene.add(cc); const vis = [G.res.visible, G.akad.visible, G.gal.visible]; G.akad.visible = G.gal.visible = false; G.res.visible = true; const bg0 = scene.background, fg0 = scene.fog; scene.background = BG_DEF; scene.fog = FOG_DEF; MIRROR.mesh.visible = false; cc.update(renderer, scene); MIRROR.mesh.visible = true; [G.res.visible, G.akad.visible, G.gal.visible] = vis; scene.background = bg0; scene.fog = fg0; M.mirror.envMap = pmrem.fromCubemap(rt.texture).texture; M.mirror.envMapIntensity = 0.5; M.mirror.roughness = 0.1; M.mirror.color.set(0x8E8780); M.mirror.needsUpdate = true; } catch (e) {}
msgEl.remove();

const tmp = new V3();
function frame(now) {
  if (!RENDER) requestAnimationFrame(frame);
  if (tween) { const k = Math.min(1, (now - tween.t0) / tween.dur), e = ease(k); camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.q0, tween.q1, e); if (k >= 1) tween = null; }
  const dt = Math.min(0.25, (now - lastT) / 1000); lastT = now;
  cut += (cutTarget - cut) * (1 - Math.exp(-dt * 3.5)); if (Math.abs(cutTarget - cut) < 0.004) cut = cutTarget; applyCut();
  controls.update();
  if (playing) document.getElementById('cProg').style.width = Math.min(100, (now - progT0) / 90) + '%';
  const w = stage.clientWidth, h = stage.clientHeight;
  LBL[curScene].forEach(L => { tmp.copy(L.v).project(camera); const vis = showLbl && !RENDER && tmp.z < 1 && tmp.z > -1 && Math.abs(tmp.x) < 1.05 && Math.abs(tmp.y) < 1.05; L.el.style.opacity = vis ? 1 : 0; if (vis) { L.el.style.left = ((tmp.x + 1) / 2 * w) + 'px'; L.el.style.top = ((1 - tmp.y) / 2 * h) + 'px'; } });
  composer.render(dt);
}
requestAnimationFrame(frame);
window.__tour = {
  go, setScene, setMode, setFig, setStall, scene, renderer, camera,
  get STOPS() { return STOPS; },
  snap(sceneKey, i, m, fig, opt) { setScene(sceneKey, true); go(i, true); if (m) setMode(m); if (opt) setStall(opt); if (fig !== undefined && fig !== null) setFig(!!fig); cut = cutTarget; applyCut(); controls.update(); composer.render(0.016); composer.render(0.016); return true; }
};
window.__ready = true;
