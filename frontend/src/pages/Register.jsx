import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api.js";
import useAuthStore from "../stores/auth.js";
import Icon from "../components/Icon.jsx";

const CURRENT_YEAR = 2026;

function Brand() {
  return (
    <div className="flex items-center justify-center gap-2.5">
      <span className="num inline-flex items-center justify-center font-black" style={{ width: 40, height: 40, borderRadius: "30%", background: "var(--inu-blue)", color: "var(--inu-yellow)", fontSize: 15, letterSpacing: "-.04em" }}>INU</span>
      <span className="text-[21px] font-extrabold tracking-tight text-fg">Course Mentor</span>
    </div>
  );
}

export default function Register() {
  const [form, setForm] = useState({
    email: "", password: "", name: "",
    department: "컴퓨터공학부", admissionYear: 2022, grade: 3, semester: 1,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", form);
      setAuth(data.token, data.user);
      navigate("/profile");
    } catch (err) {
      setError(err.response?.data?.error || "회원가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden p-6 py-10">
      <div className="absolute inset-0 z-0" style={{ background: "radial-gradient(900px 500px at 88% -10%, color-mix(in srgb, var(--inu-sky) 16%, transparent), transparent 60%), radial-gradient(700px 420px at 8% 110%, color-mix(in srgb, var(--inu-yellow) 14%, transparent), transparent 55%)" }} />
      <div className="rise relative z-10 w-full max-w-[440px]">
        <div className="mb-6"><Brand /></div>
        <div className="card" style={{ padding: 30 }}>
          <h1 className="mb-1 text-[21px] font-extrabold text-fg">계정 만들기</h1>
          <p className="mb-5 text-sm text-fg-muted">프로필은 졸업요건 계산과 AI 추천의 기준이 됩니다.</p>

          {error && <div className="mb-4 rounded-lg px-3 py-2 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>{error}</div>}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <div><label className="field-label">이메일</label><input className="field" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@inu.ac.kr" required /></div>
            <div className="grid grid-cols-2 gap-2.5">
              <div><label className="field-label">비밀번호</label><input className="field" type="password" value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="8자 이상" required /></div>
              <div><label className="field-label">이름 (선택)</label><input className="field" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="고우석" /></div>
            </div>
            <div><label className="field-label">학과</label><input className="field" value={form.department} onChange={(e) => update("department", e.target.value)} placeholder="컴퓨터공학부" required /></div>
            <div className="grid grid-cols-3 gap-2.5">
              <div><label className="field-label">입학년도</label>
                <select className="field" value={form.admissionYear} onChange={(e) => update("admissionYear", Number(e.target.value))}>
                  {Array.from({ length: 8 }, (_, i) => CURRENT_YEAR - i).map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div><label className="field-label">학년</label>
                <select className="field" value={form.grade} onChange={(e) => update("grade", Number(e.target.value))}>
                  {[1, 2, 3, 4].map((g) => <option key={g} value={g}>{g}학년</option>)}
                </select>
              </div>
              <div><label className="field-label">학기</label>
                <select className="field" value={form.semester} onChange={(e) => update("semester", Number(e.target.value))}>
                  {[1, 2].map((s) => <option key={s} value={s}>{s}학기</option>)}
                </select>
              </div>
            </div>
            <button className="btn btn-primary btn-lg btn-block mt-1.5" type="submit" disabled={loading}>{loading ? "처리 중..." : "가입하기"}</button>
          </form>

          <p className="mt-5 text-center text-[13.5px] text-fg-muted">
            이미 계정이 있으신가요? <Link to="/login" className="font-bold text-inu-sky hover:underline">로그인</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
