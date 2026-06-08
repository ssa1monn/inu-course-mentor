import { Router } from "express";
import multer from "multer";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { parseGradesBuffer } from "../services/gradesParser.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// 과목별성적 엑셀 업로드 → 수강이력 자동 등록
// 재업로드 시 기존 "grade" 출처 이력은 교체(수동 입력 이력은 보존)
router.post("/upload", requireAuth, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "성적 엑셀 파일(file)이 필요합니다." });

    const records = parseGradesBuffer(req.file.buffer);
    if (records.length === 0) {
      return res.status(400).json({ error: "성적 데이터를 찾지 못했습니다. 파일 형식을 확인하세요." });
    }

    // 기존 grade 출처 이력 삭제 후 재등록
    await prisma.enrollment.deleteMany({ where: { userId: req.userId, source: "grade" } });
    await prisma.enrollment.createMany({
      data: records.map((r) => ({ ...r, userId: req.userId })),
    });

    res.status(201).json({ total: records.length });
  } catch (err) {
    next(err);
  }
});

export default router;
