import { prisma, NotificationType } from "@lenda/database";

export async function createNotification(
  userId: string,
  type: NotificationType,
  message: string,
) {
  return prisma.notification.create({
    data: { userId, type, message },
  });
}

export async function getNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function markNotificationsRead(userId: string, ids: string[]) {
  await prisma.notification.updateMany({
    where: { id: { in: ids }, userId },
    data: { isRead: true },
  });
}

export async function getUnreadCount(userId: string) {
  const count = await prisma.notification.count({
    where: { userId, isRead: false },
  });
  return { count };
}
