import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../lib/api.js";
import useAuthStore from "../stores/auth.js";
import { PageHeader, Toast } from "../components/ui.jsx";

export default function Admin() {
  const user = useAuthStore((s) => s.user);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/users");
      setUsers(data.users);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (user?.isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 관리자가 아니면 접근 차단
  if (!user?.isAdmin) return <Navigate to="/" replace />;

  async function changeEmail(u) {
    const email = window.prompt(`"${u.email}"의 새 아이디(이메일)를 입력하세요.`, u.email);
    if (!email || email === u.email) return;
    try {
      await api.put(`/admin/users/${u.id}/email`, { email });
      setToast("아이디를 변경했습니다.");
      load();
    } catch (e) {
      setToast(e.response?.data?.error || "변경 실패");
    }
  }
  async function changePassword(u) {
    const password = window.prompt(`"${u.email}"의 새 비밀번호 (4자 이상)`);
    if (!password) return;
    try {
      await api.put(`/admin/users/${u.id}/password`, { password });
      setToast("비밀번호를 변경했습니다.");
    } catch (e) {
      setToast(e.response?.data?.error || "변경 실패");
    }
  }
  async function remove(u) {
    if (!window.confirm(`"${u.email}" 계정을 삭제할까요? 되돌릴 수 없습니다.`)) return;
    try {
      await api.delete(`/admin/users/${u.id}`);
      setToast("계정을 삭제했습니다.");
      load();
    } catch (e) {
      setToast(e.response?.data?.error || "삭제 실패");
    }
  }

  return (
    <div className="page rise">
      <PageHeader title="관리자 · 계정 관리" sub={`전체 ${users.length}명`} />

      {loading ? (
        <div className="text-fg-muted">불러오는 중…</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead style={{ background: "var(--surface-2)" }}>
                <tr className="text-left text-fg-muted">
                  <th className="px-4 py-3 font-bold">아이디(이메일)</th>
                  <th className="px-4 py-3 font-bold">이름</th>
                  <th className="px-4 py-3 font-bold">학과</th>
                  <th className="px-4 py-3 font-bold">가입일</th>
                  <th className="px-4 py-3 text-right font-bold">관리</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-3 font-semibold text-fg">
                      {u.email}
                      {u.isAdmin && <span className="badge badge-blue ml-1.5">관리자</span>}
                    </td>
                    <td className="px-4 py-3 text-fg-muted">{u.name || "-"}</td>
                    <td className="px-4 py-3 text-fg-muted">{u.department}</td>
                    <td className="px-4 py-3 text-fg-faint">{new Date(u.createdAt).toLocaleDateString("ko-KR")}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button className="btn btn-ghost btn-sm" onClick={() => changeEmail(u)}>아이디 변경</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => changePassword(u)}>비밀번호</button>
                        <button className="btn btn-danger btn-sm" disabled={u.isAdmin} onClick={() => remove(u)}>삭제</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Toast msg={toast} onDone={() => setToast("")} />
    </div>
  );
}
