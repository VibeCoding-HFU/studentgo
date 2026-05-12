import { timeToMinutes } from "../../shared/date-utils";

export type LessonModuleKeyInput = {
  endTime: string;
  lecturer: string | null;
  room: string | null;
  scheduleDayId: number;
  source: string;
  startTime: string;
  title: string;
};

export function lessonModuleKey(lesson: LessonModuleKeyInput) {
  const source = lesson.source === "STARPLAN_ARCHIVE" ? "STARPLAN" : lesson.source;

  return [
    source,
    lesson.scheduleDayId,
    lesson.startTime,
    lesson.endTime,
    lesson.title.trim().toLowerCase(),
    lesson.room?.trim().toLowerCase() ?? "",
    lesson.lecturer?.trim().toLowerCase() ?? "",
  ].join("|");
}

export function lessonsOverlap(first: { endTime: string; startTime: string }, second: { endTime: string; startTime: string }) {
  return timeToMinutes(first.startTime) < timeToMinutes(second.endTime)
    && timeToMinutes(second.startTime) < timeToMinutes(first.endTime);
}
