import { GoogleGenerativeAI } from "@google/generative-ai";

// AI 맞춤 조언 생성 (SPEC.md 7장)
// 키는 서버 환경변수(GEMINI_API_KEY)에서만 사용. 클라이언트에 노출하지 않는다.

// 컨텍스트 → 프롬프트 문자열
function buildPrompt({ user, preference, graduation, candidateCourses, ncsCompetencies }) {
  const shortages = graduation.areas
    .filter((a) => a.shortage > 0)
    .map((a) => `${a.area}: ${a.shortage}학점 부족 (현재 ${a.earned}/${a.required})`)
    .join(", ") || "현재 데이터 기준 부족 영역 없음";

  const candidates = candidateCourses
    .slice(0, 20)
    .map((c) => `- [${c.courseType}] ${c.title} (${c.courseCode}, ${c.credits}학점, ${c.professor || "교수미정"})`)
    .join("\n");

  const ncs = (ncsCompetencies || [])
    .map((n) => `- ${n.name}${n.classification ? ` (${n.classification})` : ""}${n.def ? `: ${n.def}` : ""}`)
    .join("\n");

  return `당신은 인천대학교 학생을 돕는 학사 멘토입니다. 아래 학생 정보를 바탕으로 한국어로,
구조화된 마크다운 형식의 수강 및 학사 조언을 작성하세요.

[학생 정보]
- 학과: ${user.department}
- 학년/학기: ${user.grade}학년 ${user.semester}학기 (입학 ${user.admissionYear}년)
- 관심 직무: ${preference?.interestJob || "미입력"}
- 학습 선호: ${preference?.subjectTaste || "미입력"}${preference?.interestArea ? ` / 관심분야: ${preference.interestArea}` : ""}

[졸업요건 현황 (데모 기준)]
${shortages}

[이번 학기 후보 강의 (학과/이수구분 매칭)]
${candidates || "후보 강의 데이터가 없습니다. 종합시간표를 먼저 업로드하세요."}
${ncs ? `\n[희망 직무 관련 NCS 능력단위 (국가직무능력표준)]\n${ncs}\n` : ""}
다음 4가지를 반드시 포함하세요:
1. **희망 직무에 맞춘 추천 과목과 이유**${ncs ? " (위 NCS 능력단위를 근거로 연결할 것)" : ""}
2. **현재 학년/학기에 우선해야 할 수강 로드맵**
3. **졸업요건 중 부족한 영역 보완 방법**
4. **선수과목 점검 및 리마인드**

답변은 친근하지만 간결하게, 700자 내외로 작성하세요.

그리고 답변 맨 마지막 줄에, 위 후보 강의 중 "이번 학기에 실제로 수강을 추천하는" 과목의 학수번호만
아래 형식으로 정확히 출력하세요. 듣지 말라고 한 과목이나 이미 들은 과목은 절대 포함하지 마세요.
다른 설명 없이 이 한 줄만 추가하세요:
@@RECOMMEND: 학수번호1, 학수번호2, 학수번호3`;
}

// 규칙 기반 폴백 (AI 키 없음/쿼터 초과 시)
function fallbackAdvice({ user, preference, graduation, candidateCourses }) {
  const shortages = graduation.areas.filter((a) => a.shortage > 0);
  const lines = [];
  lines.push(`## ${user.department} ${user.grade}학년 ${user.semester}학기 학사 조언 (요약)`);
  lines.push("");
  lines.push("> AI 응답을 가져올 수 없어 규칙 기반 요약을 제공합니다.");
  lines.push("");
  if (preference?.interestJob) {
    lines.push(`### 1. 관심 직무: ${preference.interestJob}`);
    lines.push("관심 직무와 관련된 전공핵심/전공심화 과목을 우선 고려하세요.");
    lines.push("");
  }
  lines.push("### 2. 졸업요건 부족 영역");
  if (shortages.length === 0) {
    lines.push("현재 데이터 기준 부족한 영역이 없습니다. (데모 기준)");
  } else {
    for (const a of shortages) {
      lines.push(`- ${a.area}: ${a.shortage}학점 부족 (현재 ${a.earned}/${a.required})`);
    }
  }
  lines.push("");
  if (candidateCourses.length > 0) {
    lines.push("### 3. 이번 학기 후보 강의");
    for (const c of candidateCourses.slice(0, 8)) {
      lines.push(`- [${c.courseType}] ${c.title} (${c.credits}학점)`);
    }
  } else {
    lines.push("### 3. 후보 강의 없음 — 종합시간표 엑셀을 먼저 업로드하세요.");
  }
  return lines.join("\n");
}

export async function generateAdvice(context) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";

  if (!apiKey) {
    return { advice: fallbackAdvice(context), source: "fallback" };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const m = genAI.getGenerativeModel({ model });
    const prompt = buildPrompt(context);
    const result = await m.generateContent(prompt);
    const text = result.response.text();
    return { advice: text, source: "gemini" };
  } catch (err) {
    console.error("[aiAdvisor] Gemini 호출 실패, 폴백 사용:", err.message);
    return { advice: fallbackAdvice(context), source: "fallback" };
  }
}

export { buildPrompt };
