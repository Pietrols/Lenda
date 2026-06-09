import { prisma, NotificationType } from "@lenda/database";

export async function createNotification(
  userId: string,
  type: NotificationType,
  message: string,
  referenceId?: string,
) {
  return prisma.notification.create({
    data: { userId, type, message, referenceId: referenceId ?? null },
  });
}

export async function getNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  await prisma.notification.updateMany({
    where: ids && ids.length > 0 ? { id: { in: ids }, userId } : { userId },
    data: { isRead: true },
  });
}

export async function getUnreadCount(userId: string) {
  const count = await prisma.notification.count({
    where: { userId, isRead: false },
  });
  return { count };
}
