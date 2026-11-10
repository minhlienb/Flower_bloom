// ============================================================
// Flower — Main Script
// ============================================================

const N = 120, M = 28;
// Nở TỪ TRONG RA: lớp trong (cánh ngắn, s=0.30) bung trước và mở xong sớm (delayEnd 0.70);
// lớp ngoài (cánh dài, s=0.47) chỉ bắt đầu khi open > 0.45 rồi mở tới cuối -> hoa bung từ nhụy ra.
const LAYERS = [
  { n: 9, s: 0.47, off: 0, delay: 0.45, delayEnd: 1.00 },   // lớp ngoài
  { n: 9, s: 0.30, off: 20, delay: 0.00, delayEnd: 0.70 },  // lớp trong
];
// Toạ độ y-hướng-lên, gốc (0,0) = nhụy. Rìa cánh là đường S (Bézier bậc 3).
const Q = [[40, 370], [160, 510], [310, 270], [470, 430]];
const AXIS_ANG = Math.atan2(400, 255);
const TILT = { x: 0.55, y: 0.45, ease: 0.028 };  // nghiêng nhẹ hơn, lười hơn: cảm giác nặng, đắt tiền
// Chìm trong nước: tóc/cánh trôi lơ lửng, neo ở nhụy, đầu cánh tự do và trễ nhịp so với gốc.
// Năng lượng = độ lớn vận tốc cuộn đã làm mượt; hướng cuộn tạo dòng chảy kéo đầu cánh trôi ngược lại.
const FLOW = {
  restEnergy: 0.14,   // mức trôi chậm khi không cuộn
  velFull: 550,      // px/s tương ứng năng lượng tối đa (hạ xuống: cuộn vừa là dòng đã căng)
  attack: 10, decay: 1.4, kickDecay: 4.6,  // 1/s: dâng nhanh, tan chậm hơn -> dòng còn dư âm sau khi ngừng cuộn
  speedRest: 0.4, speedActive: 2.0,      // tốc độ thời gian của trường dòng chảy
  amp: 82,            // độ trôi tối đa của đầu cánh (đơn vị thế giới)
  scale: 140,         // kích thước "xoáy" của trường dòng chảy
  drag: 160,          // độ kéo của dòng cuộn lên đầu cánh (chính là "mức trôi" khi cuộn)
  radius: 300,
};
// Hệ số nhân cho xung cuộn trước khi vào khâu làm mượt. >1 = cùng một cú cuộn cho dòng mạnh hơn
// mà không phải sửa các hằng số ở trên; đặt 1 để quay lại đúng cảm giác cũ.
const SCROLL_GAIN = 1.35;
// P(-1) ≡ P1: intro KHÔNG còn pose riêng. Hoa khởi động đúng bằng trạng thái P1
// (camera fit, spin đã đủ 2 rad, open = 1) rồi để chính lò xo P_TWEEN + lag P_SPIN hạ về P0 —
// cùng một code path với lúc cuộn ngược từ cuối trang lên đầu, nên hai đường đi không thể lệch nhau.
// Lớp nền khi idle: sóng phấp phới chậm hơn trước. Khi cuộn, trọng số giảm dần để dòng nước chiếm ưu thế.
const WIND = { amp: 46, period: 3.4, fadeOnScroll: 0.6 };
// Quỹ đạo tự thân khi idle: hoa trôi rất chậm trên đường ellipse + "thở" scale — như vật thể lơ lửng.
const ORBIT = { rx: 26, ry: 18, px: 110, py: 137, rz: 0.05, pz: 170, breathe: 0.012, pb: 23 };
// ---------- Keyframe vị trí ----------
// P0: vị trí bắt đầu (keyframe ghi từ debug_tilt) — hoa cận cảnh, camera thấp nhìn ngang
const P0 = {
  rx: 0.1157, ry: -0.1849, rz: 0.05, py: 16.9, scale: 1,
  cam: { x: 40, y: -515, z: 650, lookX: -190, lookY: 140, fov: 37 },
};
// P1: vị trí mặc định của trang (lưu lại từ state hiện tại trong code) — orbit tự do, camera fit
const P1 = {
  rx: 0, ry: 0, rz: 0, py: 0, scale: 1,
  cam: { x: 0, y: 0, z: null, lookX: 0, lookY: 0, fov: 35 },  // z:null = dùng camera.z fit mặc định
};
// Responsive: bề ngang hoa (~534 world) và tỉ lệ lấp khung mong muốn.
// Màn ngang giữ nguyên bản PC; màn dọc zoom ra + kéo hoa về giữa để hoa nằm trọn trong khung.
const FRAME = {
  flowerW: 534,
  p0Fill: 0.85,          // P0 (màn đầu): hoa chiếm ~85% bề ngang
  p1Fill: 0.65,          // P1 (các màn sau): hoa chiếm ~65% bề ngang
  p0Dist: Math.hypot(P0.cam.x, P0.cam.y, P0.cam.z),
};
// P2: bảng màu "chìm sâu" — section 2->3 lerp toàn bộ shader về tông xanh #0051ff
const P2_COL = {
  ramp: ['#012187', '#0044ef', '#0051ff', '#6ea3ff', '#cfe2ff'],
  deep: '#031338',
  glow: { halo: '#0030b8', mid: '#0051ff', core: '#6ea3ff', streak: '#aecbff' },
};
// Bảng màu nền tối: mực tím trên giấy đen, chữ ngà. Đổi bảng bằng ?palette=warm trên URL.
const PALETTES = {
  cool: { ramp: ['#ff3d5a', '#c02ad0', '#8e56ea', '#c0adf4', '#b9c3ff'], deep: '#5a35c8',
          glow: { halo: '#6b3df5', mid: '#d930a0', core: '#ff4d5c', streak: '#ff5966' }, bg: ['#0d0d16', '#171226'], ink: '#eae5f3' },
  warm: { ramp: ['#f6aa0e', '#7c2262', '#a057a1', '#c694cb', '#f9dfe4'], deep: '#450724',
          glow: { halo: '#a057a1', mid: '#7c2262', core: '#f6aa0e', streak: '#fcd17b' }, bg: ['#150c11', '#251119'], ink: '#f2e7dc' },
};
// Ánh sáng có hướng: ảnh B sáng dần về phía trên-phải (~43° theo hồi quy độ sáng), tối dần về dưới-trái.
const LIGHT = { angle: 43, tone: 0.25, hi: 0.18, alpha: 0.2 };  // góc (độ); độ ngả tông đậm; độ sáng thêm; chênh độ đậm nét
const SPRING = { k: 6, c: 2.2 };  // lò xo hơi dưới tắt dần cho dòng cuộn: có chút quá đà rồi lắng lại
const P_TWEEN = { k: 3.0, c: 1.7 };  // "cảm giác nặng" cho tween P0->P1: nổi chậm (ω≈1.7rad/s), hơi quá đà ~12% rồi lắng, ζ≈0.49
const P_CSWEEP = { k: 3.6, c: 2.4 };  // lò xo nhẹ hơn cho lerp màu P1->P2 (ζ≈0.63): đổi muộn chút, hơi vượt rồi lắng — màu bản thân giá trị bị chặn [0,1]
const P_SPIN = { rad: 2, lag: 2.0, axis: 'z' };  // P0->P1 xoay tổng ~2 rad trên mặt màn hình; lag hàm mũ KHÔNG quá đà: tiến rồi trôi dần như quán tính, không lùi lại

// GLSL preprocessor directives (thay vì đặt trong shader file vì phụ thuộc vào constants JS)
const GLSL_FLOW = `#define R0 ${FLOW.radius.toFixed(1)}\n#define FLOW_SCALE ${FLOW.scale.toFixed(1)}\n#define DRAG ${FLOW.drag.toFixed(1)}\n#define WIND_AMP ${WIND.amp.toFixed(1)}\n#define WIND_PERIOD ${WIND.period.toFixed(1)}\n`;

