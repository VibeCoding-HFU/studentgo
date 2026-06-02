import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../prisma";

const sourceRefInclude = {
  document: true,
} satisfies Prisma.CurriculumSourceRefDefaultArgs["include"];

const curriculumModuleArgs = {
  include: {
    assessments: { orderBy: { sortOrder: "asc" } },
    courses: { orderBy: { sortOrder: "asc" } },
    prerequisiteModules: {
      include: {
        targetModule: {
          include: {
            semester: true,
          },
        },
      },
      orderBy: { targetModule: { sortOrder: "asc" } },
    },
    semester: true,
    sourceRefs: {
      include: sourceRefInclude,
      orderBy: { pageStart: "asc" },
    },
    specializations: {
      include: {
        specialization: true,
      },
    },
    tags: {
      include: {
        tag: true,
      },
    },
  },
} satisfies Prisma.CurriculumModuleDefaultArgs;

const semesterArgs = {
  include: {
    electiveSlots: {
      include: {
        candidateModules: {
          include: {
            module: {
              include: {
                semester: true,
                specializations: {
                  include: {
                    specialization: true,
                  },
                },
              },
            },
          },
          orderBy: { module: { title: "asc" } },
        },
        semester: true,
        sourceRefs: {
          include: sourceRefInclude,
          orderBy: { pageStart: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    },
    modules: {
      ...curriculumModuleArgs,
      orderBy: { sortOrder: "asc" },
    },
  },
} satisfies Prisma.ProgramSemesterDefaultArgs;

const programArgs = {
  include: {
    sourceRefs: {
      include: sourceRefInclude,
      orderBy: { pageStart: "asc" },
    },
    specializations: {
      orderBy: { code: "asc" },
    },
    spoVersions: {
      orderBy: { versionNumber: "desc" },
    },
  },
} satisfies Prisma.StudyProgramDefaultArgs;

const specializationArgs = {
  include: {
    modules: {
      include: {
        module: {
          include: {
            semester: true,
          },
        },
      },
    },
  },
} satisfies Prisma.SpecializationDefaultArgs;

const electiveSlotArgs = {
  include: {
    candidateModules: {
      include: {
        module: {
          include: {
            semester: true,
            specializations: {
              include: {
                specialization: true,
              },
            },
          },
        },
      },
      orderBy: { module: { title: "asc" } },
    },
    semester: true,
    sourceRefs: {
      include: sourceRefInclude,
      orderBy: { pageStart: "asc" },
    },
  },
} satisfies Prisma.ElectiveSlotDefaultArgs;

const tagArgs = {
  include: {
    modules: {
      include: {
        module: {
          include: {
            semester: true,
          },
        },
      },
    },
  },
} satisfies Prisma.CurriculumTagDefaultArgs;

export type CurriculumModuleRecord = Prisma.CurriculumModuleGetPayload<typeof curriculumModuleArgs>;
export type CurriculumProgramRecord = Prisma.StudyProgramGetPayload<typeof programArgs>;
export type CurriculumSemesterRecord = Prisma.ProgramSemesterGetPayload<typeof semesterArgs>;
export type CurriculumSpecializationRecord = Prisma.SpecializationGetPayload<typeof specializationArgs>;
export type CurriculumElectiveSlotRecord = Prisma.ElectiveSlotGetPayload<typeof electiveSlotArgs>;
export type CurriculumTagRecord = Prisma.CurriculumTagGetPayload<typeof tagArgs>;
export type CurriculumModulePrerequisiteRecord = Prisma.CurriculumModulePrerequisiteGetPayload<{
  include: {
    sourceModule: {
      include: {
        semester: true,
      },
    };
    targetModule: {
      include: {
        semester: true,
      },
    };
  };
}>;

export const curriculumRepository = {
  getProgramByCode(code: string) {
    return prisma.studyProgram.findUnique({
      where: { code },
    });
  },

  getProgramSnapshotById(id: string, spoVersionId: string) {
    return prisma.studyProgram.findUnique({
      include: {
        sourceRefs: {
          include: sourceRefInclude,
          orderBy: { pageStart: "asc" },
          where: { spoVersionId },
        },
        specializations: {
          orderBy: { code: "asc" },
          where: { spoVersionId },
        },
        spoVersions: {
          orderBy: { versionNumber: "desc" },
          where: { id: spoVersionId },
        },
      },
      where: { id },
    });
  },

  getDefaultSpoVersion(studyProgramId: string) {
    return prisma.curriculumSpoVersion.findFirst({
      orderBy: [{ isDefault: "desc" }, { versionNumber: "desc" }],
      where: { studyProgramId },
    });
  },

  getSpoVersionByCode(studyProgramId: string, code: string) {
    return prisma.curriculumSpoVersion.findFirst({
      where: {
        studyProgramId,
        OR: [{ code }, { id: code }],
      },
    });
  },

  listSpoVersions(studyProgramId: string) {
    return prisma.curriculumSpoVersion.findMany({
      orderBy: { versionNumber: "desc" },
      where: { studyProgramId },
    });
  },

  getModuleById(studyProgramId: string, spoVersionId: string, id: string) {
    return prisma.curriculumModule.findFirst({
      ...curriculumModuleArgs,
      where: {
        id,
        spoVersionId,
        studyProgramId,
      },
    });
  },

  listElectiveSlots(studyProgramId: string, spoVersionId: string) {
    return prisma.electiveSlot.findMany({
      ...electiveSlotArgs,
      orderBy: [{ semester: { number: "asc" } }, { sortOrder: "asc" }],
      where: { spoVersionId, studyProgramId },
    });
  },

  listModules(studyProgramId: string, spoVersionId: string) {
    return prisma.curriculumModule.findMany({
      ...curriculumModuleArgs,
      orderBy: [{ semester: { number: "asc" } }, { sortOrder: "asc" }, { title: "asc" }],
      where: { spoVersionId, studyProgramId },
    });
  },

  listModulePrerequisites(studyProgramId: string, spoVersionId: string) {
    return prisma.curriculumModulePrerequisite.findMany({
      include: {
        sourceModule: {
          include: {
            semester: true,
          },
        },
        targetModule: {
          include: {
            semester: true,
          },
        },
      },
      orderBy: [
        { sourceModule: { semester: { number: "asc" } } },
        { sourceModule: { sortOrder: "asc" } },
        { targetModule: { semester: { number: "asc" } } },
        { targetModule: { sortOrder: "asc" } },
      ],
      where: {
        sourceModule: {
          spoVersionId,
          studyProgramId,
        },
      },
    });
  },

  listSemesters(studyProgramId: string, spoVersionId: string) {
    return prisma.programSemester.findMany({
      ...semesterArgs,
      orderBy: { number: "asc" },
      where: { spoVersionId, studyProgramId },
    });
  },

  listSpecializations(studyProgramId: string, spoVersionId: string) {
    return prisma.specialization.findMany({
      ...specializationArgs,
      orderBy: { code: "asc" },
      where: { spoVersionId, studyProgramId },
    });
  },

  listTags(studyProgramId: string, spoVersionId: string) {
    return prisma.curriculumTag.findMany({
      ...tagArgs,
      orderBy: [{ category: "asc" }, { label: "asc" }],
      where: {
        modules: {
          some: {
            module: {
              spoVersionId,
              studyProgramId,
            },
          },
        },
      },
    });
  },
};
