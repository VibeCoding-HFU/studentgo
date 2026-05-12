import { adminRepository } from "../admin.repository";
import { emitDomainEvent } from "../../../shared/events/domain-events";

export async function createChangeRequest(input: {
  action: "CREATE" | "UPDATE" | "DELETE";
  entity: "CONTACT" | "DEADLINE" | "MEAL" | "LESSON" | "STUDY_INFO";
  payload: Record<string, unknown>;
  requestedById: number;
  targetId: number | null;
}) {
  const changeRequest = await adminRepository.createChangeRequest({
    action: input.action,
    entity: input.entity,
    payloadJson: JSON.stringify(input.payload),
    requestedById: input.requestedById,
    targetId: input.targetId,
  });

  await emitDomainEvent({
    type: "change-request.created",
    payload: { requestId: changeRequest.id, requestedById: input.requestedById },
  });

  return changeRequest;
}
