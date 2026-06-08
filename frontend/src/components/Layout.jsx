import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import useAuthStore from "../stores/auth.js";
import useThemeStore from "../lib/theme.js";
import Icon from "./Icon.jsx";
import { Avatar } from "./ui.jsx";

const NAV = [
  { to: "/", label: "홈", icon: "home", end: true },
  { to: "/courses", label: "강의 검색", icon: "search" },
  { to: "/timetable", label: "시간표 생성", icon: "calendar" },
  { to: "/graduation", label: "졸업요건", icon: "cap" },
  { to: "/gpa", label: "평점 관리", icon: "chart" },
  { to: "/advice", label: "AI 조언", icon: "sparkle" },
];
const TITLES = {
  "/": "홈", "/courses": "강의 검색", "/timetable": "시간표 생성",
  "/graduation": "졸업요건", "/gpa": "평점 관리", "/advice": "AI 조언", "/profile": "프로필",
  "/admin": "관리자",
};
const ADMIN_NAV = { to: "/admin", label: "관리자", icon: "user" };

export default function Layout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const dark = useThemeStore((s) => s.dark);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const go = (to) => { navigate(to); setMenuOpen(false); };
  const isActive = (n) => (n.end ? pathname === "/" : pathname.startsWith(n.to));
  const navItems = user?.isAdmin ? [...NAV, ADMIN_NAV] : NAV;

  return (
    <div className="flex min-h-screen">
      {/* 사이드바 */}
      <aside
        className={`fixed z-40 flex h-screen w-[246px] flex-none flex-col gap-1 border-r p-3.5 shadow-2xl transition-transform duration-300 lg:sticky lg:top-0 lg:translate-x-0 lg:shadow-none ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2.5 px-2.5 pb-4 pt-1.5">
          <span className="num inline-flex items-center justify-center font-black" style={{ width: 34, height: 34, borderRadius: "30%", background: "var(--inu-blue)", color: "var(--inu-yellow)", fontSize: 13, letterSpacing: "-.04em" }}>INU</span>
          <div className="leading-tight">
            <div className="text-[15px] font-extrabold text-fg">Course Mentor</div>
            <div className="text-[11px] text-fg-faint">{user?.department || "인천대학교"}</div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map((n) => (
            <div key={n.to} className="nav-item" data-on={isActive(n)} onClick={() => go(n.to)}>
              <span style={{ display: "flex", color: isActive(n) ? "var(--inu-sky)" : "var(--text-3)" }}><Icon name={n.icon} size={20} /></span>
              {n.label}
            </div>
          ))}
        </nav>

        <div className="card mt-2 flex cursor-pointer items-center gap-2.5 p-3" style={{ boxShadow: "none", background: "var(--surface-2)" }} onClick={() => go("/profile")}>
          <Avatar name={user?.name || user?.email} size={36} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] font-bold text-fg">{user?.name || "INU 학생"}</div>
            <div className="truncate text-[11.5px] text-fg-faint">{user?.email}</div>
          </div>
          <button className="btn btn-quiet btn-icon" style={{ padding: 5, color: "var(--text-3)" }} title="로그아웃"
            onClick={(e) => { e.stopPropagation(); handleLogout(); }}>
            <Icon name="logout" size={18} />
          </button>
        </div>
      </aside>

      {menuOpen && <div onClick={() => setMenuOpen(false)} className="fixed inset-0 z-30 bg-black/40 lg:hidden" />}

      {/* 메인 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 flex-none items-center gap-4 border-b px-6"
          style={{ background: "color-mix(in srgb, var(--bg) 72%, transparent)", backdropFilter: "saturate(1.4) blur(14px)", borderColor: "var(--border)" }}>
          <button className="btn btn-quiet btn-icon lg:hidden" onClick={() => setMenuOpen(true)}><Icon name="menu" size={20} /></button>
          <div className="whitespace-nowrap text-[16.5px] font-extrabold text-fg">{TITLES[pathname] || "INU Course Mentor"}</div>
          <div className="flex-1" />
          <button className="btn btn-quiet btn-icon" title="테마 전환" onClick={toggleTheme}><Icon name={dark ? "sun" : "moon"} size={19} /></button>
          <button className="btn btn-quiet btn-icon relative" title="알림">
            <Icon name="bell" size={19} />
            <span className="absolute right-[7px] top-[7px] h-[7px] w-[7px] rounded-full" style={{ background: "var(--danger)" }} />
          </button>
          <div className="cursor-pointer" onClick={() => navigate("/profile")}><Avatar name={user?.name || user?.email} size={34} /></div>
        </header>

        <main className="w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );

  function handleLogout() {
    logout();
    navigate("/login");
  }
}
