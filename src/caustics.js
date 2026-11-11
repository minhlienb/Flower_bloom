// Caustics — bake tile + quad screen-space gắn camera. Tách từ main.js, hành vi giữ nguyên.
// Tile caustic đã bake 1 lần lúc load; runtime chỉ sample 2 lớp UV trôi, nhân uDay/uEnergy.
// Gắn thẳng camera, ghi thẳng clip-space nên không tốn matrix.

// Caustics: bake 1 tile (2.7 đơn vị sóng) bằng đúng mô hình tia khúc xạ, rồi runtime chỉ
// sample 1 lớp UV trôi. Mirrored wrap nên mép tile không lộ mối nối.
export function bakeCausticTile(renderer, size, phase) {
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

  // Viewport của RenderTarget tính bằng DEVICE px. Đừng dùng renderer.setViewport(size, size): three nhân
  // giá trị đó với pixelRatio, nên khi pixelRatio < 1 (màn > 1200p) bake chỉ phủ ~size*pr -> phần còn lại
  // của tile là đen, mép đen đó hiện thành dải/vệt cứng trên nền giấy. Đặt thẳng rt.viewport.
  rt.viewport.set(0, 0, size, size);
  rt.scissor.set(0, 0, size, size);
  const prevTarget = renderer.getRenderTarget();
  renderer.setRenderTarget(rt);
  renderer.setScissorTest(false);
  renderer.render(bakeScene, bakeCam);
  renderer.setRenderTarget(prevTarget);   // three tự trả viewport về kích thước canvas

  quad.geometry.dispose(); bakeMat.dispose();
  return rt;
}

// Dựng quad caustic: trả { caustics, cauU, cauRT }. cauU.uTime/uEnergy chia sẻ với uniforms hoa.
export function createCaustics({ renderer, scene, camera, U }) {
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
  return { caustics, cauU, cauRT };
}
