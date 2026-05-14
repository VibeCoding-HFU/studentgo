import { prisma } from "../../prisma";
import { forbidden } from "../../shared/http/http-error";
import type { Role } from "./auth.service";

type PendingAccountCreateData = {
  confirmationTokenHash: string;
  email: string;
  expiresAt: Date;
  name: string;
  passwordHash: string;
  passwordSalt: string;
  publicKeyJson: string | null;
  requestedById?: number | null;
  role: Role;
};

type PendingAccountRecord = {
  email: string;
  expiresAt: Date;
  id: number;
  name: string;
  passwordHash: string;
  passwordSalt: string;
  publicKeyJson: string | null;
  role: Role;
};

export const authRepository = {
  findAccountRequestState(email: string) {
    return Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.pendingAccount.findUnique({ where: { email } }),
    ]);
  },

  async countActiveAdminRequests(now: Date) {
    const [admins, pendingAdmins] = await Promise.all([
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.pendingAccount.count({
        where: {
          expiresAt: { gt: now },
          role: "ADMIN",
        },
      }),
    ]);

    return admins + pendingAdmins;
  },

  createPendingAccount(data: PendingAccountCreateData) {
    return prisma.$transaction(async (transaction) => {
      await transaction.pendingAccount.deleteMany({
        where: {
          email: data.email,
          expiresAt: { lte: new Date() },
        },
      });

      if (data.role === "ADMIN" && !data.requestedById) {
        const [admins, pendingAdmins] = await Promise.all([
          transaction.user.count({ where: { role: "ADMIN" } }),
          transaction.pendingAccount.count({
            where: {
              expiresAt: { gt: new Date() },
              role: "ADMIN",
            },
          }),
        ]);

        if (admins + pendingAdmins > 0) {
          throw forbidden("Admin accounts can only be created by an admin.");
        }
      }

      return transaction.pendingAccount.create({
        data: {
          confirmationTokenHash: data.confirmationTokenHash,
          email: data.email,
          expiresAt: data.expiresAt,
          name: data.name,
          passwordHash: data.passwordHash,
          passwordSalt: data.passwordSalt,
          publicKeyJson: data.publicKeyJson,
          requestedById: data.requestedById ?? null,
          role: data.role,
        },
      });
    });
  },

  findPendingAccountByConfirmationTokenHash(confirmationTokenHash: string) {
    return prisma.pendingAccount.findUnique({ where: { confirmationTokenHash } });
  },

  createUserFromPendingAccount(pendingAccount: PendingAccountRecord, publicKeyJsons: string[]) {
    return prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          email: pendingAccount.email,
          name: pendingAccount.name,
          passwordHash: pendingAccount.passwordHash,
          passwordSalt: pendingAccount.passwordSalt,
          publicKeys: {
            create: publicKeyJsons.map((publicKeyJson) => ({ publicKeyJson })),
          },
          role: pendingAccount.role,
        },
        include: { publicKeys: true },
      });

      await transaction.pendingAccount.delete({ where: { id: pendingAccount.id } });
      return user;
    });
  },

  findUserByEmailWithPublicKeys(email: string) {
    return prisma.user.findUnique({
      include: { publicKeys: true },
      where: { email },
    });
  },

  findUserByIdWithPublicKeys(userId: number) {
    return prisma.user.findUniqueOrThrow({
      include: { publicKeys: true },
      where: { id: userId },
    });
  },

  createSession(data: { activeRole: Role; expiresAt: Date; tokenHash: string; userId: number }) {
    return prisma.session.create({ data });
  },

  findSessionByTokenHash(tokenHash: string) {
    return prisma.session.findUnique({
      include: { user: { include: { publicKeys: true } } },
      where: { tokenHash },
    });
  },

  deleteSessionsByTokenHash(tokenHash: string) {
    return prisma.session.deleteMany({ where: { tokenHash } });
  },

  searchUsers(currentUserId: number, query: string) {
    return prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        email: true,
        id: true,
        name: true,
        publicKeys: { select: { publicKeyJson: true } },
        role: true,
      },
      take: 12,
      where: {
        id: { not: currentUserId },
        OR: [
          { email: { contains: query } },
          { name: { contains: query } },
        ],
      },
    });
  },

  upsertPublicKey(userId: number, publicKeyJson: string) {
    return prisma.userPublicKey.upsert({
      create: {
        publicKeyJson,
        userId,
      },
      update: {},
      where: {
        userId_publicKeyJson: {
          publicKeyJson,
          userId,
        },
      },
    });
  },
};
