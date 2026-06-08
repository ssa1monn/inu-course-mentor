import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { computeGraduation } from "../services/gradReq.js";
import { generateAdvice } from "../services/aiAdvisor.js";
import { getNcsCompetencies } from "../services/ncsService.js";

const router = Router();

// 두 강의의 시간이 겹치는가
function meetingsOverlap(a, b) {
  for (const m1 of a.meetings || []) {
    for (const m2 of b.meetings || []) {
      if (m1.day === m2.day && m1.startMin < m2.endMin && m2.startMin < m1.endMin) return true;
    }
  }
  return false;
}

// 추천 과목(제목)마다 분반 1개씩 선택하되, 시간이 가능하면 전혀 겹치지 않는 조합을 찾는다.
// (백트래킹 + 탐색 횟수 가드. 완전 무충돌이 불가능하면 충돌 최소 조합 반환)
function pickNonConflicting(titles, sections) {
  const byTitle = new Map();
  for (const t of titles) {
    const list = sections.filter((s) => s.title === t).slice(0, 6); // 제목당 분반 최대 6개
    if (list.length) byTitle.set(t, list);
  }
  const order = [...byTitle.keys()];
  let best = null;
  let bestCf = Infinity;
  let steps = 0;

  function countConflicts(chosen) {
    let cf = 0;
    for (let i = 0; i < chosen.length; i++)
      for (let j = i + 1; j < chosen.length; j++)
        if (meetingsOverlap(chosen[i], chosen[j])) cf++;
    return cf;
  }
  function bt(i, chosen) {
    if (steps++ > 200000) return false;
    if (i === order.length) {
      const cf = countConflicts(chosen);
      if (cf < bestCf) { bestCf = cf; best = [...chosen]; }
      return cf === 0; // 완전 무충돌이면 즉시 종료
    }
    for (const s of byTitle.get(order[i])) {
      chosen.push(s);
      if (bt(i + 1, chosen)) { chosen.pop(); return true; }
      chosen.pop();
    }
    return false;
  }
  bt(0, []);
  return best || [];
}

// AI 맞춤 조언 생성
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const semesterKey = req.body.semesterKey || "2026-1";
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { preference: true },
    });
    if (!user) return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });

    const [enrollments, rules] = await Promise.all([
      prisma.enrollment.findMany({ where: { userId: req.userId } }),
      prisma.gradReqRule.findMany({
        where: { department: user.department, admissionYear: user.admissionYear },
      }),
    ]);
    const graduation = computeGraduation(enrollments, rules);

    // 졸업요건 묶음(전공/교양) → 실제 이수구분 값으로 확장
    const GROUP_TO_TYPES = {
      전공: ["전공기초", "전공핵심", "전공심화"],
      교양: ["기초교양", "핵심교양", "심화교양"],
    };
    const shortageGroups = graduation.areas
      .filter((a) => a.shortage > 0 && !a.checklist && a.area !== "총학점")
      .map((a) => a.area);
    const shortageTypes = shortageGroups.flatMap((g) => GROUP_TO_TYPES[g] || []);

    // 후보 강의: 같은 학과의 이번 학기 강의 중 부족 영역 이수구분 우선 (meetings 포함 → 시간표 생성용)
    let candidateCourses = await prisma.course.findMany({
      where: {
        semesterKey,
        department: user.department,
        ...(shortageTypes.length ? { courseType: { in: shortageTypes } } : {}),
      },
      include: { meetings: true },
      take: 30,
      orderBy: { courseCode: "asc" },
    });
    // 부족 영역 매칭 강의가 없으면 학과 전체 강의로 폴백
    if (candidateCourses.length === 0) {
      candidateCourses = await prisma.course.findMany({
        where: { semesterKey, department: user.department },
        include: { meetings: true },
        take: 30,
        orderBy: { courseCode: "asc" },
      });
    }

    // NCS 직무 역량 (키 있으면 조회, 없으면 빈 배열)
    const ncsCompetencies = await getNcsCompetencies(
      user.preference?.interestJob,
      user.preference?.interestArea
    );

    const context = {
      user,
      preference: user.preference,
      graduation,
      candidateCourses,
      ncsCompetencies,
    };

    let { advice, source } = await generateAdvice(context);

    // 1) 추천 과목 결정: Gemini 구조화 마커(@@RECOMMEND: 학수번호들) 우선
    //    → "듣지 말라"고 한 과목은 마커에 안 들어가므로 자연히 제외됨
    let recTitles = [];
    const marker = advice.match(/@@RECOMMEND:\s*([^\n]+)/i);
    if (marker) {
      const tokens = marker[1].split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
      const byCode = new Map(candidateCourses.map((c) => [c.courseCode, c]));
      recTitles = [...new Set(tokens.map((tk) => byCode.get(tk)?.title).filter(Boolean))];
      advice = advice.replace(/\n*@@RECOMMEND:[^\n]*/i, "").trim(); // 표시용에서 마커 제거
    }
    // 2) 마커가 없거나(폴백 등) 매칭 실패 시: 본문에 등장하는 후보 과목명으로 폴백
    if (recTitles.length === 0) {
      recTitles = [...new Set(
        candidateCourses
          .filter((c) => c.title && c.title.length >= 3 && advice.includes(c.title))
          .map((c) => c.title)
      )];
    }
    recTitles = recTitles.slice(0, 8);

    // 3) 추천 과목들의 모든 분반(시간표 있는 것) 조회 → 시간 겹치지 않는 조합 선택
    let recommendedCourses = [];
    if (recTitles.length) {
      const sections = await prisma.course.findMany({
        where: { semesterKey, title: { in: recTitles }, meetings: { some: {} } },
        include: { meetings: true },
      });
      recommendedCourses = pickNonConflicting(recTitles, sections);
    }

    // 캐시 저장
    const contextSummary = `학과 ${user.department} / ${user.grade}-${user.semester} / 직무 ${
      user.preference?.interestJob || "-"
    } / 부족영역 ${shortageGroups.join(",") || "없음"}`;

    const saved = await prisma.recommendation.create({
      data: {
        userId: req.userId,
        semesterKey,
        contextSummary,
        aiAdvice: advice,
      },
    });

    res.status(201).json({ id: saved.id, advice, source, createdAt: saved.createdAt, recommendedCourses });
  } catch (err) {
    next(err);
  }
});

// 저장된 조언 목록
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const recommendations = await prisma.recommendation.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ recommendations });
  } catch (err) {
    next(err);
  }
});

export default router;
