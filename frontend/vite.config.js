import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 개발 모드에서 /api 요청을 백엔드로 프록시 (CORS 우회)
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
});
