import { prisma } from "../../prisma";
import { notFound } from "../../shared/http/http-error";
import { AuthSession, normalizeEmail } from "../auth/auth.service";

export async function findEditableLesson(session: NonNullable<AuthSession>, id: number) {
  const lesson = await prisma.lesson.findFirst({
    where: {
      id,
      ownerId: session.userId,
      source: { not: "STARPLAN" },
    },
  });

  if (!lesson) {
    throw notFound("Lesson not found.");
  }

  return lesson;
}

export async function ensureVisibleLesson(session: NonNullable<AuthSession>, id: number) {
  const lesson = await prisma.lesson.findFirst({
    select: { id: true },
    where: {
      id,
      OR: [
        { ownerId: null },
        { ownerId: session.userId },
        { invitations: { some: { recipientId: session.userId } } },
      ],
    },
  });

  if (!lesson) {
    throw notFound("Lesson not found.");
  }

  return lesson;
}

export async function findInvitees(input: { currentUserId: number; inviteeEmails: string[]; inviteeIds: number[] }) {
  const inviteeEmails = input.inviteeEmails.map(normalizeEmail).filter(Boolean);

  if (input.inviteeIds.length === 0 && inviteeEmails.length === 0) {
    return [];
  }

  return prisma.user.findMany({
    select: { id: true },
    where: {
      id: { not: input.currentUserId },
      OR: [
        ...(input.inviteeIds.length ? [{ id: { in: input.inviteeIds } }] : []),
        ...(inviteeEmails.length ? [{ email: { in: inviteeEmails } }] : []),
      ],
    },
  });
}
