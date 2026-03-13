import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth";
import { Role, CourseStatus } from "@prisma/client";
import { prisma } from "../../prisma/client";
import { z } from "zod";
import { validateBody } from "../../middleware/validate";
import { upload, uploadToCloudinary } from "../../utils/cloudinary";
import { createNotification } from "../../utils/notify";
import { logActivity } from "../../utils/activityLog";

const router = Router();

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation"
];

const createCourseSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1)
});

/**
 * @swagger
 * /api/courses:
 *   post:
 *     tags: [Courses]
 *     summary: Create course (Teacher only)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Course created
 *   get:
 *     tags: [Courses]
 *     summary: "List courses (role-based: students see approved, teachers see own, admin sees all)"
 *     responses:
 *       200:
 *         description: List of courses
 */
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

    await logActivity(req.user!.id, "Course created");

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

/**
 * @swagger
 * /api/courses/enrolled:
 *   get:
 *     tags: [Courses]
 *     summary: Get enrolled courses (Student only)
 *     responses:
 *       200:
 *         description: List of enrolled courses
 */
router.get("/enrolled", authenticate, requireRole([Role.STUDENT]), async (req, res) => {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: req.user!.id },
    include: { course: true }
  });
  res.json(enrollments.map((e) => e.course));
});

/**
 * @swagger
 * /api/courses/{id}/enroll:
 *   post:
 *     tags: [Courses]
 *     summary: Enroll in course (Student only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Enrollment created or updated
 *       404:
 *         description: Course not found or not approved
 */
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

/**
 * @swagger
 * /api/courses/{id}/image:
 *   post:
 *     tags: [Courses]
 *     summary: Upload course image (Teacher, own courses only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Image uploaded
 *       400:
 *         description: Invalid file type
 */
