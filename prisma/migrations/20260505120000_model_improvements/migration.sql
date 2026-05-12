CREATE TABLE IF NOT EXISTS "UserPublicKey" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "publicKeyJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserPublicKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT OR IGNORE INTO "UserPublicKey" ("userId", "publicKeyJson", "createdAt")
SELECT "id", "publicKeyJson", CURRENT_TIMESTAMP
FROM "User"
WHERE "publicKeyJson" IS NOT NULL
  AND trim("publicKeyJson") <> ''
  AND (json_valid("publicKeyJson") = 0 OR json_type("publicKeyJson") <> 'array');

INSERT OR IGNORE INTO "UserPublicKey" ("userId", "publicKeyJson", "createdAt")
SELECT "User"."id", json_each.value, CURRENT_TIMESTAMP
FROM "User", json_each("User"."publicKeyJson")
WHERE "User"."publicKeyJson" IS NOT NULL
  AND trim("User"."publicKeyJson") <> ''
  AND json_valid("User"."publicKeyJson") = 1
  AND json_type("User"."publicKeyJson") = 'array'
  AND typeof(json_each.value) = 'text'
  AND trim(json_each.value) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS "UserPublicKey_userId_publicKeyJson_key" ON "UserPublicKey"("userId", "publicKeyJson");
CREATE INDEX IF NOT EXISTS "UserPublicKey_userId_idx" ON "UserPublicKey"("userId");

CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
CREATE INDEX IF NOT EXISTS "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE INDEX IF NOT EXISTS "PendingAccount_expiresAt_idx" ON "PendingAccount"("expiresAt");
CREATE INDEX IF NOT EXISTS "ManagementChangeRequest_requestedById_idx" ON "ManagementChangeRequest"("requestedById");
CREATE INDEX IF NOT EXISTS "ManagementChangeRequest_status_idx" ON "ManagementChangeRequest"("status");
CREATE INDEX IF NOT EXISTS "ManagementChangeRequest_entity_targetId_idx" ON "ManagementChangeRequest"("entity", "targetId");
CREATE INDEX IF NOT EXISTS "Contact_ownerId_idx" ON "Contact"("ownerId");
CREATE INDEX IF NOT EXISTS "MealPlan_canteenId_idx" ON "MealPlan"("canteenId");
CREATE INDEX IF NOT EXISTS "MealPlan_date_idx" ON "MealPlan"("date");
CREATE INDEX IF NOT EXISTS "MealPlan_source_idx" ON "MealPlan"("source");
CREATE INDEX IF NOT EXISTS "Deadline_date_idx" ON "Deadline"("date");
CREATE INDEX IF NOT EXISTS "Todo_ownerId_idx" ON "Todo"("ownerId");
CREATE INDEX IF NOT EXISTS "Todo_completedAt_idx" ON "Todo"("completedAt");
CREATE INDEX IF NOT EXISTS "TodoSubtask_todoId_idx" ON "TodoSubtask"("todoId");
CREATE INDEX IF NOT EXISTS "StudyInfo_ownerId_idx" ON "StudyInfo"("ownerId");
CREATE INDEX IF NOT EXISTS "StudyInfo_category_sortOrder_idx" ON "StudyInfo"("category", "sortOrder");
CREATE INDEX IF NOT EXISTS "Module_ownerId_idx" ON "Module"("ownerId");
CREATE INDEX IF NOT EXISTS "Lesson_ownerId_idx" ON "Lesson"("ownerId");
CREATE INDEX IF NOT EXISTS "Lesson_date_idx" ON "Lesson"("date");
CREATE INDEX IF NOT EXISTS "Lesson_source_idx" ON "Lesson"("source");
CREATE INDEX IF NOT EXISTS "Lesson_ownerId_date_idx" ON "Lesson"("ownerId", "date");
CREATE INDEX IF NOT EXISTS "Lesson_scheduleDayId_idx" ON "Lesson"("scheduleDayId");
CREATE INDEX IF NOT EXISTS "LessonVisit_lessonId_idx" ON "LessonVisit"("lessonId");
CREATE INDEX IF NOT EXISTS "LessonVisit_userId_idx" ON "LessonVisit"("userId");
CREATE INDEX IF NOT EXISTS "LessonModulePreference_userId_idx" ON "LessonModulePreference"("userId");
CREATE INDEX IF NOT EXISTS "LessonInvitation_recipientId_idx" ON "LessonInvitation"("recipientId");
CREATE INDEX IF NOT EXISTS "LessonInvitation_senderId_idx" ON "LessonInvitation"("senderId");
CREATE INDEX IF NOT EXISTS "LessonInvitation_status_idx" ON "LessonInvitation"("status");
CREATE INDEX IF NOT EXISTS "ScheduleImportCache_weekStart_idx" ON "ScheduleImportCache"("weekStart");
CREATE INDEX IF NOT EXISTS "ScheduleImportCache_importedAt_idx" ON "ScheduleImportCache"("importedAt");