// ---------- Load GLSL shaders from shaders.glsl ----------
async function loadShaders() {
  const resp = await fetch('shaders.glsl');
  if (!resp.ok) throw new Error(`Failed to load shaders.glsl: ${resp.status}`);
  const all = await resp.text();
  // Tách file theo marker "// ---------- KEY ----------" (file gộp 4 shader)
  const result = {};
  const re = /^[ \t]*\/\/[ \t]*-{3,}[ \t]*([A-Z][A-Z0-9_]*)/gm;
  const marks = [];
  let m;
  while ((m = re.exec(all)) !== null) marks.push({ key: m[1], start: all.indexOf('\n', m.index) + 1 });
  for (let i = 0; i < marks.length; i++) {
    const { key, start } = marks[i];
    if (key in result) continue;          // bỏ khai báo trùng (FRAG dùng lại tên marker?)
    result[key] = all.slice(start, i + 1 < marks.length ? marks[i + 1].start : undefined).trim();
  }
  // Prepend preprocessor directives to VERT shader
  result.VERT = GLSL_FLOW + result.VERT;
  return result;
}

// ---------- Cubic Bézier evaluation: bez(a, b, c, d, t) -> số (một toạ độ) ----------
function bez(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

// ---------- Smoothstep 0..1 (dịch chuyển mượt cho scroll-driven tween) ----------
function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// ---------- Bake helpers (một lần lúc load, thay vì tính lại mỗi frame) ----------
// Glow: bake 4 mask (halo/mid/core/streak) vào RGBA. Màu vẫn lấy từ uniform nên đổi palette P1->P2 vẫn mượt.
function bakeGlowTexture(size) {
  const data = new Uint8Array(size * size * 4);
  const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
  const sstep = (e0, e1, x) => {
    const t = clamp01((x - e0) / (e1 - e0));
    return t * t * (3 - 2 * t);
  };
  for (let y = 0; y < size; y++) {
    const py = (y + 0.5) / size * 2 - 1;
    for (let x = 0; x < size; x++) {
      const px = (x + 0.5) / size * 2 - 1;
      const r = Math.hypot(px, py), a = Math.atan2(py, px);
      const caus = 0.5 + 0.5 * Math.sin(px * 9) * Math.sin(py * 8);
      const halo = Math.exp(-r * r * 6) * (0.85 + 0.3 * caus);
      const mid = Math.exp(-r * r * 40);
      const core = Math.exp(-r * r * 220);
      const streak = Math.pow(Math.max(0, Math.cos(9 * a)), 28) * Math.exp(-r * 7) * sstep(0, 0.08, r);
      const edge = 1 - sstep(0.85, 1, r);      // viền mờ bake luôn vào mask -> runtime khỏi tính r
      const o = (y * size + x) * 4;
      data[o] = Math.round(clamp01(halo * edge) * 255);
      data[o + 1] = Math.round(clamp01(mid * edge) * 255);
      data[o + 2] = Math.round(clamp01(core * edge) * 255);
      data[o + 3] = Math.round(clamp01(streak * edge) * 255);
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

// Dust: bake đốm mềm vào sprite 1 lần — fragment chỉ còn 1 texture fetch thay vì smoothstep.
function bakeDustSprite(size) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5) / size - 0.5, dy = (y + 0.5) / size - 0.5;
      const d = Math.hypot(dx, dy);
      let t = Math.max(0, Math.min(1, (d - 0.5) / -0.5));
      t = t * t * (3 - 2 * t);
      const o = (y * size + x) * 4;
      data[o] = data[o + 1] = data[o + 2] = 255;
      data[o + 3] = Math.round(t * t * 255);
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

// Caustics: bake 1 tile (2.7 đơn vị sóng) bằng đúng mô hình tia khúc xạ, rồi runtime chỉ
// sample 1 lớp UV trôi. Mirrored wrap nên mép tile không lộ mối nối.
function bakeCausticTile(renderer, size, phase) {
  const rt = new THREE.WebGLRenderTarget(size, size, {
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat, type: THREE.UnsignedByteType,
    depthBuffer: false, stencilBuffer: false,
  });
  rt.texture.wrapS = rt.texture.wrapT = THREE.MirroredRepeatWrapping;
  rt.texture.generateMipmaps = false;

  const bakeScene = new THREE.Scene();
  const bakeCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const bakeMat = new THREE.ShaderMaterial({
    uniforms: { uPhase: { value: phase || 0 } },
    depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: [
      'uniform float uPhase;',
      'varying vec2 vUv;',
      'float H(vec2 p, float t) {',                    // trường sóng gốc: 3 sin chồng, lệch tần số
      '  p += vec2(sin(t * 0.10), cos(t * 0.13)) * 0.15;',
      '  return sin(p.x * 1.7 + t * 0.90) * 0.60',
      '       + sin(p.x * 2.3 - p.y * 1.9 + t * 0.62) * 0.25',
      '       + sin(p.y * 2.9 + t * 0.47) * 0.15;',
      '}',
      'vec3 refrDir(vec2 pos, float t, vec3 L) {',
      '  float e = 0.03;',
      '  float h  = H(pos, t);',
      '  float hx = H(pos + vec2(e, 0.0), t);',
      '  float hz = H(pos + vec2(0.0, e), t);',
      '  vec3 n = normalize(vec3(-(hx - h) / e, 1.0, -(hz - h) / e));',
      '  return refract(L, n, 0.78);',
      '}',
      'vec3 hit(vec2 pos, float t, vec3 L) {',
      '  vec3 ro = vec3(pos, 0.0);',
      '  vec3 rd = refrDir(pos, t, L);',
      '  float T = -(ro.y + 0.5) / min(rd.y, -0.2);',
      '  return ro + rd * T;',
      '}',
      'void main() {',
      '  vec2 p = vUv * 2.7;',
      '  float t = uPhase;',
      '  vec3 L = normalize(vec3(0.25 * sin(t * 0.21), -1.0, 0.18 * cos(t * 0.17)));',
      '  vec3 A = hit(p, t, L);',
      '  vec3 B = hit(p + vec2(0.004, 0.0), t, L);',
      '  vec3 C = hit(p + vec2(0.0, 0.004), t, L);',
      '  float area = 0.5 * length(cross(B - A, C - A));',
      '  float caust = clamp(3.2e-5 / (area + 6e-6), 0.0, 3.0) / 3.0;',  // lưu tuyến tính 0..1, runtime mới pow
      '  gl_FragColor = vec4(vec3(caust), 1.0);',
      '}',
    ].join('\n'),
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bakeMat);
  bakeScene.add(quad);

  const prevTarget = renderer.getRenderTarget();
  const prevViewport = new THREE.Vector4(); renderer.getViewport(prevViewport);
  renderer.setRenderTarget(rt);
  renderer.setViewport(0, 0, size, size);
  renderer.setScissorTest(false);
  renderer.render(bakeScene, bakeCam);
  renderer.setRenderTarget(prevTarget);
  renderer.setViewport(prevViewport);

  quad.geometry.dispose(); bakeMat.dispose();
  return rt;
}

// ---------- Create geometries ----------
function createGeometries(shaders) {
  const pos = new Float32Array(N * M * 3); // z = vị trí nét trong cánh (0..1)
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1), s = 2 * t - 1;
    const A = [bez(Q[0][0], Q[1][0], Q[2][0], Q[3][0], t), bez(Q[0][1], Q[1][1], Q[2][1], Q[3][1], t)];
    const len = Math.hypot(A[0], A[1]), d = [A[0] / len, A[1] / len], n = [d[1], -d[0]];
    const st = [n[0] * s * 6, n[1] * s * 6];
    const c1 = [0.30 * A[0] + n[0] * s * 63, 0.30 * A[1] + n[1] * s * 63];
    const c2 = [0.72 * A[0] + n[0] * s * 49, 0.72 * A[1] + n[1] * s * 49];
    for (let j = 0; j < M; j++) {
      const u = j / (M - 1), o = (i * M + j) * 3;
      pos[o] = bez(st[0], c1[0], c2[0], A[0], u);
      pos[o + 1] = bez(st[1], c1[1], c2[1], A[1], u);
      pos[o + 2] = t;
    }
  }
  const lineIdx = [], rimIdx = [], fillIdx = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < M - 1; j++) lineIdx.push(i * M + j, i * M + j + 1);
  for (let i = 0; i < N - 1; i++) {
    rimIdx.push(i * M + M - 1, (i + 1) * M + M - 1);
    for (let j = 0; j < M - 1; j++) {
      const a = i * M + j, b = a + 1, c = a + M, d = c + 1;
      fillIdx.push(a, b, c, b, d, c);
    }
  }
  const ax = [Math.cos(AXIS_ANG), Math.sin(AXIS_ANG)];
  let lmax = 0;
  for (let i = 0; i < N * M; i++) lmax = Math.max(lmax, pos[i * 3] * ax[0] + pos[i * 3 + 1] * ax[1]);
  const inst = [];
  LAYERS.forEach((L, li) => {
    for (let j = 0; j < L.n; j++) {
      const T = (L.off + j * 360 / L.n) * Math.PI / 180, mir = j % 2 ? -1 : 1;
      const eff = mir === 1 ? AXIS_ANG : Math.PI - AXIS_ANG;
      const bud = Math.PI / 2 + (j - (L.n - 1) / 2) * 0.05 - eff;
      let rot = T - eff;
      rot = bud + Math.atan2(Math.sin(rot - bud), Math.cos(rot - bud));
      inst.push({ rot, s: L.s, mir, seed: (j * 0.37 + li * 0.21) % 1, bud, delay: L.delay, delayEnd: L.delayEnd });
    }
  });
  const d1 = new Float32Array(inst.length * 4), d2 = new Float32Array(inst.length * 3);
  inst.forEach((p, k) => { d1.set([p.rot, p.s, p.mir, p.seed], k * 4); d2.set([p.bud, p.delay, p.delayEnd], k * 3); });
  // Bake phần tĩnh của vertex shader ra attribute (một lần, dùng chung cho lines/rim/fill):
  //   aPetal = (u dọc trục, u^1.25); aBake = (rho, rho^1.6, rho^1.4) tính từ dáng nghỉ.
  // iRot = cos/sin xoay + sc^1.6/sc^1.4 theo instance — bake theo uOpen hiện tại, setOpen() sẽ rebuild.
  const V = N * M;
  const aPetal = new Float32Array(V * 2), aBake = new Float32Array(V * 3);
  for (let k = 0; k < V; k++) {
    const x = pos[k * 3], y = pos[k * 3 + 1];
    const u = Math.max(0, Math.min(1.1, (x * ax[0] + y * ax[1]) / lmax));
    aPetal[k * 2] = u; aPetal[k * 2 + 1] = Math.pow(u, 1.25);
    const rho = Math.min(1.2, Math.hypot(x, y) / FLOW.radius);
    aBake[k * 3] = rho; aBake[k * 3 + 1] = Math.pow(rho, 1.6); aBake[k * 3 + 2] = Math.pow(rho, 1.4);
  }
  const aPetalAttr = new THREE.BufferAttribute(aPetal, 2);
  const aBakeAttr = new THREE.BufferAttribute(aBake, 3);
  const iRot = new Float32Array(inst.length * 4);
  const iRotAttr = new THREE.InstancedBufferAttribute(iRot, 4);
  const rebuildOpen = (open) => {
    inst.forEach((p, k) => {
      const a0 = p.delay, a1 = Math.max(a0 + 1e-3, p.delayEnd);   // open: [delay, delayEnd] -> 0..1
      const o = open >= 1 ? 1 : smoothstep(0, 1, Math.max(0, Math.min(1, (open - a0) / (a1 - a0))));
      const rot = p.bud + (p.rot - p.bud) * o;
      const sc = p.s * (0.35 + 0.65 * o);
      iRot[k * 4] = Math.cos(rot); iRot[k * 4 + 1] = Math.sin(rot);
      iRot[k * 4 + 2] = Math.pow(sc, 1.6); iRot[k * 4 + 3] = Math.pow(sc, 1.4);
    });
    iRotAttr.needsUpdate = true;
  };
  rebuildOpen(1);
  const make = (idx) => {
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('iData', new THREE.InstancedBufferAttribute(d1, 4));   // góc xoay, tỉ lệ, lật gương, hạt giống
    g.setAttribute('iData2', new THREE.InstancedBufferAttribute(d2, 3));  // góc khi còn nụ, delay bắt đầu, delay kết thúc nở
    g.setAttribute('aPetal', aPetalAttr);                                 // attribute tĩnh dùng chung buffer GPU
    g.setAttribute('aBake', aBakeAttr);
    g.setAttribute('iRot', iRotAttr);
    g.setIndex(idx);
    g.instanceCount = inst.length;
    return g;
  };
  // Đường bao (convex hull) của cả bông hoa ở tư thế nghỉ, mở hoàn toàn.
  // Dùng để neo khung hình P0 (bottom 5% / right -5%): chỉ cần điểm biên của mỗi cánh,
  // không cần toàn bộ lưới N×M, nên hull chỉ vài chục điểm.
  const hp = [];
  for (const p of inst) {
    const c = Math.cos(p.rot), s = Math.sin(p.rot);
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
      if (i !== 0 && i !== N - 1 && j !== 0 && j !== M - 1) continue;   // chỉ mép lưới
      const o = (i * M + j) * 3, x = pos[o] * p.mir, y = pos[o + 1];
      hp.push([(c * x - s * y) * p.s, (s * x + c * y) * p.s]);
    }
  }
  hp.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of hp) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = hp.length - 1; i >= 0; i--) {
    const q = hp[i];
    while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
    up.push(q);
  }
  const hull = lo.slice(0, -1).concat(up.slice(0, -1));
  return { lines: make(lineIdx), rim: make(rimIdx), fill: make(fillIdx), count: inst.length, pos, ax, lmax, hull, rebuildOpen };
}

