CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "publicKeyJson" TEXT,
    "passwordHash" TEXT NOT NULL,
    "passwordSalt" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "Session" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tokenHash" TEXT NOT NULL,
    "activeRole" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "PendingAccount" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "publicKeyJson" TEXT,
    "passwordHash" TEXT NOT NULL,
    "passwordSalt" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "confirmationTokenHash" TEXT NOT NULL,
    "requestedById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

CREATE TABLE "ManagementChangeRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "targetId" INTEGER,
    "payloadJson" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedById" INTEGER NOT NULL,
    "reviewedById" INTEGER,
    "reviewedAt" DATETIME,
    "reviewNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ManagementChangeRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Contact" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ownerId" INTEGER,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "room" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contact_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Canteen" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "MealPlan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "canteenId" INTEGER NOT NULL,
    "day" TEXT NOT NULL,
    "date" DATETIME,
    "mainDish" TEXT NOT NULL,
    "vegetarianDish" TEXT,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "isPersonal" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "sourceKey" TEXT,
    "importedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MealPlan_canteenId_fkey" FOREIGN KEY ("canteenId") REFERENCES "Canteen" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Deadline" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "Todo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ownerId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Todo_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "TodoSubtask" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "todoId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TodoSubtask_todoId_fkey" FOREIGN KEY ("todoId") REFERENCES "Todo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "StudyInfo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ownerId" INTEGER,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "encryptedPayload" TEXT,
    "encryptedKey" TEXT,
    "encryptionIv" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudyInfo_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Module" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ownerId" INTEGER,
    "title" TEXT NOT NULL,
    "credits" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Module_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ScheduleDay" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "day" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "Lesson" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ownerId" INTEGER,
    "scheduleDayId" INTEGER NOT NULL,
    "date" DATETIME,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "encryptedPayload" TEXT,
    "encryptedKey" TEXT,
    "encryptionIv" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "room" TEXT,
    "lecturer" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "sourceKey" TEXT,
    "importedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lesson_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Lesson_scheduleDayId_fkey" FOREIGN KEY ("scheduleDayId") REFERENCES "ScheduleDay" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "LessonInvitation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lessonId" INTEGER NOT NULL,
    "senderId" INTEGER NOT NULL,
    "recipientId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "encryptedPayload" TEXT,
    "encryptedKey" TEXT,
    "encryptionIv" TEXT,
    "respondedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LessonInvitation_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LessonInvitation_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LessonInvitation_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ScheduleImportCache" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cacheKey" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "facultyName" TEXT NOT NULL,
    "studyGroup" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "semesterName" TEXT NOT NULL,
    "specialization" TEXT,
    "weekStart" DATETIME NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE UNIQUE INDEX "PendingAccount_email_key" ON "PendingAccount"("email");
CREATE UNIQUE INDEX "PendingAccount_confirmationTokenHash_key" ON "PendingAccount"("confirmationTokenHash");
CREATE UNIQUE INDEX "MealPlan_sourceKey_key" ON "MealPlan"("sourceKey");
CREATE UNIQUE INDEX "ScheduleDay_day_key" ON "ScheduleDay"("day");
CREATE UNIQUE INDEX "Lesson_sourceKey_key" ON "Lesson"("sourceKey");
CREATE UNIQUE INDEX "LessonInvitation_lessonId_recipientId_key" ON "LessonInvitation"("lessonId", "recipientId");
CREATE UNIQUE INDEX "ScheduleImportCache_cacheKey_key" ON "ScheduleImportCache"("cacheKey");

CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE INDEX "PendingAccount_expiresAt_idx" ON "PendingAccount"("expiresAt");
CREATE INDEX "ManagementChangeRequest_requestedById_idx" ON "ManagementChangeRequest"("requestedById");
CREATE INDEX "ManagementChangeRequest_status_idx" ON "ManagementChangeRequest"("status");
CREATE INDEX "ManagementChangeRequest_entity_targetId_idx" ON "ManagementChangeRequest"("entity", "targetId");
CREATE INDEX "Contact_ownerId_idx" ON "Contact"("ownerId");
CREATE INDEX "MealPlan_canteenId_idx" ON "MealPlan"("canteenId");
CREATE INDEX "MealPlan_date_idx" ON "MealPlan"("date");
CREATE INDEX "MealPlan_source_idx" ON "MealPlan"("source");
CREATE INDEX "Deadline_date_idx" ON "Deadline"("date");
CREATE INDEX "Todo_ownerId_idx" ON "Todo"("ownerId");
CREATE INDEX "Todo_completedAt_idx" ON "Todo"("completedAt");
CREATE INDEX "TodoSubtask_todoId_idx" ON "TodoSubtask"("todoId");
CREATE INDEX "StudyInfo_ownerId_idx" ON "StudyInfo"("ownerId");
CREATE INDEX "StudyInfo_category_sortOrder_idx" ON "StudyInfo"("category", "sortOrder");
CREATE INDEX "Module_ownerId_idx" ON "Module"("ownerId");
CREATE INDEX "Lesson_ownerId_idx" ON "Lesson"("ownerId");
CREATE INDEX "Lesson_date_idx" ON "Lesson"("date");
CREATE INDEX "Lesson_source_idx" ON "Lesson"("source");
CREATE INDEX "Lesson_ownerId_date_idx" ON "Lesson"("ownerId", "date");
CREATE INDEX "Lesson_scheduleDayId_idx" ON "Lesson"("scheduleDayId");
CREATE INDEX "LessonInvitation_recipientId_idx" ON "LessonInvitation"("recipientId");
CREATE INDEX "LessonInvitation_senderId_idx" ON "LessonInvitation"("senderId");
CREATE INDEX "LessonInvitation_status_idx" ON "LessonInvitation"("status");
CREATE INDEX "ScheduleImportCache_weekStart_idx" ON "ScheduleImportCache"("weekStart");
CREATE INDEX "ScheduleImportCache_importedAt_idx" ON "ScheduleImportCache"("importedAt");
