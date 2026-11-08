# ThreeJS — Fleur, hoa chìm trong nước

Trang một bông hoa Three.js chạy theo scroll: P0 (cận cảnh) → P1 (toàn cảnh, lò xo "nặng"),
spin 2 rad theo quán tính, đổi bảng màu xanh `#0051ff` ở section 3, lật nền trắng ở cuối trang.

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
  `window.flower.getState()` → `{ s, g, cam, fov, rot }` (s>1 = lò xo quá đà).


## TODO

- Thêm loading animation với initial flower motion
- fix cái này, nên cho vuốt tới cuối cùng thì hiện như hình 1 để optimize UX, feel:

![alt text](<Screenshot 2026-11-08 093406.png>)
Hình 1


![alt text](<Screenshot 2026-11-08 093422.png>)
Hình 2

chọn font sao cho đừng nhìn như AI

chạy được resolution > 2K

NỐI VỚI REACT
NỐI VỚI REACT
NỐI VỚI REACT
NỐI VỚI REACT
NỐI VỚI REACT
NỐI VỚI REACT
NỐI VỚI REACT