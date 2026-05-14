import { prisma } from "../../prisma";
import { getOrCreateScheduleDay } from "../../shared/db-helpers";

type LessonData = {
  date: Date | null;
  description: string | null;
  encryptedKey: string | null;
  encryptedPayload: string | null;
  encryptionIv: string | null;
  endTime: string;
  isRecurring: boolean;
  lecturer: string | null;
  room: string | null;
  scheduleDayId: number;
  startTime: string;
  title: string;
};

type InvitationCreateData = {
  encryptedKey: string | null;
  encryptedPayload: string | null;
  encryptionIv: string | null;
  recipientId: number;
};

export const scheduleRepository = {
  listWeek(weekStart: Date, weekEnd: Date, userId: number | null) {
    return prisma.scheduleDay.findMany({
      include: {
        lessons: {
          orderBy: { startTime: "asc" },
          where: {
            OR: [{ ownerId: null }, ...(userId ? [{ ownerId: userId }] : [])],
            AND: [
              { OR: [{ date: null }, { date: { gte: weekStart, lt: weekEnd } }] },
              { source: { not: "STARPLAN_ARCHIVE" } },
            ],
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });
  },

  listVisits(userId: number, lessonIds: number[], weekStart: Date, weekEnd: Date) {
    return prisma.lessonVisit.findMany({
      where: {
        date: { gte: weekStart, lt: weekEnd },
        lessonId: { in: lessonIds },
        userId,
      },
    });
  },

  listModulePreferences(userId: number, moduleKeys: string[]) {
    return prisma.lessonModulePreference.findMany({
      where: {
        moduleKey: { in: moduleKeys },
        userId,
      },
    });
  },

  archiveImportedCourse(input: { courseTitle: string; monthEnd: Date; monthStart: Date; userId: number }) {
    return prisma.lesson.updateMany({
      data: { source: "STARPLAN_ARCHIVE" },
      where: {
        date: { gte: input.monthStart, lt: input.monthEnd },
        ownerId: input.userId,
        source: "STARPLAN",
        title: input.courseTitle,
      },
    });
  },

  getOrCreateDay(day: string) {
    return getOrCreateScheduleDay(day);
  },

  findEditableLesson(userId: number, id: number) {
    return prisma.lesson.findFirst({
      where: {
        id,
        ownerId: userId,
        source: { not: "STARPLAN" },
      },
    });
  },

  findVisibleLesson(userId: number, id: number) {
    return prisma.lesson.findFirst({
      select: { id: true },
      where: {
        id,
        OR: [
          { ownerId: null },
          { ownerId: userId },
          { invitations: { some: { recipientId: userId } } },
        ],
      },
    });
  },

  findInvitees(input: { currentUserId: number; inviteeEmails: string[]; inviteeIds: number[] }) {
    return prisma.user.findMany({
      select: { id: true },
      where: {
        id: { not: input.currentUserId },
        OR: [
          ...(input.inviteeIds.length ? [{ id: { in: input.inviteeIds } }] : []),
          ...(input.inviteeEmails.length ? [{ email: { in: input.inviteeEmails } }] : []),
        ],
      },
    });
  },

  createLessonWithInvitations(input: {
    invitations: InvitationCreateData[];
    lessonData: LessonData;
    ownerId: number;
  }) {
    return prisma.$transaction(async (transaction) => {
      const createdLesson = await transaction.lesson.create({
        data: {
          ...input.lessonData,
          ownerId: input.ownerId,
        },
      });

      for (const invitation of input.invitations) {
        await transaction.lessonInvitation.create({
          data: {
            encryptedKey: invitation.encryptedKey,
            encryptedPayload: invitation.encryptedPayload,
            encryptionIv: invitation.encryptionIv,
            lessonId: createdLesson.id,
            recipientId: invitation.recipientId,
            senderId: input.ownerId,
          },
        });
      }

      return createdLesson;
    });
  },

  updateLesson(id: number, data: LessonData) {
    return prisma.lesson.update({
      data,
      where: { id },
    });
  },

  deleteLesson(id: number) {
    return prisma.lesson.delete({ where: { id } });
  },

  findVisit(input: { date: Date; lessonId: number; userId: number }) {
    return prisma.lessonVisit.findUnique({
      where: {
        userId_lessonId_date: {
          date: input.date,
          lessonId: input.lessonId,
          userId: input.userId,
        },
      },
    });
  },

  deleteVisit(id: number) {
    return prisma.lessonVisit.delete({ where: { id } });
  },

  createVisit(input: { date: Date; lessonId: number; userId: number }) {
    return prisma.lessonVisit.create({
      data: {
        date: input.date,
        lessonId: input.lessonId,
        userId: input.userId,
      },
    });
  },

  upsertModulePreference(input: { isActive: boolean; moduleKey: string; userId: number }) {
    return prisma.lessonModulePreference.upsert({
      create: {
        isActive: input.isActive,
        moduleKey: input.moduleKey,
        userId: input.userId,
      },
      update: { isActive: input.isActive },
      where: {
        userId_moduleKey: {
          moduleKey: input.moduleKey,
          userId: input.userId,
        },
      },
    });
  },

  listInvitations(userId: number) {
    return prisma.lessonInvitation.findMany({
      include: {
        lesson: {
          include: { scheduleDay: true },
        },
        sender: {
          select: {
            email: true,
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      where: { recipientId: userId },
    });
  },

  findPendingInvitationWithLesson(userId: number, id: number) {
    return prisma.lessonInvitation.findFirst({
      include: { lesson: true },
      where: {
        id,
        recipientId: userId,
        status: "PENDING",
      },
    });
  },

  findPendingInvitation(userId: number, id: number) {
    return prisma.lessonInvitation.findFirst({
      where: {
        id,
        recipientId: userId,
        status: "PENDING",
      },
    });
  },

  acceptInvitation(input: { invitationId: number; lessonData: LessonData; userId: number }) {
    return prisma.$transaction(async (transaction) => {
      await transaction.lesson.create({
        data: {
          ...input.lessonData,
          ownerId: input.userId,
          source: "INVITATION",
          sourceKey: `invitation-${input.invitationId}`,
        },
      });

      return transaction.lessonInvitation.update({
        data: {
          respondedAt: new Date(),
          status: "ACCEPTED",
        },
        where: { id: input.invitationId },
      });
    });
  },

  rejectInvitation(id: number) {
    return prisma.lessonInvitation.update({
      data: {
        respondedAt: new Date(),
        status: "REJECTED",
      },
      where: { id },
    });
  },
};
