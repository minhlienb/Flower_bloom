# ThreeJS — Fleur, hoa chìm trong nước

Trang một bông hoa Three.js chạy theo scroll: P0 (cận cảnh) → P1 (toàn cảnh, lò xo "nặng"),
spin 2 rad theo quán tính, đổi bảng màu xanh `#0051ff` ở section 3, lật nền trắng ở cuối trang.

> **P(-1) ≡ P1**: lúc load, hoa đứng đúng ở trạng thái P1 (camera fit, spin đủ 2 rad, `open = 1`)
> rồi lò xo `P_TWEEN` + lag `P_SPIN` hạ về P0 — cùng một code path với lúc cuộn ngược từ cuối trang
> lên đầu. Không còn pose intro riêng (drop/zoom/nghiêng/bung nụ đã bỏ).

> Lưu ý kỹ thuật: **Lenis bị TẮT trên Safari/iOS**

Ở thiết bị iOS (iPhone/iPad) và trình duyệt Safari (macOS lẫn iOS), smooth scroll
**Lenis sẽ không được khởi tạo** và trang dùng native scrolling.

Lý do:

1. **Momentum đua nhau** — iOS Safari đã có rubber-band + momentum của hệ thống.
   chồng Lenis lên tạo hiệu ứng "hai lớp vật lý": cuộn bị đóng khung chớp nháy
   (rubber-band không còn phản ứng đúng), sau khi buông tay trang dừng đột ngột
   thay vì trượt chậm dần.
2. **Bounce méo vị trí** — khi kéo vượt biên, Safari trả `scrollY` âm/vượt max,
   Lenis bình thường hóa lại bằng tổng số nội bộ khác nhau → hoa/camera nhảy bậc.
3. Lò xo camera (P0→P1), spin và lerp màu chỉ đọc `scrollY` thật, nên tắt Lenis
   **không mất hiệu ứng nào** — trên Safari chỉ mất mỗi lớp mượt cuộn của Lenis,
   còn lại chuyển động do engine tự trông cậy.

Điểm cài đặt cáp trong `main.js`:

```js
const isSafari = /^((?!chrome|chromium|android|firefox|edge).)*safari/i.test(ua)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);   // iPadOS giả desktop
if (window.Lenis && !isSafari) { /* ... */ }
```

Nếu vẫn muốn bật lại Lenis trên Safari thì sau khi làm, nhớ kiểm: rubber-band,
cuộn trong thẻ iOS Safari và momentum sau khi buông — tránh dừng đột ngột.

## Kiểm thử

- `/` — trang chính. Trạng thái tween/spin/màu/độ lật trắng đọc từ console:
  `window.flower.getState()` → `{ s, g, cam, fov, rot, spin, open, begun, arrived }` (s>1 = lò xo quá đà;
  `arrived: true` = lò xo P1→P0 đã lắng hẳn).
- `debug/petal/` — soi một cánh, dáng cố định (dùng chung `shaders.glsl`).
- `debug/petal_bud/` — orbit + sửa dáng cánh: kéo **Q0–Q3** và tay nắm **w1/w2** trên canvas,
  số liệu Q nhập theo **hệ trục u** (`s` dọc trục, `t` ngang trục; `t=0` = điểm nằm trên trục), giữ
  **Shift** khi kéo để chỉ trượt dọc trục; slider `w0/t1/t2/AXIS_ANG/N/M`.
  Chế độ **Bụp (18 cánh)** chạy theo **bloom v3** — nở = duỗi cong, **không còn `uOpen`**: mỗi cánh mang
  độ mở riêng (`iOpen`), nụ hình thành bằng `curl` (cung bảo toàn độ dài) + `wrap` + `tilt` (dựng cánh
  quanh trục tiếp tuyến) + `base` (vành đế); nút **Nở/Khép** chạy 18 lò xo **có quán tính**
  (`ζ = 0.55`, `τ = 1/ω = 0.28 s`, cánh ngoài nặng hơn 12%): bung **quá 1.0** (~+12%) rồi nảy lại
  (~−1.5%) và lắng về đúng P0; lớp ngoài trước, lệch nhịp theo seed. Slider `open` là kéo tay để so silhouette nụ ↔ nở.
  Panel "Xuất ra main.js" in lại hằng số để paste; `window.petal` = `{ Q, W, AXIS, P, BUD, LAYERS, state, view, built, insts, U, rebuild, scrubOpen, bloomTo }`.
  Nên chạy qua HTTP (`python -m http.server`); mở `file://` vẫn chỉnh được nhưng dùng material thay cho shader.
