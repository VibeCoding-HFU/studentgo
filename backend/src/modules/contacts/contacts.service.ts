import { contactData } from "../../shared/domain-data";
import { badRequest } from "../../shared/http/http-error";
import { contactRepository } from "./contacts.repository";

function validateContactPayload(payload: Record<string, unknown>) {
  const contact = contactData(payload);

  if (!contact.name) {
    throw badRequest("Contact name is required.");
  }

  if (!contact.role) {
    throw badRequest("Contact role is required.");
  }

  if (!contact.email) {
    throw badRequest("Contact email is required.");
  }

  return contact;
}

export function listContacts(userId: number | null) {
  return contactRepository.listVisible(userId);
}

export function createContact(userId: number, payload: Record<string, unknown>) {
  return contactRepository.createForOwner(userId, validateContactPayload(payload));
}
