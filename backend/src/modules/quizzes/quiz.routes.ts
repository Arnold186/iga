import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth";
import { prisma } from "../../prisma/client";
import { Role, QuestionType, SubmissionStatus } from "@prisma/client";
import { z } from "zod";
import { validateBody } from "../../middleware/validate";

const router = Router();

function parseNullableDate(raw: unknown): Date | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const d = new Date(String(raw));
  if (Number.isNaN(d.getTime())) throw new Error("Invalid datetime");
  return d;
}

function parseStringArrayJson(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    if (Array.isArray(v)) return v.filter((x) => typeof x === "string");
  } catch {
    // ignore
  }
  return [];
}

function parseOptionsPayload(raw: string): { values: string[]; marks: number } {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return {
        values: parsed.filter((x) => typeof x === "string"),
        marks: 1
      };
    }
    if (parsed && typeof parsed === "object" && Array.isArray((parsed as any).values)) {
      const marksRaw = Number((parsed as any).marks ?? 1);
      return {
        values: (parsed as any).values.filter((x: unknown) => typeof x === "string"),
        marks: Number.isFinite(marksRaw) && marksRaw > 0 ? Math.floor(marksRaw) : 1
      };
    }
  } catch {
    // ignore
  }

  return { values: [], marks: 1 };
}

function normalizeQuestion(q: any, includeCorrectAnswers: boolean) {
  const parsedOptions = parseOptionsPayload(q.options);
  const options = parsedOptions.values;
  const correctAnswers = includeCorrectAnswers ? parseStringArrayJson(q.correctAnswers) : undefined;

  return {
    id: q.id,
    questionText: q.questionText,
    questionType: q.questionType as QuestionType,
    marks: parsedOptions.marks,
    options,
    ...(includeCorrectAnswers ? { correctAnswers: correctAnswers ?? [] } : {})
  };
}

const createQuizSchema = z.object({
  title: z.string().min(1),
  courseId: z.string().uuid(),
  availableFrom: z.any().optional().nullable(),
  availableTo: z.any().optional().nullable(),
  durationSeconds: z.any().optional().nullable(),
  allowedAttempts: z.any().optional().nullable(),
  published: z.any().optional().nullable()
});

const updateQuizSchema = createQuizSchema.partial().extend({
  title: z.string().min(1).optional()
});

const addOrUpdateQuestionSchema = z.object({
  questionText: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  questionType: z.enum(["SINGLE", "MULTI"]).optional().default("SINGLE"),
  correctAnswers: z.array(z.string().min(1)).min(1),
  marks: z.number().int().min(1).optional().default(1)
});

const submitAttemptSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      selected: z.array(z.string().min(1)).default([])
    })
  )
});

router.post(
  "/",
  authenticate,
  requireRole([Role.TEACHER]),
  validateBody(createQuizSchema),
  async (req, res) => {
    const { title, courseId } = req.body as {
      title: string;
      courseId: string;
      availableFrom?: unknown;
      availableTo?: unknown;
      durationSeconds?: unknown;
      allowedAttempts?: unknown;
      published?: unknown;
    };

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.teacherId !== req.user!.id) {
      return res.status(403).json({ message: "You can only create quizzes for your courses" });
    }

    const availableFrom = (() => {
      try {
        return parseNullableDate((req.body as any).availableFrom);
      } catch {
        throw new Error("Invalid availableFrom");
      }
    })();
    const availableTo = (() => {
      try {
        return parseNullableDate((req.body as any).availableTo);
      } catch {
        throw new Error("Invalid availableTo");
      }
    })();

    const durationSecondsRaw = (req.body as any).durationSeconds;
    const durationSeconds =
      durationSecondsRaw === undefined || durationSecondsRaw === null || durationSecondsRaw === ""
        ? null
        : Number(durationSecondsRaw);

    if (durationSeconds != null && (!Number.isFinite(durationSeconds) || durationSeconds <= 0)) {
      return res.status(400).json({ message: "durationSeconds must be a positive number" });
    }

    const allowedAttemptsRaw = (req.body as any).allowedAttempts;
    const allowedAttempts =
      allowedAttemptsRaw === undefined || allowedAttemptsRaw === null || allowedAttemptsRaw === ""
        ? 1
        : Number(allowedAttemptsRaw);

    if (!Number.isInteger(allowedAttempts) || allowedAttempts < 1) {
      return res.status(400).json({ message: "allowedAttempts must be an integer >= 1" });
    }

    const publishedRaw = (req.body as any).published;
    const published = publishedRaw === undefined || publishedRaw === null ? false : Boolean(publishedRaw);

    if (availableFrom && availableTo && availableFrom > availableTo) {
      return res.status(400).json({ message: "availableFrom must be before availableTo" });
    }

    const quiz = await prisma.quiz.create({
      data: {
        title,
        courseId,
        availableFrom,
        availableTo,
        durationSeconds,
        allowedAttempts,
        published
      }
    });

    res.status(201).json(quiz);
  }
);

