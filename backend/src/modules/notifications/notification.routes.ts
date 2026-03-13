import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { prisma } from "../../prisma/client";

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Get current user notifications
 *     responses:
 *       200:
 *         description: List of notifications
 */
router.get("/", async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" }
  });
  res.json(notifications);
});

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark notification as read
 */
router.patch("/:id/read", async (req, res) => {
  const { id } = req.params;
  const n = await prisma.notification.findFirst({
    where: { id, userId: req.user!.id }
  });
  if (!n) return res.status(404).json({ message: "Notification not found" });
  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true }
  });
  res.json(updated);
});

export default router;
