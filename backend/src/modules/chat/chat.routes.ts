import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { prisma } from "../../prisma/client";

const router = Router();

/**
 * @swagger
 * /api/chat/group:
 *   get:
 *     tags: [Chat]
 *     summary: Get group chat messages (sender name, role, content, time)
 *     responses:
 *       200:
 *         description: List of group messages
 */
router.get("/group", authenticate, async (_req, res) => {
  const messages = await prisma.message.findMany({
    where: { receiverId: null },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true
        }
      }
    }
  });

  res.json(
    messages.map((m) => ({
      id: m.id,
      content: m.content,
      createdAt: m.createdAt,
      senderId: m.senderId,
      receiverId: m.receiverId,
      senderName: `${m.sender.firstName} ${m.sender.lastName}`.trim(),
      senderRole: m.sender.role
    }))
  );
});

/**
 * @swagger
 * /api/chat/private/{userId}:
 *   get:
 *     tags: [Chat]
 *     summary: Get direct messages with user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: List of direct messages
 */
router.get("/private/:userId", authenticate, async (req, res) => {
  const { userId } = req.params;

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: req.user!.id, receiverId: userId },
        { senderId: userId, receiverId: req.user!.id }
      ]
    },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true
        }
      }
    }
  });

  res.json(
    messages.map((m) => ({
      id: m.id,
      content: m.content,
      createdAt: m.createdAt,
      senderId: m.senderId,
      receiverId: m.receiverId,
      senderName: `${m.sender.firstName} ${m.sender.lastName}`.trim(),
      senderRole: m.sender.role
    }))
  );
});

export default router;