router.post(
  "/:id/image",
  authenticate,
  requireRole([Role.TEACHER]),
  upload.single("file"),
  async (req, res) => {
    const { id } = req.params;

    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    if (course.teacherId !== req.user!.id) {
      return res.status(403).json({ message: "You can only upload images for your own courses" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    if (!ALLOWED_IMAGE_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({ message: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF" });
    }

    const result = await uploadToCloudinary(req.file.buffer, "iga/course-images", "image");

    const updated = await prisma.course.update({
      where: { id },
      data: { image: result.url }
    });

    res.status(201).json({ image: result.url, course: updated });
  }
);

/**
 * @swagger
 * /api/courses/{id}/documents:
 *   post:
 *     tags: [Courses]
 *     summary: Upload course document - PDF, Word, PowerPoint (Teacher, own courses only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               title:
 *                 type: string
 *     responses:
 *       201:
 *         description: Document uploaded
 *       400:
 *         description: Invalid file type
 */
router.post(
  "/:id/documents",
  authenticate,
  requireRole([Role.TEACHER]),
  upload.single("file"),
  async (req, res) => {
    const { id } = req.params;
    const title = (req.body.title as string) || req.file?.originalname || "Document";

    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    if (course.teacherId !== req.user!.id) {
      return res.status(403).json({ message: "You can only upload documents for your own courses" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    if (!ALLOWED_DOC_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({
        message: "Invalid file type. Allowed: PDF, Word (.doc, .docx), PowerPoint (.ppt, .pptx)"
      });
    }

    const ext = req.file.originalname.split(".").pop()?.toLowerCase() || "pdf";
    const result = await uploadToCloudinary(req.file.buffer, "iga/course-documents", "raw");

    const doc = await prisma.courseDocument.create({
      data: {
        courseId: id,
        title,
        url: result.url,
        fileType: ext
      }
    });

    res.status(201).json(doc);
  }
);

/**
 * @swagger
 * /api/courses/{id}:
 *   get:
 *     tags: [Courses]
 *     summary: Get course by ID with teacher and documents
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Course details
 *       404:
 *         description: Course not found
 */
/**
 * @swagger
 * /api/courses/{id}:
 *   put:
 *     tags: [Courses]
 *     summary: Update course (Teacher, own courses only)
 */
router.put(
  "/:id",
  authenticate,
  requireRole([Role.TEACHER]),
  validateBody(createCourseSchema.partial()),
  async (req, res) => {
    const { id } = req.params;
    const { title, description } = req.body as { title?: string; description?: string };

    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) return res.status(404).json({ message: "Course not found" });
    if (course.teacherId !== req.user!.id) {
      return res.status(403).json({ message: "You can only update your own courses" });
    }

    const updated = await prisma.course.update({
      where: { id },
      data: { ...(title ? { title } : {}), ...(description ? { description } : {}) }
    });
    res.json(updated);
  }
);

router.get("/:id", authenticate, async (req, res) => {
  const { id } = req.params;

  const course = await prisma.course.findUnique({
    where: { id },
    include: { teacher: true, documents: true, modules: true }
  });

  if (!course) {
    return res.status(404).json({ message: "Course not found" });
  }

  res.json(course);
});

/**
 * @swagger
 * /api/courses/{id}/status:
 *   patch:
 *     tags: [Courses]
 *     summary: Update course status (Admin only)
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
 *               status:
 *                 type: string
 *                 enum: [PENDING, APPROVED, REJECTED]
 *     responses:
 *       200:
 *         description: Course updated
 */
/**
 * @swagger
 * /api/courses/{id}/students:
 *   get:
 *     tags: [Courses]
 *     summary: List enrolled students (Teacher, own courses only)
 */
router.get(
  "/:id/students",
  authenticate,
  requireRole([Role.TEACHER]),
  async (req, res) => {
    const { id } = req.params;
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) return res.status(404).json({ message: "Course not found" });
    if (course.teacherId !== req.user!.id) {
      return res.status(403).json({ message: "You can only view students for your own courses" });
    }
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId: id },
      include: { student: { select: { id: true, firstName: true, lastName: true, email: true } } }
    });
    res.json(enrollments);
  }
);

/**
 * @swagger
 * /api/courses/{id}/rate:
 *   post:
 *     tags: [Courses]
 *     summary: Rate course (Student)
 */
router.post(
  "/:id/rate",
  authenticate,
  requireRole([Role.STUDENT]),
  validateBody(z.object({ rating: z.number().min(1).max(5), review: z.string().optional() })),
  async (req, res) => {
    const { id } = req.params;
    const { rating, review } = req.body as { rating: number; review?: string };
    const course = await prisma.course.findFirst({ where: { id, status: CourseStatus.APPROVED } });
    if (!course) return res.status(404).json({ message: "Course not found" });
    const enrollment = await prisma.enrollment.findFirst({
      where: { courseId: id, studentId: req.user!.id }
    });
    if (!enrollment) return res.status(403).json({ message: "You must be enrolled to rate" });

    const ratingRecord = await prisma.courseRating.upsert({
      where: { courseId_studentId: { courseId: id, studentId: req.user!.id } },
      create: { courseId: id, studentId: req.user!.id, rating, review: review ?? null },
      update: { rating, review: review ?? undefined }
    });
    res.status(201).json(ratingRecord);
  }
);

/**
 * @swagger
 * /api/courses/{id}/reviews:
 *   get:
 *     tags: [Courses]
 *     summary: Get course reviews/ratings
 */
router.get("/:id/reviews", authenticate, async (req, res) => {
  const { id } = req.params;
  const ratings = await prisma.courseRating.findMany({
    where: { courseId: id },
    include: { student: { select: { firstName: true, lastName: true } } }
  });
  res.json(ratings);
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

    const existing = await prisma.course.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Course not found" });

    const course = await prisma.course.update({
      where: { id },
      data: { status }
    });

    if (status === "APPROVED") {
      await createNotification(existing.teacherId, "Your course has been approved.");
    }
    await logActivity(req.user!.id, `Course ${id} status updated to ${status}`);

    res.json(course);
  }
);

export default router;

