import { adminRepository } from "../admin.repository";
import { badRequest } from "../../../shared/http/http-error";
import { emitDomainEvent } from "../../../shared/events/domain-events";

export async function rejectChangeRequest(input: { requestId: number; reviewedById: number; reviewNote: string | null }) {
  const existingRequest = await adminRepository.findChangeRequest(input.requestId);

  if (!existingRequest || existingRequest.status !== "PENDING") {
    throw badRequest("Change request is not pending.");
  }

  const changeRequest = await adminRepository.rejectChangeRequest(input.requestId, {
    reviewedById: input.reviewedById,
    reviewNote: input.reviewNote,
  });

  await emitDomainEvent({
    type: "change-request.rejected",
    payload: { requestId: changeRequest.id, reviewedById: input.reviewedById },
  });

  return changeRequest;
}
