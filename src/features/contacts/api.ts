import { apiFetch, apiJson } from '@/src/shared/api/client';
import type { Contact } from './types';

export async function fetchContacts(token?: string | null) {
  return apiJson<Contact[]>('/api/contacts', { token });
}

export async function createContact(token: string, body: Record<string, unknown>) {
  return apiFetch('/api/contacts', {
    body,
    method: 'POST',
    token,
  });
}
