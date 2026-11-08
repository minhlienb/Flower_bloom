// ============================================================
// Flower — Three.js GLSL Shaders
// ============================================================

// ---------- VERT (cánh hoa chính) ----------
attribute vec4 iData;
attribute vec3 iData2;
attribute vec4 iRot;      // bake theo uOpen: cos(rot), sin(rot), sc^1.6, sc^1.4
attribute vec2 aPetal;    // bake: u (dọc trục), u^1.25
attribute vec3 aBake;     // bake: rho gốc, rho^1.6, rho^1.4 (tính từ dáng nghỉ)

uniform float uOpen, uAmp, uEnergy, uPhase, uDrift, uTime, uWind, uLmax;
uniform vec2 uGdir, uAxis, uLight;
uniform vec3 uC0, uC1, uC2, uC3, uC4, uDeep, uLightK;   // màu tính ở vertex (rẻ hơn hàng triệu fragment)

varying vec4 vCol;

vec3 flow(vec2 r, float t) {
  vec2 q = r / FLOW_SCALE;
  float x = sin(q.y * 1.7 + t * 0.9) + 0.5 * sin(q.y * 3.1 - q.x * 2.3 + t * 1.4 + 1.7);
  float y = sin(q.x * 1.5 - t * 0.8 + 2.1) + 0.5 * sin(q.x * 2.9 + q.y * 2.2 - t * 1.2);
  float z = sin(q.x * 1.2 + q.y * 1.4 + t * 0.7) + 0.5 * sin(q.x * 2.6 - q.y * 1.9 - t * 1.1 + 0.6);
  return vec3(x, y, z) / 1.5;
}

void main() {
  vec2 p = position.xy;
  // Lớp 1 (idle): sóng phấp phới dọc cánh, neo ở nhụy
  float u = aPetal.x;                                   // đã bake: dot(p, uAxis)/uLmax, clamp 0..1.1
  float tm = uTime / WIND_PERIOD, ph = iData.w;
  float wv = sin(6.28318 * (1.6 * u - tm + 0.45 * position.z + ph)) +
              0.22 * sin(6.28318 * (3.2 * u - 2.0 * tm + 0.8 * position.z + 2.0 * ph));
  float d = WIND_AMP * uWind * aPetal.y * wv;           // aPetal.y = pow(u, 1.25) đã bake
  p += vec2(-uAxis.y, uAxis.x) * d * 0.6 - uAxis * (d * d / (2.0 * uLmax)) * 0.6;
  float oa = iData2.y, ob = max(iData2.z, oa + 0.001);   // nở trong khoảng open [oa, ob]
  float o = smoothstep(0.0, 1.0, clamp((uOpen - oa) / (ob - oa), 0.0, 1.0));
  float sc = iData.y * mix(0.35, 1.0, o);
  float c = iRot.x, s = iRot.y;                         // cos/sin đã bake theo instance
  vec2 q = vec2(p.x * iData.z, p.y);
  vec2 r = vec2(c * q.x - s * q.y, s * q.x + c * q.y) * sc;
  float vLight = dot(r / R0, uLight);                   // vị trí so với hướng sáng: >0 phía sáng, <0 phía tối
  float rho = aBake.x * sc;                             // xoay không đổi độ dài: |r|/R0 = |p|/R0 * sc
  float anchor = aBake.y * iRot.z;                      // pow(rho, 1.6)
  vec3 f = flow(r + vec2(iData.w * 120.0, position.z * 45.0), uPhase - rho * 1.2);  // đầu cánh trễ nhịp so với gốc
  vec3 off = f * uAmp * uEnergy * anchor;
  off.y += uDrift * DRAG * aBake.z * iRot.w;            // pow(rho, 1.4)
  float vG = clamp(dot(p, uGdir) / 520.0, 0.0, 1.0);
  float vCrest = f.z * anchor;
  // Tính màu + alpha 1 lần cho mỗi vertex thay vì từng fragment (60k vertex vs hàng triệu fragment).
  vec3 col = mix(uC0, uC1, smoothstep(0.0, 0.1, vG));
  col = mix(col, uC2, smoothstep(0.1, 0.32, vG));
  col = mix(col, uC3, smoothstep(0.32, 0.65, vG));
  col = mix(col, uC4, smoothstep(0.65, 1.0, vG));
  col = mix(col, uDeep, uLightK.x * max(-vLight, 0.0));
  col = mix(col, vec3(1.0), uLightK.y * max(vLight, 0.0));
  col = mix(col, vec3(1.0), 0.25 * max(vCrest, 0.0));
  float a = mix(0.3, 1.0, smoothstep(0.0, 0.3, vG)) * mix(0.4, 1.0, o) *
            (1.0 + 0.4 * uEnergy) * (1.0 - uLightK.z * vLight);
  vCol = vec4(col, a);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(r + off.xy, off.z + d * 0.8 * sc + iData2.y * 25.0, 1.0);
}

// ---------- FRAG (cánh hoa chính) ----------
uniform float uAlpha;

varying vec4 vCol;

void main() {
  gl_FragColor = vec4(vCol.rgb, vCol.a * uAlpha);      // chỉ 1 varying + 1 nhân — fragment gần như miễn phí
}

// ---------- GLOW_VERT (vầng nhụy) ----------
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

// ---------- GLOW_FRAG (vầng nhụy) ----------
// Mask halo/mid/core/streak đã bake sẵn vào RGBA texture (bake lúc load, xem bakeGlowTexture).
// Runtime chỉ 1 texture fetch + tint theo uniform; lõi trắng suy ra từ core^4.1 nên không cần mask thứ 5.
uniform sampler2D uGlowTex;
uniform float uEnergy, uPhase;
uniform vec3 uHalo, uMid, uCore, uStreak;

varying vec2 vUv;

void main() {
  float wob = 0.012 + 0.03 * uEnergy;
  vec2 uv = vUv + (0.5 * wob) * vec2(sin(vUv.y * 12.0 + uPhase * 0.9),
                                    cos(vUv.x * 12.0 - uPhase * 0.7));
  vec4 M = texture2D(uGlowTex, uv);              // R=halo, G=mid, B=core, A=streak
  float h = M.b * M.b * M.b * M.b;               // lõi trắng ≈ core^4.1, ^4 đủ và rẻ hơn pow
  float boost = 1.0 + 0.5 * uEnergy;
  vec3 c = mix(uHalo, uMid, M.g);
  c = mix(c, uCore, M.b);
  c = mix(c, uStreak, M.a);
  c = mix(c, vec3(1.0, 0.9, 0.93), h);
  float A = max(M.r * 0.5 * boost,
            max(M.g * 0.85,
            max(M.b * 0.95,
            max(M.a * 0.7 * boost, h * 0.8))));
  gl_FragColor = vec4(c, A);
}