router.patch(
  "/:quizId",
  authenticate,
  requireRole([Role.TEACHER]),
  validateBody(updateQuizSchema),
  async (req, res) => {
    const { quizId } = req.params;

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, include: { course: true } });
    if (!quiz || quiz.course.teacherId !== req.user!.id) {
      return res.status(403).json({ message: "Not your quiz" });
    }

    const availableFrom = req.body.availableFrom !== undefined ? parseNullableDate(req.body.availableFrom) : quiz.availableFrom;
    const availableTo = req.body.availableTo !== undefined ? parseNullableDate(req.body.availableTo) : quiz.availableTo;

    const durationSecondsRaw = req.body.durationSeconds;
    const durationSeconds =
      durationSecondsRaw === undefined
        ? quiz.durationSeconds
        : durationSecondsRaw === null || durationSecondsRaw === ""
          ? null
          : Number(durationSecondsRaw);

    if (durationSeconds != null && (!Number.isFinite(durationSeconds) || durationSeconds <= 0)) {
      return res.status(400).json({ message: "durationSeconds must be a positive number" });
    }

    const allowedAttemptsRaw = req.body.allowedAttempts;
    const allowedAttempts =
      allowedAttemptsRaw === undefined
        ? quiz.allowedAttempts
        : allowedAttemptsRaw === null || allowedAttemptsRaw === ""
          ? quiz.allowedAttempts
          : Number(allowedAttemptsRaw);

    if (!Number.isInteger(allowedAttempts) || allowedAttempts < 1) {
      return res.status(400).json({ message: "allowedAttempts must be an integer >= 1" });
    }

    const published =
      req.body.published === undefined || req.body.published === null ? quiz.published : Boolean(req.body.published);

    if (availableFrom && availableTo && availableFrom > availableTo) {
      return res.status(400).json({ message: "availableFrom must be before availableTo" });
    }

    const updated = await prisma.quiz.update({
      where: { id: quizId },
      data: {
        title: req.body.title ?? quiz.title,
        availableFrom,
        availableTo,
        durationSeconds,
        allowedAttempts,
        published
      }
    });

    res.json(updated);
  }
);

router.patch(
  "/:id/publish",
  authenticate,
  requireRole([Role.TEACHER]),
  async (req, res) => {
    const { id } = req.params;
    const quiz = await prisma.quiz.findUnique({ where: { id }, include: { course: true } });
    if (!quiz || quiz.course.teacherId !== req.user!.id) {
      return res.status(403).json({ message: "You can only publish your own quizzes" });
    }

    const updated = await prisma.quiz.update({ where: { id }, data: { published: true } });
    res.json(updated);
  }
);

