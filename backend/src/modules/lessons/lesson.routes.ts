import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth";
import { Role } from "@prisma/client";
import { prisma } from "../../prisma/client";
import { upload, uploadToCloudinary } from "../../utils/cloudinary";

const router = Router();

const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation"
];

/**
 * @swagger
 * /api/lessons:
 *   post:
 *     tags: [Course Content]
 *     summary: Create lesson with file upload (Teacher)
 */
router.post(
  "/",
  authenticate,
  requireRole([Role.TEACHER]),
  upload.single("file"),
  async (req, res) => {
    const { moduleId, title, order } = req.body as { moduleId?: string; title?: string; order?: number };
    if (!moduleId || !title) {
      return res.status(400).json({ message: "moduleId and title required" });
    }
    const mod = await prisma.module.findUnique({
      where: { id: moduleId },
      include: { course: true }
    });
    if (!mod || mod.course.teacherId !== req.user!.id) {
      return res.status(403).json({ message: "Not your module" });
    }
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    if (!ALLOWED_DOC_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({ message: "Invalid file type. Allowed: PDF, DOC, DOCX, PPT, PPTX" });
    }
    const result = await uploadToCloudinary(req.file.buffer, "iga/lessons", "raw");
    const ext = req.file.originalname.split(".").pop()?.toLowerCase() || "pdf";
    const lesson = await prisma.lesson.create({
      data: { moduleId, title, url: result.url, fileType: ext, order: order ?? 0 }
    });
    res.status(201).json(lesson);
  }
);

export default router;
