import assert from "node:assert/strict";
import test from "node:test";
import { parseSwfrMeals } from "../src/integrations/swfr/swfr.parser";
import { startOfWeek, toDateInput } from "../src/shared/date-utils";

function dateHeading(date: Date) {
  return String(date.getDate()).padStart(2, "0") + "." + String(date.getMonth() + 1).padStart(2, "0") + ".";
}

function mealSection(day: string, date: Date, title: string) {
  return `
    <h3>${day} ${dateHeading(date)}</h3>
    <h5>Essen 1 vegetarisch</h5>
    <p>
      <small class="extra-text">${title}</small>
      Studierende 4,25 EUR
    </p>
    <div class="col-span-1"></div>
  `;
}

test("parses SWFR meals from current and future available weeks", () => {
  const currentMonday = startOfWeek(new Date());
  const nextMonday = new Date(currentMonday);
  nextMonday.setDate(currentMonday.getDate() + 7);
  nextMonday.setHours(12, 0, 0, 0);

  const html = `
    <main>
      <h2>Aktueller Speiseplan</h2>
      ${mealSection("Montag", currentMonday, "Current week pasta")}
      ${mealSection("Montag", nextMonday, "Next week rice")}
      <h2>Legende</h2>
    </main>
  `;

  const meals = parseSwfrMeals(html);

  assert.equal(meals.length, 2);
  assert.deepEqual(meals.map((meal) => toDateInput(meal.date)), [
    toDateInput(currentMonday),
    toDateInput(nextMonday),
  ]);
  assert.match(meals[0].mainDish, /Current week pasta/);
  assert.match(meals[1].mainDish, /Next week rice/);
});
