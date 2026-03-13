import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth";
import { Role, AssignmentStatus } from "@prisma/client";
import { prisma } from "../../prisma/client";
import { z } from "zod";
import { validateBody } from "../../middleware/validate";
import { upload, uploadToCloudinary } from "../../utils/cloudinary";
import { createNotification } from "../../utils/notify";
import { logActivity } from "../../utils/activityLog";

const router = Router();

const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation"
];

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

/**
 * @swagger
 * /api/assignments/{id}/submit:
 *   post:
 *     tags: [Assignments]
 *     summary: Submit assignment (Student)
 */
router.post(
  "/:id/submit",
  authenticate,
  requireRole([Role.STUDENT]),
  upload.single("file"),
  async (req, res) => {
    const { id } = req.params;
    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: { course: true }
    });
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    if (assignment.status !== AssignmentStatus.APPROVED) {
      return res.status(400).json({ message: "Assignment is not approved for submission" });
    }
    const enrollment = await prisma.enrollment.findFirst({
      where: { courseId: assignment.courseId, studentId: req.user!.id }
    });
    if (!enrollment) return res.status(403).json({ message: "You must be enrolled to submit" });

    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    if (!ALLOWED_DOC_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({
        message: "Invalid file type. Allowed: PDF, Word, PowerPoint"
      });
    }

    const result = await uploadToCloudinary(req.file.buffer, "iga/assignment-submissions", "raw");
    const submission = await prisma.assignmentSubmission.upsert({
      where: { assignmentId_studentId: { assignmentId: id, studentId: req.user!.id } },
      create: { assignmentId: id, studentId: req.user!.id, fileUrl: result.url },
      update: { fileUrl: result.url }
    });
    await createNotification(assignment.teacherId, "A student submitted an assignment.");
    await logActivity(req.user!.id, "Assignment submitted");
    res.status(201).json(submission);
  }
);

/**
 * @swagger
 * /api/assignments/{id}/submissions:
 *   get:
 *     tags: [Assignments]
 *     summary: List submissions for assignment (Teacher)
 */
router.get("/:id/submissions", authenticate, requireRole([Role.TEACHER]), async (req, res) => {
  const { id } = req.params;
  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: { course: true }
  });
  if (!assignment || assignment.teacherId !== req.user!.id) {
    return res.status(404).json({ message: "Assignment not found" });
  }
  const submissions = await prisma.assignmentSubmission.findMany({
    where: { assignmentId: id },
    include: { student: { select: { id: true, firstName: true, lastName: true, email: true } } }
  });
  res.json(submissions);
});

export default router;

