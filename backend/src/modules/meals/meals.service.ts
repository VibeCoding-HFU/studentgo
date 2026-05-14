import { endOfWeek, parseWeekStart } from "../../shared/date-utils";
import { mealData } from "../../shared/domain-data";
import { badRequest } from "../../shared/http/http-error";
import { numericId } from "../../shared/validation";
import { mealRepository } from "./meals.repository";

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

export function listCanteens() {
  return mealRepository.listCanteens();
}

export function listMeals(weekStartInput: unknown) {
  const weekStart = parseWeekStart(weekStartInput);
  return mealRepository.listMealsForRange(weekStart, endOfWeek(weekStart));
}

export function createMeal(payload: Record<string, unknown>) {
  return mealRepository.create(validateMealPayload(payload));
}
