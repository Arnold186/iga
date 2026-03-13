import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth";
import { Role } from "@prisma/client";
import { prisma } from "../../prisma/client";
import { z } from "zod";
import { validateBody } from "../../middleware/validate";

const router = Router();

const createQuizSchema = z.object({
  title: z.string().min(1),
  courseId: z.string().uuid()
});

const addQuestionSchema = z.object({
  questionText: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  correctAnswer: z.string().min(1)
});

const submitQuizSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().uuid(),
        answer: z.string().min(1)
      })
    )
    .min(1)
});

router.post(
  "/",
  authenticate,
  requireRole([Role.TEACHER]),
  validateBody(createQuizSchema),
  async (req, res) => {
    const { title, courseId } = req.body as { title: string; courseId: string };

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.teacherId !== req.user!.id) {
      return res.status(403).json({ message: "You can only create quizzes for your courses" });
    }

    const quiz = await prisma.quiz.create({
      data: {
        title,
        courseId
      }
    });

    res.status(201).json(quiz);
  }
);

router.post(
  "/:quizId/questions",
  authenticate,
  requireRole([Role.TEACHER]),
  validateBody(addQuestionSchema),
  async (req, res) => {
    const { quizId } = req.params;
    const { questionText, options, correctAnswer } = req.body as {
      questionText: string;
      options: string[];
      correctAnswer: string;
    };

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { course: true }
    });
    if (!quiz || quiz.course.teacherId !== req.user!.id) {
      return res
        .status(403)
        .json({ message: "You can only add questions to your own quizzes" });
    }

    if (!options.includes(correctAnswer)) {
      return res
        .status(400)
        .json({ message: "Correct answer must be one of the options" });
    }

    const question = await prisma.question.create({
      data: {
        quizId,
        questionText,
        options: JSON.stringify(options),
        correctAnswer
      }
    });

    res.status(201).json(question);
  }
);

router.patch(
  "/:id/publish",
  authenticate,
  requireRole([Role.TEACHER]),
  async (req, res) => {
    const { id } = req.params;
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: { course: true }
    });
    if (!quiz || quiz.course.teacherId !== req.user!.id) {
      return res
        .status(403)
        .json({ message: "You can only publish your own quizzes" });
    }

    const updated = await prisma.quiz.update({
      where: { id },
      data: { published: true }
    });

    res.json(updated);
  }
);

router.get(
  "/course/:courseId",
  authenticate,
  async (req, res) => {
    const { courseId } = req.params;

    if (req.user!.role === Role.STUDENT) {
      const enrollment = await prisma.enrollment.findFirst({
        where: { courseId, studentId: req.user!.id }
      });
      if (!enrollment) {
        return res.status(403).json({ message: "You are not enrolled in this course" });
      }
    }

    const quizzes = await prisma.quiz.findMany({
      where:
        req.user!.role === Role.STUDENT
          ? { courseId, published: true }
          : { courseId },
      include: { questions: true }
    });

    res.json(quizzes);
  }
);

/**
 * @swagger
 * /api/quizzes/{id}:
 *   get:
 *     tags: [Quizzes]
 *     summary: Get quiz by ID with questions
 */
router.get("/:id", authenticate, async (req, res) => {
  const { id } = req.params;
  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: { questions: true, course: true }
  });
  if (!quiz) return res.status(404).json({ message: "Quiz not found" });
  if (req.user!.role === Role.STUDENT) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { courseId: quiz.courseId, studentId: req.user!.id }
    });
    if (!enrollment) return res.status(403).json({ message: "You are not enrolled in this course" });
    if (!quiz.published) return res.status(403).json({ message: "Quiz is not published" });
  } else if (req.user!.role === Role.TEACHER && quiz.course.teacherId !== req.user!.id) {
    return res.status(403).json({ message: "Not your quiz" });
  }
  res.json(quiz);
});

router.post(
  "/:id/submit",
  authenticate,
  requireRole([Role.STUDENT]),
  validateBody(submitQuizSchema),
  async (req, res) => {
    const { id } = req.params;
    const { answers } = req.body as {
      answers: { questionId: string; answer: string }[];
    };

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: { questions: true, course: true }
    });
    if (!quiz || !quiz.published) {
      return res.status(400).json({ message: "Quiz not available" });
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: { courseId: quiz.courseId, studentId: req.user!.id }
    });
    if (!enrollment) {
      return res.status(403).json({ message: "You are not enrolled in this course" });
    }

    const answersMap = new Map(answers.map((a) => [a.questionId, a.answer]));
    let score = 0;

    for (const q of quiz.questions) {
      const ans = answersMap.get(q.id);
      if (ans && ans === q.correctAnswer) {
        score += 1;
      }
    }

    const submission = await prisma.submission.upsert({
      where: {
        studentId_quizId: {
          studentId: req.user!.id,
          quizId: id
        }
      },
      update: {
        answers: JSON.stringify(answers),
        score
      },
      create: {
        studentId: req.user!.id,
        quizId: id,
        answers: JSON.stringify(answers),
        score
      }
    });

    res.json({
      submission,
      totalQuestions: quiz.questions.length,
      score
    });
  }
);

router.get(
  "/:id/submissions",
  authenticate,
  requireRole([Role.TEACHER]),
  async (req, res) => {
    const { id } = req.params;
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: { course: true }
    });
    if (!quiz || quiz.course.teacherId !== req.user!.id) {
      return res
        .status(403)
        .json({ message: "You can only view submissions for your quizzes" });
    }

    const submissions = await prisma.submission.findMany({
      where: { quizId: id },
      include: { student: true }
    });

    res.json(submissions);
  }
);

router.get(
  "/my",
  authenticate,
  requireRole([Role.STUDENT]),
  async (req, res) => {
    const submissions = await prisma.submission.findMany({
      where: { studentId: req.user!.id },
      include: {
        quiz: {
          include: {
            course: true
          }
        }
      }
    });

    res.json(submissions);
  }
);

export default router;

