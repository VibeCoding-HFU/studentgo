import { apiFetch, apiJson } from '@/src/shared/api/client';
import type { AccountStats, CourseOption, ImportOptions, Invitation, LessonForm, Meal, ScheduleDay, UserOption } from './types';

type AuthParams = {
  token?: string | null;
};

type AuthenticatedParams = {
  token: string;
};

function queryString(params?: Record<string, number | string | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  });

  const result = query.toString();
  return result ? `?${result}` : '';
}

export function fetchImportOptions(params?: { facultyId?: number | string; semesterId?: number | string }) {
  return apiJson<ImportOptions>(`/api/schedule/import-options${queryString(params)}`).catch(() => null);
}

export function fetchScheduleDays({ token }: AuthParams, weekStart: string) {
  return apiJson<{ days: ScheduleDay[] }>(`/api/schedule?weekStart=${encodeURIComponent(weekStart)}`, { token }).catch(() => null);
}

export function fetchInvitations({ token }: AuthParams) {
  if (!token) {
    return Promise.resolve([]);
  }

  return apiJson<Invitation[]>('/api/schedule/invitations', { token });
}

export function fetchMeals(weekStart: string) {
  return apiJson<Meal[]>(`/api/meals?weekStart=${encodeURIComponent(weekStart)}`).catch(() => null);
}

export function fetchAccountStats({ token }: AuthParams) {
  if (!token) {
    return Promise.resolve(null);
  }

  return apiJson<AccountStats>('/api/account/statistics', { token }).catch(() => null);
}

export function searchUsers({ token }: AuthParams, query: string) {
  const trimmedQuery = query.trim();

  if (!token || trimmedQuery.length < 2) {
    return Promise.resolve([]);
  }

  return apiJson<UserOption[]>(`/api/users/search?q=${encodeURIComponent(trimmedQuery)}`, { token }).catch(() => []);
}

export function fetchImportCourses({ token }: AuthenticatedParams, payload: Record<string, unknown>) {
  return apiJson<{ courses: CourseOption[] }>('/api/schedule/import-courses', {
    body: payload,
    method: 'POST',
    token,
  });
}

export function importScheduleRequest({ token }: AuthenticatedParams, payload: Record<string, unknown>) {
  return apiJson<{ count: number; monthStart?: string }>('/api/schedule/import', {
    body: payload,
    method: 'POST',
    token,
  });
}

export function importCourseRequest({ token }: AuthenticatedParams, payload: Record<string, unknown>) {
  return apiJson<{ count: number; monthStart?: string }>('/api/schedule/import-course', {
    body: payload,
    method: 'POST',
    token,
  });
}

export function removeImportedCourseRequest({ token }: AuthenticatedParams, payload: Record<string, unknown>) {
  return apiJson<{ count: number; monthStart?: string }>('/api/schedule/import-course', {
    body: payload,
    method: 'DELETE',
    token,
  });
}

export function createLesson({ token }: AuthenticatedParams, body: Record<string, unknown>) {
  return apiFetch('/api/schedule/lessons', {
    body,
    method: 'POST',
    token,
  });
}

export function updateLesson({ token }: AuthenticatedParams, lessonId: number, body: LessonForm & Record<string, unknown>) {
  return apiFetch(`/api/schedule/lessons/${lessonId}`, {
    body,
    method: 'PATCH',
    token,
  });
}

export function deleteLesson({ token }: AuthenticatedParams, lessonId: number) {
  return apiFetch(`/api/schedule/lessons/${lessonId}`, {
    method: 'DELETE',
    token,
  });
}

export function setLessonVisited({ token }: AuthenticatedParams, lessonId: number, date: string) {
  return apiFetch(`/api/schedule/lessons/${lessonId}/visit`, {
    body: { date },
    method: 'POST',
    token,
  });
}

export function setModulePreference({ token }: AuthenticatedParams, moduleKey: string, isActive: boolean) {
  return apiFetch('/api/schedule/module-preferences', {
    body: { isActive, moduleKey },
    method: 'PATCH',
    token,
  });
}

export function respondToInvitationRequest({ token }: AuthenticatedParams, id: number, decision: 'accept' | 'reject') {
  return apiFetch(`/api/schedule/invitations/${id}/${decision}`, {
    method: 'POST',
    token,
  });
}
