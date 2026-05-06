import { prisma } from "../prisma";

export async function getOrCreateScheduleDay(day: string, transaction: typeof prisma = prisma) {
  const cleanDay = day.trim();
  const existingDay = await transaction.scheduleDay.findUnique({ where: { day: cleanDay } });

  if (existingDay) {
    return existingDay;
  }

  return transaction.scheduleDay.create({
    data: {
      day: cleanDay,
      sortOrder: 99,
    },
  });
}

export async function getOrCreateCanteen(name: string, transaction: typeof prisma = prisma) {
  const cleanName = name.trim() || "Mensa";
  const existingCanteen = await transaction.canteen.findFirst({ where: { name: cleanName } });

  if (existingCanteen) {
    return existingCanteen;
  }

  return transaction.canteen.create({ data: { name: cleanName } });
}
