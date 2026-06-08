import axios from "axios";

// 모든 API 호출의 베이스. Nginx가 /api 를 백엔드로 프록시한다.
const api = axios.create({
  baseURL: "/api",
});

// 요청 인터셉터: localStorage의 JWT를 Authorization 헤더에 첨부
api.interceptors.request.use((config) => {
  const raw = localStorage.getItem("inucm-auth");
  if (raw) {
    try {
      const { state } = JSON.parse(raw);
      if (state?.token) {
        config.headers.Authorization = `Bearer ${state.token}`;
      }
    } catch {
      // 무시
    }
  }
  return config;
});

// 응답 인터셉터: 401이면 토큰 만료 처리
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("inucm-auth");
    }
    return Promise.reject(err);
  }
);

export default api;
