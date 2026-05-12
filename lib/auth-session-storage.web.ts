import type { AuthSession } from '@/contexts/auth-context';

const authSessionKey = 'studentgo-auth-session';

function storage() {
  return globalThis.sessionStorage;
}

export async function getStoredAuthSession(): Promise<AuthSession | null> {
  try {
    const value = storage()?.getItem(authSessionKey) ?? globalThis.localStorage?.getItem(authSessionKey);

    if (value && !storage()?.getItem(authSessionKey)) {
      storage()?.setItem(authSessionKey, value);
      globalThis.localStorage?.removeItem(authSessionKey);
    }

    return value ? JSON.parse(value) as AuthSession : null;
  } catch {
    return null;
  }
}

export async function saveAuthSession(session: AuthSession) {
  storage()?.setItem(authSessionKey, JSON.stringify(session));
  globalThis.localStorage?.removeItem(authSessionKey);
}

export async function removeAuthSession() {
  storage()?.removeItem(authSessionKey);
  globalThis.localStorage?.removeItem(authSessionKey);
}
