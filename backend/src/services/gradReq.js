// 졸업요건 충족 계산 (졸업요건.pdf 기반, 묶음 단위)
//
// 이수구분 → 묶음(area) 매핑:
//   전공기초/전공핵심/전공심화 → "전공"
//   기초교양/핵심교양/심화교양 → "교양"
//   그 외(일반선택/교직/군사학) → 총학점에만 반영
//
// 규칙 area: "전공", "교양", "총학점" (학점 요건) + "영어졸업인증","졸업작품발표"(비학점 충족항목)

const MAJOR_TYPES = ["전공기초", "전공핵심", "전공심화"];
const LIBERAL_TYPES = ["기초교양", "핵심교양", "심화교양"];

function groupOf(courseType) {
  if (MAJOR_TYPES.includes(courseType)) return "전공";
  if (LIBERAL_TYPES.includes(courseType)) return "교양";
  return "기타";
}

export function computeGraduation(enrollments, rules) {
  const earnedByGroup = { 전공: 0, 교양: 0, 기타: 0 };
  const plannedByGroup = { 전공: 0, 교양: 0, 기타: 0 };
  // 교양 세부(기초/핵심/심화) 집계 - 참고 표시용
  const liberalDetail = { 기초교양: 0, 핵심교양: 0, 심화교양: 0 };
  const majorDetail = { 전공기초: 0, 전공핵심: 0, 전공심화: 0 };
  let totalEarned = 0;
  let totalPlanned = 0;

  for (const e of enrollments) {
    const credits = e.credits || 0;
    const g = groupOf(e.courseType);
    if (e.status === "taken") {
      earnedByGroup[g] += credits;
      totalEarned += credits;
      if (g === "교양" && liberalDetail[e.courseType] !== undefined) liberalDetail[e.courseType] += credits;
      if (g === "전공" && majorDetail[e.courseType] !== undefined) majorDetail[e.courseType] += credits;
    } else if (e.status === "planned") {
      plannedByGroup[g] += credits;
      totalPlanned += credits;
    }
  }

  const areas = rules.map((rule) => {
    // 비학점 충족 항목
    if (rule.requiredCredits === 0) {
      return {
        area: rule.area,
        required: 0,
        earned: 0,
        planned: 0,
        shortage: 0,
        percent: 100,
        checklist: true,
        etcRequirement: rule.etcRequirement || null,
      };
    }
    let earned;
    let planned;
    if (rule.area === "총학점") {
      earned = totalEarned;
      planned = totalPlanned;
    } else if (rule.area === "전공") {
      earned = earnedByGroup["전공"];
      planned = plannedByGroup["전공"];
    } else if (rule.area === "교양") {
      earned = earnedByGroup["교양"];
      planned = plannedByGroup["교양"];
    } else {
      earned = 0;
      planned = 0;
    }
    const shortage = Math.max(0, rule.requiredCredits - earned);
    const percent =
      rule.requiredCredits > 0 ? Math.min(100, Math.round((earned / rule.requiredCredits) * 100)) : 100;
    return {
      area: rule.area,
      required: rule.requiredCredits,
      earned,
      planned,
      shortage,
      percent,
      checklist: false,
      etcRequirement: rule.etcRequirement || null,
    };
  });

  return {
    areas,
    totalEarned,
    totalPlanned,
    liberalDetail,
    majorDetail,
    isDemo: true,
  };
}
