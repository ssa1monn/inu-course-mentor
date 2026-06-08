import { create } from "zustand";
import { persist } from "zustand/middleware";

// 테마(라이트/다크) 전역 상태. localStorage("inucm-theme")에 저장 → 새로고침/재방문 유지.
// dark 값이 바뀌면 <html data-theme="..."> 를 갱신한다.
const useThemeStore = create(
  persist(
    (set, get) => ({
      dark: false,
      setDark: (dark) => {
        set({ dark });
        applyTheme(dark);
      },
      toggle: () => {
        const next = !get().dark;
        set({ dark: next });
        applyTheme(next);
      },
    }),
    { name: "inucm-theme" }
  )
);

export function applyTheme(dark) {
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

// 앱 시작 시 1회 호출 — 저장된 값으로 data-theme 동기화
export function initTheme() {
  applyTheme(useThemeStore.getState().dark);
}

export default useThemeStore;
