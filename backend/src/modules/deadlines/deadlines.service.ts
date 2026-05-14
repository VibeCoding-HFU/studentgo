import { deadlineData } from "../../shared/domain-data";
import { badRequest } from "../../shared/http/http-error";
import { deadlineRepository } from "./deadlines.repository";

function validateDeadlinePayload(payload: Record<string, unknown>) {
  const deadline = deadlineData(payload);

  if (!deadline.title) {
    throw badRequest("Deadline title is required.");
  }

  if (Number.isNaN(deadline.date.getTime())) {
    throw badRequest("Deadline date is required.");
  }

  return deadline;
}

export function listDeadlines() {
  return deadlineRepository.listAll();
}

export function createDeadline(payload: Record<string, unknown>) {
  return deadlineRepository.create(validateDeadlinePayload(payload));
}
