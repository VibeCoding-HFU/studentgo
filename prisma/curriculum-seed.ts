import type { PrismaClient } from "../backend/generated/prisma/client";
import { validateCurriculumSnapshot } from "../backend/src/modules/curriculum/curriculum.validation";
import { legacyCurriculumSeeds, type CurriculumVersionSeed } from "./curriculum-spo-legacy-data";
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
  await prisma.curriculumDocument.deleteMany();
  await prisma.curriculumSpoVersion.deleteMany();
  await prisma.studyProgram.deleteMany();
}

const spo14VersionSeed: CurriculumVersionSeed = {
  documents: curriculumSeed.documents,
  electiveSlots: curriculumSeed.electiveSlots,
  modules: curriculumSeed.modules,
  programSourceRefs: curriculumSeed.programSourceRefs,
  semesters: curriculumSeed.semesters,
  specializations: curriculumSeed.specializations,
  spoVersion: {
    code: "SPO14",
    effectiveDate: new Date("2026-02-24T00:00:00.000Z"),
    id: "SPO14",
    isDefault: true,
    label: "SPO Version 14",
    retrievedAt: new Date("2026-05-19T00:00:00.000Z"),
    versionNumber: 14,
  },
};

const curriculumVersions = [spo14VersionSeed, ...legacyCurriculumSeeds].sort(
  (left, right) => left.spoVersion.versionNumber - right.spoVersion.versionNumber,
);

function tagCategory(tagId: string) {
  if (/^\d+-lp$/.test(tagId)) {
    return "workload";
  }

  if (/^sem-\d+$/.test(tagId)) {
    return "semester";
  }

  if (["aai", "cn", "ki", "min", "nits", "ras", "swe"].includes(tagId)) {
    return "specialization";
  }

  if (["bericht", "klausur", "muendlich", "praktische-arbeit", "praesentation", "referat"].includes(tagId)) {
    return "assessment";
  }

  return "content";
}

function collectCurriculumTags(versions: CurriculumVersionSeed[]) {
  const tags = new Map(curriculumSeed.tags.map((tag) => [tag.id, tag]));

  for (const version of versions) {
    for (const module of version.modules) {
      for (const tagId of module.tags) {
        if (!tags.has(tagId)) {
          tags.set(tagId, {
            category: tagCategory(tagId),
            id: tagId,
            label: tagId,
          });
        }
      }
    }
  }

  return Array.from(tags.values()).sort((left, right) => left.category.localeCompare(right.category) || left.id.localeCompare(right.id));
}

