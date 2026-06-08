// 평점(GPA) 계산 유틸

const MAJOR_TYPES = ["전공기초", "전공핵심", "전공심화"];
const LIBERAL_TYPES = ["기초교양", "핵심교양", "심화교양"];

// 학기 키("2022-1학기","2023-겨울계절학기") → 짧은 라벨("22-1","23-w","24-s")
export function shortSemesterLabel(key) {
  const m = String(key || "").match(/\d{2}(\d{2})-(.+)/);
  if (!m) return key;
  const yy = m[1];
  const term = m[2];
  const t = term.includes("여름") ? "s" : term.includes("겨울") ? "w" : term.replace("학기", "");
  return `${yy}-${t}`;
}

export function isMajor(courseType) {
  return MAJOR_TYPES.includes(courseType);
}
export function isLiberal(courseType) {
  return LIBERAL_TYPES.includes(courseType);
}

// 평점 계산: points(평점)이 있는 과목만 (P/이수인정 제외)
function gpaOf(list) {
  let sumP = 0;
  let sumC = 0;
  for (const e of list) {
    if (e.points === null || e.points === undefined) continue;
    sumP += e.points * (e.credits || 0);
    sumC += e.credits || 0;
  }
  return sumC > 0 ? sumP / sumC : 0;
}

export function computeGpaStats(enrollments) {
  const graded = enrollments.filter((e) => e.points !== null && e.points !== undefined);

  const overall = gpaOf(enrollments);
  const major = gpaOf(enrollments.filter((e) => isMajor(e.courseType)));

  // 취득 학점(전체 taken 학점 = P 포함)
  const earnedCredits = enrollments
    .filter((e) => e.status === "taken")
    .reduce((s, e) => s + (e.credits || 0), 0);
  // 평점 산입 학점(P 제외)
  const gradedCredits = graded.reduce((s, e) => s + (e.credits || 0), 0);

  // 학기별 GPA
  const bySemMap = {};
  for (const e of enrollments) {
    const key = e.semesterKey || `${e.year || "?"}-${e.term || "?"}`;
    (bySemMap[key] = bySemMap[key] || []).push(e);
  }
  const bySemester = Object.entries(bySemMap)
    .map(([key, list]) => ({
      key,
      gpa: gpaOf(list),
      credits: list.reduce((s, e) => s + (e.credits || 0), 0),
      count: list.length,
    }))
    .sort((a, b) => a.key.localeCompare(b.key));

  // 등급 분포
  const dist = {};
  for (const e of graded) {
    const g = e.grade || "기타";
    dist[g] = (dist[g] || 0) + 1;
  }

  return { overall, major, earnedCredits, gradedCredits, bySemester, dist, gradedCount: graded.length };
}
