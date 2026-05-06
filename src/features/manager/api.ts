import { apiFetch, apiJson } from '@/src/shared/api/client';
import type { ChangeRequest, Contact, Meal, ScheduleDay, StudyInfo } from './types';

export async function fetchManagerBundle(token: string) {
  const [contacts, meals, scheduleBody, infoBody, requests] = await Promise.all([
    apiJson<Contact[]>('/api/contacts'),
    apiJson<Meal[]>('/api/meals'),
    apiJson<{ days: ScheduleDay[] }>('/api/schedule'),
    apiJson<{ spo: StudyInfo[] }>('/api/study-info'),
    apiJson<ChangeRequest[]>('/api/manager/change-requests', { token }),
  ]);

  return {
    contacts,
    infos: infoBody.spo,
    lessons: scheduleBody.days.flatMap((day) => day.lessons.map((lesson) => ({ ...lesson, day: day.day }))),
    meals,
    requests,
  };
}

export async function createManagerChangeRequest(token: string, body: Record<string, unknown>) {
  return apiFetch('/api/manager/change-requests', {
    body,
    method: 'POST',
    token,
  });
}
