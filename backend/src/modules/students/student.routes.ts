import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth";
import { Role } from "@prisma/client";
import { prisma } from "../../prisma/client";

const router = Router();

router.use(authenticate, requireRole([Role.STUDENT]));

/**
 * @swagger
 * /api/students/grades:
 *   get:
 *     tags: [Students]
 *     summary: Get student's assignment grades
 *     responses:
 *       200:
 *         description: List of grades
 */
router.get("/grades", async (req, res) => {
  const submissions = await prisma.assignmentSubmission.findMany({
    where: { studentId: req.user!.id },
    include: {
      assignment: {
        include: { course: true }
      }
    }
  });
  res.json(submissions);
});

/**
 * @swagger
 * /api/students/quiz-results:
 *   get:
 *     tags: [Students]
 *     summary: Get student's quiz results
 */
router.get("/quiz-results", async (req, res) => {
  const submissions = await prisma.submission.findMany({
    where: { studentId: req.user!.id },
    include: {
      quiz: { include: { course: true, questions: true } }
    }
  });
  res.json(submissions);
});

export default router;
