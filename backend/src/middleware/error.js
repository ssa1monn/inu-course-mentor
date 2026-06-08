// 공통 에러 핸들러. 라우트에서 next(err) 또는 throw 된 에러를 받는다.
export function errorHandler(err, req, res, next) {
  console.error("[error]", err.message);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "서버 오류가 발생했습니다." });
}

// 404 핸들러
export function notFound(req, res) {
  res.status(404).json({ error: "요청한 리소스를 찾을 수 없습니다." });
}
