import * as SecureStore from 'expo-secure-store';

import type { AuthSession } from '@/contexts/auth-context';

const authSessionKey = 'studentgo-auth-session';

export async function getStoredAuthSession(): Promise<AuthSession | null> {
  const value = await SecureStore.getItemAsync(authSessionKey);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as AuthSession;
  } catch {
    return null;
  }
}

export async function saveAuthSession(session: AuthSession) {
  await SecureStore.setItemAsync(authSessionKey, JSON.stringify(session));
}

export async function removeAuthSession() {
  await SecureStore.deleteItemAsync(authSessionKey);
}
