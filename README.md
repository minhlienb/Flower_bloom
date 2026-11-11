# Fleur — Real-time 3D Web Portfolio

**Minh Liên** — 3D web / frontend engineer · Đà Lạt, Vietnam

**Live: <https://minhlienb.vercel.app>**

A single-page portfolio: an 18-petal flower built with Three.js and custom GLSL shaders, all motion driven by scroll, every number measured on device — not guessed.
Built with an AI-first workflow: the direction, the decisions and every number are human-owned.

## Measured highlights

- 18 instanced petals · 60,462 line segments · **5 draw calls per frame** (Three.js r128, custom vertex/fragment shaders)
- Spring-physics motion; per-section color transitions via two compositing-only DOM layers — no repaint
- Built-in HUD: live fps / p95 / p99 frame-time — open [`?stats=1`](https://minhlienb.vercel.app/?stats=1) to see the measurements
- Static deploy, no build step: 23 files, ~0.5 MB brotli on the Vercel edge

## Explore

- DevTools console: `flower.getState()` · `flower.stats()`
- Full technical case study (Vietnamese): [docs/Readme.md](docs/Readme.md)

## Contact

minhlien2077@gmail.com · [github.com/minhlienb](https://github.com/minhlienb)

## License

Source © 2026 Bùi Minh Liên — [PolyForm Noncommercial 1.0.0](LICENSE); commercial use requires permission.
Third-party: three.js (MIT) · GSAP + ScrollTrigger (GreenSock Standard) · Lenis (MIT) · Cormorant Garamond + Inter (SIL OFL 1.1) — see [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
