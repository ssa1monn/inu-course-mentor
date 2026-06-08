import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// 내 프로필 + 선호 조회
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { preference: true },
    });
    if (!user) return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
    const { passwordHash, ...safe } = user;
    res.json(safe);
  } catch (err) {
    next(err);
  }
});

// 프로필 + 선호 수정
router.put("/profile", requireAuth, async (req, res, next) => {
  try {
    const { name, department, admissionYear, grade, semester, interestJob, subjectTaste, interestArea } = req.body;

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(name !== undefined && { name }),
        ...(department !== undefined && { department }),
        ...(admissionYear !== undefined && { admissionYear: Number(admissionYear) }),
        ...(grade !== undefined && { grade: Number(grade) }),
        ...(semester !== undefined && { semester: Number(semester) }),
      },
    });

    // 선호(Preference) upsert
    let preference = null;
    if (interestJob !== undefined || subjectTaste !== undefined || interestArea !== undefined) {
      preference = await prisma.preference.upsert({
        where: { userId: req.userId },
        create: {
          userId: req.userId,
          interestJob: interestJob || "",
          subjectTaste: subjectTaste || "균형",
          interestArea: interestArea || null,
        },
        update: {
          ...(interestJob !== undefined && { interestJob }),
          ...(subjectTaste !== undefined && { subjectTaste }),
          ...(interestArea !== undefined && { interestArea }),
        },
      });
    }

    const { passwordHash, ...safe } = user;
    res.json({ ...safe, preference });
  } catch (err) {
    next(err);
  }
});

export default router;
