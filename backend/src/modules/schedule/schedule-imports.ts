import { prisma } from "../../prisma";
import { getOrCreateCanteen, getOrCreateScheduleDay } from "../../shared/db-helpers";
import {
  endOfMonth,
  parseDateInput,
  startOfMonth,
  toDateInput,
  weeksForMonth,
} from "../../shared/date-utils";
import { fetchStarPlanJson, fetchStarPlanTimetableHtml } from "../../integrations/starplan/starplan.client";
import { parseStarPlanTimetable } from "../../integrations/starplan/starplan.parser";
import { fetchSwfrMealPlanHtml } from "../../integrations/swfr/swfr.client";
import { parseSwfrMeals } from "../../integrations/swfr/swfr.parser";
import { lessonsOverlap } from "./schedule-utils";

export async function importSwfrMeals() {
  const html = await fetchSwfrMealPlanHtml();
  const meals = parseSwfrMeals(html);
  const canteen = await getOrCreateCanteen("Mensa Furtwangen");
  const importedAt = new Date();

  await prisma.$transaction(async (transaction) => {
    await transaction.mealPlan.deleteMany({ where: { source: "SWFR" } });

    for (const meal of meals) {
      await transaction.mealPlan.create({
        data: {
          canteenId: canteen.id,
          currency: "EUR",
          date: meal.date,
          day: meal.day,
          importedAt,
          mainDish: meal.mainDish,
          priceCents: meal.priceCents,
          source: "SWFR",
          sourceKey: `swfr-${meal.date.toISOString().slice(0, 10)}-${meal.mainDish}`,
          vegetarianDish: meal.vegetarianDish,
        },
      });
    }
  });

  return meals.length;
}

export function scheduleDailySwfrImport() {
  const runImport = async () => {
    try {
      const count = await importSwfrMeals();
      console.log(`Imported ${count} SWFR meals for the current week.`);
    } catch (error) {
      console.error("SWFR meal import failed:", error);
    }
  };

  runImport();
  setInterval(runImport, 24 * 60 * 60 * 1000);
}

type StarPlanUnit = { id: number; name: string; shortname: string; startdate?: string; enddate?: string };
type StarPlanOrgGroup = { id: number; name: string; shortname: string };
type StarPlanPlanningGroup = { id: number; name: string; shortname: string };

export async function getStarPlanOptions(facultyId?: string, semesterId?: string) {
  const semesters = await fetchStarPlanJson<StarPlanUnit>("json?m=getpus");
  const currentSemester = semesters.find((semester) => String(semester.id) === semesterId) ?? semesters[0];
  const faculties = await fetchStarPlanJson<StarPlanOrgGroup>(
    `json?m=getogs${currentSemester ? `&pu=${currentSemester.id}` : ""}`,
  );
  const groups = currentSemester && facultyId
    ? await fetchStarPlanJson<StarPlanPlanningGroup>(`json?m=getPgsExt&pu=${currentSemester.id}&og=${facultyId}`).catch(() => [])
    : [];

  return {
    faculties: faculties.map((faculty) => ({ ...faculty, groups: [] })),
    groups: groups.map((group) => ({ id: group.shortname, name: group.name, shortname: group.shortname })),
    semesters: semesters.map((semester) => ({
      enddate: semester.enddate,
      id: semester.id,
      name: semester.name,
      shortname: semester.shortname,
      startdate: semester.startdate,
    })),
    specializations: [
      { id: "standard", name: "Standard" },
      { id: "all", name: "Alle Vertiefungen" },
    ],
  };
}

export type StarPlanImportInput = {
  facultyId: string;
  facultyName: string;
  monthStart: Date;
  semesterId: string;
  semesterName: string;
  specialization?: string | null;
  studyGroup: string;
  userId: number;
};

type StarPlanParsedLesson = ReturnType<typeof parseStarPlanTimetable>[number];

