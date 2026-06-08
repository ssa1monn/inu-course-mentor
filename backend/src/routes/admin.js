import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireAdmin);

// 사용자 목록
router.get("/users", async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true, email: true, name: true, department: true,
        admissionYear: true, grade: true, isAdmin: true, createdAt: true,
      },
    });
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

// 비밀번호 변경
router.put("/users/:id/password", async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 4) {
      return res.status(400).json({ error: "비밀번호는 4자 이상이어야 합니다." });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: Number(req.params.id) }, data: { passwordHash } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// 아이디(이메일) 변경
router.put("/users/:id/email", async (req, res, next) => {
  try {
    const email = (req.body.email || "").trim();
    if (!email) return res.status(400).json({ error: "새 아이디를 입력하세요." });
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists && exists.id !== Number(req.params.id)) {
      return res.status(400).json({ error: "이미 사용 중인 아이디입니다." });
    }
    await prisma.user.update({ where: { id: Number(req.params.id) }, data: { email } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// 계정 삭제 (관리자 계정은 삭제 불가)
router.delete("/users/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
    if (target.isAdmin) return res.status(400).json({ error: "관리자 계정은 삭제할 수 없습니다." });
    await prisma.user.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
