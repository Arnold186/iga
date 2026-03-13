import "express-async-errors";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import authRoutes from "./modules/auth/auth.routes";
import courseRoutes from "./modules/courses/course.routes";
import quizRoutes from "./modules/quizzes/quiz.routes";
import chatRoutes from "./modules/chat/chat.routes";
import adminRoutes from "./modules/admin/admin.routes";
import userRoutes from "./modules/users/user.routes";
import assignmentRoutes from "./modules/assignments/assignment.routes";
import notificationRoutes from "./modules/notifications/notification.routes";
import submissionRoutes from "./modules/submissions/submission.routes";
import studentRoutes from "./modules/students/student.routes";
import moduleRoutes from "./modules/modules/module.routes";
import lessonRoutes from "./modules/lessons/lesson.routes";
import { errorHandler } from "./middleware/errorHandler";
import { env } from "./config/env";
import { setupSwagger } from "./docs/swagger";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Too many attempts, please try again later" }
});

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.frontendUrl,
      credentials: true
    })
  );
  app.use(express.json());
  app.use(morgan("dev"));

  setupSwagger(app);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authLimiter, authRoutes);
  app.use("/api/courses", courseRoutes);
  app.use("/api/quizzes", quizRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/assignments", assignmentRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/submissions", submissionRoutes);
  app.use("/api/students", studentRoutes);
  app.use("/api/modules", moduleRoutes);
  app.use("/api/lessons", lessonRoutes);

  app.use(errorHandler);

  return app;
}

