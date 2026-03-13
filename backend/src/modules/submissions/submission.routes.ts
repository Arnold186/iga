import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth";
import { Role } from "@prisma/client";
import { prisma } from "../../prisma/client";
import { z } from "zod";
import { validateBody } from "../../middleware/validate";

const router = Router();

/**
 * @swagger
 * /api/submissions/{id}/grade:
 *   patch:
 *     tags: [Assignments]
 *     summary: Grade submission (Teacher)
 */
router.patch(
  "/:id/grade",
  authenticate,
  requireRole([Role.TEACHER]),
  validateBody(z.object({ grade: z.number().min(0).max(100) })),
  async (req, res) => {
    const { id } = req.params;
    const { grade } = req.body as { grade: number };
    const sub = await prisma.assignmentSubmission.findUnique({
      where: { id },
      include: { assignment: true }
    });
    if (!sub || sub.assignment.teacherId !== req.user!.id) {
      return res.status(404).json({ message: "Submission not found" });
    }
    const updated = await prisma.assignmentSubmission.update({
      where: { id },
      data: { grade }
    });
    res.json(updated);
  }
);

export default router;
