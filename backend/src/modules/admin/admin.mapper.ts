import { parsePayload } from "../../shared/domain-data";

export function changeRequestResponse<T extends { payloadJson: string }>(changeRequest: T) {
  return {
    ...changeRequest,
    payload: parsePayload(changeRequest.payloadJson),
  };
}

export function changeRequestsResponse<T extends { payloadJson: string }>(changeRequests: T[]) {
  return changeRequests.map(changeRequestResponse);
}

export function pendingAccountResponse(pendingAccount: { email: string; expiresAt: Date }) {
  return {
    email: pendingAccount.email,
    expiresAt: pendingAccount.expiresAt,
    requiresConfirmation: true,
  };
}
