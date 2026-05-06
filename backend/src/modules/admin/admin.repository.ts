import { Role } from "../auth/auth.service";
import { prisma } from "../../prisma";

export const adminRepository = {
  countSummary() {
    return Promise.all([
      prisma.user.count(),
      prisma.session.count({ where: { expiresAt: { gt: new Date() } } }),
      prisma.contact.count(),
      prisma.mealPlan.count(),
      prisma.deadline.count(),
      prisma.studyModule.count(),
      prisma.managementChangeRequest.count({ where: { status: "PENDING" } }),
    ]);
  },

  listUsers() {
    return prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        email: true,
        id: true,
        name: true,
        role: true,
      },
    });
  },

  updateUser(id: number, data: {
    email?: string;
    name?: string;
    passwordHash?: string;
    passwordSalt?: string;
    role?: Role;
  }) {
    return prisma.user.update({
      data,
      select: {
        createdAt: true,
        email: true,
        id: true,
        name: true,
        role: true,
      },
      where: { id },
    });
  },

  deleteUser(id: number) {
    return prisma.user.delete({ where: { id } });
  },

  deleteUserSessions(userId: number) {
    return prisma.session.deleteMany({ where: { userId } });
  },

  listAdminChangeRequests() {
    return prisma.managementChangeRequest.findMany({
      include: {
        requestedBy: {
          select: {
            email: true,
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
  },

  listManagerChangeRequests(userId: number, showAll: boolean) {
    return prisma.managementChangeRequest.findMany({
      orderBy: { createdAt: "desc" },
      where: showAll ? undefined : { requestedById: userId },
    });
  },

  findChangeRequest(id: number) {
    return prisma.managementChangeRequest.findUnique({ where: { id } });
  },

  createChangeRequest(data: {
    action: "CREATE" | "UPDATE" | "DELETE";
    entity: "CONTACT" | "DEADLINE" | "MEAL" | "LESSON" | "STUDY_INFO";
    payloadJson: string;
    requestedById: number;
    targetId: number | null;
  }) {
    return prisma.managementChangeRequest.create({ data });
  },

  rejectChangeRequest(id: number, data: { reviewedById: number; reviewNote: string | null }) {
    return prisma.managementChangeRequest.update({
      data: {
        reviewedAt: new Date(),
        reviewedById: data.reviewedById,
        reviewNote: data.reviewNote,
        status: "REJECTED",
      },
      where: { id },
    });
  },
};
