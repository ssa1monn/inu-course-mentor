import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import api from "../lib/api.js";
import {
  getActiveTimetable, listTimetables, setActiveTimetable, createTimetable,
  deleteTimetable, removeCourseFromTimetable, clearTimetable,
} from "../lib/idb.js";
import { DAYS, meetingsToText, findConflicts, minToHHMM } from "../lib/time.js";
import { courseVar } from "../lib/courseColors.js";
import Icon from "../components/Icon.jsx";
import { PageHeader, Empty } from "../components/ui.jsx";

const PX = 1.15, HEAD = 38;
const TERMS = ["1학기", "2학기", "여름계절학기", "겨울계절학기"];
const YEARS = Array.from({ length: 8 }, (_, i) => 2026 - i);

// 같은 요일 겹치는 블록을 서브컬럼으로 분할 (서로 가리지 않게)
function layoutDay(items) {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const clusters = []; let cur = [], maxEnd = -1;
  sorted.forEach((it) => {
    if (cur.length && it.startMin >= maxEnd) { clusters.push(cur); cur = []; maxEnd = -1; }
    cur.push(it); maxEnd = Math.max(maxEnd, it.endMin);
  });
  if (cur.length) clusters.push(cur);
  clusters.forEach((cl) => {
    const ends = [];
    cl.forEach((it) => {
      let ci = ends.findIndex((e) => e <= it.startMin);
      if (ci === -1) { ci = ends.length; ends.push(it.endMin); } else ends[ci] = it.endMin;
      it._col = ci;
    });
    cl.forEach((it) => it._ncol = ends.length);
  });
  return sorted;
}

function RecentAdvice({ advice, navigate }) {
  return (
    <div className="card" style={{ borderColor: "color-mix(in srgb, var(--inu-sky) 24%, var(--border))" }}>
      <div className="mb-3.5 flex items-center gap-2.5">
        <span className="inline-flex flex-none items-center justify-center rounded-xl" style={{ width: 38, height: 38, background: "var(--inu-blue)", color: "var(--inu-yellow)" }}><Icon name="sparkle" size={20} /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-extrabold text-fg">최근 AI 조언</div>
          {advice && <div className="text-[11.5px] text-fg-faint">{new Date(advice.createdAt).toLocaleString("ko-KR")} · AI 멘토</div>}
        </div>
        <span className="inline-flex cursor-pointer items-center gap-0.5 whitespace-nowrap text-[13px] font-bold text-inu-sky" onClick={() => navigate("/advice")}>전체 보기 <Icon name="chevR" size={13} /></span>
      </div>
      {advice ? (
        <div className="prose-inu max-h-[280px] overflow-y-auto text-[13.5px] leading-relaxed text-fg-muted" style={{ paddingRight: 6 }}>
          <ReactMarkdown>{advice.aiAdvice}</ReactMarkdown>
        </div>
      ) : (
        <p className="m-0 text-[13.5px] text-fg-muted">아직 생성된 조언이 없어요. <span className="cursor-pointer font-bold text-inu-sky" onClick={() => navigate("/advice")}>AI 조언 받기 →</span></p>
      )}
    </div>
  );
}