- `debug/timeline/` — **timeline cho motion nở**: cùng setup với `petal_bud` (Q · `w0=0` · N/M · curl/wrap/tilt/base ·
  τ/ζ/stagger), nhưng motion được **mô phỏng trước ở 240 Hz** rồi scrub. Tab **Timeline**: 3 lane (lớp ngoài, lớp trong,
  cánh đang chọn) + playhead, kéo để scrub, `Space` play/pause, `←/→` ±1 frame, `⏮`/`↻`/tốc độ 0.25–2×. Tab **Curve**:
  đồ thị `open(t)` 18 cánh + marker `vượt đích` / `nảy lại` / `lắng`, đường P0 = 1.0. Panel sửa τ, ζ, lệch lớp/seed,
  "nặng lớp ngoài", curl/wrap/tilt/base, s lớp; đổi số là mô phỏng lại ngay. `window.timeline` = `{ insts, curves, stats,
  allSettled, state, setTime, setPlay, recompute }`.
  **Preset `∿ sin`**: sinh ngay một curve dao động tắt dần quanh P0 — `v(t) = 1 − e^(−damp·t)·cos(2πt/period)`
  với `SINE = { period: 1.2, damp: 2.6, step: 0.15 }` (đỉnh ~1.219 ở 0.45 s, đáy 0.954 ở 1.05 s, lắng 2.0 s,
  35 keyframe), neo hai đầu 0 → 1. Áp cho cánh đang chọn; dùng `→lớp` / `→all` để nhân bản, rồi kéo điểm chỉnh tiếp.
  **Sửa curve tay**: nút `✎ sửa` (tab Curve) — click chỗ trống để thêm keyframe, kéo điểm để đổi thời điểm/giá trị
  (snap 0/1), chuột phải để xoá; `−kf` trả cánh về lò xo, `→lớp` / `→all` nhân bản curve sang 9 / 18 cánh.
  Cánh có keyframe không dùng τ/ζ nữa, nội suy Hermite (Catmull-Rom, tiếp tuyến 0 ở hai đầu nên khởi động vẫn "nặng"),
  và keyframe sống sót khi đổi tham số lò xo.
  **params.json**: nút `⬇ params.json` ghi toàn bộ thông số đang chỉnh (axis · Q · petal N/M/w0..t2 · bloom ·
  motion · layers · view · keyframes) ra `debug/timeline/params.json` — dùng File System Access API nên chọn được
  đúng thư mục (cùng cấp với `index.html`), fallback là tải file về. Khi tải trang, `params.json` cùng thư mục
  (nếu có) được nạp và ghi đè mặc định; dòng "params.json: …" trong panel cho biết đã nạp hay chưa.
- `debug/bloom_v3.glsl` — VERT v3 dùng chung cho `petal_bud`, `timeline`, `mock_p-1` (nguồn duy nhất để bê vào
  `shaders.glsl`). Có uniform **`uOver`** (mặc định 0.9): khi `iOpen > 1` cả cánh phình ra
  `1 + uOver·(o − 1)` quanh gốc — nhờ đó cú "bung quá" của curve **nhìn thấy được** (o = 1.212 ⇒ hoa to ~19%),
  rồi co lại khi o trả về 1. Đặt `uOver = 0` để tắt.
