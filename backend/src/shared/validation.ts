import { badRequest } from "./http/http-error";

export function requiredString(value: unknown, field: string) {
  const result = typeof value === "string" ? value.trim() : "";

  if (!result) {
    throw badRequest(`${field} is required.`);
  }

  return result;
}

export function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function optionalNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function numericId(value: unknown, field = "id") {
  const id = Number(value);

  if (Number.isNaN(id)) {
    throw badRequest(`Invalid ${field}.`);
  }

  return id;
}

export function requiredPassword(value: unknown, field = "password") {
  const password = typeof value === "string" ? value : "";

  if (password.length < 8) {
    throw badRequest(`${field} must have at least 8 characters.`);
  }

  return password;
}

export function objectPayload(value: unknown) {
  return typeof value === "object" && value ? value as Record<string, unknown> : {};
}
