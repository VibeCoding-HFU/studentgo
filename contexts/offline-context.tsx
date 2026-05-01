import { getOfflineValue, setOfflineValue } from '@/lib/offline-storage';
import { PropsWithChildren } from 'react';
import { Alert } from 'react-native';

const offlineCachePrefix = 'fetch:';
const offlineNotice = 'Gerade besteht keine Verbindung zum Server. Bereits geladene Daten bleiben sichtbar; diese Aktion kann erst wieder online ausgefuehrt werden.';
const noticeThrottleMs = 10000;
let lastNoticeAt = 0;
let originalFetch: typeof fetch | null = null;

type CachedResponse = {
  body: string;
  headers: [string, string][];
  status: number;
  url: string;
};

function requestMethod(input: RequestInfo | URL, init?: RequestInit) {
  if (init?.method) {
    return init.method.toUpperCase();
  }

  return input instanceof Request ? input.method.toUpperCase() : 'GET';
}

function requestUrl(input: RequestInfo | URL) {
  return input instanceof Request ? input.url : String(input);
}

function authHeader(input: RequestInfo | URL, init?: RequestInit) {
  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
  return headers.get('authorization') ?? '';
}

function hasHeader(input: RequestInfo | URL, init: RequestInit | undefined, name: string) {
  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
  return headers.has(name);
}

function cacheKey(input: RequestInfo | URL, init?: RequestInit) {
  return `${offlineCachePrefix}${requestUrl(input)}:${authHeader(input, init)}`;
}

function isCacheableGet(input: RequestInfo | URL, init?: RequestInit) {
  return requestMethod(input, init) === 'GET' && !requestUrl(input).endsWith('/health');
}

function isHealthCheck(input: RequestInfo | URL) {
  return requestUrl(input).endsWith('/health');
}

function showOfflineNotice() {
  const now = Date.now();

  if (now - lastNoticeAt < noticeThrottleMs) {
    return;
  }

  lastNoticeAt = now;
  Alert.alert('Offline-Modus', offlineNotice);
}

async function cachedResponseFor(key: string) {
  const cached = await getOfflineValue(key);

  if (!cached) {
    return null;
  }

  const parsed = JSON.parse(cached) as CachedResponse;
  return new Response(parsed.body, {
    headers: [...parsed.headers, ['X-StudentGo-Offline-Cache', '1']],
    status: parsed.status,
  });
}

async function cacheResponse(key: string, response: Response) {
  const body = await response.clone().text();
  await setOfflineValue(key, JSON.stringify({
    body,
    headers: Array.from(response.headers.entries()),
    status: response.status,
    url: response.url,
  } satisfies CachedResponse));
}

export function OfflineProvider({ children }: PropsWithChildren) {
  if (!originalFetch) {
    originalFetch = globalThis.fetch;
    const fetchImplementation = originalFetch;

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = requestMethod(input, init);
      const key = cacheKey(input, init);
      const cacheableGet = isCacheableGet(input, init);

      try {
        const response = await fetchImplementation(input, init);

        if (cacheableGet && response.ok) {
          cacheResponse(key, response).catch(() => undefined);
        }

        return response;
      } catch (error) {
        if (!isHealthCheck(input) && !hasHeader(input, init, 'X-StudentGo-Sync-Replay')) {
          showOfflineNotice();
        }

        if (cacheableGet) {
          const cached = await cachedResponseFor(key).catch(() => null);

          if (cached) {
            return cached;
          }
        }

        throw error;
      }
    };
  }

  return <>{children}</>;
}
