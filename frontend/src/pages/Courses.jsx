import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api.js";
import { DAYS, findConflicts } from "../lib/time.js";
import { addCourseToTimetable, getTimetable, removeCourseFromTimetable } from "../lib/idb.js";
import CourseCard from "../components/CourseCard.jsx";
import { PageHeader, Empty, Toast } from "../components/ui.jsx";
import Icon from "../components/Icon.jsx";

// 계열 → 이수구분 그룹 (백엔드와 동일)
const TRACK_GROUPS = {
  전공: ["전공기초", "전공핵심", "전공심화"],
  교양: ["기초교양", "핵심교양", "심화교양"],
  일선: ["일반선택"],
};
const TRACK_OPTIONS = [["전공", "전공"], ["교양", "교양"], ["일선", "일반선택"]];
const HOURS = Array.from({ length: 13 }, (_, i) => 9 + i); // 9시 ~ 21시
const NON_DEPT = ["교양", "교직"]; // 학과 드롭다운에서 제외
const EMPTY = { track: "", department: "", courseType: "", grade: "", day: "", hours: [], q: "" };
const PAGE_SIZE = 16;

export default function Courses() {
  const navigate = useNavigate();
  const [facets, setFacets] = useState({ departments: [], courseTypes: [] });
  const [filters, setFilters] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ total: 0, courses: [] });
  const [loading, setLoading] = useState(false);
  const [timetable, setTimetable] = useState([]);
  const [toast, setToast] = useState("");
  const [view, setView] = useState("grid");
  const [noConflict, setNoConflict] = useState(false); // 안겹치는 강의만 (클라이언트 필터)

  useEffect(() => {
    api.get("/courses/facets").then(({ data }) => setFacets(data)).catch(() => {});
    refreshTimetable();
    search(1, EMPTY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshTimetable() { setTimetable(await getTimetable().catch(() => [])); }

  async function search(p = 1, f = filters) {
    setLoading(true);
    try {
      const params = { page: p, pageSize: PAGE_SIZE };
      if (f.track) params.track = f.track;
      if (f.department) params.department = f.department;
      if (f.courseType) params.courseType = f.courseType;
      if (f.grade) params.grade = f.grade;
      if (f.day !== "") params.day = f.day;
      if (f.hours?.length) params.hours = f.hours.join(",");
      if (f.q) params.q = f.q;
      const { data } = await api.get("/courses", { params });
      setData(data); setPage(p);
    } catch { setData({ total: 0, courses: [] }); }
    finally { setLoading(false); }
  }

  function changeSelect(key, value) {
    const next = { ...filters, [key]: value };
    if (key === "track") {
      const group = TRACK_GROUPS[value];
      if (group && next.courseType && !group.includes(next.courseType)) next.courseType = "";
      if (value === "교양" || value === "일선") next.department = "";
    }
    setFilters(next);
    search(1, next);
  }

  const courseTypeOptions = filters.track && TRACK_GROUPS[filters.track]
    ? facets.courseTypes.filter((t) => TRACK_GROUPS[filters.track].includes(t))
    : facets.courseTypes;
  const deptDisabled = filters.track === "교양" || filters.track === "일선";
  const active = filters.track || filters.department || filters.courseType || filters.grade || filters.day !== "" || filters.hours?.length || filters.q;
  const reset = () => { setFilters(EMPTY); search(1, EMPTY); };

  const ids = useMemo(() => new Set(timetable.map((c) => c.id)), [timetable]);
  // "안겹치는 강의만" 토글 시 현재 시간표와 충돌하는 강의는 숨김 (클라이언트 필터)
  const shown = noConflict ? data.courses.filter((c) => findConflicts(c, timetable).length === 0) : data.courses;

  async function handleAdd(course) {
    const conflicts = findConflicts(course, timetable);
    if (conflicts.length && !window.confirm(`"${conflicts.map((c) => c.title).join(", ")}"와(과) 시간이 겹칩니다. 그래도 담을까요?`)) return;
    await addCourseToTimetable(course);
    await refreshTimetable();
    setToast(`"${course.title}" 담았어요`);
  }
  async function handleRemove(id) { await removeCourseFromTimetable(id); await refreshTimetable(); }

  const totalPages = Math.ceil(data.total / PAGE_SIZE) || 1;

  return (
    <div className="page rise">
      <PageHeader title="강의 검색" sub={`2026학년도 1학기 · 총 ${data.total}개 결과`}
        actions={
          <div className="seg">
            <button data-on={view === "grid"} onClick={() => setView("grid")}><Icon name="grid" size={15} /></button>
            <button data-on={view === "list"} onClick={() => setView("list")}><Icon name="menu" size={15} /></button>
          </div>
        } />

      {/* 검색 바 */}
      <div className="card sticky top-[74px] z-20 mb-4.5" style={{ padding: 16, marginBottom: 18 }}>
        <div className="relative mb-3">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-faint"><Icon name="search" size={19} /></span>
          <input className="field" style={{ paddingLeft: 42, height: 46, fontSize: 15 }} placeholder="과목명 · 교수명 · 학수번호 검색"
            value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && search(1)} />
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Sel value={filters.track} onChange={(v) => changeSelect("track", v)} ph="전체 계열" opts={TRACK_OPTIONS} strong />
          <Sel value={filters.department} onChange={(v) => changeSelect("department", v)} ph={deptDisabled ? "학과 해당없음" : "전체 학과"} opts={facets.departments.filter((d) => !NON_DEPT.includes(d)).map((d) => [d, d])} disabled={deptDisabled} />
          <Sel value={filters.courseType} onChange={(v) => changeSelect("courseType", v)} ph={filters.track ? `${filters.track} 전체` : "전체 이수구분"} opts={courseTypeOptions.map((t) => [t, t])} />
          <Sel value={filters.grade} onChange={(v) => changeSelect("grade", v)} ph="전체 학년" opts={[1, 2, 3, 4].map((g) => [String(g), g + "학년"])} />
          <Sel value={filters.day} onChange={(v) => changeSelect("day", v)} ph="전체 요일" opts={DAYS.slice(0, 5).map((d, i) => [String(i), d + "요일"])} />
          <HourSelect value={filters.hours} onChange={(arr) => changeSelect("hours", arr)} />
          <button className="chip" onClick={() => setNoConflict((v) => !v)}
            style={{ background: noConflict ? "var(--inu-sky)" : undefined, color: noConflict ? "#fff" : undefined, borderColor: noConflict ? "var(--inu-sky)" : undefined }}>
            <Icon name="check" size={13} /> 안겹치는 강의만
          </button>
          {active ? <button className="chip" onClick={reset}><Icon name="x" size={13} /> 초기화</button> : null}
          <div className="flex-1" />
          <span className="text-[13px] font-semibold text-fg-muted">{loading ? "불러오는 중…" : noConflict ? `${shown.length}개 (겹침 제외)` : `${data.total}개`}</span>
        </div>
      </div>

      {shown.length === 0 && !loading ? (
        <Empty title="조건에 맞는 강의가 없어요" desc={noConflict ? "겹치지 않는 강의가 없습니다. 필터를 조정해 보세요." : "필터를 조정하거나, 홈에서 종합시간표 엑셀을 업로드했는지 확인하세요."} action={<button className="btn btn-ghost" onClick={reset}>필터 초기화</button>} />
      ) : view === "grid" ? (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {shown.map((c) => (
            <CourseCard key={c.id} course={c} inTimetable={ids.has(c.id)}
              conflict={!ids.has(c.id) && findConflicts(c, timetable).length > 0}
              onAdd={handleAdd} onRemove={handleRemove} />
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {shown.map((c, i) => {
            const inList = ids.has(c.id), cf = !inList && findConflicts(c, timetable).length > 0;
            return (
              <div key={c.id} className="flex items-center gap-3.5 px-4.5 py-3.5" style={{ padding: "13px 18px", borderTop: i ? "1px solid var(--border)" : "none", background: cf ? "var(--danger-soft)" : undefined }}>
                <span className="badge badge-blue w-[86px] flex-none justify-center">{c.courseType}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[14.5px] font-bold text-fg">{c.title} {cf && <span className="badge badge-danger ml-1.5">겹침</span>}</div>
                  <div className="text-xs text-fg-faint">{c.courseCode} · {c.professor || "교수미정"} · {c.credits}학점</div>
                </div>
                {inList
                  ? <button className="btn btn-ghost btn-sm" onClick={() => handleRemove(c.id)}><Icon name="check" size={14} /></button>
                  : <button className="btn btn-primary btn-sm" onClick={() => handleAdd(c)}><Icon name="plus" size={14} /></button>}
              </div>
            );
          })}
        </div>
      )}

      {data.total > PAGE_SIZE && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => search(page - 1)}>이전</button>
          <span className="num text-[13px] text-fg-muted">{page} / {totalPages}</span>
          <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => search(page + 1)}>다음</button>
        </div>
      )}

      <Toast msg={toast} onDone={() => setToast("")} />
    </div>
  );
}

function Sel({ value, onChange, ph, opts, disabled, strong }) {
  return (
    <select className="field" disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)}
      style={{ width: "auto", minWidth: 120, padding: "9px 32px 9px 13px", fontWeight: strong ? 700 : 500, color: strong && value ? "var(--inu-sky)" : undefined, opacity: disabled ? .5 : 1 }}>
      <option value="">{ph}</option>
      {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

// 강의 시간(시) 복수 선택 드롭다운
function HourSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const toggle = (hr) => onChange(value.includes(hr) ? value.filter((x) => x !== hr) : [...value, hr].sort((a, b) => a - b));
  const label = value.length === 0 ? "전체 시간"
    : value.length <= 3 ? value.map((h) => h + "시").join("·")
    : `시간 ${value.length}개`;
  return (
    <div ref={ref} className="relative">
      <button type="button" className="field flex items-center gap-1.5"
        style={{ width: "auto", minWidth: 120, padding: "9px 13px", fontWeight: 500, color: value.length ? "var(--inu-sky)" : undefined }}
        onClick={() => setOpen((o) => !o)}>
        <Icon name="clock" size={14} /> {label}
      </button>
      {open && (
        <div className="card absolute left-0 z-40 mt-1.5" style={{ padding: 12, width: 232, boxShadow: "var(--shadow-lg)" }}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12px] font-bold text-fg-muted">강의 시간 · 복수 선택</span>
            {value.length > 0 && <button type="button" className="text-[12px] font-semibold text-inu-sky" onClick={() => onChange([])}>해제</button>}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {HOURS.map((h) => {
              const on = value.includes(h);
              return (
                <button key={h} type="button" onClick={() => toggle(h)} className="num rounded-ctl py-1.5 text-[12.5px] font-bold"
                  style={{ background: on ? "var(--inu-sky)" : "var(--surface-2)", color: on ? "#fff" : "var(--text-2)", border: `1px solid ${on ? "var(--inu-sky)" : "var(--border)"}` }}>
                  {h}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
