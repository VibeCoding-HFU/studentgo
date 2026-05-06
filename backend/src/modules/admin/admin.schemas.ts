import { normalizeEmail, normalizeRole } from "../auth/auth.service";
import { normalizeAction, normalizeEntity } from "../../shared/domain-data";
import { badRequest } from "../../shared/http/http-error";
import { normalizePublicKeyJson } from "../../shared/public-key";
import { numericId, objectPayload, optionalNullableString, optionalString, requiredPassword, requiredString } from "../../shared/validation";

export function parseCreateAdminUserBody(body: Record<string, unknown>) {
  const publicKeyJson = normalizePublicKeyJson(body.publicKeyJson);

  if (body.publicKeyJson && !publicKeyJson) {
    throw badRequest("A valid public key is required.");
  }

  return {
    email: normalizeEmail(requiredString(body.email, "Email")),
    name: requiredString(body.name, "Name"),
    password: requiredPassword(body.password),
    publicKeyJson,
    role: normalizeRole(body.role),
  };
}

export function parseUpdateAdminUserBody(body: Record<string, unknown>) {
  const password = typeof body.password === "string" && body.password.length > 0 ? requiredPassword(body.password) : undefined;

  return {
    email: optionalString(body.email) ? normalizeEmail(body.email) : undefined,
    name: optionalString(body.name),
    password,
    role: typeof body.role === "string" ? normalizeRole(body.role) : undefined,
  };
}

export function parseChangeRequestBody(body: Record<string, unknown>) {
  const action = normalizeAction(body.action);
  const entity = normalizeEntity(body.entity);
  const targetId = body.targetId === null || body.targetId === undefined ? null : Number(body.targetId);

  if (!action || !entity || (action !== "CREATE" && !targetId)) {
    throw badRequest("Action, entity and target are required.");
  }

  return {
    action,
    entity,
    payload: objectPayload(body.payload),
    targetId,
  };
}

export function parseReviewParams(params: Record<string, unknown>) {
  return numericId(params.id, "change request id");
}

export function parseUserIdParam(params: Record<string, unknown>) {
  return numericId(params.id, "user id");
}

export function parseRejectBody(body: Record<string, unknown>) {
  return {
    note: optionalNullableString(body.note),
  };
}