// ---------- Pointer tracking ----------
function trackPointer(bounds, signal) {
  const state = { x: 0, y: 0 };
  const reset = () => { state.x = state.y = 0; };
  addEventListener('pointermove', (e) => {
    const r = bounds.getBoundingClientRect();
    state.x = (e.clientX - r.left) / r.width - 0.5;
    state.y = (e.clientY - r.top) / r.height - 0.5;
  }, { signal, passive: true });
  document.documentElement.addEventListener('pointerleave', reset, { signal });
  addEventListener('pointerup', reset, { signal, passive: true });       // touch: nhả tay -> hoa trở về tư thế nghỉ
  addEventListener('pointercancel', reset, { signal, passive: true });
  return state;
}

// ---------- Main scene init ----------
async function initScene(shaders) {
  const keepBuffer = /[?&]preserve=1/.test(location.search);   // chỉ bật khi cần chụp canvas bằng toDataURL
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: keepBuffer });
  // mặc định tắt preserveDrawingBuffer để tránh copy backbuffer mỗi frame (tăng FPS);
  // screenshot của trình duyệt/Playwright vẫn chụp được bình thường.
  // Giới hạn pixel ratio theo ngân sách fill-rate: 2K@2x (5120×2880) tụt còn ~45–60 FPS,
  // trong khi 2K@1.25x (3200×1800) vẫn 120 FPS và gần như không khác biệt với hoa mềm.
  const PR_BUDGET = 5.8e6;                            // ~5.8 triệu điểm ảnh canvas để giữ 120 FPS
  const dprCap = (w, h) => Math.max(1, Math.min(devicePixelRatio, 2, Math.sqrt(PR_BUDGET / Math.max(1, w * h))));
  renderer.setPixelRatio(dprCap(innerWidth, innerHeight));
  renderer.domElement.style.opacity = '0';   // chỉ hiện khi begin(): tránh nháy hoa ở P1 trước khi curtain mở
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(35, 1, 10, 4000);
  camera.position.set(P0.cam.x, P0.cam.y, P0.cam.z); camera.fov = P0.cam.fov;  // boot thẳng vào P0
  const G = createGeometries();
  const PAL = PALETTES[new URLSearchParams(location.search).get('palette')] || PALETTES.cool;
  const bgGrad = `radial-gradient(ellipse at center, ${PAL.bg[0]} 0%, ${PAL.bg[1]} 100%)`;
  document.documentElement.style.background = `${bgGrad} fixed`;
  const loaderEl = document.getElementById('loader');
  if (loaderEl) loaderEl.style.background = bgGrad;   // curtain trùng nền trang, không lộ đường nối khi wipe
  document.documentElement.style.setProperty('--ink', PAL.ink);   // chữ ngà theo bảng màu
  const pno = document.getElementById('pno');
  // #A chất thơ: tách tiêu đề theo ký tự + verse hiện khi section vào khung nhìn (IntersectionObserver, không pin)
  const secs = [...document.querySelectorAll('.sec')];
  secs.forEach(el => {
    const t = el.querySelector('.sectitle');
    if (t) t.innerHTML = [...t.textContent].map((c, i) =>
      `<span class="ch" style="transition-delay:${(i * 55 + (i % 3) * 90)}ms">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
  });
  let scrollMax = 0, secBounds = [];
  const measureLayout = () => {
    scrollMax = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    secBounds = secs.map((el) => [el.offsetTop, el.offsetTop + el.offsetHeight]);
  };
  const onScroll = () => {
    if (!pno) return;
    const i = scrollMax > 0 ? Math.max(0, Math.min(4, Math.round(scrollY / scrollMax * 4))) : 0;  // 5 trang: 01–05
    pno.textContent = '0' + (i + 1);
  };
  addEventListener('scroll', onScroll, { passive: true });
  const col = (h) => ({ value: new THREE.Color(h) });
  const U = {
    uOpen: { value: 1 }, uAmp: { value: FLOW.amp }, uEnergy: { value: 0 }, uPhase: { value: 0 }, uDrift: { value: 0 },
    uTime: { value: 0 }, uWind: { value: 1 }, uLmax: { value: G.lmax }, uAxis: { value: new THREE.Vector2(G.ax[0], G.ax[1]) },
    uGdir: { value: new THREE.Vector2(320, 410).normalize() },
    uLight: { value: new THREE.Vector2(Math.cos(LIGHT.angle * Math.PI / 180), Math.sin(LIGHT.angle * Math.PI / 180)) },
    uLightK: { value: new THREE.Vector3(LIGHT.tone, LIGHT.hi, LIGHT.alpha) },
    uC0: col(PAL.ramp[0]), uC1: col(PAL.ramp[1]), uC2: col(PAL.ramp[2]), uC3: col(PAL.ramp[3]), uC4: col(PAL.ramp[4]), uDeep: col(PAL.deep),
  };
  G.rebuildOpen(1);                                   // hoa mở sẵn ngay frame đầu: P(-1) ≡ P1
  // Chỉ bake lại iRot khi độ mở thật sự đổi (setOpen/debug): lúc chạy bình thường độ mở là hằng số
  // nên không upload attribute mỗi frame (tránh CPU/GPU work vô ích, không gây stutter).
  let bakedOpen = 1;
  const bakeOpen = (v, force = false) => {
    if (!force && Math.abs(v - bakedOpen) < 5e-4) return;
    bakedOpen = v; U.uOpen.value = v; G.rebuildOpen(v);
  };
  const mat = (alpha) => new THREE.ShaderMaterial({
    uniforms: Object.assign({ uAlpha: { value: alpha } }, U),
    vertexShader: shaders.VERT, fragmentShader: shaders.FRAG, transparent: true, depthWrite: false, depthTest: false,
  });
  const group = new THREE.Group(); scene.add(group);
  const glowTex = bakeGlowTexture(256);              // mask vầng nhụy bake 1 lần (halo/mid/core/streak)
  const glowU = { uEnergy: U.uEnergy, uPhase: U.uPhase, uGlowTex: { value: glowTex },
                  uHalo: col(PAL.glow.halo), uMid: col(PAL.glow.mid),
                  uCore: col(PAL.glow.core), uStreak: col(PAL.glow.streak) };
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.ShaderMaterial({
    uniforms: glowU,
    vertexShader: shaders.GLOW_VERT, fragmentShader: shaders.GLOW_FRAG, transparent: true, depthWrite: false, depthTest: false }));
  glow.renderOrder = 0; group.add(glow);
  // Caustics = quad screen-space. Tile caustic đã bake 1 lần lúc load; runtime chỉ sample 2 lớp UV trôi,
  // nhân uDay/uEnergy. Gắn thẳng camera, ghi thẳng clip-space nên không tốn matrix.
  const cauRT = bakeCausticTile(renderer, 1024, 8.5);
  const cauU = { uDay: { value: 0 }, uTime: U.uTime, uEnergy: U.uEnergy,
                 uRes: { value: new THREE.Vector2(1, 1) }, uTex: { value: cauRT.texture } };
  const caustics = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: cauU, transparent: true, depthWrite: false, depthTest: false,
    vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.9999, 1.0); }',
    // 1 lớp tile trôi chậm; mật độ sóng quy đổi như bản ray-marching cũ.
    fragmentShader: [
      'uniform sampler2D uTex;',
      'uniform float uTime, uDay, uEnergy;',
      'uniform vec2 uRes;',
      'void main(){',
      '  if (uDay < 0.01) { gl_FragColor = vec4(0.0); return; }',
      '  vec2 s = gl_FragCoord.xy / uRes.y * (1.35 / 2.7);',  // toạ độ tile: mật độ sóng đều mọi tỉ lệ màn hình
      '  vec2 a = s + vec2(0.22, 0.22) + vec2(uTime * 0.018, uTime * 0.012);',
      '  float c = texture2D(uTex, a).r;',
      '  float raw = min(c * 3.0, 3.0);',
      '  float caust = raw * sqrt(raw);',                          // raw^1.5, rẻ hơn pow
      '  gl_FragColor = vec4(vec3(0.0, 0.318, 1.0), caust * uDay * (0.10 + 0.10 * uEnergy));',
      '}',
    ].join('\n'),
  }));
  caustics.frustumCulled = false; caustics.renderOrder = -1;      // vẽ TRƯỚC hoa: gợn ở dưới cánh, cánh đè lên
  scene.add(camera); camera.add(caustics);                        // cần camera trong scene để child active
  // Cặp màu gốc -> xanh #0051ff để lerp theo scroll (section 2 -> 3)
  const pair = (from, to) => ({ a: new THREE.Color(from), b: new THREE.Color(to) });
  const PAL_T = {
    petals: PAL.ramp.map((h, i) => pair(h, P2_COL.ramp[i])),
    deep: pair(PAL.deep, P2_COL.deep),
    glow: ['halo', 'mid', 'core', 'streak'].map(k => pair(PAL.glow[k], P2_COL.glow[k])),
  };
  [[new THREE.Mesh(G.fill, mat(0.05)), 1], [new THREE.LineSegments(G.lines, mat(0.20)), 2], [new THREE.LineSegments(G.rim, mat(0.62)), 3]]
    .forEach(([o, ro]) => { o.frustumCulled = false; o.renderOrder = ro; group.add(o); });
  // BỤI NƯỚC XA — bề mặt WebGL độc lập (THREE.Points) nằm SAU hoa ở z âm: tầng depth thật duy nhất
  // còn thiếu trong danh sách. Không gắn vào group (group xoay/spin) — bụi là không gian nền, đứng yên
  // trong thế giới, chỉ trôi lên chậm theo scroll (DUST.driftK) và tan dần khi giấy trắng (sec5) lên.
  const DUST = { n: 80, spread: 1200, zMin: -520, zMax: -170, k: 5000, opacity: 0.55, driftK: 0.08 };
  const dustGeo = new THREE.BufferGeometry();
  {
    const dp = new Float32Array(DUST.n * 3), ds = new Float32Array(DUST.n);
    let sd = 20261025;                                  // LCG cố định: bố cục bụi giống nhau mỗi lần load
    const rnd = () => (sd = (sd * 1103515245 + 12345) % 2147483648) / 2147483648;
    for (let i = 0; i < DUST.n; i++) {
      dp[i * 3] = (rnd() - 0.5) * DUST.spread;
      dp[i * 3 + 1] = (rnd() - 0.5) * DUST.spread * 0.75;
      dp[i * 3 + 2] = DUST.zMin + rnd() * (DUST.zMax - DUST.zMin);
      ds[i] = 1.0 + rnd() * 1.2;                        // cỡ nốt: 1.0..2.2 -> 4..9px CSS tuỳ khoảng cách
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    dustGeo.setAttribute('aSize', new THREE.BufferAttribute(ds, 1));
  }
  const dustSprite = bakeDustSprite(64);              // đốm bụi bake 1 lần: fragment chỉ còn 1 texture fetch
  const dustU = { uTime: U.uTime, uDrift: { value: 0 }, uOpacity: { value: DUST.opacity },
                  uPixel: { value: 1 }, uK: { value: DUST.k }, uSpreadX: { value: 1 },
                  uColor: U.uC4, uSprite: { value: dustSprite } };   // màu bụi theo bảng màu hoa
  const dust = new THREE.Points(dustGeo, new THREE.ShaderMaterial({
    uniforms: dustU, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: [
      'uniform float uTime, uDrift, uPixel, uK, uSpreadX;',
      'attribute float aSize;',
      'varying float vA;',
      'void main(){',
      '  vec3 p = position;',
      '  p.x *= uSpreadX;',                                // màn hẹp: nén bề ngang để mật độ bụi không thưa
      '  float ph = aSize * 7.31;',                       // pha riêng từng nốt: không nốt nào trôi giống nốt nào
      '  float t = uTime * (0.10 + 0.06 * aSize);',
      '  p.x += sin(t + ph) * 16.0;',
      '  p.y += cos(t * 0.83 + ph) * 12.0 + uDrift;',     // + uDrift: trôi LÊN chậm hơn trang -> tầng xa
      '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
      '  gl_PointSize = clamp(aSize * uPixel * uK / max(1.0, -mv.z), 1.0, 20.0);',  // xa -> nhỏ (depth thật)
      '  gl_Position = projectionMatrix * mv;',
      '  vA = 0.35 + 0.65 * (0.5 + 0.5 * sin(t * 2.3 + ph * 2.0));',  // lấp lánh chậm, lệch pha
      '}',
    ].join('\n'),
    fragmentShader: [
      'uniform vec3 uColor; uniform float uOpacity; uniform sampler2D uSprite;',
      'varying float vA;',
      'void main(){',
      '  float a = texture2D(uSprite, gl_PointCoord).a;',  // đốm mềm đã bake vào sprite
      '  gl_FragColor = vec4(uColor, a * vA * uOpacity);',
      '}',
    ].join('\n'),
  }));
  dust.frustumCulled = false;
  dust.renderOrder = -0.5; scene.add(dust);   // vẽ trước cả glow: quầng sáng phủ lên bụi như sương

  const frameZ = (aspect) => Math.max(760, FRAME.flowerW / FRAME.p1Fill / aspect)
    / (2 * Math.tan(THREE.MathUtils.degToRad(17.5)));   // giữ chiều cao 760, nhưng đảm bảo đủ ngang cho hoa trên màn dọc

  // ---- Neo hoa ở section 01: mép dưới = bottom 5%, mép phải = right -5% (giống CSS) ----
  // Bbox hoa tính ở tư thế nghỉ (chưa cộng gió/drift) nên độ trôi vẫn nhìn thấy; chỉ khung nền là cố định.
  const P0_ANCHOR = { right: 1.1, bottom: -0.9 };    // NDC: 1.1 = 105% bề ngang, -0.9 = 95% chiều cao
  const p0Cam = new THREE.PerspectiveCamera(P0.cam.fov, 1, 10, 4000);
  const p0Rot = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(P0.rx, P0.ry, P0.rz, 'XYZ'));
  const p0V = new THREE.Vector3();
  const hullWorld = G.hull.map(([x, y]) => {
    const v = new THREE.Vector3(x, y, 0).applyMatrix4(p0Rot);
    v.y += P0.py;                                    // dáng nghỉ: group nâng P0.py
    return v;
  });
  const p0Look = { x: 0, y: 0 };                     // lookAt đã giải cho P0 (thay P0.cam.lookX/lookY)
  const solveP0Look = (aspect) => {
    const p0k = Math.max(1, (FRAME.flowerW / FRAME.p0Fill)
      / (2 * Math.tan(THREE.MathUtils.degToRad(P0.cam.fov / 2)) * aspect) / FRAME.p0Dist);
    const cx = P0.cam.x * p0k, cy = P0.cam.y * p0k, cz = P0.cam.z * p0k;
    p0Cam.aspect = aspect; p0Cam.fov = P0.cam.fov;
    p0Cam.position.set(cx, cy, cz); p0Cam.updateProjectionMatrix();
    const dist = Math.hypot(cx, cy - P0.py, cz);
    const halfH = dist * Math.tan(THREE.MathUtils.degToRad(P0.cam.fov / 2)), halfW = halfH * aspect;
    let lx = P0.cam.lookX * p0k, ly = P0.cam.lookY * p0k;   // xuất phát từ khung P0 cũ
    for (let it = 0; it < 6; it++) {                        // 2 mép cần khớp -> lặp vài lần là hội tụ
      p0Cam.lookAt(lx, ly, 0); p0Cam.updateMatrixWorld(true);
      let maxX = -Infinity, minY = Infinity;
      for (const v of hullWorld) {
        p0V.copy(v).project(p0Cam);
        if (p0V.x > maxX) maxX = p0V.x;
        if (p0V.y < minY) minY = p0V.y;
      }
      const ex = P0_ANCHOR.right - maxX, ey = P0_ANCHOR.bottom - minY;
      if (Math.abs(ex) < 5e-4 && Math.abs(ey) < 5e-4) break;
      lx -= ex * halfW; ly -= ey * halfH;                  // dịch lookAt ngược chiều với ảnh
    }
    p0Look.x = lx; p0Look.y = ly;
  };

  const fit = () => {
    const w = innerWidth, h = innerHeight;
    renderer.setPixelRatio(dprCap(w, h));             // giữ ngân sách fill-rate khi đổi kích thước / màn retina
    renderer.setSize(w, h);
    camera.aspect = w / h; camera.position.z = frameZ(camera.aspect);
    camera.updateProjectionMatrix();
    solveP0Look(camera.aspect);                       // neo lại hoa khi đổi tỉ lệ màn hình
    const pr = renderer.getPixelRatio();              // gl_FragCoord tính theo pixel thiết bị, không phải CSS px
    cauU.uRes.value.set(w * pr, h * pr);              // caustic giữ đúng mật độ sóng trên màn retina
    dustU.uPixel.value = pr;                          // cỡ nốt bụi giữ đúng px vật lý trên màn retina
    dustU.uSpreadX.value = Math.max(0.45, Math.min(1, (w / h) / 1.45));  // portrait: giữ mật độ bụi như desktop
    measureLayout();                                  // cache scrollMax + secBounds khi resize -> tránh đọc layout mỗi frame
    onScroll();
  };
  const ac = new AbortController(), { signal } = ac;       // gỡ mọi listener bằng một lệnh abort()
  addEventListener('resize', fit, { signal }); fit();
  if (window.visualViewport) visualViewport.addEventListener('resize', fit, { signal });  // iOS: thanh địa chỉ co giãn
  // CỐ Ý bỏ qua prefers-reduced-motion: đây là trang nghệ thuật, chuyển động chính là nội dung.
  const pointer = trackPointer(renderer.domElement, signal);

  // Cuộn -> xung có dấu. ScrollTrigger chỉ báo vận tốc; làm mượt và lò xo nằm ở vòng lặp bên dưới.
  let kick = 0, trigger = null;
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    trigger = ScrollTrigger.create({
      trigger: document.querySelector('main') || document.body, start: 'top top', end: 'bottom bottom',
      onUpdate: (self) => {
        const v = Math.max(-1, Math.min(1, (self.getVelocity() / FLOW.velFull) * SCROLL_GAIN));
        if (Math.abs(v) > Math.abs(kick)) kick = v;
      },
    });
  } else console.warn('Thiếu GSAP/ScrollTrigger: hoa chỉ trôi chậm, không phản ứng với cuộn.');
  // Lenis: cuộn mượt kiểu dây dưa — scrollY thật vẫn là nguồn sự thật nên lò xo camera/spin giữ nguyên,
  // chỉ thêm lớp quán tính mềm phía trước. rAF của lenis chạy trong ticker của GSAP để cùng nhịp.
  let lenis = null;
  const ua = navigator.userAgent;
  const isSafari = /^((?!chrome|chromium|android|firefox|edge).)*safari/i.test(ua)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);      // iPadOS giả desktop
  if (window.Lenis && !isSafari) {
    lenis = new Lenis({ duration: 1.25, wheelMultiplier: 0.9, touchMultiplier: 1.6, smoothWheel: true });
    if (window.ScrollTrigger) lenis.on('scroll', ScrollTrigger.update);
    if (window.gsap) {
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }
    if (document.documentElement.classList.contains('is-loading')) lenis.stop();  // loader còn -> chưa cuộn
  }

  const rest = FLOW.restEnergy;
  let energy = 0, phase = 0, drift = 0, driftVel = 0;
  let scrollBlend = 1, scrollVel = 0;   // 0 = P0, 1 = P1. Load ra ở 1 -> lò xo tự hạ về P0 (đúng đường P1->P0)
  let tiltX = 0, tiltY = 0;             // base nghiêng (chuột + offset P0) — trước khi cộng spin
  let spinProg = 1;                     // tiến trình xoay riêng: lag mũ, không quá đà (quán tính không lùi)
  let colorBlend = 0, colorVel = 0;     // lò xo cho lerp màu P1->P2: đổi chậm, chút quá đà rồi lắng
  // TEST branch: ?skew=off  -> tắt hẳn (không ghi style nào)
  //              ?skew=raw  -> y như bản cũ (toFixed(3), ghi mỗi khi chuỗi đổi)
  //              ?skew=0.1  -> (mặc định) lượng tử 0.1°: chỉ ghi khi lệch >= 0.1°
  const SKEW_Q = new URLSearchParams(location.search).get('skew');
  const SKEW_OFF = SKEW_Q === 'off';
  const SKEW_STEP = (SKEW_Q === 'raw' || SKEW_OFF) ? 0 : (parseFloat(SKEW_Q) || 0.1);
  let skewWrites = 0;                              // số lần ghi style.transform — để so chi phí 2 chế độ
  let skew = 0, lastY = scrollY, lastSkewT = '';  // A3: chữ nghiêng theo vận tốc cuộn, lắng mượt
  let vinKey = '';                      // .vin theo tâm section: đổi chỉ khi trạng thái đổi (không churn style)
  let dayBlend = 0, dayOn = false;      // lật trắng sec4->sec5 (lag mũ, không quá đà); caustics = quad shader (cauU.uDay)
  const daylight = document.querySelector('.daylight');
  const clock = new THREE.Clock();
  // ---- Hạ cánh P(-1) -> P0: bắt đầu đúng lúc curtain mở ----
  // P(-1) ≡ P1, nên "intro" chỉ còn là: giữ nguyên trạng thái P1 tới lúc reveal, rồi thả lò xo
  // P_TWEEN + lag P_SPIN hạ về P0 — y hệt lúc cuộn ngược từ cuối trang lên đầu.
  let begun = false, arrived = false;
  const begin = () => {
    if (begun) return;
    begun = true;
    scrollBlend = 1; scrollVel = 0; spinProg = 1;        // chốt đúng trạng thái P1 tại thời điểm reveal
    arrWall = performance.now();
    arrRec = true; arrI = 0; arrCount = 0; arrMaxMs = 0; arrMaxAt = 0;   // đo frame time riêng của lúc hạ cánh
    document.documentElement.classList.remove('is-loading');
    renderer.domElement.style.opacity = '1';            // canvas hiện dần cùng lúc curtain mở
    lenis?.start();
    requestAnimationFrame(() => trigger?.refresh?.());   // ScrollTrigger đo lại sau khi mở khoá cuộn
  };
  let firstFrameResolve, firstFrame = false;
  const ready = new Promise((res) => { firstFrameResolve = res; });
  let p0kCur = 1;

  // ---- Debug stats (GIỮ LẠI): frame time + rect element, thay cho việc quay video ----
  // Dùng: window.flower.stats()  |  mở ?stats=1 để xem HUD góc dưới-trái.
  // stats(false) là bản nhẹ cho HUD: không đọc layout/rect -> chính HUD không tạo jank khi debug.
  const FT_N = 240, ftBuf = new Float32Array(FT_N);
  let ftI = 0, ftCount = 0, ftLast = 0, hudLast = 0;
  const ARR_N = 900, arrBuf = new Float32Array(ARR_N);   // frame time RIÊNG của đoạn hạ cánh P1->P0 (đo đúng lúc reveal)
  let arrI = 0, arrCount = 0, arrRec = false;
  let arrWall = 0, arrMaxMs = 0, arrMaxAt = 0;         // thời điểm frame tệ nhất lúc hạ cánh (ms kể từ reveal)
  const pctl = (arr, p) => arr.length ? arr[Math.max(0, Math.min(arr.length - 1, Math.round(p * (arr.length - 1))))] : 0;
  const summarize = (buf, count, cap) => {
    const n = Math.min(count, cap);
    const arr = Array.from(buf.subarray(0, n)).sort((a, b) => a - b);
    const avg = n ? arr.reduce((a, b) => a + b, 0) / n : 0;
    return {
      n, fps: avg ? +(1000 / avg).toFixed(1) : 0,
      avg: +avg.toFixed(2), p50: +pctl(arr, 0.5).toFixed(2),
      p95: +pctl(arr, 0.95).toFixed(2), p99: +pctl(arr, 0.99).toFixed(2), max: +pctl(arr, 1).toFixed(2),
      jank: n ? +(arr.filter((v) => v > 25).length / n).toFixed(3) : 0,      // >25ms: rớt >=3 nhịp 120Hz
      drop: n ? +(arr.filter((v) => v > 16.7).length / n).toFixed(3) : 0,    // >16.7ms: rớt >=2 nhịp 120Hz
    };
  };
  const ftPush = (ms) => {
    ftBuf[ftI] = ms; ftI = (ftI + 1) % FT_N; if (ftCount < FT_N) ftCount++;
    if (arrRec) {
      arrBuf[arrI] = ms; arrI = (arrI + 1) % ARR_N; if (arrCount < ARR_N) arrCount++;
      if (ms > arrMaxMs) { arrMaxMs = ms; arrMaxAt = Math.round(performance.now() - arrWall); }
    }
  };
  const rectOf = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
  };
  const ndcBounds = () => {
    let maxX = -Infinity, minY = Infinity;
    for (const v of hullWorld) {
      p0V.copy(v).project(camera);
      if (p0V.x > maxX) maxX = p0V.x;
      if (p0V.y < minY) minY = p0V.y;
    }
    return { right: +maxX.toFixed(4), bottom: +minY.toFixed(4) };
  };
  const stats = (full = true) => {
    const ft = summarize(ftBuf, ftCount, FT_N);
    const arrt = summarize(arrBuf, arrCount, ARR_N);
    return {
      frames: ft.n, fps: ft.fps, avg: ft.avg, p50: ft.p50, p95: ft.p95, p99: ft.p99, max: ft.max,
      jank: ft.jank, drop: ft.drop,
      arrivalFt: { ...arrt, maxAt: arrMaxAt },            // maxAt: frame tệ nhất rơi vào lúc nào (ms từ reveal)
      arrival: { begun, arrived, spin: +spinProg.toFixed(3), open: +U.uOpen.value.toFixed(3) },
      skew: { writes: skewWrites, step: SKEW_OFF ? 0 : SKEW_STEP, off: SKEW_OFF },
      scroll: { y: Math.round(scrollY), max: Math.round(scrollMax), blend: +scrollBlend.toFixed(3) },
      vp: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio },
      ...(full ? {
        flower: ndcBounds(),
        rects: { loader: rectOf('#loader'), mark: rectOf('.loader-mark'), title: rectOf('.sec:first-child .sectitle'), verse: rectOf('.sec:first-child .verse'), canvas: rectOf('canvas') },
      } : null),
    };
  };
  const hud = /[?&]stats=1/.test(location.search) ? (() => {
    const d = document.createElement('div');
    d.id = 'stats-hud';
    d.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:12;padding:8px 10px;border-radius:6px;pointer-events:none;white-space:pre;font:400 11px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;color:#8ff;background:rgba(8,10,20,.72);text-shadow:0 1px 0 #000';
    document.body.appendChild(d);
    return d;
  })() : null;
  renderer.setAnimationLoop(() => {
    const nowMs = performance.now();
    if (ftLast) ftPush(nowMs - ftLast);              // frame time thật (không bị clamp như dt mô phỏng)
    ftLast = nowMs;
    const dt = Math.min(clock.getDelta(), 0.05);
    const target = kick, mag = Math.abs(target); kick *= Math.exp(-dt * FLOW.kickDecay);
    energy += (mag - energy) * (1 - Math.exp(-dt * (mag > energy ? FLOW.attack : FLOW.decay)));
    driftVel += (SPRING.k * (target - drift) - SPRING.c * driftVel) * dt; drift += driftVel * dt;
    phase += dt * (FLOW.speedRest + FLOW.speedActive * energy);  // cộng dồn thời gian để dòng chảy không giật khi đổi năng lượng
    U.uEnergy.value = rest + (1 - rest) * energy; U.uPhase.value = phase; U.uDrift.value = drift;
    U.uTime.value = clock.elapsedTime;
    U.uWind.value = 1 - WIND.fadeOnScroll * energy;
    // Quỹ đạo tự thân: trôi ellipse rất chậm, nghiêng nhẹ, "thở" theo scale — vật thể lơ lửng, không bao giờ đứng yên.
    // (chạy cả khi OS bật reduce-motion — bypass có chủ đích)
    // Lerp P0 -> P1 theo scroll: đích = smoothstep trên scroll, nhưng s chạy qua lò xo
    // (P_TWEEN) để có cảm giác nặng: khởi tốc chậm, hơi vượt quá đà rồi lắng dần.
    const smax = scrollMax;                          // cache từ measureLayout(): không đọc scrollHeight mỗi frame (forced layout)
    const f = smax > 0 ? Math.max(0, Math.min(1, scrollY / smax)) : 0;
    // A3: chữ nghiêng theo dòng chảy — skewY phản ứng vận tốc cuộn thật (px/s), lắng mượt bằng lag mũ
    if (!SKEW_OFF && dt > 0) {
      const vel = (scrollY - lastY) / dt; lastY = scrollY;
      const tgt = Math.max(-4.5, Math.min(4.5, vel * 0.0028));
      skew += (tgt - skew) * (1 - Math.exp(-dt * 7));
      // lượng tử trước khi so chuỗi: 0.1° là ngưỡng mắt không phân biệt được ở cỡ chữ này
      const qv = SKEW_STEP ? Math.round(skew / SKEW_STEP) * SKEW_STEP : skew;
      const t = Math.abs(qv) < 0.02 ? '' : 'skewY(' + qv.toFixed(SKEW_STEP ? 1 : 3) + 'deg)';
      if (t !== lastSkewT) { secs.forEach(el => el.style.transform = t); lastSkewT = t; skewWrites++; }
    } else if (SKEW_OFF) { lastY = scrollY; }
    // Verse/tiêu đề hiện khi section trôi qua giữa khung nhìn (tâm viewport trong biên của section)
    const vc = scrollY + innerHeight * 0.5;
    const key = secs.map((el, i) => (secBounds[i] && secBounds[i][0] <= vc && vc < secBounds[i][1]) ? '1' : '0').join('');
    if (key !== vinKey) { vinKey = key; secs.forEach((el, i) => el.classList.toggle('vin', key.charAt(i) === '1')); }
    // Section 4 -> section 5: nền lật trắng như giấy (f 0.75 -> 1 — ranh giới sec5 thu hẹp dần) — lag mũ k=2, không quá đà;
    // caustics "lặn gợn" theo cùng độ trắng; qua mốc nội bộ 0.55 chữ lật sang mực tối giữ tương phản trên nền trắng
    const dayT = smoothstep(0.75, 1, f);
    dayBlend += (dayT - dayBlend) * (1 - Math.exp(-dt * 2));
    // Chỉ chạm style của .daylight khi thực sự cần: lúc dayBlend=0 thì display:none -> bớt 1 layer composite mỗi frame.
    if (daylight && (dayBlend > 0.001 || daylight.style.display !== 'none')) {
      const on = dayBlend > 0.001;
      daylight.style.display = on ? '' : 'none';
      if (on) daylight.style.opacity = (dayBlend * 0.97).toFixed(3);
    }
    cauU.uDay.value = dayBlend;        // gợn nắng lặn theo cùng độ trắng — alpha 0 ngoài sec5 nên GPU gần như bỏ qua
    caustics.visible = dayBlend > 0.01; // ngoài sec5: bỏ hẳn full-screen pass thay vì rasterize rồi discard
    dustU.uDrift.value = scrollY * DUST.driftK;          // bụi trôi chậm hơn trang -> tầng xa
    dustU.uOpacity.value = DUST.opacity * (1 - dayBlend);
    dust.visible = dayBlend < 0.99;    // giấy trắng phủ hết -> thôi vẽ 80 nốt (0 work)
    const day = dayBlend > 0.55;
    if (day !== dayOn) {
      dayOn = day;
      document.documentElement.classList.toggle('day', day);
      document.documentElement.style.setProperty('--ink', day ? '#14151f' : PAL.ink);
    }
    // Chưa mở rèm thì đích = 1 (giữ nguyên P1) -> load ra đúng trạng thái P1, sau reveal lò xo mới hạ về P0.
    const sTarget = begun ? smoothstep(0, 1 / 4, f) : 1;   // 0 = P0, 1 = P1 (hết section 2 = f 1/4 — layout 5 section)
    scrollVel += (P_TWEEN.k * (sTarget - scrollBlend) - P_TWEEN.c * scrollVel) * dt;
    scrollBlend += scrollVel * dt;
    // lắng hẳn khi gần đích để không nhún nhảy vô hạn quanh 0/1
    if (Math.abs(sTarget - scrollBlend) < 0.0008 && Math.abs(scrollVel) < 0.002) { scrollBlend = sTarget; scrollVel = 0; }
    if (begun && !arrived && sTarget === 0 && scrollBlend === 0 && scrollVel === 0) { arrived = true; arrRec = false; }  // hạ cánh xong: ngừng đo
    const s = 1 - scrollBlend;
    // Màu: section 2->3 (f: 1/3 -> 1/2) lerp toàn bộ bảng màu shader về #0051ff.
    // g chạy qua lò xo P_CSWEEP: đổi muộn một nhịp, hơi vượt rồi lắng — cảm giác "chìm đậm" nặng khi hai đầu khôi phục
    const gTarget = smoothstep(1 / 4, 1 / 2, f);   // section 2->3 (f 0.25->0.5 — layout 5 section): lerp màu về #0051ff
    colorVel += (P_CSWEEP.k * (gTarget - colorBlend) - P_CSWEEP.c * colorVel) * dt;
    colorBlend += colorVel * dt;
    if (Math.abs(gTarget - colorBlend) < 0.0008 && Math.abs(colorVel) < 0.002) { colorBlend = gTarget; colorVel = 0; }
    const g = Math.max(0, Math.min(1, colorBlend));
    if (g > 0) {
      PAL_T.petals.forEach((p, i) => U['uC' + i].value.copy(p.a).lerp(p.b, g));
      U.uDeep.value.copy(PAL_T.deep.a).lerp(PAL_T.deep.b, g);
      ['halo', 'mid', 'core', 'streak'].forEach((k, i) => glowU['u' + k[0].toUpperCase() + k.slice(1)].value.copy(PAL_T.glow[i].a).lerp(PAL_T.glow[i].b, g));
    }
    // P0 responsive: màn hẹp zoom ra theo bề ngang hoa (dùng chung cho cả hạ cánh lẫn camera)
    p0kCur = Math.max(1, (FRAME.flowerW / FRAME.p0Fill)
      / (2 * Math.tan(THREE.MathUtils.degToRad(P0.cam.fov / 2)) * camera.aspect) / FRAME.p0Dist);
    {
      const t = clock.elapsedTime, TAU = Math.PI * 2;
      group.position.x = Math.sin(t * TAU / ORBIT.px) * ORBIT.rx;
      group.position.y = Math.cos(t * TAU / ORBIT.py) * ORBIT.ry + (P0.py - P1.py) * s;
      group.rotation.z = Math.sin(t * TAU / ORBIT.pz) * ORBIT.rz + (P0.rz - P1.rz) * s
                       + (P_SPIN.axis === 'z' ? P_SPIN.rad * spinProg : 0);
      group.scale.setScalar((1 + ORBIT.breathe * Math.sin(t * TAU / ORBIT.pb)) * (1 + (P0.scale - P1.scale) * s));
    }
    // nghiêng chuột: cộng offset của P0 vào đích lerp, offset tàn dần khi cuộn về P1
    tiltY += (pointer.x * TILT.y + (P0.ry - P1.ry) * s - tiltY) * TILT.ease;
    tiltX += (pointer.y * TILT.x + (P0.rx - P1.rx) * s - tiltX) * TILT.ease;
    // Xoay theo tiến trình RIÊNG (lag mũ 1 bậc, k = P_SPIN.lag): không quá đà, không lùi —
    // đích đến chậm dần dần như quán tính ma sát. Cuộn ngược vẫn xoay ngược về P0 cho đối xứng.
    spinProg += (sTarget - spinProg) * (1 - Math.exp(-dt * P_SPIN.lag));
    if (P_SPIN.axis === 'y') { group.rotation.y = tiltY + P_SPIN.rad * spinProg; group.rotation.x = tiltX; }
    else if (P_SPIN.axis === 'x') { group.rotation.x = tiltX + P_SPIN.rad * spinProg; group.rotation.y = tiltY; }
    else { group.rotation.x = tiltX; group.rotation.y = tiltY; }
    // camera: P0 (cận cảnh, neo góc dưới-phải) -> P1 (mặc định fit)
    const camDefZ = frameZ(camera.aspect);
    // p0kCur: màn hẹp zoom ra theo bề ngang hoa
    camera.position.x = THREE.MathUtils.lerp(P0.cam.x * p0kCur, P1.cam.x, 1 - s);
    camera.position.y = THREE.MathUtils.lerp(P0.cam.y * p0kCur, P1.cam.y, 1 - s);
    camera.position.z = THREE.MathUtils.lerp(P0.cam.z * p0kCur, P1.cam.z ?? camDefZ, 1 - s);
    const fovNow = THREE.MathUtils.lerp(P0.cam.fov, P1.cam.fov, 1 - s);
    if (fovNow !== camera.fov) { camera.fov = fovNow; camera.updateProjectionMatrix(); }   // tránh cập nhật matrix mỗi frame khi fov không đổi
    camera.lookAt(THREE.MathUtils.lerp(p0Look.x, P1.cam.lookX, 1 - s), THREE.MathUtils.lerp(p0Look.y, P1.cam.lookY, 1 - s), 0);
    renderer.render(scene, camera);
    if (!firstFrame) { firstFrame = true; firstFrameResolve(); }   // frame đầu đã vẽ -> loader được phép đóng
    if (hud && nowMs - hudLast > 400) {
      hudLast = nowMs;
      const s = stats(false);                          // bản nhẹ: không đọc layout -> HUD không tự gây jank
      hud.textContent = `fps ${s.fps}  ft ${s.avg}  p95 ${s.p95}  p99 ${s.p99}  max ${s.max}  jank ${(s.jank * 100).toFixed(0)}%  skew ${s.skew.writes}w/${s.skew.step || 'off'}\n`
        + `arrival ft p95 ${s.arrivalFt.p95}  max ${s.arrivalFt.max}@${(s.arrivalFt.maxAt / 1000).toFixed(1)}s  n ${s.arrivalFt.n}\n`
        + `arrival begun ${s.arrival.begun ? 'y' : 'n'} settled ${s.arrival.arrived ? 'y' : 'n'} spin ${s.arrival.spin} open ${s.arrival.open}\n`
        + `scroll ${s.scroll.y}/${s.scroll.max}  blend ${s.scroll.blend}  ${s.vp.w}x${s.vp.h}`;
    }
  });
  const dispose = () => {
    ac.abort(); trigger?.kill(); renderer.setAnimationLoop(null);
    group.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
    dust.geometry.dispose(); dust.material.dispose();     // bụi nằm ngoài group — dọn riêng
    glowTex.dispose(); dustSprite.dispose(); cauRT.dispose();   // texture/RT bake
    renderer.dispose(); renderer.domElement.remove();
  };
  window.flower = { U, glowU, dustU, cauU, renderer, cauRT, glowTex, dustSprite, camera, group, p0Look,
    setOpen: (v) => bakeOpen(v, true), dispose,
    // Đo NDC mép hoa (dùng hull dáng nghỉ) — kiểm tra neo bottom 5% / right -5%
    ndcBounds,
    // Debug (giữ lại): frame time + vị trí element + trạng thái hạ cánh/scroll
    stats,
    getState: () => ({ s: +scrollBlend.toFixed(3), g: +colorBlend.toFixed(3), cam: camera.position.toArray().map(v => +v.toFixed(1)), fov: camera.fov, rot: [group.rotation.x, group.rotation.y, group.rotation.z].map(v => +v.toFixed(3)), spin: +spinProg.toFixed(3), open: +U.uOpen.value.toFixed(3), begun, arrived }) };
  return { ready, begin, measure: measureLayout };
}

// ---------- Boot ----------
(async function boot() {
  const prog = (v) => window.__load && window.__load(v);
  const MIN_SHOW = 900, FILL = 420;                  // hiện tối thiểu 0.9s; 0.42s cuối để thanh chạy hết
  const t0 = window.__loadT0 || performance.now();
  const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(r, ms))]);
  // Chờ tài nguyên thật sự xong (load: libs/CSS + fonts: woff2), không chỉ frame đầu của hoa.
  // => loader không còn tắt sớm khi mạng còn đang tải nốt.
  const loadDone = document.readyState === 'complete' ? Promise.resolve()
    : new Promise((r) => addEventListener('load', r, { once: true }));
  let app = null;
  try {
    prog(52);                                        // 4 script CDN đã chạy xong, main.js bắt đầu
    const shaders = await loadShaders();
    prog(72);                                        // shaders.glsl xong
    app = await initScene(shaders);
    prog(90);                                        // cảnh đã dựng: bake xong, texture sẵn sàng
    await Promise.all([
      withTimeout(app.ready, 4000),                  // frame đầu đã vẽ
      withTimeout(loadDone, 30000),                  // toàn bộ tài nguyên (libs, CSS)
    ]);
    // CSS (kèm @font-face) chỉ đăng ký font SAU khi load -> chờ woff2 thật sự ở đây.
    await withTimeout((document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve(), 15000);
    app?.measure?.();                                  // đo lại section sau khi font đổi (trước khi kéo rèm)
  } catch (err) {
    console.error('Không khả thi:', err);            // vẫn phải mở loader, không treo trang
  }
  prog(100);
  // Loader đã tự mở trước khi app sẵn sàng: thả lò xo P1->P0 ngay khi frame đầu vẽ xong (canvas còn ẩn -> không nháy)
  if (window.__revealMode === 'fallback') { if (app) app.begin(); return; }
  // Thanh chỉ chạy 100 ở đoạn cuối: tránh cảnh đứng ở 99% suốt thời gian chờ min-display.
  const elapsed = performance.now() - t0;
  await new Promise((r) => setTimeout(r, Math.max(0, MIN_SHOW - FILL - elapsed)));
  prog(100);
  await new Promise((r) => setTimeout(r, FILL));
  if (window.__revealLoader) window.__revealLoader(app && app.begin);
  else if (app) app.begin();                         // phòng khi HTML cũ không có loader
})();
