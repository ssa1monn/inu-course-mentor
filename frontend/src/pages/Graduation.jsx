import { useEffect, useState } from "react";
import api from "../lib/api.js";
import Icon from "../components/Icon.jsx";
import { ProgressRing } from "../components/charts.jsx";
import { PageHeader, SectionTitle } from "../components/ui.jsx";

const COURSE_TYPES = ["전공기초", "전공핵심", "전공심화", "기초교양", "핵심교양", "심화교양", "일반선택"];
const AREA_COLORS = { 전공: "--c1", 교양: "--c2", 총학점: "--c5" };

export default function Graduation() {
  const [grad, setGrad] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [form, setForm] = useState({ title: "", credits: 3, courseType: "전공핵심", status: "taken" });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [g, e] = await Promise.all([api.get("/graduation"), api.get("/enrollments")]);
    setGrad(g.data);
    setEnrollments(e.data.enrollments || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function addEnrollment(e) {
    e.preventDefault();
    if (!form.title) return;
    await api.post("/enrollments", { ...form, credits: Number(form.credits), semesterKey: "" });
    setForm({ title: "", credits: 3, courseType: "전공핵심", status: "taken" });
    load();
  }
  async function removeEnrollment(id) { await api.delete(`/enrollments/${id}`); load(); }

  if (loading) return <div className="page rise text-fg-muted">불러오는 중...</div>;

  const areaBars = (grad?.areas || []).filter((a) => !a.checklist);
  const checklist = (grad?.areas || []).filter((a) => a.checklist);
  const total = areaBars.find((a) => a.area === "총학점");
  const totalPct = total ? total.percent : 0;
  const manual = enrollments.filter((e) => e.source !== "grade");
  const importedCount = enrollments.length - manual.length;

  return (
    <div className="page rise">
      <PageHeader title="졸업요건 충족 현황"
        sub="컴퓨터공학부 2022학번 기준 · 데모 규칙"
        actions={<span className="badge badge-neutral"><Icon name="info" size={13} /> 데모 기준</span>} />

      {grad?.message && <div className="mb-4 rounded-ctl px-3 py-2.5 text-sm" style={{ background: "var(--inu-light)", color: "var(--inu-sky)" }}>{grad.message}</div>}

      {areaBars.length > 0 && (
        <div className="grad-2col mb-5 grid gap-4" style={{ gridTemplateColumns: "300px minmax(0,1fr)" }}>
          <div className="card flex flex-col items-center justify-center gap-3.5">
            <ProgressRing percent={totalPct} size={150} stroke={14} color="--inu-sky" label="총 이수율" />
            {total && (
              <div className="text-center">
                <div className="num text-[17px] font-extrabold text-fg">{total.earned} <span className="text-[14px] text-fg-faint">/ {total.required}학점</span></div>
                <div className="mt-0.5 text-[12.5px] text-fg-muted">예정 포함 시 {total.earned + total.planned}학점</div>
              </div>
            )}
          </div>

          <div className="card">
            <SectionTitle>영역별 충족률</SectionTitle>
            <div className="flex flex-col gap-4">
              {areaBars.map((a) => {
                const pct = a.percent;
                const plPct = Math.min(100, Math.round(((a.earned + a.planned) / a.required) * 100));
                const ok = a.earned >= a.required;
                return (
                  <div key={a.area}>
                    <div className="mb-2 flex items-center justify-between text-[13px]">
                      <span className="flex items-center gap-2 font-bold text-fg"><span className="dot" style={{ background: `var(${AREA_COLORS[a.area] || "--c6"})` }} />{a.area}</span>
                      <span className="num text-[12.5px] text-fg-muted">
                        <b className="text-fg">{a.earned}</b>/{a.required}
                        {a.planned > 0 && <span className="text-inu-sky"> (+{a.planned})</span>}
                        {ok ? <span className="badge badge-ok ml-2">충족</span> : <span className="badge badge-danger ml-2">{a.shortage} 부족</span>}
                      </span>
                    </div>
                    <div className="track relative">
                      {a.planned > 0 && <div className="fill absolute inset-0" style={{ width: `${plPct}%`, background: `color-mix(in srgb, var(${AREA_COLORS[a.area] || "--c6"}) 35%, var(--surface-3))` }} />}
                      <div className="fill relative" style={{ width: `${pct}%`, background: ok ? "var(--ok)" : `var(${AREA_COLORS[a.area] || "--c6"})` }} />
                    </div>
                  </div>
                );
              })}
              {grad?.liberalDetail && (
                <p className="m-0 text-xs text-fg-faint">교양 세부: 기초 {grad.liberalDetail.기초교양}학점 · 핵심 {grad.liberalDetail.핵심교양}학점 · 심화 {grad.liberalDetail.심화교양}학점</p>
              )}
            </div>
          </div>
        </div>
      )}

      {checklist.length > 0 && (
        <div className="card mb-5">
          <SectionTitle>기타 졸업 요건</SectionTitle>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            {checklist.map((c) => (
              <div key={c.area} className="card flex items-start gap-2.5" style={{ boxShadow: "none", background: "var(--surface-2)", padding: 14 }}>
                <span className="inline-flex flex-none items-center justify-center rounded-lg" style={{ width: 26, height: 26, background: "var(--surface-3)", color: "var(--text-3)" }}><Icon name="clock" size={15} /></span>
                <div>
                  <div className="text-[13.5px] font-bold text-fg">{c.area}</div>
                  {c.etcRequirement && <div className="mt-0.5 text-xs text-fg-faint">{c.etcRequirement}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 수강 이력 입력 */}
      <div className="card">
        <SectionTitle right={importedCount > 0 ? <span className="text-[12.5px] text-fg-faint">성적 업로드 {importedCount}과목 자동 반영됨</span> : null}>수강 이력 입력</SectionTitle>
        <form onSubmit={addEnrollment} className="mb-3.5 flex flex-wrap items-end gap-2.5">
          <div style={{ flex: "1 1 200px" }}><label className="field-label">과목명</label><input className="field" placeholder="예: 컴파일러" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div style={{ width: 88 }}><label className="field-label">학점</label><input className="field" type="number" min="1" max="6" value={form.credits} onChange={(e) => setForm({ ...form, credits: e.target.value })} /></div>
          <div style={{ width: 130 }}><label className="field-label">이수구분</label><select className="field" value={form.courseType} onChange={(e) => setForm({ ...form, courseType: e.target.value })}>{COURSE_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
          <div style={{ width: 120 }}><label className="field-label">상태</label><select className="field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="taken">수강완료</option><option value="planned">수강예정</option></select></div>
          <button className="btn btn-primary"><Icon name="plus" size={16} /> 추가</button>
        </form>
        <div className="flex flex-col gap-2">
          {manual.length === 0 && <p className="m-0 text-sm text-fg-faint">직접 입력한 수강 이력이 없습니다.</p>}
          {manual.map((e) => (
            <div key={e.id} className="flex items-center gap-3 rounded-ctl border px-3.5 py-2.5" style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
              <span className={`badge ${e.status === "planned" ? "badge-yellow" : "badge-ok"}`}>{e.status === "planned" ? "예정" : "완료"}</span>
              <span className="flex-1 text-sm font-bold text-fg">{e.title}</span>
              <span className="text-[13px] text-fg-muted">{e.courseType} · {e.credits}학점</span>
              <button className="btn btn-quiet btn-icon" style={{ padding: 5, color: "var(--text-3)" }} onClick={() => removeEnrollment(e.id)}><Icon name="x" size={15} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