export async function seedCurriculumData(prisma: PrismaClient) {
  for (const version of curriculumVersions) {
    validateCurriculumSnapshot({
      electiveSlots: version.electiveSlots,
      modules: version.modules.map((module) => ({
        credits: module.credits,
        id: module.id,
        semesterNumber: module.semesterNumber,
        sourceRefs: module.sourceRefs,
      })),
      program: curriculumSeed.program,
      semesters: version.semesters,
    });
  }

  await prisma.studyProgram.create({
    data: curriculumSeed.program,
  });

  await prisma.curriculumSpoVersion.createMany({
    data: curriculumVersions.map((version) => ({
      code: version.spoVersion.code,
      effectiveDate: version.spoVersion.effectiveDate ?? null,
      id: version.spoVersion.id,
      isDefault: version.spoVersion.isDefault ?? false,
      label: version.spoVersion.label,
      retrievedAt: version.spoVersion.retrievedAt ?? null,
      studyProgramId: curriculumSeed.program.id,
      versionNumber: version.spoVersion.versionNumber,
    })),
  });

  await prisma.curriculumDocument.createMany({
    data: curriculumVersions.flatMap((version) =>
      version.documents.map((document) => ({
        ...document,
        spoVersionId: version.spoVersion.id,
      })),
    ),
  });

  await prisma.programSemester.createMany({
    data: curriculumVersions.flatMap((version) => version.semesters.map((semester) => ({
      area: semester.area,
      credits: semester.credits,
      number: semester.number,
      spoVersionId: version.spoVersion.id,
      studyProgramId: curriculumSeed.program.id,
      title: semester.title,
    }))),
  });

  const semesters = await prisma.programSemester.findMany({
    orderBy: { number: "asc" },
    where: { studyProgramId: curriculumSeed.program.id },
  });
  const semesterIds = new Map<string, number>(
    semesters.map((semester) => [`${semester.spoVersionId}:${semester.number}`, semester.id] as const),
  );

  await prisma.specialization.createMany({
    data: curriculumVersions.flatMap((version) => version.specializations.map((specialization) => ({
      ...specialization,
      spoVersionId: version.spoVersion.id,
      studyProgramId: curriculumSeed.program.id,
    }))),
  });

  await prisma.curriculumTag.createMany({
    data: collectCurriculumTags(curriculumVersions),
  });

  await prisma.curriculumModule.createMany({
    data: curriculumVersions.flatMap((version) => version.modules.map((module) => ({
      area: module.area,
      contactHours: module.contactHours ?? null,
      credits: module.credits,
      duration: module.duration ?? null,
      frequency: module.frequency ?? null,
      id: module.id,
      language: module.language ?? null,
      prerequisitesText: module.prerequisitesText ?? null,
      selfStudyHours: module.selfStudyHours ?? null,
      semesterId: semesterIds.get(`${version.spoVersion.id}:${module.semesterNumber}`) ?? null,
      sortOrder: module.sortOrder,
      spoVersionId: version.spoVersion.id,
      status: module.status,
      studyProgramId: curriculumSeed.program.id,
      title: module.title,
      workloadHours: module.workloadHours ?? null,
    }))),
  });

  await prisma.curriculumCourse.createMany({
    data: curriculumVersions.flatMap((version) => version.modules.flatMap((module) =>
      module.courses.map((entry, index) => ({
        kindCode: entry.kindCode,
        kindLabel: entry.kindLabel,
        moduleId: module.id,
        sortOrder: index + 1,
        title: entry.title,
        weeklyHours: entry.weeklyHours ?? null,
      })),
    )),
  });

  await prisma.curriculumAssessment.createMany({
    data: curriculumVersions.flatMap((version) => version.modules.flatMap((module) =>
      module.assessments.map((assessment, index) => ({
        category: assessment.category,
        code: assessment.code,
        credits: assessment.credits ?? null,
        description: assessment.description ?? null,
        label: assessment.label,
        moduleId: module.id,
        sortOrder: index + 1,
      })),
    )),
  });

  await prisma.curriculumModulePrerequisite.createMany({
    data: curriculumVersions.flatMap((version) => version.modules.flatMap((module) =>
      (module.prerequisiteModuleIds ?? []).map((targetModuleId) => ({
        sourceModuleId: module.id,
        targetModuleId,
      })),
    )),
  });

  await prisma.curriculumModuleTag.createMany({
    data: curriculumVersions.flatMap((version) => version.modules.flatMap((module) =>
      module.tags.map((tagId) => ({
        moduleId: module.id,
        tagId,
      })),
    )),
  });

  const specializationIds = new Map(
    curriculumVersions.flatMap((version) =>
      version.specializations.map((specialization) => [`${version.spoVersion.id}:${specialization.code}`, specialization.id] as const),
    ),
  );

  await prisma.curriculumModuleSpecialization.createMany({
    data: curriculumVersions.flatMap((version) => version.modules.flatMap((module) =>
      (module.specializationCodes ?? []).map((code) => ({
        moduleId: module.id,
        specializationId: specializationIds.get(`${version.spoVersion.id}:${code}`) ?? code,
      })),
    )),
  });

  await prisma.electiveSlot.createMany({
    data: curriculumVersions.flatMap((version) => version.electiveSlots.map((slot) => ({
      credits: slot.credits,
      description: slot.description,
      id: slot.id,
      kind: slot.kind,
      name: slot.name,
      semesterId: semesterIds.get(`${version.spoVersion.id}:${slot.semesterNumber}`) ?? 0,
      sortOrder: slot.sortOrder,
      spoVersionId: version.spoVersion.id,
      studyProgramId: curriculumSeed.program.id,
    }))),
  });

  await prisma.electiveSlotCandidateModule.createMany({
    data: curriculumVersions.flatMap((version) => version.electiveSlots.flatMap((slot) =>
      (slot.candidateModuleIds ?? []).map((moduleId) => ({
        electiveSlotId: slot.id,
        moduleId,
      })),
    )),
  });

  await prisma.curriculumSourceRef.createMany({
    data: curriculumVersions.flatMap((version) => [
      ...version.programSourceRefs.map((sourceRef) => ({
        ...sourceRef,
        electiveSlotId: null,
        moduleId: null,
        spoVersionId: version.spoVersion.id,
        studyProgramId: curriculumSeed.program.id,
      })),
      ...version.modules.flatMap((module) =>
        module.sourceRefs.map((sourceRef) => ({
          ...sourceRef,
          electiveSlotId: null,
          moduleId: module.id,
          spoVersionId: version.spoVersion.id,
          studyProgramId: null,
        })),
      ),
      ...version.electiveSlots.flatMap((slot) =>
        slot.sourceRefs.map((sourceRef) => ({
          ...sourceRef,
          electiveSlotId: slot.id,
          moduleId: null,
          spoVersionId: version.spoVersion.id,
          studyProgramId: null,
        })),
      ),
    ]),
  });
}
