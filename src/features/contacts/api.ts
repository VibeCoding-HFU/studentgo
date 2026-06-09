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

type FetchHfuContactsOptions = {
  limit?: number;
  offset?: number;
};

export async function fetchHfuContacts(filter?: HfuContactFilter | null, options: FetchHfuContactsOptions = {}) {
  const params = new URLSearchParams();

  if (filter) {
    params.set('filter', filter.solrFilter);
    params.set('label', filter.label);
    params.set('category', filter.category);
  }

  if (options.limit) {
    params.set('limit', String(options.limit));
  }

  if (options.offset) {
    params.set('offset', String(options.offset));
  }

  const query = params.toString() ? `?${params.toString()}` : '';
  return apiJson<HfuContactsResult>(`/api/hfu-contacts${query}`);
}
