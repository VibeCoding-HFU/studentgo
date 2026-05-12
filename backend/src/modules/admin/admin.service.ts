import {
  AuthSession,
  createPendingAccount,
  ensureAccountCanBeRequested,
  hashPassword,
} from "../auth/auth.service";
import { canDeleteUser } from "../auth/auth.policies";
import { adminRepository } from "./admin.repository";
import { conflict, forbidden } from "../../shared/http/http-error";
import { emitDomainEvent } from "../../shared/events/domain-events";

export async function getAdminSummary() {
  const [users, sessions, contacts, meals, deadlines, modules, pendingRequests] = await adminRepository.countSummary();
  return { contacts, deadlines, meals, modules, pendingRequests, sessions, users };
}

export function listAdminUsers() {
  return adminRepository.listUsers();
}

export async function inviteAdminUser(input: {
  email: string;
  name: string;
  password: string;
  publicKeyJson: string | null;
  requestedById?: number | null;
  role: "USER" | "MANAGER" | "ADMIN";
}) {
  const accountError = await ensureAccountCanBeRequested(input.email, input.role, true);

  if (accountError) {
    throw conflict(accountError);
  }

  const pendingAccount = await createPendingAccount(input);

  await emitDomainEvent({
    type: "admin.user.invited",
    payload: {
      email: pendingAccount.email,
      requestedById: input.requestedById,
      role: input.role,
    },
  });

  return pendingAccount;
}

export async function updateAdminUser(id: number, input: {
  email?: string;
  name?: string;
  password?: string;
  role?: "USER" | "MANAGER" | "ADMIN";
}) {
  const data: Parameters<typeof adminRepository.updateUser>[1] = {};

  if (input.name) {
    data.name = input.name;
  }

  if (input.email) {
    data.email = input.email;
  }

  if (input.role) {
    data.role = input.role;
  }

  if (input.password) {
    const passwordData = await hashPassword(input.password);
    data.passwordHash = passwordData.hash;
    data.passwordSalt = passwordData.salt;
  }

  const user = await adminRepository.updateUser(id, data);

  if (data.role || data.passwordHash) {
    await adminRepository.deleteUserSessions(id);
  }

  await emitDomainEvent({ type: "admin.user.updated", payload: { userId: id } });
  return user;
}

export async function deleteAdminUser(session: AuthSession, id: number) {
  if (!canDeleteUser(session, id)) {
    throw forbidden("You cannot delete your own account while signed in.");
  }

  await adminRepository.deleteUser(id);
  await emitDomainEvent({ type: "admin.user.deleted", payload: { userId: id } });
}
