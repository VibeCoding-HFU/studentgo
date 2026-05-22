import type { PrismaClient } from "../backend/generated/prisma/client";
import { validateCurriculumSnapshot } from "../backend/src/modules/curriculum/curriculum.validation";
import { curriculumSeed } from "./curriculum-seed-data";

export async function clearCurriculumData(prisma: PrismaClient) {
  await prisma.curriculumSourceRef.deleteMany();
  await prisma.electiveSlotCandidateModule.deleteMany();
  await prisma.curriculumModulePrerequisite.deleteMany();
  await prisma.curriculumModuleTag.deleteMany();
  await prisma.curriculumModuleSpecialization.deleteMany();
  await prisma.curriculumAssessment.deleteMany();
  await prisma.curriculumCourse.deleteMany();
  await prisma.electiveSlot.deleteMany();
  await prisma.curriculumModule.deleteMany();
  await prisma.curriculumTag.deleteMany();
  await prisma.specialization.deleteMany();
  await prisma.programSemester.deleteMany();
  await prisma.studyProgram.deleteMany();
  await prisma.curriculumDocument.deleteMany();
}

export async function seedCurriculumData(prisma: PrismaClient) {
  validateCurriculumSnapshot({
    electiveSlots: curriculumSeed.electiveSlots,
    modules: curriculumSeed.modules.map((module) => ({
      credits: module.credits,
      id: module.id,
      semesterNumber: module.semesterNumber,
      sourceRefs: module.sourceRefs,
    })),
    program: curriculumSeed.program,
    semesters: curriculumSeed.semesters,
  });

  await prisma.curriculumDocument.createMany({ data: curriculumSeed.documents });
  await prisma.studyProgram.create({
    data: curriculumSeed.program,
  });

  await prisma.programSemester.createMany({
    data: curriculumSeed.semesters.map((semester) => ({
      area: semester.area,
      credits: semester.credits,
      number: semester.number,
      studyProgramId: curriculumSeed.program.id,
      title: semester.title,
    })),
  });

  const semesters = await prisma.programSemester.findMany({
    orderBy: { number: "asc" },
    where: { studyProgramId: curriculumSeed.program.id },
  });
  const semesterIds = new Map<number, number>(
    semesters.map((semester) => [semester.number, semester.id] as const),
  );

  await prisma.specialization.createMany({
    data: curriculumSeed.specializations.map((specialization) => ({
      ...specialization,
      studyProgramId: curriculumSeed.program.id,
    })),
  });

  await prisma.curriculumTag.createMany({
    data: curriculumSeed.tags,
  });

  await prisma.curriculumModule.createMany({
    data: curriculumSeed.modules.map((module) => ({
      area: module.area,
      contactHours: module.contactHours ?? null,
      credits: module.credits,
      duration: module.duration ?? null,
      frequency: module.frequency ?? null,
      id: module.id,
      language: module.language ?? null,
      prerequisitesText: module.prerequisitesText ?? null,
      selfStudyHours: module.selfStudyHours ?? null,
      semesterId: semesterIds.get(module.semesterNumber) ?? null,
      sortOrder: module.sortOrder,
      status: module.status,
      studyProgramId: curriculumSeed.program.id,
      title: module.title,
      workloadHours: module.workloadHours ?? null,
    })),
  });

  await prisma.curriculumCourse.createMany({
    data: curriculumSeed.modules.flatMap((module) =>
      module.courses.map((entry, index) => ({
        kindCode: entry.kindCode,
        kindLabel: entry.kindLabel,
        moduleId: module.id,
        sortOrder: index + 1,
        title: entry.title,
        weeklyHours: entry.weeklyHours ?? null,
      })),
    ),
  });

  await prisma.curriculumAssessment.createMany({
    data: curriculumSeed.modules.flatMap((module) =>
      module.assessments.map((assessment, index) => ({
        category: assessment.category,
        code: assessment.code,
        credits: assessment.credits ?? null,
        description: assessment.description ?? null,
        label: assessment.label,
        moduleId: module.id,
        sortOrder: index + 1,
      })),
    ),
  });

  await prisma.curriculumModulePrerequisite.createMany({
    data: curriculumSeed.modules.flatMap((module) =>
      (module.prerequisiteModuleIds ?? []).map((targetModuleId) => ({
        sourceModuleId: module.id,
        targetModuleId,
      })),
    ),
  });

  await prisma.curriculumModuleTag.createMany({
    data: curriculumSeed.modules.flatMap((module) =>
      module.tags.map((tagId) => ({
        moduleId: module.id,
        tagId,
      })),
    ),
  });

  const specializationIds = new Map(
    curriculumSeed.specializations.map((specialization) => [specialization.code, specialization.id]),
  );

  await prisma.curriculumModuleSpecialization.createMany({
    data: curriculumSeed.modules.flatMap((module) =>
      (module.specializationCodes ?? []).map((code) => ({
        moduleId: module.id,
        specializationId: specializationIds.get(code) ?? code,
      })),
    ),
  });

  await prisma.electiveSlot.createMany({
    data: curriculumSeed.electiveSlots.map((slot) => ({
      credits: slot.credits,
      description: slot.description,
      id: slot.id,
      kind: slot.kind,
      name: slot.name,
      semesterId: semesterIds.get(slot.semesterNumber) ?? 0,
      sortOrder: slot.sortOrder,
      studyProgramId: curriculumSeed.program.id,
    })),
  });

  await prisma.electiveSlotCandidateModule.createMany({
    data: curriculumSeed.electiveSlots.flatMap((slot) =>
      (slot.candidateModuleIds ?? []).map((moduleId) => ({
        electiveSlotId: slot.id,
        moduleId,
      })),
    ),
  });

  await prisma.curriculumSourceRef.createMany({
    data: [
      ...curriculumSeed.programSourceRefs.map((sourceRef) => ({
        ...sourceRef,
        electiveSlotId: null,
        moduleId: null,
        studyProgramId: curriculumSeed.program.id,
      })),
      ...curriculumSeed.modules.flatMap((module) =>
        module.sourceRefs.map((sourceRef) => ({
          ...sourceRef,
          electiveSlotId: null,
          moduleId: module.id,
          studyProgramId: null,
        })),
      ),
      ...curriculumSeed.electiveSlots.flatMap((slot) =>
        slot.sourceRefs.map((sourceRef) => ({
          ...sourceRef,
          electiveSlotId: slot.id,
          moduleId: null,
          studyProgramId: null,
        })),
      ),
    ],
  });
}
