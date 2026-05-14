import { apiFetch, apiJson } from '@/src/shared/api/client';
import type { Invitation } from './types';

export function fetchInvitationRequests(token: string) {
  return apiJson<Invitation[]>('/api/schedule/invitations', { token });
}

export function respondToInvitationRequest(token: string, id: number, decision: 'accept' | 'reject') {
  return apiFetch(`/api/schedule/invitations/${id}/${decision}`, {
    method: 'POST',
    token,
  });
}
