// Bụi nước xa — Points + sprite bake sẵn. Tách từ main.js, hành vi giữ nguyên.
// Không gắn vào group (group xoay/spin) — bụi là không gian nền, đứng yên trong thế giới,
// chỉ trôi lên chậm theo scroll (DUST.driftK) và tan dần khi giấy trắng (sec5) lên.

// Dust: bake đốm mềm vào sprite 1 lần — fragment chỉ còn 1 texture fetch thay vì smoothstep.
export function bakeDustSprite(size) {
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

// Dựng lớp bụi xa: trả { dust, dustU, dustSprite, DUST }. uTime/uColor chia sẻ với uniforms hoa.
export function createDust({ scene, U }) {
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
  return { dust, dustU, dustSprite, DUST };
}
