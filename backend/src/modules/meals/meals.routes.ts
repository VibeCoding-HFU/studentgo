import { Express } from "express";
import { objectPayload } from "../../shared/validation";
import { requireManager } from "../auth/auth.service";
import { createMeal, listCanteens, listMeals } from "./meals.service";

export function registerMealRoutes(app: Express) {
  app.get("/api/canteens", async (_request, response) => {
    response.json(await listCanteens());
  });

  app.get("/api/meals", async (request, response) => {
    response.json(await listMeals(request.query.weekStart));
  });

  app.post("/api/meals", requireManager, async (request, response) => {
    response.status(201).json(await createMeal(objectPayload(request.body)));
  });
}
