import type {
  CurriculumElectiveSlotRecord,
  CurriculumModuleRecord,
  CurriculumProgramRecord,
  CurriculumSemesterRecord,
  CurriculumSpecializationRecord,
  CurriculumTagRecord,
} from "./curriculum.repository";

function mapSourceRefs(sourceRefs: Array<CurriculumModuleRecord["sourceRefs"][number]>) {
  return sourceRefs.map((sourceRef) => ({
    document: {
      fileName: sourceRef.document.fileName,
      id: sourceRef.document.id,
      pageCount: sourceRef.document.pageCount,
      title: sourceRef.document.title,
      type: sourceRef.document.type,
      versionLabel: sourceRef.document.versionLabel,
    },
    locator: sourceRef.locator,
    note: sourceRef.note,
    pageEnd: sourceRef.pageEnd,
    pageStart: sourceRef.pageStart,
  }));
}

function mapPrerequisiteModules(prerequisites: CurriculumModuleRecord["prerequisiteModules"]) {
  return prerequisites.map((entry: CurriculumModuleRecord["prerequisiteModules"][number]) => ({
    id: entry.targetModule.id,
    semesterNumber: entry.targetModule.semester?.number ?? null,
    title: entry.targetModule.title,
  }));
}

export function mapProgram(program: CurriculumProgramRecord) {
  return {
    basicStudySemesters: program.basicStudySemesters,
    bilingual: program.bilingual,
    code: program.code,
    degree: program.degree,
    id: program.id,
    name: program.name,
    regularSemesters: program.regularSemesters,
    sourceRefs: mapSourceRefs(program.sourceRefs),
    specializations: program.specializations.map((specialization: CurriculumProgramRecord["specializations"][number]) => ({
      code: specialization.code,
      description: specialization.description,
      id: specialization.id,
      name: specialization.name,
    })),
    totalCredits: program.totalCredits,
  };
}

export function mapModule(module: CurriculumModuleRecord) {
  return {
    area: module.area,
    assessments: module.assessments.map((assessment: CurriculumModuleRecord["assessments"][number]) => ({
      category: assessment.category,
      code: assessment.code,
      credits: assessment.credits,
      description: assessment.description,
      label: assessment.label,
    })),
    contactHours: module.contactHours,
    courses: module.courses.map((course: CurriculumModuleRecord["courses"][number]) => ({
      kindCode: course.kindCode,
      kindLabel: course.kindLabel,
      title: course.title,
      weeklyHours: course.weeklyHours,
    })),
    credits: module.credits,
    duration: module.duration,
    frequency: module.frequency,
    id: module.id,
    language: module.language,
    prerequisiteModules: mapPrerequisiteModules(module.prerequisiteModules),
    prerequisites: module.prerequisitesText ? [module.prerequisitesText] : [],
    semester: module.semester
      ? {
          credits: module.semester.credits,
          number: module.semester.number,
          title: module.semester.title,
        }
      : null,
    sourceRefs: mapSourceRefs(module.sourceRefs),
    specializations: module.specializations.map((entry: CurriculumModuleRecord["specializations"][number]) => ({
      code: entry.specialization.code,
      id: entry.specialization.id,
      name: entry.specialization.name,
    })),
    status: module.status,
    tags: module.tags.map((entry: CurriculumModuleRecord["tags"][number]) => ({
      category: entry.tag.category,
      id: entry.tag.id,
      label: entry.tag.label,
    })),
    title: module.title,
    workloadHours: module.workloadHours,
  };
}

export function mapSemester(semester: CurriculumSemesterRecord) {
  return {
    area: semester.area,
    credits: semester.credits,
    id: semester.id,
    modules: semester.modules.map(mapModule),
    number: semester.number,
    electiveSlots: semester.electiveSlots.map(mapElectiveSlot),
    title: semester.title,
  };
}

export function mapSpecialization(specialization: CurriculumSpecializationRecord) {
  return {
    code: specialization.code,
    description: specialization.description,
    id: specialization.id,
    modules: specialization.modules.map((entry: CurriculumSpecializationRecord["modules"][number]) => ({
      id: entry.module.id,
      semesterNumber: entry.module.semester?.number ?? null,
      title: entry.module.title,
    })),
    name: specialization.name,
  };
}

export function mapElectiveSlot(slot: CurriculumElectiveSlotRecord) {
  return {
    candidateModules: slot.candidateModules.map((entry: CurriculumElectiveSlotRecord["candidateModules"][number]) => ({
      area: entry.module.area,
      id: entry.module.id,
      semesterNumber: entry.module.semester?.number ?? null,
      specializations: entry.module.specializations.map((specialization) => specialization.specialization.code),
      title: entry.module.title,
    })),
    credits: slot.credits,
    description: slot.description,
    id: slot.id,
    kind: slot.kind,
    name: slot.name,
    semester: {
      credits: slot.semester.credits,
      number: slot.semester.number,
      title: slot.semester.title,
    },
    sourceRefs: mapSourceRefs(slot.sourceRefs),
    status: slot.status,
  };
}

export function mapTag(tag: CurriculumTagRecord) {
  return {
    category: tag.category,
    id: tag.id,
    label: tag.label,
    moduleCount: tag.modules.length,
  };
}
