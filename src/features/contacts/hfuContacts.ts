import type { HfuContactPerson } from './types';

export function filterHfuContacts(contacts: HfuContactPerson[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return contacts;
  }

  return contacts.filter((contact) =>
    [
      contact.fullName,
      contact.title,
      contact.role,
      contact.function,
      contact.faculty,
      contact.department,
      contact.institution,
      contact.campus,
      contact.email,
      contact.phone,
      contact.room,
      ...contact.tags,
    ]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(normalizedQuery)),
  );
}
