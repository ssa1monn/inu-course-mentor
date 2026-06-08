import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { computeGraduation } from "../services/gradReq.js";

const router = Router();

// 졸업요건 충족 현황 계산
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });

    const [enrollments, rules] = await Promise.all([
      prisma.enrollment.findMany({ where: { userId: req.userId } }),
      prisma.gradReqRule.findMany({
        where: { department: user.department, admissionYear: user.admissionYear },
        orderBy: { id: "asc" },
      }),
    ]);

    if (rules.length === 0) {
      return res.json({
        areas: [],
        totalEarned: 0,
        totalPlanned: 0,
        isDemo: true,
        message: `${user.department} ${user.admissionYear}학번 졸업요건 데모 규칙이 없습니다. (현재 컴퓨터공학부 2022학번 데모만 시드됨)`,
      });
    }

    const result = computeGraduation(enrollments, rules);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
