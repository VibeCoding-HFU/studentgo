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
      ...programArgs,
      where: { code },
    });
  },

  getModuleById(studyProgramId: string, id: string) {
    return prisma.curriculumModule.findFirst({
      ...curriculumModuleArgs,
      where: {
        id,
        studyProgramId,
      },
    });
  },

  listElectiveSlots(studyProgramId: string) {
    return prisma.electiveSlot.findMany({
      ...electiveSlotArgs,
      orderBy: [{ semester: { number: "asc" } }, { sortOrder: "asc" }],
      where: { studyProgramId },
    });
  },

  listModules(studyProgramId: string) {
    return prisma.curriculumModule.findMany({
      ...curriculumModuleArgs,
      orderBy: [{ semester: { number: "asc" } }, { sortOrder: "asc" }, { title: "asc" }],
      where: { studyProgramId },
    });
  },

  listModulePrerequisites(studyProgramId: string) {
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
          studyProgramId,
        },
      },
    });
  },

  listSemesters(studyProgramId: string) {
    return prisma.programSemester.findMany({
      ...semesterArgs,
      orderBy: { number: "asc" },
      where: { studyProgramId },
    });
  },

  listSpecializations(studyProgramId: string) {
    return prisma.specialization.findMany({
      ...specializationArgs,
      orderBy: { code: "asc" },
      where: { studyProgramId },
    });
  },

  listTags(studyProgramId: string) {
    return prisma.curriculumTag.findMany({
      ...tagArgs,
      orderBy: [{ category: "asc" }, { label: "asc" }],
      where: {
        modules: {
          some: {
            module: {
              studyProgramId,
            },
          },
        },
      },
    });
  },
};
