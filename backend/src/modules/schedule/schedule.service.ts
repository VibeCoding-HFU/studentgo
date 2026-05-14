import { endOfMonth, endOfWeek, parseDateInput, parseMonthStart, parseWeekStart, toDateInput } from "../../shared/date-utils";
import { lessonData } from "../../shared/domain-data";
import { notFound } from "../../shared/http/http-error";
import { objectPayload } from "../../shared/validation";
import { AuthSession, normalizeEmail } from "../auth/auth.service";
import { getStarPlanOptions, importStarPlanSchedule, loadStarPlanMonth } from "./schedule-imports";
import { scheduleRepository } from "./schedule.repository";
import {
  parseCourseImportPayload,
  parseImportPayload,
  parseInvitationId,
  parseInvitees,
  parseLessonId,
  parseModulePreferenceBody,
  parseVisitBody,
} from "./schedule.schemas";
import { lessonModuleKey } from "./schedule-utils";

type AuthSessionValue = NonNullable<AuthSession>;

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
}) {
  return {
    date: lesson.date,
    description: lesson.description,
    encryptedKey: lesson.encryptedKey,
    encryptedPayload: lesson.encryptedPayload,
    encryptionIv: lesson.encryptionIv,
    endTime: lesson.endTime,
    isRecurring: lesson.isRecurring,
    lecturer: lesson.lecturer,
    room: lesson.room,
    scheduleDayId: lesson.scheduleDayId,
    startTime: lesson.startTime,
    title: lesson.title,
  };
}