- `debug/mock_p-1/` — **mock trạng thái P(−1) → P(0)** của trang chính: đọc `debug/timeline/params.json`
  (axis · Q · petal N/M/w0..t2 · bloom curl/wrap/tilt/base · layers) và **phát lại `keyframes`** đã vẽ trong
  timeline — chuẩn hoá trước khi phát: thời gian tính từ điểm đầu của curve, hai đầu kéo về đúng **0** (nụ) và
  **1** (P0), cắt đuôi phẳng (dừng ở keyframe đầu tiên chạm 1), nội suy **Hermite monotone** nên đi qua đúng
  từng keyframe và **không tự nảy thêm** giữa hai điểm — quán tính trong hình là phần vượt đích/nảy lại bạn vẽ.
  **Nhịp**: nhanh từ đầu tới đỉnh rồi chậm lại ở đoạn bounce — curve được chia tại đỉnh và co/giãn thời gian
  hai bên (`TIMING = { rise: 0.55, tail: 1.6 }` trong file; tại đỉnh tiếp tuyến = 0 nên không gãy vận tốc).
  **Cuộn vải**: shader có `uLag` (mặc định 0.45) — độ mở chạy như mép vải từ **gốc cánh ra đầu cánh**
  (`oV = o·(1+uLag) − t_dọc_cánh·uLag`), nên gốc bung trước, đầu cánh còn cuộn rồi mới trải ra; `uLag = 0` là nở đều,
  0.9 là đầu cánh trễ rõ.
  **Rơi từ trên xuống**: `FALL = { dist: 340, dur: 0.95 }` — nhanh dần đều (`y = dist·(1 − u²)`), chạm đúng P0 ở
  `u = 1` và **dừng** (không lún/nảy).
  **Chỉ còn 2 pha: rơi + bung**, tổng **`RUN = 3.0 s`**: curve được co giãn để `max(tStart) + dur = 3.0`
  (đỉnh 1.212 ở ~0.65 s khi còn trên không, chạm đất ~0.95 s, lắng đúng 3.0 s). Đã bỏ orbit trôi, breathe,
  nghiêng theo chuột, bump nước và lớp gió động (`uTime/uPhase` đóng băng) — cánh chỉ chuyển động do rơi + bung.
  **Không còn trễ theo lớp**: `MOTION.stagger = 0`, cánh trong bắt đầu cùng lúc với lớp ngoài (chỉ lệch ~0–0.08 s theo seed).
  Cánh không có keyframe thì rơi về lò xo (`MOTION` trong file). Dựng đúng P0 (camera + neo hull mép phải 1.1 /
  đáy −0.9, tilt, orbit, glow, vignette + grain như `styles.css`). **Chỉ còn nở bung**: không độ trễ, không
  `introK` — camera/tư thế đứng yên ở P0, `open` chạy theo curve ngay từ frame đầu; không xoay
  (`getState().spin = 0`, `introK = rotK = 0`).
  **Không có HUD/panel**; debug bằng console y như trang chính:
  `window.flower.getState()` → `{ s, g, cam, fov, rot, introK, rotK, spin, open, introDone, introSettled }`,
  `window.flower.stats()` → `{ fps, p50/p95/p99, jank, drop, intro, scroll, vp, flower }`.
  Phát lại: trang **mở ở trạng thái dừng** (nụ, `open 0`) — **`Space` = play/pause** (nở xong rồi bấm thì chạy lại
  từ nụ), **click** = play/pause, **`R`** = chạy lại từ đầu; API: `flower.play() / .pause() / .toggle() / .replay()`,
  `flower.playing`; `getState()` có thêm khoá `playing`.


## TODO

- Thêm loading animation với initial flower motion
- fix cái này, nên cho vuốt tới cuối cùng thì hiện như hình 1 để optimize UX, feel:

![alt text](<Screenshot 2026-11-08 093406.png>)
Hình 1


![alt text](<Screenshot 2026-11-08 093422.png>)
Hình 2

chọn font sao cho đừng nhìn như AI

chạy được resolution > 2K

tách logic từ main.js để mỗi file làm một việc

hoa đang nở thì pause computing sin wave của cánh hoa, và wave theo gió

đếm từ P0 tới P1 xem có bao nhiêu computing

tắt đổi màu text

NỐI VỚI REACT
NỐI VỚI REACT
NỐI VỚI REACT
NỐI VỚI REACT
NỐI VỚI REACT
NỐI VỚI REACT
NỐI VỚI REACT