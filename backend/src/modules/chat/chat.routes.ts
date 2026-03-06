import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { prisma } from "../../prisma/client";

const router = Router();

router.get("/group", authenticate, async (req, res) => {
  const messages = await prisma.message.findMany({
    where: { receiverId: null },
    orderBy: { timestamp: "asc" },
    take: 200
  });
  res.json(messages);
});

router.get("/private/:userId", authenticate, async (req, res) => {
  const { userId } = req.params;

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: req.user!.id, receiverId: userId },
        { senderId: userId, receiverId: req.user!.id }
      ]
    },
    orderBy: { timestamp: "asc" },
    take: 200
  });

  res.json(messages);
});

export default router;

