import { useEffect, useRef, useState } from "react";
import api from "../lib/api.js";
import { computeGpaStats, isMajor } from "../lib/grade.js";
import Icon from "../components/Icon.jsx";
import { ProgressRing, Donut, BarChart } from "../components/charts.jsx";
import { PageHeader, SectionTitle, StatCard, Segmented } from "../components/ui.jsx";

const GRADE_C = { "A+": "--c2", "A0": "--c2", "B+": "--c1", "B0": "--c1", "C+": "--c3", "C0": "--c3", "D+": "--c4", "D0": "--c4", "F": "--c4", "P": "--c6" };
const DIST_ORDER = ["A+", "A0", "B+", "B0", "C+", "C0", "D+", "D0", "F", "P"];

export default function Gpa() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadMsg, setUploadMsg] = useState("");
  const [tab, setTab] = useState("sem");
  const fileRef = useRef(null);

  async function load() {
    setLoading(true);
    const { data } = await api.get("/enrollments");
    setEnrollments(data.enrollments || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleUpload(e) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadMsg("");
    try {
      const fd = new FormData(); fd.append("file", file);
      const { data } = await api.post("/grades/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setUploadMsg(`성적 ${data.total}건을 수강이력에 등록했습니다.`);
      load();
    } catch (err) {
      setUploadMsg(err.response?.data?.error || "업로드 실패");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const g = computeGpaStats(enrollments);
  const bars = g.bySemester.map((s) => ({ value: s.gpa, label: s.key.slice(2) }));
  const distEntries = DIST_ORDER.filter((k) => g.dist[k]);
  const distMax = Math.max(1, ...Object.values(g.dist));
  const lastSem = g.bySemester[g.bySemester.length - 1];

  return (
    <div className="page rise">
      <PageHeader title="평점 관리" sub="포털의 '과목별성적' 엑셀을 업로드하면 평점이 자동 계산됩니다."
        actions={<label className="btn btn-ghost cursor-pointer"><Icon name="upload" size={16} /> 성적 업로드<input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleUpload} className="hidden" /></label>} />

      {uploadMsg && <div className="mb-4 rounded-ctl px-3 py-2.5 text-sm font-semibold" style={{ background: "var(--inu-light)", color: "var(--inu-sky)" }}>{uploadMsg}</div>}

      {loading ? (
        <div className="text-fg-muted">불러오는 중...</div>
      ) : g.gradedCount === 0 ? (
        <div className="card border-dashed py-13 text-center" style={{ paddingTop: 52, paddingBottom: 52 }}>
          <span className="mb-3 inline-flex h-[60px] w-[60px] items-center justify-center rounded-2xl" style={{ background: "var(--inu-light)", color: "var(--inu-sky)" }}><Icon name="chart" size={30} /></span>
          <h3 className="m-0 text-[17px] font-extrabold text-fg">평점 데이터가 없어요</h3>
          <p className="mx-auto mt-1.5 max-w-[380px] text-sm text-fg-muted">위 '성적 업로드'로 포털의 과목별성적 엑셀을 올리면 평점·등급분포가 자동 계산됩니다.</p>
        </div>
      ) : (
        <>
          <div className="mb-5 grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            <div className="card flex items-center gap-4.5" style={{ gap: 18 }}>
              <ProgressRing percent={Math.round((g.overall / 4.5) * 100)} size={104} stroke={11} color="--inu-sky" />
              <div>
                <div className="text-[13px] font-semibold text-fg-muted">전체 평점</div>
                <div className="num text-fg" style={{ fontFamily: "Sora, Pretendard, sans-serif", fontSize: "calc(36px * var(--num-scale))", fontWeight: 800, lineHeight: 1.05 }}>{g.overall.toFixed(2)}</div>
                <div className="text-xs text-fg-faint">4.5 만점 · P/이수인정 제외</div>
              </div>
            </div>
            <StatCard icon="trophy" label="전공 평점" value={g.major.toFixed(2)} unit="/ 4.5" accent="--c2" sub={`전체 대비 ${(g.major - g.overall >= 0 ? "+" : "")}${(g.major - g.overall).toFixed(2)}`} />
            <StatCard icon="cap" label="취득 학점" value={g.earnedCredits} unit="학점" accent="--c5" sub={`평점 산입 ${g.gradedCredits}학점`} />
            <StatCard icon="bolt" label="최근 학기" value={lastSem ? lastSem.gpa.toFixed(2) : "—"} accent="--c3" sub={lastSem ? `${lastSem.key} · ${lastSem.credits}학점` : ""} />
          </div>

          <div className="dash-2col mb-5 grid gap-4" style={{ gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr)" }}>
            <div className="card">
              <SectionTitle right={<Segmented options={[{ value: "sem", label: "학기별" }, { value: "dist", label: "등급분포" }]} value={tab} onChange={setTab} />}>성적 분석</SectionTitle>
              {tab === "sem" ? (
                <div style={{ marginTop: 30 }}><BarChart data={bars} max={4.5} height={166} color="--inu-sky" highlightLast /></div>
              ) : (
                <div className="flex flex-col gap-2.5 pt-1.5">
                  {distEntries.map((k) => (
                    <div key={k} className="flex items-center gap-3">
                      <span className="num w-[30px] text-sm font-extrabold" style={{ color: `var(${GRADE_C[k]})` }}>{k}</span>
                      <div className="track flex-1"><div className="fill" style={{ width: `${(g.dist[k] / distMax) * 100}%`, background: `var(${GRADE_C[k]})` }} /></div>
                      <span className="num w-[50px] text-right text-[13px] text-fg-muted">{g.dist[k]}과목</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="card flex flex-col items-center justify-center gap-3.5">
              <SectionTitle>전공 vs 전체</SectionTitle>
              <Donut data={[{ value: g.major, color: "--c2" }, { value: Math.max(0, 4.5 - g.major), color: "--surface-3" }]} size={150} stroke={18} centerTop={g.major.toFixed(2)} centerBottom="전공 평점" />
              <div className="text-center text-[12.5px] text-fg-faint">{g.major >= g.overall ? "전공 과목이 전체 평균보다 높아요. 강점을 살린 진로가 유리합니다." : "전공 평점을 끌어올리면 전체 평점도 함께 올라갑니다."}</div>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "18px 22px 4px" }}><SectionTitle>전체 성적</SectionTitle></div>
            <div style={{ overflowX: "auto" }}>
              <table className="tbl" style={{ minWidth: 560 }}>
                <thead><tr><th>학기</th><th>과목명</th><th>이수구분</th><th className="text-center">학점</th><th className="text-center">등급</th><th className="text-center">평점</th></tr></thead>
                <tbody>
                  {enrollments.slice().sort((a, b) => (b.semesterKey || "").localeCompare(a.semesterKey || "")).map((e) => (
                    <tr key={e.id}>
                      <td className="num text-fg-faint">{e.semesterKey || "-"}</td>
                      <td className="font-semibold text-fg">{e.title}</td>
                      <td><span className={isMajor(e.courseType) ? "badge badge-blue" : "badge badge-neutral"}>{e.courseType}</span></td>
                      <td className="num text-center text-fg">{e.credits}</td>
                      <td className="text-center"><span className="num font-extrabold" style={{ color: `var(${GRADE_C[e.grade] || "--text-2"})` }}>{e.grade || "-"}</span></td>
                      <td className="num text-center text-fg-muted">{e.points != null ? e.points.toFixed(1) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
