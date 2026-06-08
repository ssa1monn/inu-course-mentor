import * as XLSX from "xlsx";

// 포털 "과목별성적" .xlsx 파싱 → 수강이력(enrollment) 레코드.
//
// 컬럼(0-based): 0 순번,1 년도,2 학기,3 교과목코드,4 교과목명,5 영문,6 학점,7 등급,
//   8 평점,9 이수구분,10 이수영역,11 시간,12 과목구분,13 취득구분,14 성적이관일자,
//   15 재수강,16 성적폐기사유,17 학점포기신청학기,18 학점포기신청,19 학점포기처리

const COL = {
  year: 1,
  term: 2,
  code: 3,
  title: 4,
  credits: 6,
  grade: 7,
  point: 8,
  courseType: 9,
  area: 10,
  discardReason: 16,
};

// 옛 이수구분 → 새 이수구분 정규화 (사용자 확정: 이수영역 기준 자동)
function normalizeCourseType(rawType, rawArea) {
  const t = (rawType || "").trim();
  const area = (rawArea || "").trim();
  switch (t) {
    case "교양필수":
      // 이수영역으로 기초/핵심 구분: 기초교양 영역→기초교양, INU핵심/핵심→핵심교양
      if (area.includes("기초")) return "기초교양";
      if (area.includes("핵심") || area.includes("INU")) return "핵심교양";
      return "기초교양"; // 기본값
    case "교양선택":
      return "심화교양";
    case "전공선택":
      return "전공심화";
    case "전공필수":
      return "전공핵심";
    default:
      return t || "기타"; // 이미 새 분류면 그대로
  }
}

function cell(row, idx) {
  const v = row[idx];
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export function parseGradesBuffer(buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  const records = [];
  // 0행 헤더 → 1행부터 데이터
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const title = cell(row, COL.title);
    if (!title) continue;

    // 성적 폐기(재수강으로 무효화 등)된 행은 제외
    if (cell(row, COL.discardReason)) continue;

    const creditsRaw = cell(row, COL.credits);
    const credits = creditsRaw ? Math.round(parseFloat(creditsRaw)) || 0 : 0;
    const pointRaw = cell(row, COL.point);
    const points = pointRaw ? parseFloat(pointRaw) : null; // P/이수인정 등은 null
    const year = cell(row, COL.year) ? parseInt(cell(row, COL.year), 10) : null;
    const term = cell(row, COL.term);
    const courseType = normalizeCourseType(cell(row, COL.courseType), cell(row, COL.area));

    records.push({
      courseCode: cell(row, COL.code) || "",
      title,
      credits,
      grade: cell(row, COL.grade),
      points: Number.isNaN(points) ? null : points,
      year,
      term,
      semesterKey: year && term ? `${year}-${term}` : "",
      courseType,
      status: "taken",
      source: "grade",
    });
  }
  return records;
}
