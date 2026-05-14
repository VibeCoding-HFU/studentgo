import { prisma } from "../../prisma";

export const accountRepository = {
  listVisibleLessons(userId: number) {
    return prisma.lesson.findMany({
      where: {
        OR: [{ ownerId: null }, { ownerId: userId }],
      },
    });
  },

  listModulePreferences(userId: number, moduleKeys: string[]) {
    return prisma.lessonModulePreference.findMany({
      where: {
        moduleKey: { in: moduleKeys },
        userId,
      },
    });
  },

  listLessonVisits(userId: number, lessonIds: number[]) {
    return prisma.lessonVisit.findMany({
      select: {
        date: true,
        lessonId: true,
      },
      where: {
        lessonId: { in: lessonIds },
        userId,
      },
    });
  },
};
