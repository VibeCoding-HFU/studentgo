import { Express } from "express";
import { getSession, requireSessionValue } from "../auth/auth.service";
import { prisma } from "../../prisma";
import { getOrCreateScheduleDay } from "../../shared/db-helpers";
import { endOfWeek, parseDateInput, parseMonthStart, parseWeekStart, toDateInput } from "../../shared/date-utils";
import { lessonData } from "../../shared/domain-data";
import { getStarPlanOptions, importStarPlanSchedule, loadStarPlanMonth } from "./schedule-imports";
import { parseCourseImportPayload, parseImportPayload, parseInvitationId, parseInvitees, parseLessonId, parseModulePreferenceBody, parseVisitBody } from "./schedule.schemas";
import { ensureVisibleLesson, findEditableLesson, findInvitees } from "./schedule.service";
import { lessonModuleKey } from "./schedule-utils";

function dateForScheduleDay(weekStart: Date, dayName: string) {
  const mondayFirstDays = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  const offset = Math.max(0, mondayFirstDays.indexOf(dayName));
  const date = new Date(weekStart);
  date.setDate(date.getDate() + offset);
  return date;
}

function invitationLessonData(lesson: {
  date: Date | null;
  description: string | null;
  endTime: string;
  encryptedKey: string | null;
  encryptedPayload: string | null;
  encryptionIv: string | null;
  isRecurring: boolean;
  lecturer: string | null;
  room: string | null;
  scheduleDayId: number;
  startTime: string;
  title: string;
}) {
  return {
    date: lesson.date,
    description: lesson.description,
    endTime: lesson.endTime,
    encryptedKey: lesson.encryptedKey,
    encryptedPayload: lesson.encryptedPayload,
    encryptionIv: lesson.encryptionIv,
    isRecurring: lesson.isRecurring,
    lecturer: lesson.lecturer,
    room: lesson.room,
    scheduleDayId: lesson.scheduleDayId,
    startTime: lesson.startTime,
    title: lesson.title,
  };
}