router.post(
  "/:quizId/questions",
  authenticate,
  requireRole([Role.TEACHER]),
  validateBody(addOrUpdateQuestionSchema),
  async (req, res) => {
    const { quizId } = req.params;
    const { questionText, options, questionType, correctAnswers, marks } = req.body as {
      questionText: string;
      options: string[];
      questionType: QuestionType | "SINGLE" | "MULTI";
      correctAnswers: string[];
      marks?: number;
    };

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, include: { course: true } });
    if (!quiz || quiz.course.teacherId !== req.user!.id) {
      return res.status(403).json({ message: "You can only add questions to your own quizzes" });
    }

    const type = (questionType ?? "SINGLE") as QuestionType;
    if (type === QuestionType.SINGLE && correctAnswers.length !== 1) {
      return res.status(400).json({ message: "Single-choice questions must have exactly 1 correct answer" });
    }
    if (type === QuestionType.MULTI && correctAnswers.length < 1) {
      return res.status(400).json({ message: "Multi-choice questions must have at least 1 correct answer" });
    }

    if (!correctAnswers.every((a) => options.includes(a))) {
      return res.status(400).json({ message: "All correct answers must be included in options" });
    }

    const question = await prisma.question.create({
      data: {
        quizId,
        questionText,
        questionType: type,
        options: JSON.stringify({ values: options, marks: Number(marks ?? 1) }),
        correctAnswers: JSON.stringify(correctAnswers)
      }
    });

    res.status(201).json({
      ...question,
      options,
      correctAnswers
    });
  }
);

router.patch(
  "/:quizId/questions/:questionId",
  authenticate,
  requireRole([Role.TEACHER]),
  validateBody(addOrUpdateQuestionSchema),
  async (req, res) => {
    const { quizId, questionId } = req.params;
    const { questionText, options, questionType, correctAnswers, marks } = req.body as {
      questionText: string;
      options: string[];
      questionType: QuestionType | "SINGLE" | "MULTI";
      correctAnswers: string[];
      marks?: number;
    };

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, include: { course: true } });
    if (!quiz || quiz.course.teacherId !== req.user!.id) {
      return res.status(403).json({ message: "Not your quiz" });
    }

    const existingQuestion = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true, quizId: true }
    });
    if (!existingQuestion || existingQuestion.quizId !== quizId) {
      return res.status(404).json({ message: "Question not found" });
    }

    const type = (questionType ?? "SINGLE") as QuestionType;
    if (type === QuestionType.SINGLE && correctAnswers.length !== 1) {
      return res.status(400).json({ message: "Single-choice questions must have exactly 1 correct answer" });
    }
    if (type === QuestionType.MULTI && correctAnswers.length < 1) {
      return res.status(400).json({ message: "Multi-choice questions must have at least 1 correct answer" });
    }

    if (!correctAnswers.every((a) => options.includes(a))) {
      return res.status(400).json({ message: "All correct answers must be included in options" });
    }

    const updated = await prisma.question.update({
      where: { id: questionId },
      data: {
        questionText,
        questionType: type,
        options: JSON.stringify({ values: options, marks: Number(marks ?? 1) }),
        correctAnswers: JSON.stringify(correctAnswers),
        quizId
      }
    });

    res.json({
      ...updated,
      options,
      correctAnswers
    });
  }
);

router.delete(
  "/:quizId/questions/:questionId",
  authenticate,
  requireRole([Role.TEACHER]),
  async (req, res) => {
    const { quizId, questionId } = req.params;

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, include: { course: true } });
    if (!quiz || quiz.course.teacherId !== req.user!.id) {
      return res.status(403).json({ message: "Not your quiz" });
    }

    const existingQuestion = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true, quizId: true }
    });
    if (!existingQuestion || existingQuestion.quizId !== quizId) {
      return res.status(404).json({ message: "Question not found" });
    }

    await prisma.question.delete({ where: { id: questionId } });
    res.json({ ok: true });
  }
);

