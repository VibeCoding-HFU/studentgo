export const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

export const dayOptions = dayNames.map((day) => ({ id: day, name: day }));

export const timeOptions = Array.from({ length: 57 }, (_value, index) => {
  const minutes = 6 * 60 + index * 15;
  const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  return { id: time, name: time };
});

export function startOfWeek(date = new Date()) {
  const result = new Date(date);
  const day = result.getDay() || 7;
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - day + 1);
  return result;
}

export function startOfMonth(date = new Date()) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(1);
  return result;
}

export function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function toInputDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function formatDisplayDate(date: Date) {
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

export function dayFromDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return dayNames[(date.getDay() + 6) % 7];
}