export function registerScheduleRoutes(app: Express) {
  app.get("/api/schedule", async (request, response) => {
    const session = await getSession(request);
    const weekStart = parseWeekStart(request.query.weekStart);
    const weekEnd = endOfWeek(weekStart);
    const schedule = await prisma.scheduleDay.findMany({
      include: {
        lessons: {
          orderBy: { startTime: "asc" },
          where: {
            OR: [{ ownerId: null }, ...(session ? [{ ownerId: session.userId }] : [])],
            AND: [
              { OR: [{ date: null }, { date: { gte: weekStart, lt: weekEnd } }] },
              { source: { not: "STARPLAN_ARCHIVE" } },
            ],
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    if (!session) {
      response.json({ days: schedule, weekEnd, weekStart });
      return;
    }

    const lessons = schedule.flatMap((day) => day.lessons);
    const lessonIds = lessons.map((lesson) => lesson.id);
    const moduleKeys = [...new Set(lessons.map(lessonModuleKey))];
    const [visits, preferences] = await Promise.all([
      lessonIds.length
        ? prisma.lessonVisit.findMany({
            where: {
              date: { gte: weekStart, lt: weekEnd },
              lessonId: { in: lessonIds },
              userId: session.userId,
            },
          })
        : [],
      moduleKeys.length
        ? prisma.lessonModulePreference.findMany({
            where: {
              moduleKey: { in: moduleKeys },
              userId: session.userId,
            },
          })
        : [],
    ]);
    const visitKeys = new Set(visits.map((visit) => `${visit.lessonId}:${toDateInput(visit.date)}`));
    const preferenceByModuleKey = new Map(preferences.map((preference) => [preference.moduleKey, preference]));
    const days = schedule.map((day) => {
      const dayDate = dateForScheduleDay(weekStart, day.day);
      return {
        ...day,
        lessons: day.lessons.map((lesson) => {
          const dateKey = toDateInput(lesson.date ?? dayDate);
          const moduleKey = lessonModuleKey(lesson);
          return {
            ...lesson,
            isModuleActive: preferenceByModuleKey.get(moduleKey)?.isActive ?? true,
            isVisited: visitKeys.has(`${lesson.id}:${dateKey}`),
            moduleKey,
          };
        }),
      };
    });

    response.json({ days, weekEnd, weekStart });
  });

  app.get("/api/schedule/import-options", async (request, response) => {
    response.json(await getStarPlanOptions(
      typeof request.query.facultyId === "string" ? request.query.facultyId : undefined,
      typeof request.query.semesterId === "string" ? request.query.semesterId : undefined,
    ));
  });

  app.post("/api/schedule/import-courses", async (request, response) => {
    const session = await requireSessionValue(request);
    const payload = parseImportPayload(request.body);

    const monthImport = await loadStarPlanMonth({
      ...payload,
      monthStart: parseMonthStart(request.body.monthStart ?? request.body.weekStart),
      userId: session.userId,
    });
    const courses = [...new Map(monthImport.lessons.map((lesson) => [lesson.title, lesson])).entries()]
      .map(([title]) => ({
        lessonCount: monthImport.lessons.filter((lesson) => lesson.title === title).length,
        title,
      }))
      .sort((first, second) => first.title.localeCompare(second.title, "de"));

    response.json({
      courses,
      monthEnd: monthImport.monthEnd,
      monthStart: monthImport.monthStart,
    });
  });

  app.post("/api/schedule/import", async (request, response) => {
    const session = await requireSessionValue(request);
    const payload = parseImportPayload(request.body);
    const monthStart = parseMonthStart(request.body.monthStart ?? request.body.weekStart);
    const result = await importStarPlanSchedule({
      ...payload,
      monthStart,
      userId: session.userId,
      replaceMonth: true,
    });

    response.json({
      count: result.lessons.length,
      lessons: result.lessons,
      monthEnd: result.monthEnd,
      monthStart: result.monthStart,
    });
  });

  app.post("/api/schedule/import-course", async (request, response) => {
    const session = await requireSessionValue(request);
    const payload = parseCourseImportPayload(request.body);

    const result = await importStarPlanSchedule({
      ...payload,
      monthStart: parseMonthStart(request.body.monthStart ?? request.body.weekStart),
      userId: session.userId,
    });

    response.json({
      count: result.lessons.length,
      lessons: result.lessons,
      monthEnd: result.monthEnd,
      monthStart: result.monthStart,
    });
  });

  app.post("/api/schedule/lessons", async (request, response) => {
    const session = await requireSessionValue(request);

    const day = await getOrCreateScheduleDay(typeof request.body.day === "string" ? request.body.day : "Allgemein");
    const { encryptedInvitations, inviteeEmails, inviteeIds } = parseInvitees(request.body, session.userId);
    const invitees = await findInvitees({ currentUserId: session.userId, inviteeEmails, inviteeIds });

    const lesson = await prisma.$transaction(async (transaction) => {
      const createdLesson = await transaction.lesson.create({
        data: {
          ...lessonData(request.body, day.id),
          ownerId: session.userId,
        },
      });

      for (const invitee of invitees) {
        const encryptedInvitation = encryptedInvitations.find((item) => Number(item.recipientId) === invitee.id);
        await transaction.lessonInvitation.create({
          data: {
            encryptedKey: typeof encryptedInvitation?.encryptedKey === "string" ? encryptedInvitation.encryptedKey : null,
            encryptedPayload: typeof encryptedInvitation?.encryptedPayload === "string" ? encryptedInvitation.encryptedPayload : null,
            encryptionIv: typeof encryptedInvitation?.encryptionIv === "string" ? encryptedInvitation.encryptionIv : null,
            lessonId: createdLesson.id,
            recipientId: invitee.id,
            senderId: session.userId,
          },
        });
      }

      return createdLesson;
    });

    response.status(201).json(lesson);
  });

  app.patch("/api/schedule/lessons/:id", async (request, response) => {
    const session = await requireSessionValue(request);
    const id = parseLessonId(request.params);
    await findEditableLesson(session, id);

    const day = await getOrCreateScheduleDay(typeof request.body.day === "string" ? request.body.day : "Allgemein");
    const lesson = await prisma.lesson.update({
      data: lessonData(request.body, day.id),
      where: { id },
    });

    response.json(lesson);
  });

  app.delete("/api/schedule/lessons/:id", async (request, response) => {
    const session = await requireSessionValue(request);
    const id = parseLessonId(request.params);
    await findEditableLesson(session, id);

    await prisma.lesson.delete({ where: { id } });
    response.status(204).send();
  });

  app.post("/api/schedule/lessons/:id/visit", async (request, response) => {
    const session = await requireSessionValue(request);
    const { date, id } = parseVisitBody(request.params, request.body, parseDateInput);
    await ensureVisibleLesson(session, id);

    const existingVisit = await prisma.lessonVisit.findUnique({
      where: {
        userId_lessonId_date: {
          date,
          lessonId: id,
          userId: session.userId,
        },
      },
    });

    if (existingVisit) {
      await prisma.lessonVisit.delete({ where: { id: existingVisit.id } });
      response.json({ isVisited: false });
      return;
    }

    await prisma.lessonVisit.create({
      data: {
        date,
        lessonId: id,
        userId: session.userId,
      },
    });
    response.json({ isVisited: true });
  });

  app.patch("/api/schedule/module-preferences", async (request, response) => {
    const session = await requireSessionValue(request);
    const { isActive, moduleKey } = parseModulePreferenceBody(request.body);

    const preference = await prisma.lessonModulePreference.upsert({
      create: {
        isActive,
        moduleKey,
        userId: session.userId,
      },
      update: { isActive },
      where: {
        userId_moduleKey: {
          moduleKey,
          userId: session.userId,
        },
      },
    });

    response.json(preference);
  });

  app.get("/api/schedule/invitations", async (request, response) => {
    const session = await requireSessionValue(request);

    const invitations = await prisma.lessonInvitation.findMany({
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
      where: { recipientId: session.userId },
    });

    response.json(invitations);
  });

  app.post("/api/schedule/invitations/:id/accept", async (request, response) => {
    const session = await requireSessionValue(request);
    const id = parseInvitationId(request.params);

    const invitation = await prisma.lessonInvitation.findFirst({
      include: { lesson: true },
      where: {
        id,
        recipientId: session.userId,
        status: "PENDING",
      },
    });

    if (!invitation) {
      response.status(404).json({ error: "Invitation not found." });
      return;
    }

    const acceptedInvitation = await prisma.$transaction(async (transaction) => {
      await transaction.lesson.create({
        data: {
          ...invitationLessonData({
            ...invitation.lesson,
            encryptedKey: invitation.encryptedKey ?? invitation.lesson.encryptedKey,
            encryptedPayload: invitation.encryptedPayload ?? invitation.lesson.encryptedPayload,
            encryptionIv: invitation.encryptionIv ?? invitation.lesson.encryptionIv,
          }),
          ownerId: session.userId,
          source: "INVITATION",
          sourceKey: `invitation-${invitation.id}`,
        },
      });

      return transaction.lessonInvitation.update({
        data: {
          respondedAt: new Date(),
          status: "ACCEPTED",
        },
        where: { id: invitation.id },
      });
    });

    response.json(acceptedInvitation);
  });

  app.post("/api/schedule/invitations/:id/reject", async (request, response) => {
    const session = await requireSessionValue(request);
    const id = parseInvitationId(request.params);

    const invitation = await prisma.lessonInvitation.findFirst({
      where: {
        id,
        recipientId: session.userId,
        status: "PENDING",
      },
    });

    if (!invitation) {
      response.status(404).json({ error: "Invitation not found." });
      return;
    }

    const rejectedInvitation = await prisma.lessonInvitation.update({
      data: {
        respondedAt: new Date(),
        status: "REJECTED",
      },
      where: { id: invitation.id },
    });

    response.json(rejectedInvitation);
  });
}
