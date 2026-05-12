import { Express } from "express";
import { prisma } from "../../prisma";
import { deadlineData } from "../../shared/domain-data";
import { badRequest } from "../../shared/http/http-error";
import { objectPayload } from "../../shared/validation";
import { requireManager } from "../auth/auth.service";

function validateDeadlinePayload(payload: Record<string, unknown>) {
  const deadline = deadlineData(payload);

  if (!deadline.title) {
    throw badRequest("Deadline title is required.");
  }

  if (Number.isNaN(deadline.date.getTime())) {
    throw badRequest("Deadline date is required.");
  }

  return deadline;
}

export function registerDeadlineRoutes(app: Express) {
  app.get("/api/deadlines", async (_request, response) => {
    const deadlines = await prisma.deadline.findMany({ orderBy: { date: "asc" } });
    response.json(deadlines);
  });

  app.post("/api/deadlines", requireManager, async (request, response) => {
    const deadlinePayload = validateDeadlinePayload(objectPayload(request.body));
    const deadline = await prisma.deadline.create({
      data: deadlinePayload,
    });

    response.status(201).json(deadline);
  });
}
