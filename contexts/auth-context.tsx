import { getBackendUrl } from '@/constants/api';
import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';

export type Role = 'USER' | 'MANAGER' | 'ADMIN';

type AuthUser = {
  email: string;
  id: number;
  name: string;
  role: Role;
};

type AuthSession = {
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
  register: (name: string, email: string, password: string, role: Role) => Promise<void>;
  session: AuthSession | null;
  token: string | null;
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
  const backendUrl = useMemo(() => getBackendUrl(), []);

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
  }

  async function login(email: string, password: string, loginAs: Role) {
    await authenticate('/api/auth/login', { email, loginAs, password });
  }

  async function register(name: string, email: string, password: string, role: Role) {
    const response = await fetch(`${backendUrl}/api/auth/register`, {
      body: JSON.stringify({ email, name, password, role }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(await readError(response));
    }
  }

  async function confirmRegistration(token: string) {
    await authenticate('/api/auth/confirm', { token });
  }

  async function logout() {
    const token = session?.token;
    setSession(null);

    if (!token) {
      return;
    }

    await fetch(`${backendUrl}/api/auth/logout`, {
      headers: { Authorization: `Bearer ${token}` },
      method: 'POST',
    }).catch(() => undefined);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      activeRole: session?.activeRole ?? null,
      confirmRegistration,
      isAdminMode: session?.activeRole === 'ADMIN',
      isManagerMode: session?.activeRole === 'ADMIN' || session?.activeRole === 'MANAGER',
      isAuthenticated: Boolean(session),
      login,
      logout,
      register,
      session,
      token: session?.token ?? null,
      user: session?.user ?? null,
    }),
    [session],
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
