import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// 내 수강 이력/예정 조회
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: req.userId },
      orderBy: { id: "desc" },
    });
    res.json({ enrollments });
  } catch (err) {
    next(err);
  }
});

// 수강 이력/예정 추가
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { courseCode, title, semesterKey, status, credits, courseType } = req.body;
    if (!title || !credits || !courseType || !status) {
      return res.status(400).json({ error: "필수 항목(title, credits, courseType, status)이 누락되었습니다." });
    }
    const enrollment = await prisma.enrollment.create({
      data: {
        userId: req.userId,
        courseCode: courseCode || "",
        title,
        semesterKey: semesterKey || "",
        status, // "taken" | "planned"
        credits: Number(credits),
        courseType,
      },
    });
    res.status(201).json(enrollment);
  } catch (err) {
    next(err);
  }
});

// 삭제
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.enrollment.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.userId) {
      return res.status(404).json({ error: "항목을 찾을 수 없습니다." });
    }
    await prisma.enrollment.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
