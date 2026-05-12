export const DAY_NAMES = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

export function startOfWeek(date = new Date()) {
  const start = new Date(date);
  const day = start.getDay() || 7;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - day + 1);
  return start;
}

export function startOfMonth(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(1);
  return start;
}

export function toDateInput(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function parseDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function parseWeekStart(value: unknown) {
  const input = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) ? parseDateInput(value.trim()) : new Date();
  return startOfWeek(Number.isNaN(input.getTime()) ? new Date() : input);
}

export function parseMonthStart(value: unknown) {
  const input = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) ? parseDateInput(value.trim()) : new Date();
  return startOfMonth(Number.isNaN(input.getTime()) ? new Date() : input);
}

export function endOfWeek(date = new Date()) {
  const end = startOfWeek(date);
  end.setDate(end.getDate() + 7);
  return end;
}

export function endOfMonth(date = new Date()) {
  const end = startOfMonth(date);
  end.setMonth(end.getMonth() + 1);
  return end;
}

export function weeksForMonth(monthStart: Date) {
  const monthEnd = endOfMonth(monthStart);
  const weeks: Date[] = [];
  let weekStart = startOfWeek(monthStart);

  while (weekStart < monthEnd) {
    weeks.push(new Date(weekStart));
    weekStart = new Date(weekStart);
    weekStart.setDate(weekStart.getDate() + 7);
  }

  return weeks;
}

export function dateForDay(day: string, datePart: string) {
  const [dayOfMonth, month] = datePart.split(".").map(Number);
  const now = new Date();
  let year = now.getFullYear();
  const parsed = new Date(year, month - 1, dayOfMonth);

  if (parsed < new Date(now.getFullYear(), 0, 1) && now.getMonth() === 11) {
    year += 1;
  }

  const result = new Date(year, month - 1, dayOfMonth);
  result.setHours(12, 0, 0, 0);

  if (DAY_NAMES[result.getDay()] !== day) {
    const currentWeek = startOfWeek();
    for (let index = 0; index < 7; index += 1) {
      const candidate = new Date(currentWeek);
      candidate.setDate(currentWeek.getDate() + index);
      if (DAY_NAMES[candidate.getDay()] === day && candidate.getDate() === dayOfMonth && candidate.getMonth() === month - 1) {
        candidate.setHours(12, 0, 0, 0);
        return candidate;
      }
    }
  }

  return result;
}
