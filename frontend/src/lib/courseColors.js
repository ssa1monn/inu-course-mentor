// 시간표 강의 색상 (CSS 변수). index.css 의 --c1..--c8 와 매칭.
// --c4(빨강)는 충돌 표시(--danger)와 같은 색이라 제외 → 일반 강의에 빨강이 안 쓰이게 함.
export const COURSE_VARS = ["--c1", "--c2", "--c3", "--c5", "--c6", "--c7", "--c8"];
export function courseVar(index) {
  return COURSE_VARS[index % COURSE_VARS.length];
}
