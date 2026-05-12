import { getBackendUrl } from '@/constants/api';

type ApiRequestOptions = Omit<RequestInit, 'body' | 'headers'> & {
  body?: unknown;
  headers?: HeadersInit;
  token?: string | null;
};

export async function readApiError(response: Response) {
  try {
    const body = await response.json();
    return typeof body.error === 'string' ? body.error : 'Die Anfrage ist fehlgeschlagen.';
  } catch {
    return 'Die Anfrage ist fehlgeschlagen.';
  }
}

export function authJsonHeaders(token?: string | null) {
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'Content-Type': 'application/json',
  };
}

export async function apiFetch(path: string, options: ApiRequestOptions = {}) {
  const { body, headers, token, ...requestOptions } = options;

  return fetch(`${getBackendUrl()}${path}`, {
    ...requestOptions,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
}

export async function apiJson<T>(path: string, options: ApiRequestOptions = {}) {
  const response = await apiFetch(path, options);

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return (await response.json()) as T;
}