export async function getSchedule(userId: number | null, weekStartInput: unknown) {
  const weekStart = parseWeekStart(weekStartInput);
  const weekEnd = endOfWeek(weekStart);
  const schedule = await scheduleRepository.listWeek(weekStart, weekEnd, userId);

  if (!userId) {
    return { days: schedule, weekEnd, weekStart };
  }

  const lessons = schedule.flatMap((day) => day.lessons);
  const lessonIds = lessons.map((lesson) => lesson.id);
  const moduleKeys = [...new Set(lessons.map(lessonModuleKey))];
  const [visits, preferences] = await Promise.all([
    lessonIds.length ? scheduleRepository.listVisits(userId, lessonIds, weekStart, weekEnd) : [],
    moduleKeys.length ? scheduleRepository.listModulePreferences(userId, moduleKeys) : [],
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

  return { days, weekEnd, weekStart };
}

export function getScheduleImportOptions(facultyIdInput: unknown, semesterIdInput: unknown) {
  return getStarPlanOptions(
    typeof facultyIdInput === "string" ? facultyIdInput : undefined,
    typeof semesterIdInput === "string" ? semesterIdInput : undefined,
  );
}

export async function listImportCourses(userId: number, body: unknown) {
  const payload = parseImportPayload(body);
  const bodyPayload = objectPayload(body);
  const monthImport = await loadStarPlanMonth({
    ...payload,
    monthStart: parseMonthStart(bodyPayload.monthStart ?? bodyPayload.weekStart),
    userId,
  });
  const courses = [...new Map(monthImport.lessons.map((lesson) => [lesson.title, lesson])).entries()]
    .map(([title]) => ({
      lessonCount: monthImport.lessons.filter((lesson) => lesson.title === title).length,
      title,
    }))
    .sort((first, second) => first.title.localeCompare(second.title, "de"));

  return {
    courses,
    monthEnd: monthImport.monthEnd,
    monthStart: monthImport.monthStart,
  };
}

export async function importScheduleMonth(userId: number, body: unknown) {
  const payload = parseImportPayload(body);
  const bodyPayload = objectPayload(body);
  const result = await importStarPlanSchedule({
    ...payload,
    monthStart: parseMonthStart(bodyPayload.monthStart ?? bodyPayload.weekStart),
    replaceMonth: true,
    userId,
  });

  return {
    count: result.lessons.length,
    lessons: result.lessons,
    monthEnd: result.monthEnd,
    monthStart: result.monthStart,
  };
}

export async function importScheduleCourse(userId: number, body: unknown) {
  const payload = parseCourseImportPayload(body);
  const bodyPayload = objectPayload(body);
  const result = await importStarPlanSchedule({
    ...payload,
    monthStart: parseMonthStart(bodyPayload.monthStart ?? bodyPayload.weekStart),
    userId,
  });

  return {
    count: result.lessons.length,
    lessons: result.lessons,
    monthEnd: result.monthEnd,
    monthStart: result.monthStart,
  };
}

export async function deleteImportedCourse(userId: number, body: unknown) {
  const payload = parseCourseImportPayload(body);
  const bodyPayload = objectPayload(body);
  const monthStart = parseMonthStart(bodyPayload.monthStart ?? bodyPayload.weekStart);
  const monthEnd = endOfMonth(monthStart);
  const result = await scheduleRepository.archiveImportedCourse({
    courseTitle: payload.courseTitle,
    monthEnd,
    monthStart,
    userId,
  });

  return {
    count: result.count,
    monthEnd,
    monthStart,
  };
}

export async function findEditableLesson(session: AuthSessionValue, id: number) {
  const lesson = await scheduleRepository.findEditableLesson(session.userId, id);

  if (!lesson) {
    throw notFound("Lesson not found.");
  }

  return lesson;
}

export async function ensureVisibleLesson(session: AuthSessionValue, id: number) {
  const lesson = await scheduleRepository.findVisibleLesson(session.userId, id);

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

  return scheduleRepository.findInvitees({
    currentUserId: input.currentUserId,
    inviteeEmails,
    inviteeIds: input.inviteeIds,
  });
}

export async function createLesson(userId: number, body: unknown) {
  const payload = objectPayload(body);
  const day = await scheduleRepository.getOrCreateDay(typeof payload.day === "string" ? payload.day : "Allgemein");
  const { encryptedInvitations, inviteeEmails, inviteeIds } = parseInvitees(payload, userId);
  const invitees = await findInvitees({ currentUserId: userId, inviteeEmails, inviteeIds });

  return scheduleRepository.createLessonWithInvitations({
    invitations: invitees.map((invitee) => {
      const encryptedInvitation = encryptedInvitations.find((item) => Number(item.recipientId) === invitee.id);
      return {
        encryptedKey: typeof encryptedInvitation?.encryptedKey === "string" ? encryptedInvitation.encryptedKey : null,
        encryptedPayload: typeof encryptedInvitation?.encryptedPayload === "string" ? encryptedInvitation.encryptedPayload : null,
        encryptionIv: typeof encryptedInvitation?.encryptionIv === "string" ? encryptedInvitation.encryptionIv : null,
        recipientId: invitee.id,
      };
    }),
    lessonData: lessonData(payload, day.id),
    ownerId: userId,
  });
}

export async function updateLesson(session: AuthSessionValue, params: Record<string, unknown>, body: unknown) {
  const id = parseLessonId(params);
  await findEditableLesson(session, id);

  const payload = objectPayload(body);
  const day = await scheduleRepository.getOrCreateDay(typeof payload.day === "string" ? payload.day : "Allgemein");
  return scheduleRepository.updateLesson(id, lessonData(payload, day.id));
}

export async function deleteLesson(session: AuthSessionValue, params: Record<string, unknown>) {
  const id = parseLessonId(params);
  await findEditableLesson(session, id);
  await scheduleRepository.deleteLesson(id);
}

export async function toggleLessonVisit(session: AuthSessionValue, params: Record<string, unknown>, body: unknown) {
  const { date, id } = parseVisitBody(params, body, parseDateInput);
  await ensureVisibleLesson(session, id);

  const existingVisit = await scheduleRepository.findVisit({
    date,
    lessonId: id,
    userId: session.userId,
  });

  if (existingVisit) {
    await scheduleRepository.deleteVisit(existingVisit.id);
    return { isVisited: false };
  }

  await scheduleRepository.createVisit({
    date,
    lessonId: id,
    userId: session.userId,
  });

  return { isVisited: true };
}

export function setModulePreference(userId: number, body: unknown) {
  const { isActive, moduleKey } = parseModulePreferenceBody(body);
  return scheduleRepository.upsertModulePreference({ isActive, moduleKey, userId });
}

export function listLessonInvitations(userId: number) {
  return scheduleRepository.listInvitations(userId);
}

export async function acceptLessonInvitation(userId: number, params: Record<string, unknown>) {
  const id = parseInvitationId(params);
  const invitation = await scheduleRepository.findPendingInvitationWithLesson(userId, id);

  if (!invitation) {
    throw notFound("Invitation not found.");
  }

  return scheduleRepository.acceptInvitation({
    invitationId: invitation.id,
    lessonData: invitationLessonData({
      ...invitation.lesson,
      encryptedKey: invitation.encryptedKey ?? invitation.lesson.encryptedKey,
      encryptedPayload: invitation.encryptedPayload ?? invitation.lesson.encryptedPayload,
      encryptionIv: invitation.encryptionIv ?? invitation.lesson.encryptionIv,
    }),
    userId,
  });
}

export async function rejectLessonInvitation(userId: number, params: Record<string, unknown>) {
  const id = parseInvitationId(params);
  const invitation = await scheduleRepository.findPendingInvitation(userId, id);

  if (!invitation) {
    throw notFound("Invitation not found.");
  }

  return scheduleRepository.rejectInvitation(invitation.id);
}
