import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api.js";
import useAuthStore from "../stores/auth.js";
import Icon from "../components/Icon.jsx";

function Brand() {
  return (
    <div className="flex items-center justify-center gap-2.5">
      <span className="num inline-flex items-center justify-center font-black" style={{ width: 40, height: 40, borderRadius: "30%", background: "var(--inu-blue)", color: "var(--inu-yellow)", fontSize: 15, letterSpacing: "-.04em" }}>INU</span>
      <span className="text-[21px] font-extrabold tracking-tight text-fg">Course Mentor</span>
    </div>
  );
}

function Field({ icon, ...rest }) {
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-faint"><Icon name={icon} size={18} /></span>
      <input className="field" style={{ paddingLeft: 40 }} {...rest} />
    </div>
  );
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setAuth(data.token, data.user);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden p-6">
      <div className="absolute inset-0 z-0" style={{ background: "radial-gradient(900px 500px at 88% -10%, color-mix(in srgb, var(--inu-sky) 16%, transparent), transparent 60%), radial-gradient(700px 420px at 8% 110%, color-mix(in srgb, var(--inu-yellow) 14%, transparent), transparent 55%)" }} />
      <div className="rise relative z-10 w-full max-w-[410px]">
        <div className="mb-6"><Brand /></div>
        <div className="card" style={{ padding: 30 }}>
          <h1 className="mb-1 text-[21px] font-extrabold text-fg">다시 오신 걸 환영해요</h1>
          <p className="mb-5 text-sm text-fg-muted">인천대 계정으로 로그인하세요.</p>

          {error && <div className="mb-4 rounded-lg px-3 py-2 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>{error}</div>}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <div><label className="field-label">이메일</label><Field icon="mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@inu.ac.kr" required /></div>
            <div><label className="field-label">비밀번호</label><Field icon="lock" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required /></div>
            <button className="btn btn-primary btn-lg btn-block mt-1.5" type="submit" disabled={loading}>{loading ? "로그인 중..." : "로그인"}</button>
          </form>

          <p className="mt-5 text-center text-[13.5px] text-fg-muted">
            계정이 없으신가요? <Link to="/register" className="font-bold text-inu-sky hover:underline">회원가입</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
