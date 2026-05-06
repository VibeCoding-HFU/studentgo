import { Express } from "express";
import { getSession, normalizeEmail } from "../auth/auth.service";
import { prisma } from "../../prisma";
import { getOrCreateScheduleDay } from "../../shared/db-helpers";
import { endOfWeek, parseDateInput, parseMonthStart, parseWeekStart, toDateInput } from "../../shared/date-utils";
import { lessonData } from "../../shared/domain-data";
import { getStarPlanOptions, importStarPlanSchedule, loadStarPlanMonth } from "./schedule-imports";
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
    const session = await getSession(request);

    if (!session) {
      response.status(401).json({ error: "Not authenticated." });
      return;
    }

    const monthImport = await loadStarPlanMonth({
      facultyId: String(request.body.facultyId ?? ""),
      facultyName: String(request.body.facultyName ?? ""),
      monthStart: parseMonthStart(request.body.monthStart ?? request.body.weekStart),
      semesterId: String(request.body.semesterId ?? ""),
      semesterName: String(request.body.semesterName ?? ""),
      specialization: typeof request.body.specialization === "string" ? request.body.specialization : null,
      studyGroup: String(request.body.studyGroup ?? ""),
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
    const session = await getSession(request);

    if (!session) {
      response.status(401).json({ error: "Not authenticated." });
      return;
    }

    const monthStart = parseMonthStart(request.body.monthStart ?? request.body.weekStart);
    const result = await importStarPlanSchedule({
      facultyId: String(request.body.facultyId ?? ""),
      facultyName: String(request.body.facultyName ?? ""),
      monthStart,
      semesterId: String(request.body.semesterId ?? ""),
      semesterName: String(request.body.semesterName ?? ""),
      specialization: typeof request.body.specialization === "string" ? request.body.specialization : null,
      studyGroup: String(request.body.studyGroup ?? ""),
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
    const session = await getSession(request);
    const courseTitle = typeof request.body.courseTitle === "string" ? request.body.courseTitle.trim() : "";

    if (!session) {
      response.status(401).json({ error: "Not authenticated." });
      return;
    }

    if (!courseTitle) {
      response.status(400).json({ error: "Course title is required." });
      return;
    }

    const result = await importStarPlanSchedule({
      courseTitle,
      facultyId: String(request.body.facultyId ?? ""),
      facultyName: String(request.body.facultyName ?? ""),
      monthStart: parseMonthStart(request.body.monthStart ?? request.body.weekStart),
      semesterId: String(request.body.semesterId ?? ""),
      semesterName: String(request.body.semesterName ?? ""),
      specialization: typeof request.body.specialization === "string" ? request.body.specialization : null,
      studyGroup: String(request.body.studyGroup ?? ""),
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
    const session = await getSession(request);

    if (!session) {
      response.status(401).json({ error: "Not authenticated." });
      return;
    }

    const day = await getOrCreateScheduleDay(typeof request.body.day === "string" ? request.body.day : "Allgemein");
    const inviteeIds = Array.isArray(request.body.inviteeIds)
      ? request.body.inviteeIds.map(Number).filter((id: number) => !Number.isNaN(id) && id !== session.userId)
      : [];
    const inviteeEmails = Array.isArray(request.body.inviteeEmails)
      ? request.body.inviteeEmails.map(normalizeEmail).filter(Boolean)
      : [];
    const encryptedInvitations = Array.isArray(request.body.encryptedInvitations)
      ? request.body.encryptedInvitations as Array<Record<string, unknown>>
      : [];
    const invitees = inviteeIds.length || inviteeEmails.length
      ? await prisma.user.findMany({
          select: { id: true },
          where: {
            id: { not: session.userId },
            OR: [
              ...(inviteeIds.length ? [{ id: { in: inviteeIds } }] : []),
              ...(inviteeEmails.length ? [{ email: { in: inviteeEmails } }] : []),
            ],
          },
        })
      : [];

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
        }).catch(() => undefined);
      }

      return createdLesson;
    });

    response.status(201).json(lesson);
  });

  app.patch("/api/schedule/lessons/:id", async (request, response) => {
    const session = await getSession(request);
    const id = Number(request.params.id);

    if (!session) {
      response.status(401).json({ error: "Not authenticated." });
      return;
    }

    if (Number.isNaN(id)) {
      response.status(400).json({ error: "Invalid lesson id." });
      return;
    }

    const existingLesson = await prisma.lesson.findFirst({
      where: {
        id,
        ownerId: session.userId,
        source: { not: "STARPLAN" },
      },
    });

    if (!existingLesson) {
      response.status(404).json({ error: "Lesson not found." });
      return;
    }

    const day = await getOrCreateScheduleDay(typeof request.body.day === "string" ? request.body.day : "Allgemein");
    const lesson = await prisma.lesson.update({
      data: lessonData(request.body, day.id),
      where: { id },
    });

    response.json(lesson);
  });

  app.delete("/api/schedule/lessons/:id", async (request, response) => {
    const session = await getSession(request);
    const id = Number(request.params.id);

    if (!session) {
      response.status(401).json({ error: "Not authenticated." });
      return;
    }

    if (Number.isNaN(id)) {
      response.status(400).json({ error: "Invalid lesson id." });
      return;
    }

    const existingLesson = await prisma.lesson.findFirst({
      where: {
        id,
        ownerId: session.userId,
        source: { not: "STARPLAN" },
      },
    });

    if (!existingLesson) {
      response.status(404).json({ error: "Lesson not found." });
      return;
    }

    await prisma.lesson.delete({ where: { id } });
    response.status(204).send();
  });

  app.post("/api/schedule/lessons/:id/visit", async (request, response) => {
    const session = await getSession(request);
    const id = Number(request.params.id);
    const date = typeof request.body.date === "string" ? parseDateInput(request.body.date) : new Date("");

    if (!session) {
      response.status(401).json({ error: "Not authenticated." });
      return;
    }

    if (Number.isNaN(id) || Number.isNaN(date.getTime())) {
      response.status(400).json({ error: "Lesson id and date are required." });
      return;
    }

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
    const session = await getSession(request);
    const moduleKey = typeof request.body.moduleKey === "string" ? request.body.moduleKey.trim() : "";
    const isActive = request.body.isActive === true;

    if (!session) {
      response.status(401).json({ error: "Not authenticated." });
      return;
    }

    if (!moduleKey) {
      response.status(400).json({ error: "Module key is required." });
      return;
    }

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
    const session = await getSession(request);

    if (!session) {
      response.status(401).json({ error: "Not authenticated." });
      return;
    }

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
    const session = await getSession(request);
    const id = Number(request.params.id);

    if (!session) {
      response.status(401).json({ error: "Not authenticated." });
      return;
    }

    if (Number.isNaN(id)) {
      response.status(400).json({ error: "Invalid invitation id." });
      return;
    }

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
    const session = await getSession(request);
    const id = Number(request.params.id);

    if (!session) {
      response.status(401).json({ error: "Not authenticated." });
      return;
    }

    if (Number.isNaN(id)) {
      response.status(400).json({ error: "Invalid invitation id." });
      return;
    }

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