export async function loadStarPlanMonth(input: StarPlanImportInput) {
  const monthStart = startOfMonth(input.monthStart);
  const monthEnd = endOfMonth(monthStart);
  const cacheKey = [
    "month",
    input.semesterId,
    input.facultyId,
    input.studyGroup,
    input.specialization ?? "standard",
    toDateInput(monthStart),
  ].join(":");
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const existingCache = await prisma.scheduleImportCache.findUnique({ where: { cacheKey } });
  let parsedLessons: StarPlanParsedLesson[];

  if (existingCache && existingCache.importedAt >= todayStart) {
    parsedLessons = JSON.parse(existingCache.payloadJson) as StarPlanParsedLesson[];
  } else {
    const weeklyLessons = await Promise.all(weeksForMonth(monthStart).map(async (weekStart) => {
      const params = new URLSearchParams({
        dfc: toDateInput(weekStart),
        m: "getTT",
        og: input.facultyId,
        pg: input.studyGroup,
        pu: input.semesterId,
        sa: "false",
        sd: "true",
        sel: "pg",
      });
      return parseStarPlanTimetable(await fetchStarPlanTimetableHtml(params), weekStart);
    }));

    parsedLessons = weeklyLessons
      .flat()
      .filter((lesson) => {
        const date = parseDateInput(lesson.date);
        return date >= monthStart && date < monthEnd;
      })
      .filter((lesson, index, lessons) => lessons.findIndex((candidate) => (
        candidate.date === lesson.date
        && candidate.startTime === lesson.startTime
        && candidate.endTime === lesson.endTime
        && candidate.title === lesson.title
        && candidate.room === lesson.room
        && candidate.lecturer === lesson.lecturer
      )) === index);
    await prisma.scheduleImportCache.upsert({
      create: {
        cacheKey,
        facultyId: input.facultyId,
        facultyName: input.facultyName,
        importedAt: new Date(),
        payloadJson: JSON.stringify(parsedLessons),
        semesterId: input.semesterId,
        semesterName: input.semesterName,
        specialization: input.specialization,
        studyGroup: input.studyGroup,
        weekStart: monthStart,
      },
      update: {
        importedAt: new Date(),
        payloadJson: JSON.stringify(parsedLessons),
        weekStart: monthStart,
      },
      where: { cacheKey },
    });
  }

  return { cacheKey, lessons: parsedLessons, monthEnd, monthStart };
}

export async function importStarPlanSchedule(input: StarPlanImportInput & {
  courseTitle?: string | null;
  replaceMonth?: boolean;
}) {
  const monthImport = await loadStarPlanMonth(input);
  const parsedLessons = input.courseTitle
    ? monthImport.lessons.filter((lesson) => lesson.title === input.courseTitle)
    : monthImport.lessons;

  await prisma.$transaction(async (transaction) => {
    const importedAt = new Date();
    const existingLessons = await transaction.lesson.findMany({
      where: {
        date: { gte: monthImport.monthStart, lt: monthImport.monthEnd },
        ownerId: input.userId,
        source: { in: ["STARPLAN", "STARPLAN_ARCHIVE"] },
      },
    });
    const handledLessonIds = new Set<number>();

    if (input.replaceMonth) {
      await transaction.lesson.updateMany({
        data: { source: "STARPLAN_ARCHIVE" },
        where: {
          date: { gte: monthImport.monthStart, lt: monthImport.monthEnd },
          ownerId: input.userId,
          source: "STARPLAN",
        },
      });
    } else if (input.courseTitle) {
      await transaction.lesson.updateMany({
        data: { source: "STARPLAN_ARCHIVE" },
        where: {
          date: { gte: monthImport.monthStart, lt: monthImport.monthEnd },
          ownerId: input.userId,
          source: "STARPLAN",
          title: input.courseTitle,
        },
      });
    }

    for (const lesson of parsedLessons) {
      const day = await getOrCreateScheduleDay(lesson.day, transaction as typeof prisma);
      const sourceKey = [
        "starplan",
        input.userId,
        monthImport.cacheKey,
        lesson.date,
        lesson.startTime,
        lesson.endTime,
        lesson.title,
        lesson.room ?? "",
      ].join(":");
      const exactLesson = existingLessons.find((existingLesson) => (
        existingLesson.sourceKey === sourceKey
        || (
          existingLesson.date
          && toDateInput(existingLesson.date) === lesson.date
          && existingLesson.startTime === lesson.startTime
          && existingLesson.endTime === lesson.endTime
          && existingLesson.title === lesson.title
          && (existingLesson.room ?? "") === (lesson.room ?? "")
          && (existingLesson.lecturer ?? "") === (lesson.lecturer ?? "")
        )
      ));
      const lessonPayload = {
        date: new Date(`${lesson.date}T12:00:00`),
        endTime: lesson.endTime,
        importedAt,
        lecturer: lesson.lecturer,
        ownerId: input.userId,
        room: lesson.room,
        scheduleDayId: day.id,
        source: "STARPLAN" as const,
        sourceKey,
        startTime: lesson.startTime,
        title: lesson.title,
      };

      if (exactLesson) {
        await transaction.lesson.update({
          data: lessonPayload,
          where: { id: exactLesson.id },
        });
        handledLessonIds.add(exactLesson.id);
        continue;
      }

      const conflictingLessons = existingLessons.filter((existingLesson) => {
        if (handledLessonIds.has(existingLesson.id) || !existingLesson.date) {
          return false;
        }

        return toDateInput(existingLesson.date) === lesson.date && lessonsOverlap(existingLesson, lesson);
      });

      for (const conflictingLesson of conflictingLessons) {
        await transaction.lesson.update({
          data: { source: "STARPLAN_ARCHIVE" },
          where: { id: conflictingLesson.id },
        });
        handledLessonIds.add(conflictingLesson.id);
      }

      const createdLesson = await transaction.lesson.create({
        data: {
          ...lessonPayload,
        },
      });
      handledLessonIds.add(createdLesson.id);
    }
  });

  return {
    lessons: parsedLessons,
    monthEnd: monthImport.monthEnd,
    monthStart: monthImport.monthStart,
  };
}
