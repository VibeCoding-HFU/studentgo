import { Express } from "express";
import { prisma } from "../../prisma";
import { studyInfoData } from "../../shared/domain-data";
import { getSession, requireSessionValue } from "../auth/auth.service";

export function registerStudyInfoRoutes(app: Express) {
  app.get("/api/study-info", async (request, response) => {
    const session = await getSession(request);
    const [spo, modules] = await Promise.all([
      prisma.studyInfo.findMany({
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
        where: { OR: [{ ownerId: null }, ...(session ? [{ ownerId: session.userId }] : [])] },
      }),
      prisma.studyModule.findMany({
        orderBy: { title: "asc" },
        where: { OR: [{ ownerId: null }, ...(session ? [{ ownerId: session.userId }] : [])] },
      }),
    ]);

    response.json({ spo, modules });
  });

  app.post("/api/study-info", async (request, response) => {
    const session = await requireSessionValue(request);

    const info = await prisma.studyInfo.create({
      data: {
        ...studyInfoData(request.body),
        ownerId: session.userId,
      },
    });

    response.status(201).json(info);
  });
}
