import type { AuthSession } from '@/contexts/auth-context';

const authSessionKey = 'studentgo-auth-session';

export async function getStoredAuthSession(): Promise<AuthSession | null> {
  try {
    const value = globalThis.localStorage?.getItem(authSessionKey);
    return value ? JSON.parse(value) as AuthSession : null;
  } catch {
    return null;
  }
}

export async function saveAuthSession(session: AuthSession) {
  globalThis.localStorage?.setItem(authSessionKey, JSON.stringify(session));
}

export async function removeAuthSession() {
  globalThis.localStorage?.removeItem(authSessionKey);
}
