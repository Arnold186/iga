import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth";
import { Role, CourseStatus } from "@prisma/client";
import { prisma } from "../../prisma/client";
import { z } from "zod";
import { validateBody } from "../../middleware/validate";

const router = Router();

const createCourseSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1)
});

router.post(
  "/",
  authenticate,
  requireRole([Role.TEACHER]),
  validateBody(createCourseSchema),
  async (req, res) => {
    const { title, description } = req.body as {
      title: string;
      description: string;
    };

    const course = await prisma.course.create({
      data: {
        title,
        description,
        teacherId: req.user!.id,
        status: CourseStatus.PENDING
      }
    });

    res.status(201).json(course);
  }
);

router.get("/", authenticate, async (req, res) => {
  if (req.user!.role === Role.STUDENT) {
    const courses = await prisma.course.findMany({
      where: { status: CourseStatus.APPROVED },
      include: { teacher: true }
    });
    return res.json(courses);
  }

  if (req.user!.role === Role.TEACHER) {
    const courses = await prisma.course.findMany({
      where: { teacherId: req.user!.id },
      include: { teacher: true }
    });
    return res.json(courses);
  }

  // admin
  const courses = await prisma.course.findMany({
    include: { teacher: true }
  });
  return res.json(courses);
});

router.get("/enrolled", authenticate, requireRole([Role.STUDENT]), async (req, res) => {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: req.user!.id },
    include: { course: true }
  });
  res.json(enrollments.map((e) => e.course));
});

router.post("/:id/enroll", authenticate, requireRole([Role.STUDENT]), async (req, res) => {
  const { id } = req.params;

  const course = await prisma.course.findFirst({
    where: { id, status: CourseStatus.APPROVED }
  });
  if (!course) {
    return res.status(404).json({ message: "Course not found or not approved" });
  }

  const enrollment = await prisma.enrollment.upsert({
    where: {
      studentId_courseId: {
        studentId: req.user!.id,
        courseId: id
      }
    },
    create: {
      studentId: req.user!.id,
      courseId: id
    },
    update: {}
  });

  res.json(enrollment);
});

router.patch(
  "/:id/status",
  authenticate,
  requireRole([Role.ADMIN]),
  validateBody(
    z.object({
      status: z.nativeEnum(CourseStatus)
    })
  ),
  async (req, res) => {
    const { id } = req.params;
    const { status } = req.body as { status: CourseStatus };

    const course = await prisma.course.update({
      where: { id },
      data: { status }
    });

    res.json(course);
  }
);

export default router;

