import { prisma } from "../lib/prisma";

// Store (or refresh) a push device token for a user. Tokens are globally
// unique, so an upsert by token re-points it to the current user/platform if
// the same device was previously registered (e.g. after re-login).
export async function registerDeviceToken(
  userId: string,
  token: string,
  platform: string,
) {
  return prisma.deviceToken.upsert({
    where: { token },
    create: { userId, token, platform },
    update: { userId, platform },
  });
}

// Remove a device token. Scoped to the owning user so one user can't delete
// another's token. Idempotent: deleting an unknown/!owned token is a no-op.
export async function removeDeviceToken(userId: string, token: string) {
  await prisma.deviceToken.deleteMany({ where: { userId, token } });
}
