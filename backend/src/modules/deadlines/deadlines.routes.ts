import { Express } from "express";
import { objectPayload } from "../../shared/validation";
import { requireManager } from "../auth/auth.service";
import { createDeadline, listDeadlines } from "./deadlines.service";

export function registerDeadlineRoutes(app: Express) {
  app.get("/api/deadlines", async (_request, response) => {
    response.json(await listDeadlines());
  });

  app.post("/api/deadlines", requireManager, async (request, response) => {
    response.status(201).json(await createDeadline(objectPayload(request.body)));
  });
}
