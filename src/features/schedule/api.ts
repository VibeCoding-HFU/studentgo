import type { AccountStats, CourseOption, ImportOptions, Invitation, LessonForm, Meal, ScheduleDay, UserOption } from './types';

type AuthParams = {
  backendUrl: string;
  token?: string | null;
};

type AuthenticatedParams = {
  backendUrl: string;
  token: string;
};

function authHeaders(token?: string | null) {
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

function jsonAuthHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function fetchImportOptions(backendUrl: string, params?: { facultyId?: number | string; semesterId?: number | string }) {
  const query = params?.facultyId && params.semesterId
    ? `?facultyId=${params.facultyId}&semesterId=${params.semesterId}`
    : '';
  const response = await fetch(`${backendUrl}/api/schedule/import-options${query}`);
  return response.ok ? (await response.json()) as ImportOptions : null;
}

export async function fetchScheduleDays({ backendUrl, token }: AuthParams, weekStart: string) {
  const response = await fetch(`${backendUrl}/api/schedule?weekStart=${weekStart}`, {
    headers: authHeaders(token),
  });
  return response.ok ? (await response.json()) as { days: ScheduleDay[] } : null;
}

export async function fetchInvitations({ backendUrl, token }: AuthParams) {
  if (!token) {
    return [];
  }

  const response = await fetch(`${backendUrl}/api/schedule/invitations`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('invitations');
  }

  return (await response.json()) as Invitation[];
}

export async function fetchMeals(backendUrl: string, weekStart: string) {
  const response = await fetch(`${backendUrl}/api/meals?weekStart=${weekStart}`);
  return response.ok ? (await response.json()) as Meal[] : null;
}

export async function fetchAccountStats({ backendUrl, token }: AuthParams) {
  if (!token) {
    return null;
  }

  const response = await fetch(`${backendUrl}/api/account/statistics`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.ok ? (await response.json()) as AccountStats : null;
}

export async function searchUsers({ backendUrl, token }: AuthParams, query: string) {
  if (!token || query.trim().length < 2) {
    return [];
  }

  const response = await fetch(`${backendUrl}/api/users/search?q=${encodeURIComponent(query.trim())}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.ok ? (await response.json()) as UserOption[] : [];
}

export async function fetchImportCourses({ backendUrl, token }: AuthenticatedParams, payload: Record<string, unknown>) {
  const response = await fetch(`${backendUrl}/api/schedule/import-courses`, {
    body: JSON.stringify(payload),
    headers: jsonAuthHeaders(token),
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('import-courses');
  }

  return (await response.json()) as { courses: CourseOption[] };
}

export async function importScheduleRequest({ backendUrl, token }: AuthenticatedParams, payload: Record<string, unknown>) {
  const response = await fetch(`${backendUrl}/api/schedule/import`, {
    body: JSON.stringify(payload),
    headers: jsonAuthHeaders(token),
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('import-schedule');
  }

  return (await response.json()) as { count: number; monthStart?: string };
}

export async function importCourseRequest({ backendUrl, token }: AuthenticatedParams, payload: Record<string, unknown>) {
  const response = await fetch(`${backendUrl}/api/schedule/import-course`, {
    body: JSON.stringify(payload),
    headers: jsonAuthHeaders(token),
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('import-course');
  }

  return (await response.json()) as { count: number; monthStart?: string };
}

export async function removeImportedCourseRequest({ backendUrl, token }: AuthenticatedParams, payload: Record<string, unknown>) {
  const response = await fetch(`${backendUrl}/api/schedule/import-course`, {
    body: JSON.stringify(payload),
    headers: jsonAuthHeaders(token),
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('remove-imported-course');
  }

  return (await response.json()) as { count: number; monthStart?: string };
}

export async function createLesson({ backendUrl, token }: AuthenticatedParams, body: Record<string, unknown>) {
  return fetch(`${backendUrl}/api/schedule/lessons`, {
    body: JSON.stringify(body),
    headers: jsonAuthHeaders(token),
    method: 'POST',
  });
}

export async function updateLesson({ backendUrl, token }: AuthenticatedParams, lessonId: number, body: LessonForm & Record<string, unknown>) {
  return fetch(`${backendUrl}/api/schedule/lessons/${lessonId}`, {
    body: JSON.stringify(body),
    headers: jsonAuthHeaders(token),
    method: 'PATCH',
  });
}

export async function deleteLesson({ backendUrl, token }: AuthenticatedParams, lessonId: number) {
  return fetch(`${backendUrl}/api/schedule/lessons/${lessonId}`, {
    headers: { Authorization: `Bearer ${token}` },
    method: 'DELETE',
  });
}

export async function setLessonVisited({ backendUrl, token }: AuthenticatedParams, lessonId: number, date: string) {
  return fetch(`${backendUrl}/api/schedule/lessons/${lessonId}/visit`, {
    body: JSON.stringify({ date }),
    headers: jsonAuthHeaders(token),
    method: 'POST',
  });
}

export async function setModulePreference({ backendUrl, token }: AuthenticatedParams, moduleKey: string, isActive: boolean) {
  return fetch(`${backendUrl}/api/schedule/module-preferences`, {
    body: JSON.stringify({ isActive, moduleKey }),
    headers: jsonAuthHeaders(token),
    method: 'PATCH',
  });
}

export async function respondToInvitationRequest({ backendUrl, token }: AuthenticatedParams, id: number, decision: 'accept' | 'reject') {
  return fetch(`${backendUrl}/api/schedule/invitations/${id}/${decision}`, {
    headers: { Authorization: `Bearer ${token}` },
    method: 'POST',
  });
}
