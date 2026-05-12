import { dayNames, toInputDate } from '@/src/shared/utils/dates';
import type { Invitation, LessonForm, Meal, Option, ParsedGroup } from './types';

export function createEmptyForm(): LessonForm {
  const today = new Date();

  return {
    date: toInputDate(today),
    day: dayNames[(today.getDay() + 6) % 7],
    description: '',
    endTime: '09:45',
    isRecurring: false,
    startTime: '08:15',
    title: '',
  };
}

export function formatInvitationDate(value?: string | null) {
  if (!value) {
    return 'woechentlich';
  }

  return new Date(value).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function mealLabel(meal: Meal, index: number) {
  return meal.mainDish.match(/^Essen\s+\d+/i)?.[0] ?? `Essen ${index + 1}`;
}

export function mealTitle(meal: Meal) {
  return meal.mainDish.replace(/^Essen\s+\d+\s*:\s*/i, '').trim();
}

export function invitationStatusLabel(status: Invitation['status']) {
  if (status === 'ACCEPTED') {
    return 'Angenommen';
  }

  if (status === 'REJECTED') {
    return 'Abgelehnt';
  }

  return 'Offen';
}

export function uniqueOptions(options: Option[]) {
  const seen = new Set<string>();
  return options.filter((option) => {
    const key = String(option.id);
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function parseGroup(group: Option): ParsedGroup | null {
  const label = group.shortname ?? group.name;
  const match = label.match(/\b(\d+)\b(?:\s+(.+))?$/);

  if (!match) {
    return null;
  }

  const semester = match[1];
  const specialization = match[2]?.trim() || 'Standard';

  return {
    ...group,
    importKey: label,
    semester,
    specialization,
  };
}
