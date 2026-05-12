export type ChangeAction = "CREATE" | "UPDATE" | "DELETE";
export type ChangeEntity = "CONTACT" | "DEADLINE" | "MEAL" | "LESSON" | "STUDY_INFO";

export function normalizeAction(action: unknown): ChangeAction | null {
  return action === "CREATE" || action === "UPDATE" || action === "DELETE" ? action : null;
}

export function normalizeEntity(entity: unknown): ChangeEntity | null {
  return entity === "CONTACT" || entity === "DEADLINE" || entity === "MEAL" || entity === "LESSON" || entity === "STUDY_INFO" ? entity : null;
}

export function parsePayload(payloadJson: string) {
  return JSON.parse(payloadJson) as Record<string, unknown>;
}

export function contactData(payload: Record<string, unknown>) {
  return {
    email: typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "",
    name: typeof payload.name === "string" ? payload.name.trim() : "",
    phone: typeof payload.phone === "string" && payload.phone.trim() ? payload.phone.trim() : null,
    role: typeof payload.role === "string" ? payload.role.trim() : "",
    room: typeof payload.room === "string" && payload.room.trim() ? payload.room.trim() : null,
  };
}

export function deadlineData(payload: Record<string, unknown>) {
  return {
    date: typeof payload.date === "string" ? new Date(payload.date) : new Date(""),
    description: typeof payload.description === "string" && payload.description.trim() ? payload.description.trim() : null,
    title: typeof payload.title === "string" ? payload.title.trim() : "",
  };
}

export function studyInfoData(payload: Record<string, unknown>) {
  return {
    category: typeof payload.category === "string" && payload.category.trim() ? payload.category.trim() : "allgemein",
    content: typeof payload.content === "string" ? payload.content.trim() : "",
    encryptedKey: typeof payload.encryptedKey === "string" && payload.encryptedKey.trim() ? payload.encryptedKey.trim() : null,
    encryptedPayload: typeof payload.encryptedPayload === "string" && payload.encryptedPayload.trim() ? payload.encryptedPayload.trim() : null,
    encryptionIv: typeof payload.encryptionIv === "string" && payload.encryptionIv.trim() ? payload.encryptionIv.trim() : null,
    sortOrder: Number(payload.sortOrder ?? 0),
    title: typeof payload.title === "string" ? payload.title.trim() : "",
  };
}

export function mealData(payload: Record<string, unknown>, canteenId: number) {
  return {
    canteenId,
    currency: typeof payload.currency === "string" && payload.currency.trim() ? payload.currency.trim() : "EUR",
    date: typeof payload.date === "string" && payload.date.trim() ? new Date(payload.date) : null,
    day: typeof payload.day === "string" ? payload.day.trim() : "",
    mainDish: typeof payload.mainDish === "string" ? payload.mainDish.trim() : "",
    priceCents: Number(payload.priceCents ?? 0),
    vegetarianDish: typeof payload.vegetarianDish === "string" && payload.vegetarianDish.trim() ? payload.vegetarianDish.trim() : null,
  };
}

export function lessonData(payload: Record<string, unknown>, scheduleDayId: number) {
  const isRecurring = payload.isRecurring === true;

  return {
    date: !isRecurring && typeof payload.date === "string" && payload.date.trim() ? new Date(payload.date) : null,
    description: typeof payload.description === "string" && payload.description.trim() ? payload.description.trim() : null,
    endTime: typeof payload.endTime === "string" ? payload.endTime.trim() : "",
    encryptedKey: typeof payload.encryptedKey === "string" && payload.encryptedKey.trim() ? payload.encryptedKey.trim() : null,
    encryptedPayload: typeof payload.encryptedPayload === "string" && payload.encryptedPayload.trim() ? payload.encryptedPayload.trim() : null,
    encryptionIv: typeof payload.encryptionIv === "string" && payload.encryptionIv.trim() ? payload.encryptionIv.trim() : null,
    isRecurring,
    lecturer: typeof payload.lecturer === "string" && payload.lecturer.trim() ? payload.lecturer.trim() : null,
    room: typeof payload.room === "string" && payload.room.trim() ? payload.room.trim() : null,
    scheduleDayId,
    startTime: typeof payload.startTime === "string" ? payload.startTime.trim() : "",
    title: typeof payload.title === "string" ? payload.title.trim() : "",
  };
}
