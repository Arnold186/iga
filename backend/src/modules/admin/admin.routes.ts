import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth";
import { Role, AssignmentStatus } from "@prisma/client";
import { prisma } from "../../prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { validateBody } from "../../middleware/validate";

const router = Router();

const registerTeacherSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6)
});

router.use(authenticate, requireRole([Role.ADMIN]));

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List all users
 *     responses:
 *       200:
 *         description: All users
 */
router.get("/users", async (_req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      profileImage: true,
      isActive: true,
      createdAt: true
    }
  });
  res.json(users);
});

/**
 * @swagger
 * /api/admin/users/{id}/status:
 *   patch:
 *     tags: [Admin]
 *     summary: Activate or deactivate user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User status updated
 */
router.patch(
  "/users/:id/status",
  validateBody(z.object({ isActive: z.boolean() })),
  async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body as { isActive: boolean };
    const user = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: { id: true, email: true, isActive: true }
    });
    res.json(user);
  }
);

router.post("/register-teacher", validateBody(registerTeacherSchema), async (req, res) => {
  const { firstName, lastName, email, password } = req.body as {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  };
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(400).json({ message: "Email already in use" });
  }
  const hash = await bcrypt.hash(password, 10);
  const teacher = await prisma.user.create({
    data: { firstName, lastName, email, password: hash, role: Role.TEACHER },
    select: { id: true, firstName: true, lastName: true, email: true, role: true, createdAt: true }
  });
  res.status(201).json(teacher);
});

/**
 * @swagger
 * /api/admin/teachers:
 *   get:
 *     tags: [Admin]
 *     summary: List all teachers
 *     responses:
 *       200:
 *         description: All teachers
 *   post:
 *     tags: [Admin]
 *     summary: Register teacher
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, password]
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Teacher created
 */
router.get("/teachers", async (_req, res) => {
  const teachers = await prisma.user.findMany({
    where: { role: Role.TEACHER },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      profileImage: true,
      createdAt: true
    }
  });
  res.json(teachers);
});

router.post("/teachers", validateBody(registerTeacherSchema), async (req, res) => {
  const { firstName, lastName, email, password } = req.body as {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(400).json({ message: "Email already in use" });
  }

  const hash = await bcrypt.hash(password, 10);

  const teacher = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      password: hash,
      role: Role.TEACHER
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      createdAt: true
    }
  });

  res.status(201).json(teacher);
});

/**
 * @swagger
 * /api/admin/students:
 *   get:
 *     tags: [Admin]
 *     summary: List all students
 *     responses:
 *       200:
 *         description: All students
 */
router.get("/students", async (_req, res) => {
  const students = await prisma.user.findMany({
    where: { role: Role.STUDENT },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      profileImage: true,
      createdAt: true
    }
  });
  res.json(students);
});

/**
 * @swagger
 * /api/admin/analytics:
 *   get:
 *     tags: [Admin]
 *     summary: Dashboard analytics
 *     responses:
 *       200:
 *         description: studentsCount, coursesCount, averagePerformance
 */
/**
 * @swagger
 * /api/admin/courses/pending:
 *   get:
 *     tags: [Admin]
 *     summary: List pending courses for approval
 *     responses:
 *       200:
 *         description: List of pending courses
 */
router.get("/courses/pending", async (_req, res) => {
  const courses = await prisma.course.findMany({
    where: { status: "PENDING" },
    include: { teacher: true }
  });
  res.json(courses);
});

router.get("/analytics", async (_req, res) => {
  const [
    studentsCount,
    teachersCount,
    coursesCount,
    pendingCoursesCount,
    enrollmentsCount,
    submissions
  ] = await Promise.all([
    prisma.user.count({ where: { role: Role.STUDENT } }),
    prisma.user.count({ where: { role: Role.TEACHER } }),
    prisma.course.count(),
    prisma.course.count({ where: { status: "PENDING" } }),
    prisma.enrollment.count(),
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
    const percentage = (questionCount ? (sub.score / questionCount) * 100 : 0);
    totalPercentage += percentage;
    submissionCount += 1;
  }

  const averagePerformance =
    submissionCount === 0 ? 0 : Number((totalPercentage / submissionCount).toFixed(2));

  res.json({
    studentsCount,
    teachersCount,
    coursesCount,
    pendingCoursesCount,
    enrollmentsCount,
    averagePerformance
  });
});

/**
 * @swagger
 * /api/admin/assignments:
 *   get:
 *     tags: [Admin]
 *     summary: List all assignments for review
 *     responses:
 *       200:
 *         description: All assignments
 */
router.get("/assignments", async (_req, res) => {
  const assignments = await prisma.assignment.findMany({
    include: {
      course: true,
      teacher: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    }
  });
  res.json(assignments);
});

/**
 * @swagger
 * /api/admin/assignments/{id}/approve:
 *   patch:
 *     tags: [Admin]
 *     summary: Approve assignment
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Assignment approved
 */
router.patch("/assignments/:id/approve", async (req, res) => {
  const { id } = req.params;

  const assignment = await prisma.assignment.update({
    where: { id },
    data: { status: AssignmentStatus.APPROVED }
  });

  res.json(assignment);
});

/**
 * @swagger
 * /api/admin/assignments/{id}/reject:
 *   patch:
 *     tags: [Admin]
 *     summary: Reject assignment
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Assignment rejected
 */
router.patch("/assignments/:id/reject", async (req, res) => {
  const { id } = req.params;

  const assignment = await prisma.assignment.update({
    where: { id },
    data: { status: AssignmentStatus.REJECTED }
  });

  res.json(assignment);
});

export default router;

