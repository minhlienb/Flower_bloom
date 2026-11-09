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
- `debug/bloom_v3.glsl` — VERT v3 dùng chung cho `petal_bud` và `timeline` (nguồn duy nhất để bê vào `shaders.glsl`).


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


NỐI VỚI REACT
NỐI VỚI REACT
NỐI VỚI REACT
NỐI VỚI REACT
NỐI VỚI REACT
NỐI VỚI REACT
NỐI VỚI REACT