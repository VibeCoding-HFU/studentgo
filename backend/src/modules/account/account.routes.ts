import { Express } from "express";
import { getSession } from "../auth/auth.service";
import { prisma } from "../../prisma";
import { toDateInput } from "../../shared/date-utils";
import { lessonModuleKey } from "../schedule/schedule-utils";

export function registerAccountRoutes(app: Express) {
  app.get("/api/account/statistics", async (request, response) => {
    const session = await getSession(request);

    if (!session) {
      response.status(401).json({ error: "Not authenticated." });
      return;
    }

    const lessons = await prisma.lesson.findMany({
      where: {
        OR: [{ ownerId: null }, { ownerId: session.userId }],
      },
    });
    const moduleKeys = [...new Set(lessons.map(lessonModuleKey))];
    const preferences = moduleKeys.length
      ? await prisma.lessonModulePreference.findMany({
          where: {
            moduleKey: { in: moduleKeys },
            userId: session.userId,
          },
        })
      : [];
    const preferenceByModuleKey = new Map(preferences.map((preference) => [preference.moduleKey, preference]));
    const activeLessons = lessons.filter((lesson) => preferenceByModuleKey.get(lessonModuleKey(lesson))?.isActive !== false);
    const activeDatedLessons = activeLessons.filter((lesson): lesson is typeof lesson & { date: Date } => Boolean(lesson.date));
    const dateByLessonId = new Map(activeDatedLessons.map((lesson) => [lesson.id, toDateInput(lesson.date)]));
    const visits = activeDatedLessons.length
      ? await prisma.lessonVisit.findMany({
          select: {
            date: true,
            lessonId: true,
          },
          where: {
            lessonId: { in: activeDatedLessons.map((lesson) => lesson.id) },
            userId: session.userId,
          },
        })
      : [];
    const visitedLessonIds = new Set(visits
      .filter((visit) => dateByLessonId.get(visit.lessonId) === toDateInput(visit.date))
      .map((visit) => visit.lessonId));

    response.json({
      courseCount: new Set(activeLessons.filter((lesson) => ["STARPLAN", "STARPLAN_ARCHIVE"].includes(lesson.source)).map(lessonModuleKey)).size,
      totalEvents: activeDatedLessons.length,
      visitedEvents: visitedLessonIds.size,
    });
  });
}