// 시간표 생성 모달
function CreateModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [year, setYear] = useState(2026);
  const [term, setTerm] = useState("1학기");
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: "color-mix(in srgb, #000 45%, transparent)" }} onClick={onClose}>
      <div className="card w-full max-w-[400px]" style={{ padding: 24 }} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="m-0 text-[17px] font-extrabold text-fg">새 시간표 만들기</h2>
          <button className="btn btn-quiet btn-icon" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div className="flex flex-col gap-3.5">
          <div>
            <label className="field-label">시간표 이름</label>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 1안, 전공 위주" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="field-label">학년도</label>
              <select className="field" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {YEARS.map((y) => <option key={y} value={y}>{y}학년도</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">학기</label>
              <select className="field" value={term} onChange={(e) => setTerm(e.target.value)}>
                {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <button className="btn btn-primary btn-block mt-1" onClick={() => onCreate({ name: name.trim() || `${year} ${term} 시간표`, year, term })}>
            <Icon name="plus" size={16} /> 만들기
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Timetable() {
  const navigate = useNavigate();
  const [tts, setTts] = useState([]); // 모든 시간표
  const [active, setActive] = useState(null); // 활성 시간표 {id,name,year,term,courses}
  const [hoverId, setHoverId] = useState(null);
  const [openConflict, setOpenConflict] = useState(null);
  const [advice, setAdvice] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const rightRef = useRef(null);
  const [sideH, setSideH] = useState(null);

  async function refresh() {
    const act = await getActiveTimetable().catch(() => null);
    const list = await listTimetables().catch(() => []);
    setActive(act);
    setTts(list);
  }
  useEffect(() => {
    refresh();
    api.get("/recommend").then(({ data }) => setAdvice(data.recommendations?.[0] || null)).catch(() => {});
  }, []);

  const courses = active?.courses || [];

  async function switchTo(id) { await setActiveTimetable(id); refresh(); }
  async function handleCreate(opts) { await createTimetable(opts); setShowCreate(false); refresh(); }
  async function handleDeleteTt() {
    if (!active) return;
    if (window.confirm(`"${active.name}" 시간표를 삭제할까요?`)) { await deleteTimetable(active.id); refresh(); }
  }
  async function handleRemove(id) { await removeCourseFromTimetable(id); refresh(); }
  async function handleClear() { if (window.confirm("이 시간표의 강의를 모두 비울까요?")) { await clearTimetable(); refresh(); } }

  // 학년도-학기별로 그룹핑 (optgroup)
  const groups = {};
  tts.forEach((t) => { const k = `${t.year}학년도 ${t.term}`; (groups[k] = groups[k] || []).push(t); });

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1081px)");
    const measure = () => setSideH(mq.matches && rightRef.current ? rightRef.current.offsetHeight : null);
    measure();
    const ro = new ResizeObserver(measure);
    if (rightRef.current) ro.observe(rightRef.current);
    window.addEventListener("resize", measure);
    mq.addEventListener && mq.addEventListener("change", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); mq.removeEventListener && mq.removeEventListener("change", measure); };
  }, [courses.length, advice]);

  const meetingsAll = courses.flatMap((c) => (c.meetings || []).map((m) => ({ ...m, c })));
  let minS = 540, maxE = 1080, maxDay = 4;
  meetingsAll.forEach((m) => { minS = Math.min(minS, m.startMin); maxE = Math.max(maxE, m.endMin); maxDay = Math.max(maxDay, m.day); });
  const startH = Math.floor(minS / 60), endH = Math.ceil(maxE / 60);
  const base = startH * 60, gridH = (endH - startH) * 60 * PX;
  const dayCount = Math.max(5, maxDay + 1);
  const hours = []; for (let h = startH; h <= endH; h++) hours.push(h);
  const colorIdx = {}; courses.forEach((c, i) => (colorIdx[c.id] = courseVar(i)));

  const conflictMap = {};
  courses.forEach((c) => (conflictMap[c.id] = findConflicts(c, courses)));
  const conflictIds = new Set(courses.filter((c) => conflictMap[c.id].length).map((c) => c.id));
  const totalCredits = courses.reduce((s, c) => s + (c.credits || 0), 0);

  return (
    <div className="page rise">
      <PageHeader title="시간표 생성" sub="관심 강의를 담아 주간 시간표를 구성하세요. 시간 충돌은 자동으로 감지됩니다."
        actions={<>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Icon name="plus" size={16} /> 시간표 생성</button>
          <button className="btn btn-ghost" onClick={() => navigate("/courses")}><Icon name="search" size={16} /> 강의 담기</button>
        </>} />

      <div className="tt-grid grid items-start gap-4.5" style={{ gridTemplateColumns: "300px minmax(0,1fr)", gap: 18 }}>
        {/* 좌측 */}
        <div className="tt-side flex flex-col gap-3.5" style={{ height: sideH || undefined }}>
          <div className="card" style={{ flex: "none" }}>
            <div className="flex items-center gap-2">
              <select className="field" style={{ fontWeight: 700, color: "var(--inu-sky)" }} value={active?.id ?? ""} onChange={(e) => switchTo(Number(e.target.value))}>
                {Object.entries(groups).map(([label, items]) => (
                  <optgroup key={label} label={label}>
                    {items.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </optgroup>
                ))}
              </select>
              {tts.length > 1 && (
                <button className="btn btn-quiet btn-icon flex-none" style={{ color: "var(--text-3)" }} title="이 시간표 삭제" onClick={handleDeleteTt}><Icon name="x" size={16} /></button>
              )}
            </div>
            <div className="mb-1 mt-4.5 flex items-center justify-between" style={{ marginTop: 18 }}>
              <div className="num text-fg" style={{ fontFamily: "Sora, Pretendard, sans-serif", fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{totalCredits}<span className="text-fg-faint" style={{ fontSize: 15 }}> 학점</span></div>
              <span className="badge badge-blue">{courses.length}과목</span>
            </div>
            <div className="text-xs text-fg-faint">{conflictIds.size ? `${conflictIds.size}개 강의 시간 겹침` : "충돌 없음 · 깔끔해요"}</div>
            {conflictIds.size > 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-ctl px-2.5 py-2.5 text-xs font-semibold" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}><Icon name="info" size={15} /> 겹치는 강의의 시간을 조정해 보세요</div>
            )}
          </div>

          {courses.length === 0 ? (
            <Empty icon="calendar" title="담은 강의가 없어요" desc="강의 검색에서 관심 강의를 담아보세요." action={<button className="btn btn-primary btn-sm" onClick={() => navigate("/courses")}>강의 검색</button>} />
          ) : (
            <>
              <div className="flex flex-col gap-2.5" style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", paddingRight: 5 }}>
                {courses.map((c) => {
                  const cfList = conflictMap[c.id], cf = cfList.length > 0;
                  const open = openConflict === c.id, lit = hoverId === c.id;
                  return (
                    <div key={c.id} className="card" onMouseEnter={() => setHoverId(c.id)} onMouseLeave={() => setHoverId(null)}
                      style={{ padding: 13, flex: "none", borderLeft: `4px solid var(${colorIdx[c.id]})`, cursor: "default",
                        boxShadow: lit ? "var(--shadow)" : "var(--shadow-sm)", transform: lit ? "translateX(2px)" : "none",
                        transition: "transform .16s var(--ease), box-shadow .16s, border-color .16s",
                        borderColor: cf ? "color-mix(in srgb, var(--danger) 32%, var(--border))" : (lit ? "var(--border-strong)" : undefined) }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-bold text-fg">{c.title}</div>
                          <div className="mt-0.5 text-[11.5px] text-fg-faint">{c.professor || "교수미정"} · {c.credits}학점</div>
                          <div className="mt-1 text-[11.5px] text-inu-sky">{meetingsToText(c.meetings)}</div>
                        </div>
                        <button className="btn btn-quiet btn-icon" style={{ padding: 5, color: "var(--text-3)" }} onClick={() => handleRemove(c.id)} title="빼기"><Icon name="x" size={15} /></button>
                      </div>
                      {cf && (
                        <div className="mt-2">
                          <button onClick={() => setOpenConflict(open ? null : c.id)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, cursor: "pointer", border: "1px solid transparent", transition: "all .15s var(--ease)", background: open ? "var(--danger)" : "var(--danger-soft)", color: open ? "#fff" : "var(--danger)" }}>
                            <Icon name="info" size={12} /> {cfList.length}개 강의와 겹침 <Icon name={open ? "chevD" : "chevR"} size={11} />
                          </button>
                          {open && (
                            <div className="mt-2 flex flex-col gap-1.5 pl-0.5">
                              {cfList.map((o) => (
                                <div key={o.id} className="flex items-center gap-1.5 text-[11.5px] text-fg-muted" onMouseEnter={() => setHoverId(o.id)} onMouseLeave={() => setHoverId(c.id)}>
                                  <span className="dot" style={{ width: 7, height: 7, background: `var(${colorIdx[o.id]})` }} />
                                  <span className="font-semibold text-fg">{o.title}</span>
                                  <span className="text-fg-faint">· {meetingsToText(o.meetings)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <button className="btn btn-danger btn-sm" style={{ flex: "none" }} onClick={handleClear}>전체 비우기</button>
            </>
          )}
        </div>

        {/* 우측: 그리드 + 최근 AI 조언 */}
        <div className="flex min-w-0 flex-col gap-4">
          <div ref={rightRef} className="flex flex-col gap-4">
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="flex" style={{ minWidth: 560 }}>
                {/* 시간 축 */}
                <div className="flex-none border-r" style={{ width: 52, borderColor: "var(--border)" }}>
                  <div style={{ height: HEAD, borderBottom: "1px solid var(--border)" }} />
                  <div className="relative" style={{ height: gridH + 12 }}>
                    {hours.map((h) => <div key={h} className="num absolute" style={{ right: 9, top: Math.max(1, (h * 60 - base) * PX - 6), fontSize: 11, fontWeight: 600, color: "var(--text-3)" }}>{String(h).padStart(2, "0")}</div>)}
                  </div>
                </div>
                {/* 요일 컬럼 */}
                {Array.from({ length: dayCount }, (_, d) => (
                  <div key={d} className="min-w-0 flex-1" style={{ borderRight: d < dayCount - 1 ? "1px solid var(--border)" : "none" }}>
                    <div className="flex items-center justify-center text-[13px] font-bold text-fg-muted" style={{ height: HEAD, borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>{DAYS[d]}</div>
                    <div className="relative" style={{ height: gridH + 12 }}>
                      {hours.map((h) => <div key={h} className="absolute left-0 right-0" style={{ top: (h * 60 - base) * PX, borderTop: "1px solid var(--border)", opacity: .55 }} />)}
                      {layoutDay(meetingsAll.filter((m) => m.day === d)).map((m, i) => {
                        const cf = conflictIds.has(m.c.id), ccol = colorIdx[m.c.id];
                        const lit = hoverId === m.c.id, dim = hoverId != null && !lit;
                        const tint = cf ? "--danger" : ccol;
                        const nc = m._ncol || 1, ci = m._col || 0;
                        return (
                          <div key={i} title={`${m.c.title} ${minToHHMM(m.startMin)}~${minToHHMM(m.endMin)}`}
                            onMouseEnter={() => setHoverId(m.c.id)} onMouseLeave={() => setHoverId(null)}
                            style={{ position: "absolute",
                              left: `calc(3px + ${ci} * ((100% - 6px) / ${nc}))`,
                              width: `calc((100% - 6px) / ${nc} - ${nc > 1 ? 2 : 0}px)`,
                              top: (m.startMin - base) * PX + 1, height: Math.max(22, (m.endMin - m.startMin) * PX - 2),
                              background: `color-mix(in srgb, var(${tint}) ${lit ? 24 : (cf ? 9 : 13)}%, var(--surface))`, borderRadius: 8, padding: "5px 7px", overflow: "hidden",
                              borderLeft: `3px solid var(${tint})`,
                              boxShadow: lit ? "var(--shadow-lg)" : (cf ? "inset 0 0 0 1px color-mix(in srgb, var(--danger) 38%, transparent)" : "var(--shadow-sm)"),
                              transform: lit ? "scale(1.045)" : "none", transformOrigin: "center", zIndex: lit ? 6 : 1,
                              opacity: dim ? .4 : 1, cursor: "default",
                              transition: "transform .16s var(--ease), box-shadow .16s, opacity .16s, background .16s" }}>
                            {cf && <span className="absolute flex" style={{ top: 4, right: 5, color: "var(--danger)" }}><Icon name="info" size={11} /></span>}
                            <div style={{ fontWeight: 700, fontSize: 11.5, color: `color-mix(in srgb, var(${tint}) 70%, var(--text))`, lineHeight: 1.2, paddingRight: cf ? 12 : 0 }}>{m.c.title}</div>
                            <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>{m.room || ""}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <RecentAdvice advice={advice} navigate={navigate} />
          </div>
          <p className="m-0 flex items-center gap-1.5 text-xs text-fg-faint"><Icon name="info" size={14} /> 시간표는 브라우저(IndexedDB)에 저장되어 새로고침해도 유지됩니다.</p>
        </div>
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
    </div>
  );
}
