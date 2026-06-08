// 시간/요일 유틸 + 시간 충돌 감지

export const DAYS = ["월", "화", "수", "목", "금", "토", "일"];

// 분 → "HH:MM"
export function minToHHMM(min) {
  const h = String(Math.floor(min / 60)).padStart(2, "0");
  const m = String(min % 60).padStart(2, "0");
  return `${h}:${m}`;
}

// 한 강의의 meetings를 사람이 읽는 문자열로 ("화 10:30~11:45, 목 09:00~10:15")
export function meetingsToText(meetings) {
  if (!meetings || meetings.length === 0) return "시간 미정";
  return meetings
    .map((m) => `${DAYS[m.day]} ${minToHHMM(m.startMin)}~${minToHHMM(m.endMin)}`)
    .join(", ");
}

// 두 미팅이 겹치는가
function meetingsOverlap(a, b) {
  return a.day === b.day && a.startMin < b.endMin && b.startMin < a.endMin;
}

// 새 강의(course)가 기존 강의 목록(existing)과 충돌하는지 검사.
// 충돌하는 기존 강의 배열을 반환(없으면 빈 배열).
export function findConflicts(course, existing) {
  const conflicts = [];
  for (const ex of existing) {
    if (ex.id === course.id) continue;
    for (const m1 of course.meetings || []) {
      for (const m2 of ex.meetings || []) {
        if (meetingsOverlap(m1, m2)) {
          conflicts.push(ex);
        }
      }
    }
  }
  // 중복 제거
  return [...new Map(conflicts.map((c) => [c.id, c])).values()];
}
