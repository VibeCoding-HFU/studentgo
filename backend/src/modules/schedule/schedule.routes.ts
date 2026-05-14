import { Express } from "express";
import { getSession, requireSessionValue } from "../auth/auth.service";
import {
  acceptLessonInvitation,
  createLesson,
  deleteImportedCourse,
  deleteLesson,
  getSchedule,
  getScheduleImportOptions,
  importScheduleCourse,
  importScheduleMonth,
  listImportCourses,
  listLessonInvitations,
  rejectLessonInvitation,
  setModulePreference,
  toggleLessonVisit,
  updateLesson,
} from "./schedule.service";

export function registerScheduleRoutes(app: Express) {
  app.get("/api/schedule", async (request, response) => {
    const session = await getSession(request);
    response.json(await getSchedule(session?.userId ?? null, request.query.weekStart));
  });

  app.get("/api/schedule/import-options", async (request, response) => {
    response.json(await getScheduleImportOptions(request.query.facultyId, request.query.semesterId));
  });

  app.post("/api/schedule/import-courses", async (request, response) => {
    const session = await requireSessionValue(request);
    response.json(await listImportCourses(session.userId, request.body));
  });

  app.post("/api/schedule/import", async (request, response) => {
    const session = await requireSessionValue(request);
    response.json(await importScheduleMonth(session.userId, request.body));
  });

  app.post("/api/schedule/import-course", async (request, response) => {
    const session = await requireSessionValue(request);
    response.json(await importScheduleCourse(session.userId, request.body));
  });

  app.delete("/api/schedule/import-course", async (request, response) => {
    const session = await requireSessionValue(request);
    response.json(await deleteImportedCourse(session.userId, request.body));
  });

  app.post("/api/schedule/lessons", async (request, response) => {
    const session = await requireSessionValue(request);
    response.status(201).json(await createLesson(session.userId, request.body));
  });

  app.patch("/api/schedule/lessons/:id", async (request, response) => {
    const session = await requireSessionValue(request);
    response.json(await updateLesson(session, request.params, request.body));
  });

  app.delete("/api/schedule/lessons/:id", async (request, response) => {
    const session = await requireSessionValue(request);
    await deleteLesson(session, request.params);
    response.status(204).send();
  });

  app.post("/api/schedule/lessons/:id/visit", async (request, response) => {
    const session = await requireSessionValue(request);
    response.json(await toggleLessonVisit(session, request.params, request.body));
  });

  app.patch("/api/schedule/module-preferences", async (request, response) => {
    const session = await requireSessionValue(request);
    response.json(await setModulePreference(session.userId, request.body));
  });

  app.get("/api/schedule/invitations", async (request, response) => {
    const session = await requireSessionValue(request);
    response.json(await listLessonInvitations(session.userId));
  });

  app.post("/api/schedule/invitations/:id/accept", async (request, response) => {
    const session = await requireSessionValue(request);
    response.json(await acceptLessonInvitation(session.userId, request.params));
  });

  app.post("/api/schedule/invitations/:id/reject", async (request, response) => {
    const session = await requireSessionValue(request);
    response.json(await rejectLessonInvitation(session.userId, request.params));
  });
}