router.get(
  "/course/:courseId",
  authenticate,
  async (req, res) => {
    const { courseId } = req.params;

    if (req.user!.role === Role.STUDENT) {
      const enrollment = await prisma.enrollment.findFirst({ where: { courseId, studentId: req.user!.id } });
      if (!enrollment) return res.status(403).json({ message: "You are not enrolled in this course" });
    }

    const quizzes = await prisma.quiz.findMany({
      where: req.user!.role === Role.STUDENT ? { courseId, published: true } : { courseId },
      include: { questions: true }
    });

    if (req.user!.role === Role.STUDENT) {
      const quizIds = quizzes.map((q) => q.id);
      const completed = await prisma.submission.findMany({
        where: {
          studentId: req.user!.id,
          quizId: { in: quizIds },
          status: SubmissionStatus.COMPLETED
        },
        select: { quizId: true }
      });
      const completedCountByQuiz: Record<string, number> = {};
      for (const s of completed) completedCountByQuiz[s.quizId] = (completedCountByQuiz[s.quizId] ?? 0) + 1;

      const now = new Date();
      return res.json(
        quizzes.map((q) => {
          const used = completedCountByQuiz[q.id] ?? 0;
          const left = Math.max(0, q.allowedAttempts - used);

          const availableNow =
            (!q.availableFrom || now >= q.availableFrom) &&
            (!q.availableTo || now <= q.availableTo);

          const availabilityStatus = availableNow
            ? "AVAILABLE"
            : q.availableFrom && now < q.availableFrom
              ? "NOT_YET"
              : "EXPIRED";

          const timeUntilEndSeconds =
            q.availableTo ? Math.max(0, Math.floor((q.availableTo.getTime() - now.getTime()) / 1000)) : null;

          return {
            id: q.id,
            title: q.title,
            published: q.published,
            availableFrom: q.availableFrom,
            availableTo: q.availableTo,
            durationSeconds: q.durationSeconds,
            allowedAttempts: q.allowedAttempts,
            totalMarks: q.questions.reduce((sum, qq: any) => sum + parseOptionsPayload(qq.options).marks, 0),
            questionCount: q.questions.length,
            attemptsUsed: used,
            attemptsLeft: left,
            availabilityStatus,
            timeUntilEndSeconds,
            // include questions so student UI can show basic preview if desired
            questions: q.questions.map((qq: any) =>
              normalizeQuestion(qq, false)
            )
          };
        })
      );
    }

    // Teacher response includes correct answers for management.
    res.json(
      quizzes.map((q) => {
        const totalMarks = q.questions.reduce((sum, qq: any) => sum + parseOptionsPayload(qq.options).marks, 0);
        return {
          ...q,
          totalMarks,
          questions: q.questions.map((qq: any) => normalizeQuestion(qq, true))
        };
      })
    );
  }
);

router.get("/:id", authenticate, async (req, res) => {
  const { id } = req.params;
  const quiz = await prisma.quiz.findUnique({ where: { id }, include: { questions: true, course: true } });
  if (!quiz) return res.status(404).json({ message: "Quiz not found" });

  const isStudent = req.user!.role === Role.STUDENT;
  const isTeacher = req.user!.role === Role.TEACHER;

  if (isStudent) {
    const enrollment = await prisma.enrollment.findFirst({ where: { courseId: quiz.courseId, studentId: req.user!.id } });
    if (!enrollment) return res.status(403).json({ message: "You are not enrolled in this course" });
    if (!quiz.published) return res.status(403).json({ message: "Quiz is not published" });
  } else if (isTeacher) {
    if (quiz.course.teacherId !== req.user!.id) return res.status(403).json({ message: "Not your quiz" });
  }

  res.json({
    id: quiz.id,
    title: quiz.title,
    courseId: quiz.courseId,
    published: quiz.published,
    availableFrom: quiz.availableFrom,
    availableTo: quiz.availableTo,
    durationSeconds: quiz.durationSeconds,
    allowedAttempts: quiz.allowedAttempts,
    totalMarks: quiz.questions.reduce((sum, qq: any) => sum + parseOptionsPayload(qq.options).marks, 0),
    course: quiz.course,
    questions: quiz.questions.map((q: any) => normalizeQuestion(q, isTeacher))
  });
});

