import { DAY_NAMES, endOfWeek, parseDateInput } from "../../shared/date-utils";
import { stripHtml } from "../swfr/swfr.parser";

export function parseStarPlanTimetable(html: string, weekStart: Date) {
  const dayCells = [...html.matchAll(/ttweekdaycell[^>]*left:(-?\d+)px[\s\S]*?data-date="(\d{4}-\d{2}-\d{2})"/gi)].map((match) => ({
    date: match[2],
    left: Number(match[1]),
  }));
  const events = [...html.matchAll(/<div style="position:absolute;([^"]+)" class="ttevent[^"]*"[\s\S]*?<div class="tooltip">([\s\S]*?)<\/div>([\s\S]*?)<div class="ttIconContainer">/gi)];

  return events
    .map((match) => {
      const style = match[1];
      const left = Number(style.match(/left:(-?\d+)px/)?.[1] ?? 0);
      const dateCell = dayCells.reduce((closest, current) => (Math.abs(current.left - left) < Math.abs(closest.left - left) ? current : closest), dayCells[0]);
      const lines = match[2].split(/<br\s*\/?>/i).map((line) => stripHtml(line)).filter(Boolean);
      const time = lines.find((line) => /^\d{2}:\d{2}-\d{2}:\d{2}$/.test(line));

      if (!dateCell || !time) {
        return null;
      }

      const [startTime, endTime] = time.split("-");
      const date = parseDateInput(dateCell.date);
      const day = DAY_NAMES[date.getDay()];

      if (date < weekStart || date >= endOfWeek(weekStart)) {
        return null;
      }

      return {
        date: dateCell.date,
        day,
        endTime,
        lecturer: lines[1] ?? null,
        room: lines[3] ?? null,
        startTime,
        title: lines[0] ?? "Termin",
      };
    })
    .filter((event): event is NonNullable<typeof event> => Boolean(event));
}
