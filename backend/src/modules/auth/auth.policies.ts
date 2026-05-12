import { AuthSession } from "./auth.service";

export function canDeleteUser(session: AuthSession, targetUserId: number) {
  return Boolean(session && session.userId !== targetUserId);
}

export function canReviewChangeRequest(session: AuthSession) {
  return session?.activeRole === "ADMIN";
}

export function canManageChangeRequests(session: AuthSession) {
  return session?.activeRole === "ADMIN" || session?.activeRole === "MANAGER";
}
