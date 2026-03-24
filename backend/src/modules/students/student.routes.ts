import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth";
import { Role } from "@prisma/client";
import { prisma } from "../../prisma/client";
import { SubmissionStatus, AssignmentStatus } from "@prisma/client";

const router = Router();

router.use(authenticate, requireRole([Role.STUDENT]));

function parseOptionsMarks(rawOptions: string): number {
  try {
    const parsed = JSON.parse(rawOptions);
    // Expected shape: { values: string[], marks: number }
    if (parsed && typeof parsed === "object" && Array.isArray((parsed as any).values)) {
      const marksRaw = Number((parsed as any).marks ?? 1);
      return Number.isFinite(marksRaw) && marksRaw > 0 ? marksRaw : 1;
    }
    // Backwards compatibility: options might be a plain array of answers.
    if (Array.isArray(parsed)) return 1;
  } catch {
    // ignore
  }
  return 1;
}

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
 * Weighted course progress:
 * - Best quiz attempt only (highest completed score)
 * - Assignment/quiz items not yet expired are excluded unless graded
 * - Expired missing assignments/quizzes count as 0 (and affect the final percent)
 * - Each quiz/assignment has a `weightPercent` stored in DB
 */
router.get("/course-progress", async (req, res) => {
  const now = new Date();
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: req.user!.id },
    include: { course: true }
  });

  const courseIds = enrollments.map((e) => e.courseId);
  if (courseIds.length === 0) return res.json([]);

  const [quizzes, assignments] = await Promise.all([
    prisma.quiz.findMany({
      where: { courseId: { in: courseIds }, published: true },
      include: {
        questions: {
          select: { options: true }
        }
      }
    }),
    prisma.assignment.findMany({
      where: { courseId: { in: courseIds }, status: AssignmentStatus.APPROVED }
    })
  ]);

  const quizIds = quizzes.map((q) => q.id);
  const assignmentIds = assignments.map((a) => a.id);

  const [quizSubmissions, assignmentSubmissions] = await Promise.all([
    quizIds.length
      ? prisma.submission.findMany({
          where: {
            studentId: req.user!.id,
            quizId: { in: quizIds },
            status: SubmissionStatus.COMPLETED
          },
          select: { quizId: true, score: true }
        })
      : Promise.resolve([] as Array<{ quizId: string; score: number | null }>),
    assignmentIds.length
      ? prisma.assignmentSubmission.findMany({
          where: { studentId: req.user!.id, assignmentId: { in: assignmentIds } },
          select: { assignmentId: true, grade: true }
        })
      : Promise.resolve([] as Array<{ assignmentId: string; grade: number | null }>)
  ]);

  const bestQuizScoreByQuizId: Record<string, number> = {};
  for (const s of quizSubmissions) {
    if (s.score == null) continue;
    bestQuizScoreByQuizId[s.quizId] = Math.max(bestQuizScoreByQuizId[s.quizId] ?? 0, s.score);
  }

  const submissionGradeByAssignmentId: Record<string, number | null> = {};
  for (const sub of assignmentSubmissions) {
    // Keep even null grades so we can distinguish:
    // "not submitted at all" vs "submitted but not graded yet".
    submissionGradeByAssignmentId[sub.assignmentId] = sub.grade;
  }

  const quizzesByCourseId: Record<string, typeof quizzes> = {};
  for (const q of quizzes) {
    quizzesByCourseId[q.courseId] = quizzesByCourseId[q.courseId] ?? [];
    quizzesByCourseId[q.courseId].push(q);
  }

  const assignmentsByCourseId: Record<string, typeof assignments> = {};
  for (const a of assignments) {
    assignmentsByCourseId[a.courseId] = assignmentsByCourseId[a.courseId] ?? [];
    assignmentsByCourseId[a.courseId].push(a);
  }

  const results = enrollments.map((e) => {
    const quizItems = quizzesByCourseId[e.courseId] ?? [];
    const assignmentItems = assignmentsByCourseId[e.courseId] ?? [];

    let numerator = 0;
    let denominator = 0;

    for (const q of quizItems) {
      const totalMarks = q.questions.reduce((sum, qq: any) => sum + parseOptionsMarks(qq.options), 0);
      const weight = (q.weightPercent ?? 1) as number;
      const expired = q.availableTo != null && now > q.availableTo;

      const bestScore = bestQuizScoreByQuizId[q.id];
      if (bestScore != null) {
        const percentScore = Math.round((bestScore / Math.max(1, totalMarks)) * 100);
        numerator += percentScore * weight;
        denominator += weight;
      } else if (expired) {
        numerator += 0 * weight;
        denominator += weight;
      }
      // Not expired and not attempted -> excluded
    }

    for (const a of assignmentItems) {
      const weight = (a.weightPercent ?? 1) as number;
      const expired = a.availableTo != null && now > a.availableTo;

      const hasSubmission = Object.prototype.hasOwnProperty.call(submissionGradeByAssignmentId, a.id);
      const grade = submissionGradeByAssignmentId[a.id];

      if (hasSubmission && grade != null) {
        numerator += grade * weight;
        denominator += weight;
      } else if (!hasSubmission && expired) {
        numerator += 0 * weight;
        denominator += weight;
      }
      // Not expired and not submitted -> excluded
    }

    const finalPercent = denominator > 0 ? Math.round(numerator / denominator) : 0;
    return {
      courseId: e.courseId,
      courseTitle: e.course.title,
      finalPercent
    };
  });

  res.json(results);
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
