import { Express } from "express";
import { requireSessionValue } from "../auth/auth.service";
import { getAccountStatistics } from "./account.service";

export function registerAccountRoutes(app: Express) {
  app.get("/api/account/statistics", async (request, response) => {
    const session = await requireSessionValue(request);
    response.json(await getAccountStatistics(session.userId));
  });
}