router.post(
  "/:id/start",
  authenticate,
  requireRole([Role.STUDENT]),
  async (req, res) => {
    const quizId = req.params.id;
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, include: { course: true, questions: true } });
    if (!quiz || !quiz.published) return res.status(403).json({ message: "Quiz not available" });

    const enrollment = await prisma.enrollment.findFirst({ where: { courseId: quiz.courseId, studentId: req.user!.id } });
    if (!enrollment) return res.status(403).json({ message: "You are not enrolled in this course" });

    const now = new Date();
    if (quiz.availableFrom && now < quiz.availableFrom) return res.status(403).json({ message: "Quiz not started yet" });
    if (quiz.availableTo && now > quiz.availableTo) return res.status(403).json({ message: "Quiz is no longer available" });

    const inProgress = await prisma.submission.findFirst({
      where: { studentId: req.user!.id, quizId, status: SubmissionStatus.IN_PROGRESS },
      orderBy: { startedAt: "desc" }
    });

    if (inProgress) {
      // If the attempt already expired, close it automatically so the student can retake.
      if (inProgress.expiresAt && now > inProgress.expiresAt) {
        const timeSpentSeconds = Math.max(0, Math.floor((now.getTime() - inProgress.startedAt.getTime()) / 1000));
        await prisma.submission.update({
          where: { id: inProgress.id },
          data: {
            status: SubmissionStatus.COMPLETED,
            submittedAt: now,
            score: 0,
            timeSpentSeconds
          }
        });
      } else {
        const timeRemainingSeconds =
          inProgress.expiresAt
            ? Math.max(0, Math.floor((inProgress.expiresAt.getTime() - now.getTime()) / 1000))
            : null;
        return res.json({
          attempt: inProgress,
          quiz: {
            id: quiz.id,
            title: quiz.title,
            courseId: quiz.courseId,
            durationSeconds: quiz.durationSeconds,
            availableFrom: quiz.availableFrom,
            availableTo: quiz.availableTo,
            allowedAttempts: quiz.allowedAttempts,
            timerMode: quiz.durationSeconds ? "DURATION" : "WINDOW",
            questions: quiz.questions.map((q: any) => normalizeQuestion(q, false))
          },
          timeRemainingSeconds
        });
      }
    }

    const completedCount = await prisma.submission.count({
      where: { studentId: req.user!.id, quizId, status: SubmissionStatus.COMPLETED }
    });

    if (completedCount >= quiz.allowedAttempts) {
      return res.status(403).json({ message: "No attempts left for this quiz" });
    }

    // Expiration is min(duration end, availableTo end), depending on what teacher set.
    let expiresAt: Date | null = null;
    if (quiz.durationSeconds) {
      expiresAt = new Date(now.getTime() + quiz.durationSeconds * 1000);
    } else if (quiz.availableTo) {
      expiresAt = quiz.availableTo;
    }
    if (expiresAt && quiz.availableTo) {
      expiresAt = new Date(Math.min(expiresAt.getTime(), quiz.availableTo.getTime()));
    }

    const attemptNumber = completedCount + 1;
    const submission = await prisma.submission.create({
      data: {
        quizId,
        studentId: req.user!.id,
        attemptNumber,
        status: SubmissionStatus.IN_PROGRESS,
        startedAt: now,
        expiresAt
      }
    });

    const timeRemainingSeconds =
      submission.expiresAt ? Math.max(0, Math.floor((submission.expiresAt.getTime() - now.getTime()) / 1000)) : null;

    res.json({
      attempt: submission,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        courseId: quiz.courseId,
        durationSeconds: quiz.durationSeconds,
        availableFrom: quiz.availableFrom,
        availableTo: quiz.availableTo,
        allowedAttempts: quiz.allowedAttempts,
        timerMode: quiz.durationSeconds ? "DURATION" : "WINDOW",
        questions: quiz.questions.map((q: any) => normalizeQuestion(q, false))
      },
      timeRemainingSeconds
    });
  }
);

