// Bảng màu — tách từ main.js (refactor tối thiểu: chỉ chuyển data, không đổi hành vi).
// P2: bảng màu "chìm sâu" — section 2->3 lerp toàn bộ shader về tông xanh #0051ff
export const P2_COL = {
  ramp: ['#012187', '#0044ef', '#0051ff', '#6ea3ff', '#cfe2ff'],
  deep: '#031338',
  glow: { halo: '#0030b8', mid: '#0051ff', core: '#6ea3ff', streak: '#aecbff' },
};
// Bảng màu nền tối: mực tím trên giấy đen, chữ ngà. Đổi bảng bằng ?palette=warm trên URL.
export const PALETTES = {
  cool: { ramp: ['#ff3d5a', '#c02ad0', '#8e56ea', '#c0adf4', '#b9c3ff'], deep: '#5a35c8',
          glow: { halo: '#6b3df5', mid: '#d930a0', core: '#ff4d5c', streak: '#ff5966' }, bg: ['#0d0d16', '#171226'], ink: '#eae5f3' },
  warm: { ramp: ['#f6aa0e', '#7c2262', '#a057a1', '#c694cb', '#f9dfe4'], deep: '#450724',
          glow: { halo: '#a057a1', mid: '#7c2262', core: '#f6aa0e', streak: '#fcd17b' }, bg: ['#150c11', '#251119'], ink: '#f2e7dc' },
};
// Bảng màu theo SECTION (6 section): 01 mực tím · 02 PLUM ROSE · 03 CHARCOAL BONE · 04 FOREST LIME · 05 INK ICE · 06 giấy xanh.
// `tone` = lớp phủ nền (đổi sắc nền, KHÔNG đổi màu chữ); `paper` = độ lật nền sáng (0..1).
// Nền giấy (06) giữ caustic xanh hard-code #0051ff nên ramp ở đó cũng phải lệch hue so với xanh: xanh navy + neutrals.
export const THEMES = [
  { ...PALETTES.cool, tone: '#0d0d16', toneA: 0.0, paper: 0 },
  { ramp: ['#7C2262', '#A057A1', '#C694CB', '#E6C9E0', '#FBF2F7'], deep: '#2E0B24',   // PLUM / ROSE
    glow: { halo: '#5A1640', mid: '#A057A1', core: '#F5DCEC', streak: '#FFF3F9' },
    tone: '#1C0817', toneA: 0.60, paper: 0 },
  { ramp: ['#56524F', '#8C8781', '#BAA99A', '#DAD4CC', '#EEE7DE'], deep: '#232220',   // CHARCOAL STONE / SOFT BONE
    glow: { halo: '#3A3836', mid: '#8C8781', core: '#EEE7DE', streak: '#F7F4EC' },
    tone: '#141416', toneA: 0.90, paper: 0 },
  { ramp: ['#87A33C', '#6E8A2F', '#9DBB55', '#C9D89B', '#F2F5E6'], deep: '#1F2A10',   // FOREST / LIME
    glow: { halo: '#4C6A16', mid: '#87A33C', core: '#DCEBAE', streak: '#F5FADF' },
    tone: '#101A0C', toneA: 0.70, paper: 0 },
  { ramp: ['#0051FF', '#2A6CFF', '#6EA3FF', '#C4DDFF', '#F4F9FF'], deep: '#031338',   // INK / ICE
    glow: { halo: '#0030B8', mid: '#0051FF', core: '#E8F3FF', streak: '#FFFFFF' },
    tone: '#071026', toneA: 0.75, paper: 0 },
  { ramp: P2_COL.ramp, deep: P2_COL.deep, glow: P2_COL.glow, tone: '#f5f4f0', toneA: 0.0, paper: 1 },  // giấy: hoa vẫn xanh như ảnh tham chiếu
];
