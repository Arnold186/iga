import { prisma } from "../prisma/client";

export async function logActivity(userId: string, action: string) {
  try {
    await prisma.activityLog.create({
      data: { userId, action }
    });
  } catch {
    // Non-critical; don't fail the request
  }
}
