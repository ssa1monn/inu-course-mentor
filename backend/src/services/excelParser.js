import * as XLSX from "xlsx";

// 종합강의시간표 .xlsx 파싱 (SPEC.md 4장 규격)
//
// 구조: 단일 시트, 1행 제목, 2행 헤더, 3행~ 데이터, 20개 컬럼.
// 컬럼 인덱스 (0-based):
//  0 순번 | 1 대학(원) | 2 학과(부) | 3 학년 | 4 이수구분 | 5 이수영역 | 6 학수번호
//  7 교과목명 | 8 영문명 | 9 담당교수 | 10 강의실 | 11 시간표(교시) | 12 시간표(시간)
//  13 교시유형 | 14 학점 | 15 수업구분 | 16 수업유형 | 17 집중이수제 | 18 성적평가 | 19 원어강의

const COL = {
  college: 1,
  department: 2,
  targetGrade: 3,
  courseType: 4,
  courseArea: 5,
  courseCode: 6,
  title: 7,
  titleEn: 8,
  professor: 9,
  room: 10,
  timeText: 12, // 시간표(시간) - 실제 시간의 단일 진실
  credits: 14,
  classType: 16,
  grading: 18,
  language: 19,
};

const DAY_MAP = { 월: 0, 화: 1, 수: 2, 목: 3, 금: 4, 토: 5, 일: 6 };

// "[07-407:화(10:30~11:45),목(09:00~10:15)]" → [{day,startMin,endMin,room}, ...]
export function parseMeetings(timeText, fallbackRoom) {
  if (!timeText) return [];
  let s = String(timeText).trim();
  if (!s || s.includes("시간표 없음")) return [];

  // 양 끝 대괄호 제거
  s = s.replace(/^\[/, "").replace(/\]$/, "").trim();
  if (!s) return [];

  // 첫 ':' 기준으로 강의실코드 / 본문 분리
  const colonIdx = s.indexOf(":");
  let room = fallbackRoom || null;
  let body = s;
  if (colonIdx !== -1) {
    room = s.slice(0, colonIdx).trim() || fallbackRoom || null;
    body = s.slice(colonIdx + 1).trim();
  }

  const meetings = [];
  // 요일 블록은 콤마로 구분. 단 시간 안에는 콤마가 없으므로 안전.
  const blocks = body.split(",");
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // 블록 맨 앞 한국어 요일 글자 탐색
    const dayChar = [...trimmed].find((ch) => ch in DAY_MAP);
    const day = dayChar !== undefined ? DAY_MAP[dayChar] : null;

    // 블록 내 모든 (HH:MM~HH:MM) 추출
    const re = /\((\d{1,2}):(\d{2})~(\d{1,2}):(\d{2})\)/g;
    let m;
    while ((m = re.exec(trimmed)) !== null) {
      const startMin = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
      const endMin = parseInt(m[3], 10) * 60 + parseInt(m[4], 10);
      if (day === null) continue; // 요일 불명이면 건너뜀
      meetings.push({ day, startMin, endMin, room });
    }
  }
  return meetings;
}

// 셀 값을 안전한 문자열로
function cell(row, idx) {
  const v = row[idx];
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

// 버퍼(업로드된 .xlsx)를 파싱하여 강의 배열 반환
export function parseTimetableBuffer(buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  // 헤더 없이 배열의 배열로 읽음
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  const courses = [];
  // 0행 제목, 1행 헤더 → 2행부터 데이터
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const courseCode = cell(row, COL.courseCode);
    const title = cell(row, COL.title);
    if (!courseCode || !title) continue; // 빈 행/잡행 스킵

    const creditsRaw = cell(row, COL.credits);
    const credits = creditsRaw ? parseInt(creditsRaw, 10) || 0 : 0;
    const room = cell(row, COL.room);
    const meetings = parseMeetings(cell(row, COL.timeText), room);

    courses.push({
      courseCode,
      title,
      titleEn: cell(row, COL.titleEn),
      professor: cell(row, COL.professor),
      college: cell(row, COL.college),
      department: cell(row, COL.department) || "기타",
      targetGrade: cell(row, COL.targetGrade) || "전학년",
      courseType: cell(row, COL.courseType) || "기타",
      courseArea: cell(row, COL.courseArea),
      credits,
      room,
      language: cell(row, COL.language),
      grading: cell(row, COL.grading),
      classType: cell(row, COL.classType),
      meetings,
    });
  }
  return courses;
}
