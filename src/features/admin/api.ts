import { apiFetch, apiJson } from '@/src/shared/api/client';
import type { Role } from '@/src/shared/types/auth';

export type Summary = {
  contacts: number;
  deadlines: number;
  meals: number;
  modules: number;
  pendingRequests: number;
  sessions: number;
  users: number;
};

export type AdminUser = {
  createdAt: string;
  email: string;
  id: number;
  name: string;
  role: Role;
};

export type ChangeRequest = {
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  createdAt: string;
  entity: 'CONTACT' | 'DEADLINE' | 'MEAL' | 'LESSON' | 'STUDY_INFO';
  id: number;
  payload: Record<string, unknown>;
  requestedBy: {
    email: string;
    name: string;
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
};

type AuthParams = {
  token: string;
};

export async function fetchAdminBundle({ token }: AuthParams) {
  const [summary, users, requests] = await Promise.all([
    apiJson<Summary>('/api/admin/summary', { token }),
    apiJson<AdminUser[]>('/api/admin/users', { token }),
    apiJson<ChangeRequest[]>('/api/admin/change-requests', { token }),
  ]);

  return { requests, summary, users };
}

export async function saveAdminUser({ token }: AuthParams, body: Record<string, unknown>, selectedUserId: number | null) {
  return apiFetch(selectedUserId ? `/api/admin/users/${selectedUserId}` : '/api/admin/users', {
    body,
    method: selectedUserId ? 'PATCH' : 'POST',
    token,
  });
}

export async function deleteAdminUserRequest({ token }: AuthParams, id: number) {
  return apiFetch(`/api/admin/users/${id}`, {
    method: 'DELETE',
    token,
  });
}

export async function reviewChangeRequest({ token }: AuthParams, id: number, decision: 'approve' | 'reject') {
  return apiFetch(`/api/admin/change-requests/${id}/${decision}`, {
    body: decision === 'reject' ? { note: 'Vom Admin abgelehnt.' } : undefined,
    method: 'POST',
    token,
  });
}
