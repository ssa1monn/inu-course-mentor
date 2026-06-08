import express from "express";
import helmet from "helmet";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import meRoutes from "./routes/me.js";
import courseRoutes from "./routes/courses.js";
import gradeRoutes from "./routes/grades.js";
import enrollmentRoutes from "./routes/enrollments.js";
import graduationRoutes from "./routes/graduation.js";
import recommendRoutes from "./routes/recommend.js";
import adminRoutes from "./routes/admin.js";
import { errorHandler, notFound } from "./middleware/error.js";

const app = express();

app.use(helmet());
app.use(cors()); // same-origin(Nginx 프록시) 환경이지만 개발 편의상 허용
app.use(express.json({ limit: "1mb" }));

// 헬스체크
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "inucm-backend" });
});

// API 라우트
app.use("/api/auth", authRoutes);
app.use("/api/me", meRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/grades", gradeRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/graduation", graduationRoutes);
app.use("/api/recommend", recommendRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`inucm-backend listening on port ${PORT}`);
});
