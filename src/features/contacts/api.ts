import { apiFetch, apiJson } from '@/src/shared/api/client';
import type { Contact, HfuContactFilter, HfuContactsResult } from './types';

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

export async function fetchHfuContacts(filter?: HfuContactFilter | null) {
  const params = new URLSearchParams();

  if (filter) {
    params.set('filter', filter.solrFilter);
    params.set('label', filter.label);
    params.set('category', filter.category);
  }

  const query = params.toString() ? `?${params.toString()}` : '';
  return apiJson<HfuContactsResult>(`/api/hfu-contacts${query}`);
}
