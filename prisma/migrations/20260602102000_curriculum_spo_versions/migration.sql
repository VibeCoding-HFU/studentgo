-- CreateTable
CREATE TABLE IF NOT EXISTS "CurriculumSpoVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studyProgramId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "effectiveDate" DATETIME,
    "retrievedAt" DATETIME,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CurriculumSpoVersion_studyProgramId_fkey" FOREIGN KEY ("studyProgramId") REFERENCES "StudyProgram" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- AlterTable
ALTER TABLE "CurriculumDocument" ADD COLUMN "spoVersionId" TEXT REFERENCES "CurriculumSpoVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProgramSemester" ADD COLUMN "spoVersionId" TEXT REFERENCES "CurriculumSpoVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CurriculumModule" ADD COLUMN "spoVersionId" TEXT REFERENCES "CurriculumSpoVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Specialization" ADD COLUMN "spoVersionId" TEXT REFERENCES "CurriculumSpoVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ElectiveSlot" ADD COLUMN "spoVersionId" TEXT REFERENCES "CurriculumSpoVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CurriculumSourceRef" ADD COLUMN "spoVersionId" TEXT REFERENCES "CurriculumSpoVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop obsolete uniqueness constraints for single-SPO curriculum data.
DROP INDEX IF EXISTS "ProgramSemester_studyProgramId_number_key";
DROP INDEX IF EXISTS "Specialization_studyProgramId_code_key";

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CurriculumSpoVersion_studyProgramId_code_key" ON "CurriculumSpoVersion"("studyProgramId", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "CurriculumSpoVersion_studyProgramId_versionNumber_key" ON "CurriculumSpoVersion"("studyProgramId", "versionNumber");
CREATE INDEX IF NOT EXISTS "CurriculumSpoVersion_studyProgramId_isDefault_idx" ON "CurriculumSpoVersion"("studyProgramId", "isDefault");

CREATE INDEX IF NOT EXISTS "CurriculumDocument_spoVersionId_type_idx" ON "CurriculumDocument"("spoVersionId", "type");

CREATE UNIQUE INDEX IF NOT EXISTS "ProgramSemester_studyProgramId_spoVersionId_number_key" ON "ProgramSemester"("studyProgramId", "spoVersionId", "number");
CREATE INDEX IF NOT EXISTS "ProgramSemester_spoVersionId_idx" ON "ProgramSemester"("spoVersionId");

CREATE INDEX IF NOT EXISTS "CurriculumModule_studyProgramId_spoVersionId_semesterId_sortOrder_idx" ON "CurriculumModule"("studyProgramId", "spoVersionId", "semesterId", "sortOrder");
CREATE INDEX IF NOT EXISTS "CurriculumModule_spoVersionId_idx" ON "CurriculumModule"("spoVersionId");

CREATE UNIQUE INDEX IF NOT EXISTS "Specialization_studyProgramId_spoVersionId_code_key" ON "Specialization"("studyProgramId", "spoVersionId", "code");
CREATE INDEX IF NOT EXISTS "Specialization_spoVersionId_idx" ON "Specialization"("spoVersionId");

CREATE INDEX IF NOT EXISTS "ElectiveSlot_studyProgramId_spoVersionId_semesterId_sortOrder_idx" ON "ElectiveSlot"("studyProgramId", "spoVersionId", "semesterId", "sortOrder");
CREATE INDEX IF NOT EXISTS "ElectiveSlot_spoVersionId_idx" ON "ElectiveSlot"("spoVersionId");

CREATE INDEX IF NOT EXISTS "CurriculumSourceRef_spoVersionId_idx" ON "CurriculumSourceRef"("spoVersionId");
