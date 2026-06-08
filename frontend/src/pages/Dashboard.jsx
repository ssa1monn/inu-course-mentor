import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import api from "../lib/api.js";
import useAuthStore from "../stores/auth.js";
import { getTimetable } from "../lib/idb.js";
import { computeGpaStats, shortSemesterLabel } from "../lib/grade.js";
import Icon from "../components/Icon.jsx";
import { ProgressRing, LineChart } from "../components/charts.jsx";
import { StatCard, SectionTitle } from "../components/ui.jsx";

const AREA_COLORS = { 전공: "--c1", 교양: "--c2", 총학점: "--c5" };

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [courseCount, setCourseCount] = useState(null);
  const [grad, setGrad] = useState(null);
  const [gpa, setGpa] = useState(null);
  const [advice, setAdvice] = useState(null);
  const [tt, setTt] = useState([]);
  const [up1, setUp1] = useState("");
  const [up2, setUp2] = useState("");
  const file1 = useRef(null), file2 = useRef(null);

  async function loadAll() {
    setTt(await getTimetable().catch(() => []));
    api.get("/courses", { params: { pageSize: 1 } }).then(({ data }) => setCourseCount(data.total)).catch(() => setCourseCount(0));
    api.get("/graduation").then(({ data }) => setGrad(data)).catch(() => {});
    api.get("/enrollments").then(({ data }) => setGpa(computeGpaStats(data.enrollments || []))).catch(() => {});
    api.get("/recommend").then(({ data }) => setAdvice(data.recommendations?.[0] || null)).catch(() => {});
  }
  useEffect(() => { loadAll(); }, []);

  async function handleUpload(e, kind) {
    const file = e.target.files?.[0]; if (!file) return;
    const fd = new FormData(); fd.append("file", file);
    try {
      if (kind === "courses") {
        fd.append("semesterKey", "2026-1");
        const { data } = await api.post("/courses/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
        setUp1(`업로드 완료 · 총 ${data.total}개 (신규 ${data.created} / 갱신 ${data.updated})`);
      } else {
        const { data } = await api.post("/grades/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
        setUp2(`성적 ${data.total}건을 수강이력에 등록했습니다.`);
      }
      loadAll();
    } catch (err) {
      const m = err.response?.data?.error || "업로드 실패";
      kind === "courses" ? setUp1(m) : setUp2(m);
    } finally {
      if (kind === "courses" && file1.current) file1.current.value = "";
      if (kind === "grades" && file2.current) file2.current.value = "";
    }
  }

  const total = grad?.areas?.find((a) => a.area === "총학점");
  const gradPct = total ? total.percent : 0;
  const remaining = total ? Math.max(0, total.required - total.earned) : "—";
  const ttCredits = tt.reduce((s, c) => s + (c.credits || 0), 0);
  const areaBars = (grad?.areas || []).filter((a) => !a.checklist);
  const gpaLine = (gpa?.bySemester || []).map((s) => ({ value: s.gpa, label: shortSemesterLabel(s.key) }));
  const linkS = "inline-flex items-center gap-0.5 whitespace-nowrap text-[13px] font-bold text-inu-sky cursor-pointer";

  return (
    <div className="page rise">
      {/* 히어로 */}
      <div className="mb-5 overflow-hidden rounded-card" style={{ background: "linear-gradient(118deg, var(--inu-blue), color-mix(in srgb, var(--inu-sky) 88%, var(--inu-blue)))", color: "#fff" }}>
        <div className="flex flex-wrap items-center justify-between gap-6 px-8 py-8">
          <div className="min-w-[240px]">
            <div className="text-[13px] font-bold tracking-tight" style={{ color: "var(--inu-yellow)" }}>{user?.department || "인천대학교"}{user?.grade ? ` · ${user.grade}학년` : ""}</div>
            <h1 className="font-display mt-2 mb-1.5 text-[30px] font-extrabold text-white">안녕하세요, {user?.name || "INU 학생"}님</h1>
            <p className="m-0 max-w-[460px] text-[14.5px]" style={{ color: "rgba(255,255,255,.82)" }}>
              {total ? <>졸업까지 <b className="num text-white">{remaining}학점</b> 남았어요. 이번 학기 계획을 시작해 볼까요?</> : <>종합시간표와 성적을 업로드하면 졸업요건·평점·AI 추천을 한눈에 볼 수 있어요.</>}
            </p>
            <div className="mt-4 flex gap-2.5">
              <button className="btn btn-accent" onClick={() => navigate("/courses")}><Icon name="search" size={16} /> 강의 찾기</button>
              <button className="btn" style={{ background: "rgba(255,255,255,.14)", color: "#fff", border: "1px solid rgba(255,255,255,.25)" }} onClick={() => navigate("/advice")}><Icon name="sparkle" size={16} /> AI 조언</button>
            </div>
          </div>
          <div className="relative" style={{ width: 150, height: 150, flex: "none" }}>
            <ProgressRing percent={gradPct} size={150} stroke={13} color="--inu-yellow" hideCenter />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-white">
              <div className="num" style={{ fontFamily: "Sora, Pretendard, sans-serif", fontSize: 40, fontWeight: 800, lineHeight: 1 }}>{gradPct}<span style={{ fontSize: 18 }}>%</span></div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.8)", marginTop: 4 }}>{total ? `${total.earned} / ${total.required}학점` : "데이터 없음"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 스탯 */}
      <div className="mb-6 grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
        <StatCard icon="chart" label="전체 평점" value={gpa?.gradedCount ? gpa.overall.toFixed(2) : "—"} unit="/ 4.5" accent="--inu-sky" sub={gpa?.gradedCount ? `전공 평점 ${gpa.major.toFixed(2)}` : "성적 업로드 시 표시"} />
        <StatCard icon="cap" label="이수 학점" value={grad?.totalEarned ?? 0} unit="학점" accent="--c2" sub={total ? `졸업 ${total.required}학점 기준` : "졸업요건 기준"} />
        <StatCard icon="target" label="졸업까지" value={remaining} unit="학점" accent="--c3" sub={grad?.totalPlanned ? `예정 ${grad.totalPlanned}학점 반영 가능` : "남은 학점"} />
        <StatCard icon="calendar" label="이번 학기 담음" value={tt.length} unit="과목" accent="--c5" sub={`${ttCredits}학점 구성 중`} />
      </div>

      {/* 업로드 + 졸업요건 */}
      <div className="dash-2col mb-6 grid gap-4" style={{ gridTemplateColumns: "minmax(0,1.15fr) minmax(0,1fr)" }}>
        <div className="card">
          <SectionTitle>데이터 업로드</SectionTitle>
          <div className="flex flex-col gap-3">
            <UploadRow tint="tint-blue" icon="upload" accent="--inu-sky" title="종합강의시간표 (.xlsx)"
              desc={up1 || `현재 적재된 강의: ${courseCount === null ? "..." : courseCount + "개"}`} done={!!up1}
              inputRef={file1} onChange={(e) => handleUpload(e, "courses")} />
            <UploadRow tint="tint-yellow" icon="dl" accent="--inu-yellow-deep" title="과목별 성적 (.xlsx)"
              desc={up2 || "성적표를 올리면 수강이력·평점이 자동 계산됩니다."} done={!!up2}
              inputRef={file2} onChange={(e) => handleUpload(e, "grades")} />
          </div>
        </div>

        <div className="card flex flex-col">
          <SectionTitle right={<span className={linkS} onClick={() => navigate("/graduation")}>자세히 <Icon name="chevR" size={13} /></span>}>졸업요건 현황</SectionTitle>
          <div className="flex flex-1 items-center gap-5">
            <ProgressRing percent={gradPct} size={132} stroke={16} color="--inu-sky" label="총 이수율" />
            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
              {areaBars.length === 0 && <div className="text-[13px] text-fg-faint">졸업요건 데이터가 없습니다.</div>}
              {areaBars.map((a) => (
                <div key={a.area} className="flex items-center gap-2.5 text-[13px]">
                  <span className="dot" style={{ background: `var(${AREA_COLORS[a.area] || "--c6"})` }} />
                  <span className="flex-1 font-semibold text-fg-muted">{a.area}</span>
                  <span className="num font-bold text-fg">{a.earned}<span className="text-fg-faint">/{a.required}</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 평점 추이 + 바로가기 */}
      <div className="dash-2col mb-6 grid gap-4" style={{ gridTemplateColumns: "minmax(0,1.15fr) minmax(0,1fr)" }}>
        <div className="card">
          <SectionTitle right={<span className={linkS} onClick={() => navigate("/gpa")}>평점 관리 <Icon name="chevR" size={13} /></span>}>학기별 평점 추이</SectionTitle>
          {gpaLine.length >= 2
            ? <LineChart data={gpaLine} yMin={Math.max(0, Math.min(...gpaLine.map((d) => d.value)) - 0.3)} yMax={4.5} height={150} />
            : <div className="grid h-[150px] place-items-center text-[13px] text-fg-faint">성적을 업로드하면 학기별 추이가 표시됩니다.</div>}
        </div>
        <div className="card">
          <SectionTitle>바로가기</SectionTitle>
          <div className="grid grid-cols-2 gap-2.5">
            {[["/courses", "search", "강의 검색", "--inu-sky"], ["/timetable", "calendar", "시간표 생성", "--c5"], ["/graduation", "cap", "졸업요건", "--c2"], ["/advice", "sparkle", "AI 조언", "--c3"]].map(([to, ic, lb, ac]) => (
              <button key={to} className="card card-link flex flex-col items-start gap-2.5 text-left" style={{ padding: 15, boxShadow: "none", background: "var(--surface-2)" }} onClick={() => navigate(to)}>
                <span className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-[10px]" style={{ background: `color-mix(in srgb, var(${ac}) 14%, transparent)`, color: `var(${ac})` }}><Icon name={ic} size={18} /></span>
                <span className="text-sm font-bold text-fg">{lb}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 최근 AI 조언 */}
      <div className="card tint-blue">
        <div className="flex items-start gap-3.5">
          <span className="inline-flex flex-none items-center justify-center rounded-xl" style={{ width: 40, height: 40, background: "var(--inu-blue)", color: "var(--inu-yellow)" }}><Icon name="sparkle" size={21} /></span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2.5">
              <h2 className="m-0 whitespace-nowrap text-base font-extrabold text-fg">최근 AI 조언</h2>
              <span className={linkS} onClick={() => navigate("/advice")}>전체 보기 <Icon name="chevR" size={13} /></span>
            </div>
            {advice ? (
              <div className="prose-inu mt-2 text-[14px] leading-relaxed text-fg-muted" style={{ maxHeight: 280, overflowY: "auto", paddingRight: 8 }}>
                <ReactMarkdown>{advice.aiAdvice}</ReactMarkdown>
              </div>
            ) : (
              <p className="mt-2 text-[14px] text-fg-muted">아직 생성된 AI 조언이 없어요. <span className={linkS} onClick={() => navigate("/advice")}>AI 조언 받기 →</span></p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadRow({ tint, icon, accent, title, desc, done, inputRef, onChange }) {
  return (
    <label className={`card ${tint} flex cursor-pointer items-center gap-3.5`} style={{ boxShadow: "none", padding: 16 }}>
      <span className="inline-flex flex-none items-center justify-center rounded-xl" style={{ width: 42, height: 42, background: "var(--surface)", color: `var(${accent})`, boxShadow: "var(--shadow-sm)" }}><Icon name={done ? "check" : icon} size={21} /></span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-fg">{title}</div>
        <div className="mt-0.5 text-[12.5px]" style={{ color: done ? "var(--ok)" : "var(--text-2)", fontWeight: done ? 700 : 500 }}>{desc}</div>
      </div>
      <span className="btn btn-ghost btn-sm flex-none">파일 선택</span>
      <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={onChange} className="hidden" />
    </label>
  );
}