router.post(
  "/attempts/:attemptId/submit",
  authenticate,
  requireRole([Role.STUDENT]),
  validateBody(submitAttemptSchema),
  async (req, res) => {
    const { attemptId } = req.params;
    const { answers } = req.body as { answers: { questionId: string; selected: string[] }[] };

    const submission = await prisma.submission.findUnique({
      where: { id: attemptId },
      include: { quiz: { include: { questions: true } } }
    });
    if (!submission || submission.studentId !== req.user!.id) {
      return res.status(403).json({ message: "Attempt not found" });
    }
    if (submission.status !== SubmissionStatus.IN_PROGRESS) {
      return res.status(400).json({ message: "Attempt is not active" });
    }

    const quiz = submission.quiz;
    const now = new Date();

    // Enforce timer / availability window.
    if (submission.expiresAt && now > submission.expiresAt) {
      await prisma.submission.update({
        where: { id: submission.id },
        data: { status: SubmissionStatus.COMPLETED, submittedAt: now, score: 0 }
      });
      return res.status(403).json({ message: "Time expired" });
    }

    if (!quiz.published) return res.status(403).json({ message: "Quiz not available" });

    const enrollment = await prisma.enrollment.findFirst({
      where: { courseId: quiz.courseId, studentId: req.user!.id }
    });
    if (!enrollment) return res.status(403).json({ message: "You are not enrolled in this course" });

    // Index selections by questionId.
    const selectedByQuestion: Record<string, string[]> = {};
    for (const a of answers) selectedByQuestion[a.questionId] = a.selected ?? [];

    let score = 0;
    let totalMarks = 0;
    for (const q of quiz.questions) {
      const correct = parseStringArrayJson((q as any).correctAnswers);
      const studentSelected = selectedByQuestion[q.id] ?? [];
      const marks = parseOptionsPayload((q as any).options).marks;
      totalMarks += marks;

      const questionType = (q as any).questionType as QuestionType;

      if (questionType === QuestionType.SINGLE) {
        const expected = correct[0];
        const actual = studentSelected.length > 0 ? studentSelected[0] : undefined;
        if (actual && expected && actual === expected) score += marks;
      } else {
        const expectedSet = new Set(correct);
        const actualSet = new Set(studentSelected);
        if (expectedSet.size !== actualSet.size) continue;
        let allMatch = true;
        for (const v of expectedSet) {
          if (!actualSet.has(v)) {
            allMatch = false;
            break;
          }
        }
        if (allMatch) score += marks;
      }
    }

    const startedAt = submission.startedAt;
    const timeSpentSeconds = Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000));

    const answersPayload: Record<string, string[]> = {};
    for (const a of answers) answersPayload[a.questionId] = a.selected ?? [];

    const updated = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: SubmissionStatus.COMPLETED,
        submittedAt: now,
        score,
        answers: JSON.stringify(answersPayload),
        timeSpentSeconds
      }
    });

    res.json({
      submission: updated,
      totalQuestions: quiz.questions.length,
      totalMarks,
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
    const quiz = await prisma.quiz.findUnique({ where: { id }, include: { course: true, questions: true } });
    if (!quiz || quiz.course.teacherId !== req.user!.id) {
      return res.status(403).json({ message: "You can only view submissions for your quizzes" });
    }

    const submissions = await prisma.submission.findMany({
      where: { quizId: id },
      include: { student: true },
      orderBy: [{ attemptNumber: "asc" }, { startedAt: "asc" }]
    });

    const totalQuestions = quiz.questions.length;
    const totalMarks = quiz.questions.reduce((sum, q: any) => sum + parseOptionsPayload(q.options).marks, 0);
    res.json(
      submissions.map((s) => ({
        ...s,
        percentScore: s.score == null ? null : Math.round((s.score / Math.max(1, totalMarks)) * 100),
        totalMarks,
        totalQuestions
      }))
    );
  }
);

router.get(
  "/my",
  authenticate,
  requireRole([Role.STUDENT]),
  async (req, res) => {
    const submissions = await prisma.submission.findMany({
      where: { studentId: req.user!.id },
      include: { quiz: { include: { course: true, questions: true } } },
      orderBy: [{ startedAt: "desc" }, { attemptNumber: "desc" }]
    });

    res.json(
      submissions.map((s) => {
        const totalQuestions = s.quiz.questions.length;
        const totalMarks = s.quiz.questions.reduce((sum, q: any) => sum + parseOptionsPayload(q.options).marks, 0);
        const percentScore = s.score == null ? null : Math.round((s.score / Math.max(1, totalMarks)) * 100);
        // Strip questions from student payload (prevents leaking correct answers).
        return {
          ...s,
          totalQuestions,
          totalMarks,
          percentScore,
          quiz: {
            id: s.quiz.id,
            title: s.quiz.title,
            course: s.quiz.course
          }
        };
      })
    );
  }
);

export default router;

