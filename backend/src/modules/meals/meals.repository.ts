import { prisma } from "../../prisma";

type MealWriteData = {
  canteenId: number;
  currency: string;
  date: Date | null;
  day: string;
  mainDish: string;
  priceCents: number;
  vegetarianDish: string | null;
};

export const mealRepository = {
  listCanteens() {
    return prisma.canteen.findMany({
      include: { meals: { orderBy: { id: "asc" } } },
      orderBy: { name: "asc" },
    });
  },

  listMealsForRange(weekStart: Date, weekEnd: Date) {
    return prisma.mealPlan.findMany({
      include: { canteen: true },
      orderBy: [{ date: "asc" }, { id: "asc" }],
      where: {
        date: { gte: weekStart, lt: weekEnd },
      },
    });
  },

  create(data: MealWriteData) {
    return prisma.mealPlan.create({ data });
  },
};
