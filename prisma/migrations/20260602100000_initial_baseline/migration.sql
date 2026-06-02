-- CreateTable
CREATE TABLE IF NOT EXISTS "User" (
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

-- CreateTable
CREATE TABLE IF NOT EXISTS "UserPublicKey" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "publicKeyJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserPublicKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Session" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tokenHash" TEXT NOT NULL,
    "activeRole" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PendingAccount" (
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

-- CreateTable
CREATE TABLE IF NOT EXISTS "ManagementChangeRequest" (
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

-- CreateTable
CREATE TABLE IF NOT EXISTS "Contact" (
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

-- CreateTable
CREATE TABLE IF NOT EXISTS "Canteen" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MealPlan" (
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

-- CreateTable
CREATE TABLE IF NOT EXISTS "Deadline" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Todo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ownerId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Todo_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TodoSubtask" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "todoId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TodoSubtask_todoId_fkey" FOREIGN KEY ("todoId") REFERENCES "Todo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "StudyInfo" (
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

-- CreateTable
CREATE TABLE IF NOT EXISTS "Module" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ownerId" INTEGER,
    "title" TEXT NOT NULL,
    "credits" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Module_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ScheduleDay" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "day" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Lesson" (
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

-- CreateTable
CREATE TABLE IF NOT EXISTS "LessonVisit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "visitedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LessonVisit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LessonVisit_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LessonModulePreference" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LessonModulePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LessonInvitation" (
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

-- CreateTable
CREATE TABLE IF NOT EXISTS "ScheduleImportCache" (
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

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserPublicKey_userId_idx" ON "UserPublicKey"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "UserPublicKey_userId_publicKeyJson_key" ON "UserPublicKey"("userId", "publicKeyJson");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PendingAccount_email_key" ON "PendingAccount"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PendingAccount_confirmationTokenHash_key" ON "PendingAccount"("confirmationTokenHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PendingAccount_expiresAt_idx" ON "PendingAccount"("expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ManagementChangeRequest_requestedById_idx" ON "ManagementChangeRequest"("requestedById");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ManagementChangeRequest_status_idx" ON "ManagementChangeRequest"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ManagementChangeRequest_entity_targetId_idx" ON "ManagementChangeRequest"("entity", "targetId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Contact_ownerId_idx" ON "Contact"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MealPlan_sourceKey_key" ON "MealPlan"("sourceKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MealPlan_canteenId_idx" ON "MealPlan"("canteenId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MealPlan_date_idx" ON "MealPlan"("date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MealPlan_source_idx" ON "MealPlan"("source");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Deadline_date_idx" ON "Deadline"("date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Todo_ownerId_idx" ON "Todo"("ownerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Todo_completedAt_idx" ON "Todo"("completedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TodoSubtask_todoId_idx" ON "TodoSubtask"("todoId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StudyInfo_ownerId_idx" ON "StudyInfo"("ownerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StudyInfo_category_sortOrder_idx" ON "StudyInfo"("category", "sortOrder");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Module_ownerId_idx" ON "Module"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ScheduleDay_day_key" ON "ScheduleDay"("day");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Lesson_sourceKey_key" ON "Lesson"("sourceKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lesson_ownerId_idx" ON "Lesson"("ownerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lesson_date_idx" ON "Lesson"("date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lesson_source_idx" ON "Lesson"("source");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lesson_ownerId_date_idx" ON "Lesson"("ownerId", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lesson_scheduleDayId_idx" ON "Lesson"("scheduleDayId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LessonVisit_lessonId_idx" ON "LessonVisit"("lessonId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LessonVisit_userId_idx" ON "LessonVisit"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LessonVisit_userId_lessonId_date_key" ON "LessonVisit"("userId", "lessonId", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LessonModulePreference_userId_idx" ON "LessonModulePreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LessonModulePreference_userId_moduleKey_key" ON "LessonModulePreference"("userId", "moduleKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LessonInvitation_recipientId_idx" ON "LessonInvitation"("recipientId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LessonInvitation_senderId_idx" ON "LessonInvitation"("senderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LessonInvitation_status_idx" ON "LessonInvitation"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LessonInvitation_lessonId_recipientId_key" ON "LessonInvitation"("lessonId", "recipientId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ScheduleImportCache_cacheKey_key" ON "ScheduleImportCache"("cacheKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ScheduleImportCache_weekStart_idx" ON "ScheduleImportCache"("weekStart");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ScheduleImportCache_importedAt_idx" ON "ScheduleImportCache"("importedAt");
