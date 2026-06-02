-- CreateTable
CREATE TABLE IF NOT EXISTS "CurriculumDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "programCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "versionLabel" TEXT,
    "effectiveDate" DATETIME,
    "retrievedAt" DATETIME,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT,
    "sha256" TEXT NOT NULL,
    "pageCount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "StudyProgram" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "totalCredits" INTEGER NOT NULL,
    "regularSemesters" INTEGER NOT NULL,
    "basicStudySemesters" INTEGER NOT NULL,
    "advancedStudySemesters" INTEGER NOT NULL,
    "bilingual" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProgramSemester" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "studyProgramId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "area" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProgramSemester_studyProgramId_fkey" FOREIGN KEY ("studyProgramId") REFERENCES "StudyProgram" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CurriculumModule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studyProgramId" TEXT NOT NULL,
    "semesterId" INTEGER,
    "title" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "area" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'VALIDATED',
    "language" TEXT,
    "workloadHours" INTEGER,
    "contactHours" INTEGER,
    "selfStudyHours" INTEGER,
    "frequency" TEXT,
    "duration" TEXT,
    "prerequisitesText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CurriculumModule_studyProgramId_fkey" FOREIGN KEY ("studyProgramId") REFERENCES "StudyProgram" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CurriculumModule_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "ProgramSemester" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CurriculumCourse" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "moduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kindCode" TEXT NOT NULL,
    "kindLabel" TEXT NOT NULL,
    "weeklyHours" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CurriculumCourse_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CurriculumModule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CurriculumAssessment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "moduleId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "credits" INTEGER,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CurriculumAssessment_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CurriculumModule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CurriculumModulePrerequisite" (
    "sourceModuleId" TEXT NOT NULL,
    "targetModuleId" TEXT NOT NULL,

    PRIMARY KEY ("sourceModuleId", "targetModuleId"),
    CONSTRAINT "CurriculumModulePrerequisite_sourceModuleId_fkey" FOREIGN KEY ("sourceModuleId") REFERENCES "CurriculumModule" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CurriculumModulePrerequisite_targetModuleId_fkey" FOREIGN KEY ("targetModuleId") REFERENCES "CurriculumModule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Specialization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studyProgramId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Specialization_studyProgramId_fkey" FOREIGN KEY ("studyProgramId") REFERENCES "StudyProgram" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CurriculumTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CurriculumModuleTag" (
    "moduleId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    PRIMARY KEY ("moduleId", "tagId"),
    CONSTRAINT "CurriculumModuleTag_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CurriculumModule" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CurriculumModuleTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "CurriculumTag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CurriculumModuleSpecialization" (
    "moduleId" TEXT NOT NULL,
    "specializationId" TEXT NOT NULL,

    PRIMARY KEY ("moduleId", "specializationId"),
    CONSTRAINT "CurriculumModuleSpecialization_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CurriculumModule" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CurriculumModuleSpecialization_specializationId_fkey" FOREIGN KEY ("specializationId") REFERENCES "Specialization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ElectiveSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studyProgramId" TEXT NOT NULL,
    "semesterId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'VALIDATED',
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ElectiveSlot_studyProgramId_fkey" FOREIGN KEY ("studyProgramId") REFERENCES "StudyProgram" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ElectiveSlot_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "ProgramSemester" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ElectiveSlotCandidateModule" (
    "electiveSlotId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,

    PRIMARY KEY ("electiveSlotId", "moduleId"),
    CONSTRAINT "ElectiveSlotCandidateModule_electiveSlotId_fkey" FOREIGN KEY ("electiveSlotId") REFERENCES "ElectiveSlot" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ElectiveSlotCandidateModule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CurriculumModule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CurriculumSourceRef" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "documentId" TEXT NOT NULL,
    "studyProgramId" TEXT,
    "moduleId" TEXT,
    "electiveSlotId" TEXT,
    "pageStart" INTEGER NOT NULL,
    "pageEnd" INTEGER NOT NULL,
    "locator" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CurriculumSourceRef_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "CurriculumDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CurriculumSourceRef_studyProgramId_fkey" FOREIGN KEY ("studyProgramId") REFERENCES "StudyProgram" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CurriculumSourceRef_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CurriculumModule" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CurriculumSourceRef_electiveSlotId_fkey" FOREIGN KEY ("electiveSlotId") REFERENCES "ElectiveSlot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CurriculumDocument_programCode_type_idx" ON "CurriculumDocument"("programCode", "type");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "StudyProgram_code_key" ON "StudyProgram"("code");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProgramSemester_studyProgramId_number_key" ON "ProgramSemester"("studyProgramId", "number");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CurriculumModule_studyProgramId_semesterId_sortOrder_idx" ON "CurriculumModule"("studyProgramId", "semesterId", "sortOrder");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CurriculumModule_title_idx" ON "CurriculumModule"("title");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CurriculumModule_area_idx" ON "CurriculumModule"("area");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CurriculumCourse_moduleId_sortOrder_idx" ON "CurriculumCourse"("moduleId", "sortOrder");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CurriculumAssessment_moduleId_sortOrder_idx" ON "CurriculumAssessment"("moduleId", "sortOrder");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CurriculumAssessment_category_code_idx" ON "CurriculumAssessment"("category", "code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CurriculumModulePrerequisite_targetModuleId_idx" ON "CurriculumModulePrerequisite"("targetModuleId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Specialization_studyProgramId_code_key" ON "Specialization"("studyProgramId", "code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CurriculumTag_category_idx" ON "CurriculumTag"("category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CurriculumModuleTag_tagId_idx" ON "CurriculumModuleTag"("tagId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CurriculumModuleSpecialization_specializationId_idx" ON "CurriculumModuleSpecialization"("specializationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ElectiveSlot_studyProgramId_semesterId_sortOrder_idx" ON "ElectiveSlot"("studyProgramId", "semesterId", "sortOrder");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ElectiveSlotCandidateModule_moduleId_idx" ON "ElectiveSlotCandidateModule"("moduleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CurriculumSourceRef_documentId_pageStart_pageEnd_idx" ON "CurriculumSourceRef"("documentId", "pageStart", "pageEnd");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CurriculumSourceRef_studyProgramId_idx" ON "CurriculumSourceRef"("studyProgramId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CurriculumSourceRef_moduleId_idx" ON "CurriculumSourceRef"("moduleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CurriculumSourceRef_electiveSlotId_idx" ON "CurriculumSourceRef"("electiveSlotId");
