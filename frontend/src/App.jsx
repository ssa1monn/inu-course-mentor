import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import useAuthStore from "./stores/auth.js";
import { initTheme } from "./lib/theme.js";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Profile from "./pages/Profile.jsx";
import Courses from "./pages/Courses.jsx";
import Timetable from "./pages/Timetable.jsx";
import Graduation from "./pages/Graduation.jsx";
import Gpa from "./pages/Gpa.jsx";
import Advice from "./pages/Advice.jsx";
import Admin from "./pages/Admin.jsx";

// 인증 필요 라우트 가드
function Protected({ children }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  // 저장된 테마(라이트/다크)를 <html data-theme> 에 1회 반영
  useEffect(() => { initTheme(); }, []);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/timetable" element={<Timetable />} />
        <Route path="/graduation" element={<Graduation />} />
        <Route path="/gpa" element={<Gpa />} />
        <Route path="/advice" element={<Advice />} />
        <Route path="/admin" element={<Admin />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
