import { Router } from "express";
import multer from "multer";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { parseTimetableBuffer } from "../services/excelParser.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// 계열(track) → 이수구분(courseType) 그룹 매핑
const TRACK_GROUPS = {
  전공: ["전공기초", "전공핵심", "전공심화"],
  교양: ["기초교양", "핵심교양", "심화교양"],
  일선: ["일반선택"],
};

// 엑셀 업로드 → 파싱 → DB 적재 (upsert)
router.post("/upload", requireAuth, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "엑셀 파일(file)이 필요합니다." });
    const semesterKey = req.body.semesterKey || "2026-1";

    const parsed = parseTimetableBuffer(req.file.buffer);
    if (parsed.length === 0) {
      return res.status(400).json({ error: "강의 데이터를 찾지 못했습니다. 파일 형식을 확인하세요." });
    }

    let created = 0;
    let updated = 0;

    // 동일 학수번호가 여러 행(분반)일 수 있어, courseCode 중복은 마지막 것으로 처리
    for (const c of parsed) {
      const existing = await prisma.course.findUnique({
        where: { semesterKey_courseCode: { semesterKey, courseCode: c.courseCode } },
      });

      const data = {
        semesterKey,
        courseCode: c.courseCode,
        title: c.title,
        titleEn: c.titleEn,
        professor: c.professor,
        college: c.college,
        department: c.department,
        targetGrade: c.targetGrade,
        courseType: c.courseType,
        courseArea: c.courseArea,
        credits: c.credits,
        room: c.room,
        language: c.language,
        grading: c.grading,
        classType: c.classType,
      };

      if (existing) {
        // 기존 meeting 제거 후 재생성
        await prisma.meeting.deleteMany({ where: { courseId: existing.id } });
        await prisma.course.update({ where: { id: existing.id }, data });
        if (c.meetings.length) {
          await prisma.meeting.createMany({
            data: c.meetings.map((m) => ({ ...m, courseId: existing.id })),
          });
        }
        updated++;
      } else {
        const course = await prisma.course.create({ data });
        if (c.meetings.length) {
          await prisma.meeting.createMany({
            data: c.meetings.map((m) => ({ ...m, courseId: course.id })),
          });
        }
        created++;
      }
    }

    res.status(201).json({ semesterKey, total: parsed.length, created, updated });
  } catch (err) {
    next(err);
  }
});

// 강의 검색·필터·페이지네이션
// query: semesterKey, department, courseType, day(0~6), q(키워드), startMin, endMin, page, pageSize
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const {
      semesterKey = "2026-1",
      department,
      courseType,
      track,
      grade,
      q,
      day,
      hours,
      page = "1",
      pageSize = "20",
    } = req.query;

    const where = { semesterKey };
    if (department) where.department = department;
    // 이수구분(세부)이 지정되면 우선, 아니면 계열(track) 그룹으로 필터
    if (courseType) where.courseType = courseType;
    else if (track && TRACK_GROUPS[track]) where.courseType = { in: TRACK_GROUPS[track] };
    // 학년 필터: 해당 학년 + "전학년"(모든 학년 대상) 포함
    if (grade) where.targetGrade = { in: [String(grade), "전학년"] };
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { professor: { contains: q, mode: "insensitive" } },
        { courseCode: { contains: q, mode: "insensitive" } },
      ];
    }
    // 요일 + 강의 시간(시 단위 복수 선택)을 하나의 meeting 조건으로 결합
    // hours="9,10,14" → 선택된 시(時) 중 하나라도 강의 시간에 걸치면 매칭
    const meetingCond = {};
    if (day !== undefined && day !== "") meetingCond.day = Number(day);
    if (hours) {
      const hourList = String(hours).split(",").map(Number).filter((h) => !Number.isNaN(h));
      if (hourList.length) {
        // 시각 h 와 겹침: startMin < (h+1)*60 AND endMin > h*60
        meetingCond.OR = hourList.map((h) => ({ startMin: { lt: (h + 1) * 60 }, endMin: { gt: h * 60 } }));
      }
    }
    if (Object.keys(meetingCond).length) where.meetings = { some: meetingCond };

    const take = Math.min(100, Number(pageSize) || 20);
    const skip = (Math.max(1, Number(page) || 1) - 1) * take;

    const [total, courses] = await Promise.all([
      prisma.course.count({ where }),
      prisma.course.findMany({
        where,
        include: { meetings: true },
        orderBy: { courseCode: "asc" },
        skip,
        take,
      }),
    ]);

    res.json({ total, page: Number(page), pageSize: take, courses });
  } catch (err) {
    next(err);
  }
});

// 필터 옵션(학과/이수구분 목록)
router.get("/facets", requireAuth, async (req, res, next) => {
  try {
    const { semesterKey = "2026-1" } = req.query;
    const [departments, courseTypes] = await Promise.all([
      prisma.course.findMany({
        where: { semesterKey },
        distinct: ["department"],
        select: { department: true },
        orderBy: { department: "asc" },
      }),
      prisma.course.findMany({
        where: { semesterKey },
        distinct: ["courseType"],
        select: { courseType: true },
        orderBy: { courseType: "asc" },
      }),
    ]);
    res.json({
      departments: departments.map((d) => d.department),
      courseTypes: courseTypes.map((c) => c.courseType),
    });
  } catch (err) {
    next(err);
  }
});

// 강의 상세
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: Number(req.params.id) },
      include: { meetings: true },
    });
    if (!course) return res.status(404).json({ error: "강의를 찾을 수 없습니다." });
    res.json(course);
  } catch (err) {
    next(err);
  }
});

export default router;
