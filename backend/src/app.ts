import "express-async-errors";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./modules/auth/auth.routes";
import courseRoutes from "./modules/courses/course.routes";
import quizRoutes from "./modules/quizzes/quiz.routes";
import chatRoutes from "./modules/chat/chat.routes";
import adminRoutes from "./modules/admin/admin.routes";
import { errorHandler } from "./middleware/errorHandler";
import { env } from "./config/env";

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

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/courses", courseRoutes);
  app.use("/api/quizzes", quizRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/admin", adminRoutes);

  app.use(errorHandler);

  return app;
}

