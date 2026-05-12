export type Role = 'USER' | 'MANAGER' | 'ADMIN';

export const roles: Role[] = ['USER', 'MANAGER', 'ADMIN'];

export function roleLabel(role: Role | null) {
  if (role === 'ADMIN') {
    return 'Admin';
  }

  if (role === 'MANAGER') {
    return 'Verwalter';
  }

  return 'User';
}
