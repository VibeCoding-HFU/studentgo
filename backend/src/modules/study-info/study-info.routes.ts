import { Express } from "express";
import { getSession, requireSessionValue } from "../auth/auth.service";
import { createStudyInfo, listStudyInfo } from "./study-info.service";

export function registerStudyInfoRoutes(app: Express) {
  app.get("/api/study-info", async (request, response) => {
    const session = await getSession(request);
    response.json(await listStudyInfo(session?.userId ?? null));
  });

  app.post("/api/study-info", async (request, response) => {
    const session = await requireSessionValue(request);
    response.status(201).json(await createStudyInfo(session.userId, request.body));
  });
}
