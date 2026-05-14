import { toDateInput } from "../../shared/date-utils";
import { lessonModuleKey } from "../schedule/schedule-utils";
import { accountRepository } from "./account.repository";

export async function getAccountStatistics(userId: number) {
  const lessons = await accountRepository.listVisibleLessons(userId);
  const moduleKeys = [...new Set(lessons.map(lessonModuleKey))];
  const preferences = moduleKeys.length
    ? await accountRepository.listModulePreferences(userId, moduleKeys)
    : [];
  const preferenceByModuleKey = new Map(preferences.map((preference) => [preference.moduleKey, preference]));
  const activeLessons = lessons.filter((lesson) => preferenceByModuleKey.get(lessonModuleKey(lesson))?.isActive !== false);
  const activeDatedLessons = activeLessons.filter((lesson): lesson is typeof lesson & { date: Date } => Boolean(lesson.date));
  const dateByLessonId = new Map(activeDatedLessons.map((lesson) => [lesson.id, toDateInput(lesson.date)]));
  const visits = activeDatedLessons.length
    ? await accountRepository.listLessonVisits(userId, activeDatedLessons.map((lesson) => lesson.id))
    : [];
  const visitedLessonIds = new Set(visits
    .filter((visit) => dateByLessonId.get(visit.lessonId) === toDateInput(visit.date))
    .map((visit) => visit.lessonId));

  return {
    courseCount: new Set(activeLessons.filter((lesson) => ["STARPLAN", "STARPLAN_ARCHIVE"].includes(lesson.source)).map(lessonModuleKey)).size,
    totalEvents: activeDatedLessons.length,
    visitedEvents: visitedLessonIds.size,
  };
}
