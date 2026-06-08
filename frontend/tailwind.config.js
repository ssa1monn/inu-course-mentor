/** @type {import('tailwindcss').Config} */
// 색상은 CSS 변수(:root / [data-theme=dark])를 가리킨다 → 라이트/다크 자동 전환.
// 브랜드(inu.*)도 변수로 두어 다크에서 대비를 살짝 보정한다.
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        inu: {
          blue: "var(--inu-blue)",
          sky: "var(--inu-sky)",
          light: "var(--inu-light)",
          yellow: "var(--inu-yellow)",
          gray: "var(--text-2)",
        },
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "surface-3": "var(--surface-3)",
        line: "var(--border)",
        "line-strong": "var(--border-strong)",
        fg: "var(--text)",
        "fg-muted": "var(--text-2)",
        "fg-faint": "var(--text-3)",
        ok: "var(--ok)",
        warn: "var(--warn)",
        danger: "var(--danger)",
      },
      fontFamily: {
        sans: ["Pretendard", "system-ui", "sans-serif"],
        display: ["Sora", "Pretendard", "sans-serif"],
      },
      borderRadius: {
        card: "var(--radius)",
        ctl: "var(--radius-sm)",
      },
    },
  },
  plugins: [],
};
