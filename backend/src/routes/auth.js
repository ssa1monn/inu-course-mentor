import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db.js";

const router = Router();

function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

// 회원가입
router.post("/register", async (req, res, next) => {
  try {
    const { email, password, name, department, admissionYear, grade, semester } = req.body;
    if (!email || !password || !department || !admissionYear || !grade || !semester) {
      return res.status(400).json({ error: "필수 항목이 누락되었습니다." });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return res.status(400).json({ error: "이미 가입된 이메일입니다." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || null,
        department,
        admissionYear: Number(admissionYear),
        grade: Number(grade),
        semester: Number(semester),
      },
    });

    const token = signToken(user.id);
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, department: user.department, isAdmin: user.isAdmin },
    });
  } catch (err) {
    next(err);
  }
});

// 로그인
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "이메일과 비밀번호를 입력하세요." });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
    }

    const token = signToken(user.id);
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, department: user.department, isAdmin: user.isAdmin },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
