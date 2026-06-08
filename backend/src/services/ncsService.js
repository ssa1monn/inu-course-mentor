// NCS(국가직무능력표준) 관련 정보 서비스 연동
// 공공데이터포털: 한국산업인력공단_NCS 관련 정보 서비스 (data.go.kr/data/15063879)
// 엔드포인트: https://c.q-net.or.kr/openapi/Ncs1info/ncsinfo.do
// 파라미터: ServiceKey(필수), type(json/xml), pageNo, numOfRows
//
// 이 API는 검색 필터가 없어 전체 능력단위(약 1,306개)를 받아 백엔드에서 키워드 매칭한다.
// 목록은 자주 바뀌지 않으므로 프로세스 메모리에 캐시한다.

const NCS_ENDPOINT = "https://c.q-net.or.kr/openapi/Ncs1info/ncsinfo.do";

let cache = null; // { at: number, units: [...] }
const CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12시간

// 응답에서 능력단위 배열을 방어적으로 추출 (data.go.kr JSON 중첩 구조 대응)
function extractItems(json) {
  if (!json) return [];
  const candidates = [
    json?.response?.body?.items?.item,
    json?.response?.body?.items,
    json?.body?.items?.item,
    json?.items?.item,
    json?.items,
    Array.isArray(json) ? json : null,
  ];
  for (const c of candidates) {
    if (Array.isArray(c)) return c;
    if (c && typeof c === "object") return [c];
  }
  return [];
}

function normalizeUnit(it) {
  return {
    code: it.ncsClCd || it.compeUnitCd || "",
    name: it.compeUnitName || it.ncsClCdNm || "",
    level: it.compeUnitLevel || "",
    lclas: it.ncsLclasCdnm || it.ncsLclasCdNm || "",
    mclas: it.ncsMclasCdnm || it.ncsMclasCdNm || "",
    sclas: it.ncsSclasCdnm || it.ncsSclasCdNm || "",
    subd: it.ncsSubdCdnm || it.ncsSubdCdNm || "",
    def: it.compeUnitDef || "",
  };
}

async function fetchPage(key, pageNo, numOfRows) {
  // 포털 발급 인증키를 그대로 사용 (data.go.kr 표준 파라미터명 serviceKey)
  const url = `${NCS_ENDPOINT}?serviceKey=${key}&type=json&pageNo=${pageNo}&numOfRows=${numOfRows}`;
  const res = await fetch(url);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("NCS 응답 파싱 실패 (JSON 아님)");
  }
  // 키 미등록/에러 메시지 응답 처리
  if (json && json.message && /KEY/i.test(json.message)) {
    throw new Error(`NCS 인증키 오류: ${json.message}`);
  }
  return extractItems(json).map(normalizeUnit);
}

async function loadAllUnits(key) {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.units;
  const numOfRows = 1000;
  const p1 = await fetchPage(key, 1, numOfRows);
  const p2 = await fetchPage(key, 2, numOfRows);
  const units = [...p1, ...p2].filter((u) => u.name);
  cache = { at: Date.now(), units };
  return units;
}

// 관심 직무/분야 텍스트 → 매칭 능력단위 상위 N개
export async function getNcsCompetencies(interestJob, interestArea, limit = 8) {
  const key = process.env.NCS_API_KEY;
  if (!key) return []; // 키 없으면 우회(폴백)

  try {
    const units = await loadAllUnits(key);
    if (units.length === 0) return [];

    const text = `${interestJob || ""} ${interestArea || ""}`;
    const tokens = text
      .split(/[^가-힣A-Za-z0-9]+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2);

    const scored = units.map((u) => {
      const hay = `${u.name} ${u.lclas} ${u.mclas} ${u.sclas} ${u.subd}`;
      let score = 0;
      for (const tk of tokens) if (hay.includes(tk)) score += 1;
      // 컴퓨터/소프트웨어 전공 보정: 정보통신 대분류 가산
      if (u.lclas.includes("정보통신")) score += 0.5;
      return { u, score };
    });

    let matched = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
    // 매칭이 없으면 정보통신 대분류 능력단위로 폴백
    if (matched.length === 0) {
      matched = scored.filter((s) => s.u.lclas.includes("정보통신")).slice(0, limit).map((s) => ({ ...s, score: 0.5 }));
    }

    return matched.slice(0, limit).map((s) => ({
      name: s.u.name,
      classification: [s.u.lclas, s.u.mclas, s.u.sclas].filter(Boolean).join(" > "),
      level: s.u.level,
      def: (s.u.def || "").slice(0, 120),
    }));
  } catch (err) {
    console.error("[ncsService] 조회 실패, 폴백:", err.message);
    return [];
  }
}
