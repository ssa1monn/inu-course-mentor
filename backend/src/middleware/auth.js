import jwt from "jsonwebtoken";
import { prisma } from "../db.js";

// JWT 검증 미들웨어. Authorization: Bearer <token> 헤더를 확인한다.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "인증 토큰이 필요합니다." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch (err) {
    return res.status(401).json({ error: "유효하지 않은 토큰입니다." });
  }
}

// 관리자 권한 확인 (requireAuth 다음에 사용)
export async function requireAdmin(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user?.isAdmin) return res.status(403).json({ error: "관리자 권한이 필요합니다." });
    next();
  } catch (err) {
    next(err);
  }
}
