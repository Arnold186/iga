import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth";
import { Role } from "@prisma/client";
import { prisma } from "../../prisma/client";

const router = Router();

router.use(authenticate, requireRole([Role.ADMIN]));

router.get("/users", async (_req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      createdAt: true
    }
  });
  res.json(users);
});

router.get("/analytics", async (_req, res) => {
  const [studentsCount, coursesCount, submissions] = await Promise.all([
    prisma.user.count({ where: { role: Role.STUDENT } }),
    prisma.course.count(),
    prisma.submission.findMany({
      include: {
        quiz: {
          include: { questions: true }
        }
      }
    })
  ]);

  let totalPercentage = 0;
  let submissionCount = 0;

  for (const sub of submissions) {
    const questionCount = sub.quiz.questions.length || 1;
    const percentage = (sub.score / questionCount) * 100;
    totalPercentage += percentage;
    submissionCount += 1;
  }

  const averagePerformance =
    submissionCount === 0 ? 0 : Number((totalPercentage / submissionCount).toFixed(2));

  res.json({
    studentsCount,
    coursesCount,
    averagePerformance
  });
});

export default router;

