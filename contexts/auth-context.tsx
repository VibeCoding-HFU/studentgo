import { getBackendUrl } from '@/constants/api';
import { generateAccountKeyPair, savePrivateKey } from '@/lib/client-crypto';
import { addPublicKeyToValue } from '@/lib/client-crypto.shared';
import { getStoredAuthSession, removeAuthSession, saveAuthSession } from '@/lib/auth-session-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

export type Role = 'USER' | 'MANAGER' | 'ADMIN';

type AuthUser = {
  email: string;
  id: number;
  name: string;
  publicKeyJson?: string | null;
  role: Role;
};

export type AuthSession = {
  activeRole: Role;
  token: string;
  user: AuthUser;
};

type AuthContextValue = {
  activeRole: Role | null;
  confirmRegistration: (token: string) => Promise<void>;
  isAdminMode: boolean;
  isManagerMode: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, loginAs: Role) => Promise<void>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string, role: Role) => Promise<{ privateKeyJson: string; privateKeySaved: boolean }>;
  session: AuthSession | null;
  token: string | null;
  updatePublicKey: (publicKeyJson: string) => void;
  user: AuthUser | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function readError(response: Response) {
  try {
    const body = await response.json();
    return typeof body.error === 'string' ? body.error : 'Die Anfrage ist fehlgeschlagen.';
  } catch {
    return 'Die Anfrage ist fehlgeschlagen.';
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isSessionLoaded, setIsSessionLoaded] = useState(false);
  const backendUrl = useMemo(() => getBackendUrl(), []);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const storedSession = await getStoredAuthSession();

      if (!cancelled) {
        setSession(storedSession);
        setIsSessionLoaded(true);
      }
    }

    loadSession();
    return () => {
      cancelled = true;
    };
  }, []);

  async function authenticate(path: string, body: Record<string, unknown>) {
    const response = await fetch(`${backendUrl}${path}`, {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(await readError(response));
    }

    const nextSession = (await response.json()) as AuthSession;
    setSession(nextSession);
    await saveAuthSession(nextSession);
  }

  async function login(email: string, password: string, loginAs: Role) {
    await authenticate('/api/auth/login', { email, loginAs, password });
  }

  async function register(name: string, email: string, password: string, role: Role) {
    const keyPair = await generateAccountKeyPair();
    const response = await fetch(`${backendUrl}/api/auth/register`, {
      body: JSON.stringify({ email, name, password, publicKeyJson: keyPair.publicKeyJson, role }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(await readError(response));
    }

    try {
      await savePrivateKey(email, keyPair.privateKeyJson);
      return { privateKeyJson: keyPair.privateKeyJson, privateKeySaved: true };
    } catch {
      return { privateKeyJson: keyPair.privateKeyJson, privateKeySaved: false };
    }
  }

  async function confirmRegistration(token: string) {
    await authenticate('/api/auth/confirm', { token });
  }

  async function logout() {
    const token = session?.token;
    setSession(null);
    await removeAuthSession();

    if (!token) {
      return;
    }

    await fetch(`${backendUrl}/api/auth/logout`, {
      headers: { Authorization: `Bearer ${token}` },
      method: 'POST',
    }).catch(() => undefined);
  }

  function updatePublicKey(publicKeyJson: string) {
    setSession((current) => {
      if (!current) {
        return current;
      }

      const nextSession = {
        ...current,
        user: {
          ...current.user,
          publicKeyJson: addPublicKeyToValue(current.user.publicKeyJson, publicKeyJson),
        },
      };
      saveAuthSession(nextSession).catch(() => undefined);
      return nextSession;
    });
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      activeRole: session?.activeRole ?? null,
      confirmRegistration,
      isAdminMode: session?.activeRole === 'ADMIN',
      isManagerMode: session?.activeRole === 'ADMIN' || session?.activeRole === 'MANAGER',
      isAuthenticated: Boolean(session) || !isSessionLoaded,
      login,
      logout,
      register,
      session,
      token: session?.token ?? null,
      updatePublicKey,
      user: session?.user ?? null,
    }),
    [isSessionLoaded, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return value;
}
