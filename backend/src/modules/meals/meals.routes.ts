import { Express } from "express";
import { prisma } from "../../prisma";
import { endOfWeek, parseWeekStart } from "../../shared/date-utils";
import { mealData } from "../../shared/domain-data";
import { badRequest } from "../../shared/http/http-error";
import { numericId, objectPayload } from "../../shared/validation";
import { requireManager } from "../auth/auth.service";

function validateMealPayload(payload: Record<string, unknown>) {
  const meal = mealData(payload, numericId(payload.canteenId, "canteenId"));

  if (!meal.day) {
    throw badRequest("Meal day is required.");
  }

  if (!meal.mainDish) {
    throw badRequest("Meal main dish is required.");
  }

  if (!Number.isInteger(meal.priceCents) || meal.priceCents < 0) {
    throw badRequest("Meal priceCents must be a non-negative integer.");
  }

  if (meal.date && Number.isNaN(meal.date.getTime())) {
    throw badRequest("Meal date is invalid.");
  }

  return meal;
}

export function registerMealRoutes(app: Express) {
  app.get("/api/canteens", async (_request, response) => {
    const canteens = await prisma.canteen.findMany({
      include: { meals: { orderBy: { id: "asc" } } },
      orderBy: { name: "asc" },
    });

    response.json(canteens);
  });

  app.get("/api/meals", async (request, response) => {
    const weekStart = parseWeekStart(request.query.weekStart);
    const weekEnd = endOfWeek(weekStart);
    const meals = await prisma.mealPlan.findMany({
      include: { canteen: true },
      orderBy: [{ date: "asc" }, { id: "asc" }],
      where: {
        date: { gte: weekStart, lt: weekEnd },
      },
    });

    response.json(meals);
  });

  app.post("/api/meals", requireManager, async (request, response) => {
    const mealPayload = validateMealPayload(objectPayload(request.body));
    const meal = await prisma.mealPlan.create({
      data: mealPayload,
    });

    response.status(201).json(meal);
  });
}
