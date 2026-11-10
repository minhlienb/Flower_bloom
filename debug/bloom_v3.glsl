// ============================================================
// Bloom v3 — NỞ = DUỖI CONG (bản thử nghiệm, nguồn dùng chung cho debug/*)
// - Không còn uOpen: mỗi cánh mang độ mở riêng qua attribute `iOpen` (0 = nụ, 1 = nở, cho phép > 1).
// - Nụ hình thành bằng ĐỘ CONG (cung tròn bảo toàn độ dài) + hẹp bề ngang + dựng cánh,
//   không phải bằng thu nhỏ + xoay cả cánh.
// - Trang nạp phải prepend các #define của lớp gió trước khối này:
//   R0 · FLOW_SCALE · DRAG · WIND_AMP · WIND_PERIOD   (giống main.js/GLSL_FLOW).
// Khi chốt: dán khối VERT_V3 này vào shaders.glsl (đổi marker thành VERT) và bỏ `uOpen` ở main.js.
// ============================================================

// ---------- VERT_V3 ----------
attribute vec4 iData;      // x: trống · y: s · z: mirror · w: seed
attribute vec3 iData2;     // x: curlK · y: wrapK · z: tiltK — biến thiên từng cánh
attribute vec4 iRot;       // x,y: cos/sin hướng radial (cố định) · z: sc^1.6 · w: sc^1.4
attribute float iOpen;     // độ mở RIÊNG của cánh: 0 = nụ, 1 = nở (>1 = quá đà)
attribute vec2 aPetal;     // u, u^1.25
attribute vec3 aBake;      // rho, rho^1.6, rho^1.4

uniform float uAmp, uEnergy, uPhase, uDrift, uTime, uWind, uLmax, uCurl, uWrap, uTilt, uBase, uOver, uLag;
uniform vec2 uGdir, uAxis, uLight;
uniform vec3 uC0, uC1, uC2, uC3, uC4, uDeep, uLightK;

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

  // --- lớp gió dọc cánh (giữ nguyên) ---
  float u = aPetal.x;
  float tm = uTime / WIND_PERIOD, ph = iData.w;
  float wv = sin(6.28318 * (1.6 * u - tm + 0.45 * position.z + ph)) +
             0.22 * sin(6.28318 * (3.2 * u - 2.0 * tm + 0.8 * position.z + 2.0 * ph));
  float d = WIND_AMP * uWind * aPetal.y * wv;
  p += vec2(-uAxis.y, uAxis.x) * d * 0.6 - uAxis * (d * d / (2.0 * uLmax)) * 0.6;

  // --- tư thế: mirror -> xoay radial -> tỉ lệ lớp ---
  // o được phép VƯỢT 1.0: cánh bung quá rồi nảy lại (ngoại suy có kiểm soát).
  float o = clamp(iOpen, 0.0, 1.25);
  float oc = clamp(iOpen, 0.0, 1.0);          // bản clamp cho alpha (không cho trong suốt âm)
  // CUỘN VẢI: độ mở chạy như một mép vải từ GỐC cánh ra ĐẦU cánh (position.z = t dọc cánh).
  // uLag càng lớn, đầu cánh càng mở muộn so với gốc.
  float oV = clamp(o * (1.0 + uLag) - position.z * uLag, 0.0, 1.25);
  float ocV = clamp(oc * (1.0 + uLag) - position.z * uLag, 0.0, 1.0);
  // Nở theo 3 NHỊP LỆCH nhau (tự nhiên hơn: cả cánh cùng một hệ số trông như cơ cấu):
  // đáy cánh bật ra trước -> mép cánh nhả ra -> cuối cùng mới duỗi hết độ cong.
  float oTilt = smoothstep(0.00, 0.55, oV);
  float oWrap = smoothstep(0.08, 0.85, oV);
  float oCurl = smoothstep(0.28, 1.00, oV);
  float sc = iData.y;
  float c = iRot.x, s = iRot.y;
  vec2 q = vec2(p.x * iData.z, p.y);
  vec2 r = vec2(c * q.x - s * q.y, s * q.x + c * q.y) * sc;

  // --- hệ trục CỦA CÁNH sau khi xoay (không dùng uAxis trần: mỗi cánh một hướng) ---
  vec2 axM = vec2(uAxis.x * iData.z, uAxis.y);
  vec2 dir = vec2(c * axM.x - s * axM.y, s * axM.x + c * axM.y);
  vec2 perp = vec2(-dir.y, dir.x);
  float along = dot(r, dir);
  float across = dot(r, perp);

  // --- cuộn: cung tròn bảo toàn độ dài; tổng góc cuốn tại đầu cánh = curl ---
  float len = max(sc * uLmax, 1.0);            // cánh mọc từ TÂM (gốc lưới = 0,0), không phải từ Q0
  float arc = max(along, 0.0);
  float curl = mix(uCurl * iData2.x, -0.12, oCurl);       // nở: đầu cánh hơi bật ngược
  float kk = curl / len;
  float A = abs(kk) > 1e-4 ? sin(kk * arc) / kk : arc;
  float Z = abs(kk) > 1e-4 ? (1.0 - cos(kk * arc)) / kk : 0.0;
  float bw = across * mix(uWrap * iData2.y, 1.0, oWrap);

  // --- dựng cánh quanh trục TIẾP TUYẾN (vuông góc chiều dài): nụ thành khối đứng ---
  float ta = uTilt * iData2.z * (1.0 - oTilt);
  float ct = cos(ta), st = sin(ta);
  float a2 = A * ct - Z * st;            // thành phần dọc bị dựng vào z
  float bz = A * st + Z * ct;
  float baseR = uBase * sc * (1.0 - oTilt);  // đế: khép về tâm cùng nhịp với đáy cánh
  vec3 pos = vec3(dir * (baseR + a2) + perp * bw, bz);
  // bung quá (o > 1): cả cánh phình ra khỏi tư thế nghỉ — thấy rõ cú vượt rồi trả về
  pos *= 1.0 + uOver * max(o - 1.0, 0.0);

  // --- dòng nước + drift (giữ nguyên) ---
  float vLight = dot(r / R0, uLight);
  float rho = aBake.x * sc;
  float anchor = aBake.y * iRot.z;
  vec3 f = flow(r + vec2(iData.w * 120.0, position.z * 45.0), uPhase - rho * 1.2);
  vec3 off = f * uAmp * uEnergy * anchor;
  off.y += uDrift * DRAG * aBake.z * iRot.w;
  float vG = clamp(dot(p, uGdir) / 520.0, 0.0, 1.0);
  float vCrest = f.z * anchor;

  vec3 col = mix(uC0, uC1, smoothstep(0.0, 0.1, vG));
  col = mix(col, uC2, smoothstep(0.1, 0.32, vG));
  col = mix(col, uC3, smoothstep(0.32, 0.65, vG));
  col = mix(col, uC4, smoothstep(0.65, 1.0, vG));
  col = mix(col, uDeep, uLightK.x * max(-vLight, 0.0));
  col = mix(col, vec3(1.0), uLightK.y * max(vLight, 0.0));
  col = mix(col, vec3(1.0), 0.25 * max(vCrest, 0.0));
  float a = mix(0.3, 1.0, smoothstep(0.0, 0.3, vG)) * mix(0.75, 1.0, ocV) *
            (1.0 + 0.4 * uEnergy) * (1.0 - uLightK.z * vLight);
  vCol = vec4(col, a);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos.xy + off.xy, pos.z + off.z + d * 0.8 * sc, 1.0);
}
