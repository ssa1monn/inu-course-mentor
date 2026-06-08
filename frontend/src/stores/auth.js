import { create } from "zustand";
import { persist } from "zustand/middleware";

// 인증 상태 전역 관리. persist로 localStorage("inucm-auth")에 저장 → 새로고침/재방문 유지.
// (api.js의 인터셉터가 이 localStorage 키에서 token을 읽는다.)
const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: "inucm-auth",
    }
  )
);

export default useAuthStore;
