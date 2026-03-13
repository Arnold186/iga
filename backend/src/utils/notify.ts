import { prisma } from "../prisma/client";

export async function createNotification(userId: string, message: string) {
  try {
    await prisma.notification.create({
      data: { userId, message }
    });
  } catch {
    // Non-critical
  }
}
