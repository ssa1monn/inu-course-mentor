import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import api from "../lib/api.js";
import { createTimetable } from "../lib/idb.js";
import { meetingsToText } from "../lib/time.js";
import Icon from "../components/Icon.jsx";
import { PageHeader } from "../components/ui.jsx";

export default function Advice() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [grad, setGrad] = useState(null);
  const [advice, setAdvice] = useState("");
  const [source, setSource] = useState("");
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [openId, setOpenId] = useState(null);

  function loadHistory() { api.get("/recommend").then(({ data }) => setHistory(data.recommendations || [])).catch(() => {}); }
  useEffect(() => {
    loadHistory();
    api.get("/me").then(({ data }) => setMe(data)).catch(() => {});
    api.get("/graduation").then(({ data }) => setGrad(data)).catch(() => {});
  }, []);

  async function generate() {
    setLoading(true); setError(""); setRecommended([]);
    try {
      const { data } = await api.post("/recommend", { semesterKey: "2026-1" });
      setAdvice(data.advice); setSource(data.source);
      setRecommended(data.recommendedCourses || []);
      loadHistory();
    } catch (err) {
      setError(err.response?.data?.error || "조언 생성에 실패했습니다.");
    } finally { setLoading(false); }
  }

  async function createFromAdvice() {
    const credits = recommended.reduce((s, c) => s + (c.credits || 0), 0);
    if (!window.confirm(`AI가 추천한 ${recommended.length}개 강의(${credits}학점)로 새 시간표를 만들까요?`)) return;
    await createTimetable({ name: "AI 추천 시간표", year: 2026, term: "1학기", courses: recommended });
    navigate("/timetable");
  }

  const total = grad?.areas?.find((a) => a.area === "총학점");
  const remaining = total ? Math.max(0, total.required - total.earned) : null;
  const shortage = (grad?.areas || []).filter((a) => !a.checklist && a.shortage > 0 && a.area !== "총학점").map((a) => a.area);

  return (
    <div className="page rise">
      <PageHeader title="AI 맞춤 조언" sub="프로필 · 졸업요건 · 이번 학기 강의를 종합해 수강 로드맵을 생성합니다." />

      {/* 컨텍스트 */}
      <div className="card mb-4 flex flex-wrap items-center gap-3">
        <span className="text-[11.5px] font-bold uppercase tracking-wider text-fg-faint">AI가 참고하는 정보</span>
        {me && <span className="chip" style={{ cursor: "default" }}><Icon name="user" size={13} /> {me.department} {me.grade}학년</span>}
        {me?.preference?.interestJob && <span className="chip" style={{ cursor: "default" }}><Icon name="target" size={13} /> {me.preference.interestJob}</span>}
        {remaining != null && <span className="chip" style={{ cursor: "default" }}><Icon name="cap" size={13} /> 졸업 {remaining}학점 남음</span>}
        {shortage.length > 0 && <span className="chip" style={{ cursor: "default" }}><Icon name="info" size={13} /> 부족: {shortage.join("·")}</span>}
        <div className="flex-1" />
        <button className="btn btn-primary" disabled={loading} onClick={generate}>
          <Icon name="sparkle" size={16} /> {loading ? "생성 중…" : advice ? "다시 생성" : "AI 조언 생성하기"}
        </button>
      </div>

      {error && <div className="mb-4 rounded-ctl px-3 py-2.5 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>{error}</div>}

      {loading && (
        <div className="card flex flex-col gap-3">
          <div className="skel" style={{ height: 20, width: "40%" }} />
          <div className="skel" style={{ height: 13 }} /><div className="skel" style={{ height: 13, width: "92%" }} /><div className="skel" style={{ height: 13, width: "70%" }} />
          <div className="mt-1 flex items-center gap-2.5 text-[13px] font-semibold text-inu-sky"><Icon name="sparkle" size={16} /> 맞춤 로드맵을 작성하고 있어요…</div>
        </div>
      )}

      {!loading && advice && (
        <div className="card rise" style={{ borderColor: "color-mix(in srgb, var(--inu-sky) 28%, var(--border))" }}>
          <div className="mb-4 flex items-center gap-2.5 border-b pb-4" style={{ borderColor: "var(--border)" }}>
            <span className="inline-flex items-center justify-center rounded-xl" style={{ width: 36, height: 36, background: "var(--inu-blue)", color: "var(--inu-yellow)" }}><Icon name="sparkle" size={19} /></span>
            <div>
              <div className="text-[15px] font-extrabold text-fg">2026-1 맞춤 수강 조언</div>
              <div className="text-xs text-fg-faint">{new Date().toLocaleString("ko-KR")} · {source === "fallback" ? "규칙 기반" : "AI"}</div>
            </div>
          </div>
          {source === "fallback" && (
            <div className="mb-3 rounded-ctl px-3 py-2 text-xs" style={{ background: "var(--surface-2)", color: "var(--text-2)" }}>
              ※ AI 응답을 가져오지 못해 규칙 기반 요약을 표시합니다. (GEMINI_API_KEY 미설정 또는 호출 실패)
            </div>
          )}
          <div className="prose-inu"><ReactMarkdown>{advice}</ReactMarkdown></div>
        </div>
      )}

      {/* AI 추천 강의로 시간표 생성 */}
      {!loading && recommended.length > 0 && (
        <div className="card rise mt-4 tint-blue">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="inline-flex flex-none items-center justify-center rounded-xl" style={{ width: 36, height: 36, background: "var(--inu-blue)", color: "var(--inu-yellow)" }}><Icon name="calendar" size={19} /></span>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-extrabold text-fg">AI가 추천한 강의로 시간표를 만들까요?</div>
              <div className="text-xs text-fg-faint">조언에서 언급된 {recommended.length}개 강의 · {recommended.reduce((s, c) => s + (c.credits || 0), 0)}학점</div>
            </div>
            <button className="btn btn-primary flex-none" onClick={createFromAdvice}><Icon name="check" size={16} /> 예, 시간표 생성</button>
          </div>
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
            {recommended.map((c) => (
              <div key={c.id} className="card flex items-center gap-2.5" style={{ padding: 11, boxShadow: "none", background: "var(--surface-2)" }}>
                <span className="badge badge-blue flex-none">{c.courseType}</span>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-bold text-fg">{c.title}</div>
                  <div className="truncate text-[11px] text-fg-faint">{meetingsToText(c.meetings)} · {c.credits}학점</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !advice && (
        <div className="card border-dashed py-13 text-center" style={{ paddingTop: 54, paddingBottom: 54 }}>
          <span className="mb-3.5 inline-flex h-[60px] w-[60px] items-center justify-center rounded-2xl" style={{ background: "var(--inu-light)", color: "var(--inu-sky)" }}><Icon name="sparkle" size={30} /></span>
          <h3 className="m-0 text-[17px] font-extrabold text-fg">아직 생성된 조언이 없어요</h3>
          <p className="mx-auto mb-4.5 mt-1.5 max-w-[380px] text-sm text-fg-muted" style={{ marginBottom: 18 }}>위 정보를 바탕으로 이번 학기 수강 우선순위와 졸업 로드맵을 한 번에 정리해 드려요.</p>
          <button className="btn btn-primary btn-lg" onClick={generate}><Icon name="sparkle" size={17} /> AI 조언 생성하기</button>
        </div>
      )}

      {/* 이력 */}
      {history.length > 0 && (
        <div className="mt-7">
          <h2 className="mb-2.5 text-base font-extrabold text-fg">이전 조언 이력</h2>
          <div className="flex flex-col gap-2.5">
            {history.map((h) => {
              const open = openId === h.id;
              return (
                <div key={h.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                  <button className="flex w-full items-center gap-2.5 px-4 py-3 text-left" onClick={() => setOpenId(open ? null : h.id)}>
                    <Icon name="clock" size={15} style={{ color: "var(--text-3)", flex: "none" }} />
                    <span className="num text-[12.5px] text-fg-muted">{new Date(h.createdAt).toLocaleString("ko-KR")}</span>
                    <span className="truncate text-[12.5px] text-fg-faint">· {h.contextSummary}</span>
                    <span className="flex-1" />
                    <Icon name={open ? "chevD" : "chevR"} size={15} style={{ color: "var(--text-3)", flex: "none" }} />
                  </button>
                  {open && <div className="prose-inu border-t px-4 py-3.5 text-[13.5px]" style={{ borderColor: "var(--border)" }}><ReactMarkdown>{h.aiAdvice}</ReactMarkdown></div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
