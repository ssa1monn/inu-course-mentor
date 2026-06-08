import { useEffect, useState } from "react";
import api from "../lib/api.js";
import useAuthStore from "../stores/auth.js";
import Icon from "../components/Icon.jsx";
import { PageHeader, SectionTitle, Avatar } from "../components/ui.jsx";

export default function Profile() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const token = useAuthStore((s) => s.token);
  const [email, setEmail] = useState("");
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/me").then(({ data }) => {
      setEmail(data.email || "");
      setForm({
        name: data.name || "",
        department: data.department || "",
        admissionYear: data.admissionYear || 2022,
        grade: data.grade || 1,
        semester: data.semester || 1,
        interestJob: data.preference?.interestJob || "",
        subjectTaste: data.preference?.subjectTaste || "균형",
        interestArea: data.preference?.interestArea || "",
      });
    }).catch(() => {});
  }, []);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setMsg("");
    try {
      const { data } = await api.put("/me/profile", form);
      setAuth(token, { id: data.id, email: data.email, name: data.name, department: data.department });
      setMsg("저장되었습니다.");
    } catch (err) {
      setMsg(err.response?.data?.error || "저장 실패");
    } finally { setSaving(false); }
  }

  if (!form) return <div className="page rise text-fg-muted">불러오는 중...</div>;

  const tastes = [{ value: "이론", label: "이론 중심" }, { value: "균형", label: "균형" }, { value: "실습", label: "실습 중심" }];

  return (
    <div className="page rise" style={{ maxWidth: 880 }}>
      <PageHeader title="프로필" sub="졸업요건 계산과 AI 추천의 기준이 되는 정보입니다." />

      {msg && <div className="mb-4 rounded-ctl px-3 py-2.5 text-sm font-semibold" style={{ background: msg.includes("실패") ? "var(--danger-soft)" : "var(--inu-light)", color: msg.includes("실패") ? "var(--danger)" : "var(--inu-sky)" }}>{msg}</div>}

      <div className="card mb-4 flex items-center gap-4.5" style={{ gap: 18 }}>
        <Avatar name={form.name || email} size={64} />
        <div className="flex-1">
          <div className="text-xl font-extrabold text-fg">{form.name || "INU 학생"}</div>
          <div className="text-[13.5px] text-fg-muted">{email} · {form.department}</div>
        </div>
        <span className="badge badge-blue text-[12.5px]">{form.admissionYear}학번</span>
      </div>

      <form onSubmit={handleSave}>
        <div className="card mb-4">
          <SectionTitle>학적 정보</SectionTitle>
          <div className="grid grid-cols-2 gap-3.5">
            <div><label className="field-label">이름</label><input className="field" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="고우석" /></div>
            <div><label className="field-label">이메일</label><input className="field" value={email} disabled style={{ opacity: .6 }} /></div>
            <div><label className="field-label">학과</label><input className="field" value={form.department} onChange={(e) => update("department", e.target.value)} /></div>
            <div><label className="field-label">입학년도</label><input className="field" type="number" value={form.admissionYear} onChange={(e) => update("admissionYear", Number(e.target.value))} /></div>
            <div><label className="field-label">학년</label>
              <select className="field" value={form.grade} onChange={(e) => update("grade", Number(e.target.value))}>{[1, 2, 3, 4].map((g) => <option key={g} value={g}>{g}학년</option>)}</select>
            </div>
            <div><label className="field-label">학기</label>
              <select className="field" value={form.semester} onChange={(e) => update("semester", Number(e.target.value))}>{[1, 2].map((s) => <option key={s} value={s}>{s}학기</option>)}</select>
            </div>
          </div>
        </div>

        <div className="card mb-4">
          <SectionTitle>관심 · 선호</SectionTitle>
          <div className="mb-3.5 grid grid-cols-2 gap-3.5">
            <div><label className="field-label">관심 직무</label><input className="field" value={form.interestJob} onChange={(e) => update("interestJob", e.target.value)} placeholder="예: 백엔드 개발, 데이터 분석" /></div>
            <div><label className="field-label">관심 분야 (선택)</label><input className="field" value={form.interestArea} onChange={(e) => update("interestArea", e.target.value)} placeholder="예: 인공지능, 보안" /></div>
          </div>
          <label className="field-label">학습 선호</label>
          <div className="seg">
            {tastes.map((t) => <button key={t.value} type="button" data-on={form.subjectTaste === t.value} onClick={() => update("subjectTaste", t.value)}>{t.label}</button>)}
          </div>
        </div>

        <div className="flex justify-end gap-2.5">
          <button type="submit" className="btn btn-primary" disabled={saving}><Icon name="check" size={16} /> {saving ? "저장 중..." : "변경사항 저장"}</button>
        </div>
      </form>
    </div>
  );
}
