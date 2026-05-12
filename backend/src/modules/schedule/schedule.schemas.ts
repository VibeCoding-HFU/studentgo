import { badRequest } from "../../shared/http/http-error";
import { numericId, objectPayload, requiredString } from "../../shared/validation";

export function parseLessonId(params: Record<string, unknown>) {
  return numericId(params.id, "lesson id");
}

export function parseInvitationId(params: Record<string, unknown>) {
  return numericId(params.id, "invitation id");
}

export function parseModulePreferenceBody(body: unknown) {
  const payload = objectPayload(body);
  const moduleKey = requiredString(payload.moduleKey, "Module key");

  return {
    isActive: payload.isActive === true,
    moduleKey,
  };
}

export function parseImportPayload(body: unknown) {
  const payload = objectPayload(body);

  return {
    facultyId: String(payload.facultyId ?? ""),
    facultyName: String(payload.facultyName ?? ""),
    semesterId: String(payload.semesterId ?? ""),
    semesterName: String(payload.semesterName ?? ""),
    specialization: typeof payload.specialization === "string" ? payload.specialization : null,
    studyGroup: String(payload.studyGroup ?? ""),
  };
}

export function parseCourseImportPayload(body: unknown) {
  const payload = objectPayload(body);
  const courseTitle = requiredString(payload.courseTitle, "Course title");

  return {
    ...parseImportPayload(payload),
    courseTitle,
  };
}

export function parseInvitees(body: unknown, currentUserId: number) {
  const payload = objectPayload(body);
  const inviteeIds = Array.isArray(payload.inviteeIds)
    ? [...new Set(payload.inviteeIds.map(Number).filter((id: number) => Number.isInteger(id) && id > 0 && id !== currentUserId))]
    : [];
  const inviteeEmails = Array.isArray(payload.inviteeEmails)
    ? [...new Set(payload.inviteeEmails.filter((email): email is string => typeof email === "string" && Boolean(email.trim())))]
    : [];
  const encryptedInvitations = Array.isArray(payload.encryptedInvitations)
    ? payload.encryptedInvitations.filter((item): item is Record<string, unknown> => typeof item === "object" && Boolean(item))
    : [];

  return {
    encryptedInvitations,
    inviteeEmails,
    inviteeIds,
  };
}

export function parseVisitBody(params: Record<string, unknown>, body: unknown, parseDateInput: (value: string) => Date) {
  const id = parseLessonId(params);
  const payload = objectPayload(body);
  const date = typeof payload.date === "string" ? parseDateInput(payload.date) : new Date("");

  if (Number.isNaN(date.getTime())) {
    throw badRequest("Lesson id and date are required.");
  }

  return { date, id };
}
