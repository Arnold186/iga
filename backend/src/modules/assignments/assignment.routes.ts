import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth";
import { Role, AssignmentStatus } from "@prisma/client";
import { prisma } from "../../prisma/client";
import { z } from "zod";
import { validateBody } from "../../middleware/validate";

const router = Router();

const createAssignmentSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  courseId: z.string().uuid()
});

/**
 * @swagger
 * /api/assignments:
 *   post:
 *     tags: [Assignments]
 *     summary: Create assignment (Teacher only)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, courseId]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               courseId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Assignment created (PENDING)
 *       403:
 *         description: Not your course
 *   get:
 *     tags: [Assignments]
 *     summary: List assignments (role-based)
 *     responses:
 *       200:
 *         description: List of assignments
 */
router.post(
  "/",
  authenticate,
  requireRole([Role.TEACHER]),
  validateBody(createAssignmentSchema),
  async (req, res) => {
    const { title, description, courseId } = req.body as {
      title: string;
      description: string;
      courseId: string;
    };

    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (course.teacherId !== req.user!.id) {
      return res.status(403).json({ message: "You can only create assignments for your courses" });
    }

    const assignment = await prisma.assignment.create({
      data: {
        title,
        description,
        courseId,
        teacherId: req.user!.id
      }
    });

    res.status(201).json(assignment);
  }
);

router.get("/", authenticate, async (req, res) => {
  if (req.user!.role === Role.TEACHER) {
    const assignments = await prisma.assignment.findMany({
      where: { teacherId: req.user!.id },
      include: { course: true }
    });
    return res.json(assignments);
  }

  if (req.user!.role === Role.STUDENT) {
    const assignments = await prisma.assignment.findMany({
      where: { status: AssignmentStatus.APPROVED },
      include: { course: true }
    });
    return res.json(assignments);
  }

  // admin
  const assignments = await prisma.assignment.findMany({
    include: { course: true }
  });
  return res.json(assignments);
});

export default router;

