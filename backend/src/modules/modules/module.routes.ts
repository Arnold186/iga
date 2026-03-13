import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth";
import { Role } from "@prisma/client";
import { prisma } from "../../prisma/client";
import { z } from "zod";
import { validateBody } from "../../middleware/validate";
const router = Router();

/**
 * @swagger
 * /api/modules:
 *   post:
 *     tags: [Course Content]
 *     summary: Create module (Teacher)
 */
router.post(
  "/",
  authenticate,
  requireRole([Role.TEACHER]),
  validateBody(z.object({ courseId: z.string().uuid(), title: z.string().min(1), order: z.number().optional() })),
  async (req, res) => {
    const { courseId, title, order } = req.body as { courseId: string; title: string; order?: number };
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.teacherId !== req.user!.id) {
      return res.status(403).json({ message: "Not your course" });
    }
    const mod = await prisma.module.create({
      data: { courseId, title, order: order ?? 0 }
    });
    res.status(201).json(mod);
  }
);

export default router;
