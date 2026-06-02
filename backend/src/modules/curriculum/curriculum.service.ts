import { badRequest, notFound } from "../../shared/http/http-error";
import {
  mapElectiveSlot,
  mapModule,
  mapProgram,
  mapSemester,
  mapSpecialization,
  mapSpoVersion,
  mapTag,
} from "./curriculum.mapper";
import {
  curriculumRepository,
  type CurriculumModulePrerequisiteRecord,
  type CurriculumModuleRecord,
} from "./curriculum.repository";

type ModuleFilters = {
  area?: string;
  assessmentType?: string;
  credits?: number;
  language?: string;
  semester?: number;
  specialization?: string;
  spoVersion?: string;
  tag?: string;
};

type GraphFilters = {
  includeTags: boolean;
  semester?: number;
  specialization?: string;
  spoVersion?: string;
};

type GraphNodeType = "electiveSlot" | "module" | "program" | "semester" | "specialization" | "tag";
type GraphEdgeType =
  | "BELONGS_TO_SPECIALIZATION"
  | "CAN_FILL_SLOT"
  | "CONTAINS"
  | "REQUIRES"
  | "SCHEDULED_IN"
  | "TAGGED_WITH";

function normalizeFilterValue(value: string) {
  return value.trim().toLowerCase();
}

function normalizeProgramCode(code: string) {
  return code.trim().toUpperCase();
}

function normalizeSpoVersionCode(code: string) {
  return code.trim().toUpperCase();
}

function parseOptionalNumber(value: string | undefined, errorMessage: string) {
  const parsed = value ? Number(value) : undefined;

  if (typeof parsed === "number" && Number.isNaN(parsed)) {
    throw badRequest(errorMessage);
  }

  return parsed;
}

function matchesAssessmentType(module: CurriculumModuleRecord, assessmentType: string) {
  const normalized = normalizeFilterValue(assessmentType);

  return module.assessments.some((assessment: CurriculumModuleRecord["assessments"][number]) => {
    const compactCode = assessment.code.toLowerCase();
    const compactLabel = assessment.label.toLowerCase();
    return compactCode === normalized || compactLabel.includes(normalized);
  });
}

function matchesSpecialization(module: CurriculumModuleRecord, specialization: string) {
  const normalized = normalizeFilterValue(specialization);

  return module.specializations.some((entry: CurriculumModuleRecord["specializations"][number]) => {
    const code = entry.specialization.code.toLowerCase();
    const name = entry.specialization.name.toLowerCase();
    return code === normalized || name.includes(normalized);
  });
}

function matchesTag(module: CurriculumModuleRecord, tag: string) {
  const normalized = normalizeFilterValue(tag);

  return module.tags.some(
    (entry: CurriculumModuleRecord["tags"][number]) =>
      entry.tag.id === normalized || entry.tag.label.toLowerCase() === normalized,
  );
}

function filterModules(modules: CurriculumModuleRecord[], filters: ModuleFilters) {
  return modules.filter((module: CurriculumModuleRecord) => {
    if (typeof filters.semester === "number" && module.semester?.number !== filters.semester) {
      return false;
    }

    if (typeof filters.credits === "number" && module.credits !== filters.credits) {
      return false;
    }

    if (filters.area && module.area.toLowerCase() !== normalizeFilterValue(filters.area)) {
      return false;
    }

    if (filters.language && (module.language ?? "").toLowerCase() !== normalizeFilterValue(filters.language)) {
      return false;
    }

    if (filters.specialization && !matchesSpecialization(module, filters.specialization)) {
      return false;
    }

    if (filters.assessmentType && !matchesAssessmentType(module, filters.assessmentType)) {
      return false;
    }

    if (filters.tag && !matchesTag(module, filters.tag)) {
      return false;
    }

    return true;
  });
}

function mapGraphModuleNode(module: CurriculumModuleRecord) {
  return {
    area: module.area,
    credits: module.credits,
    id: `module:${module.id}`,
    label: module.title,
    semesterNumber: module.semester?.number ?? null,
    type: "module" satisfies GraphNodeType,
  };
}

function mapGraphSemesterNode(semester: { area: string; credits: number; number: number; title: string }) {
  return {
    area: semester.area,
    credits: semester.credits,
    id: `semester:${semester.number}`,
    label: semester.title,
    number: semester.number,
    type: "semester" satisfies GraphNodeType,
  };
}

function mapGraphSpecializationNode(specialization: { code: string; name: string }) {
  return {
    code: specialization.code,
    id: `specialization:${specialization.code}`,
    label: specialization.name,
    type: "specialization" satisfies GraphNodeType,
  };
}

function mapGraphTagNode(tag: { category: string; id: string; label: string }) {
  return {
    category: tag.category,
    id: `tag:${tag.id}`,
    label: tag.label,
    type: "tag" satisfies GraphNodeType,
  };
}

function mapGraphSlotNode(slot: { credits: number; id: string; kind: string; name: string; semester: { number: number } }) {
  return {
    credits: slot.credits,
    id: `slot:${slot.id}`,
    kind: slot.kind,
    label: slot.name,
    semesterNumber: slot.semester.number,
    type: "electiveSlot" satisfies GraphNodeType,
  };
}

function addGraphEdge(
  edges: Array<{ from: string; id: string; to: string; type: GraphEdgeType }>,
  from: string,
  to: string,
  type: GraphEdgeType,
) {
  edges.push({
    from,
    id: `${type}:${from}->${to}`,
    to,
    type,
  });
}

async function getCurriculumScope(programCode: string, spoVersionCode?: string) {
  const program = await curriculumRepository.getProgramByCode(normalizeProgramCode(programCode));

  if (!program) {
    throw notFound("Study program not found.");
  }

  const spoVersion = spoVersionCode
    ? await curriculumRepository.getSpoVersionByCode(program.id, normalizeSpoVersionCode(spoVersionCode))
    : await curriculumRepository.getDefaultSpoVersion(program.id);

  if (!spoVersion) {
    throw notFound("SPO version not found.");
  }

  return { program, spoVersion };
}

async function getProgramRecord(programCode: string, spoVersionCode?: string) {
  const scope = await getCurriculumScope(programCode, spoVersionCode);
  const program = await curriculumRepository.getProgramSnapshotById(scope.program.id, scope.spoVersion.id);

  if (!program) {
    throw notFound("Study program not found.");
  }

  return { program, spoVersion: scope.spoVersion };
}

export async function getProgram(programCode: string, spoVersionCode?: string) {
  return mapProgram((await getProgramRecord(programCode, spoVersionCode)).program);
}

export async function getProgramModule(programCode: string, moduleId: string, spoVersionCode?: string) {
  const scope = await getCurriculumScope(programCode, spoVersionCode);
  const module = await curriculumRepository.getModuleById(scope.program.id, scope.spoVersion.id, moduleId);

  if (!module) {
    throw notFound("Module not found.");
  }

  return mapModule(module);
}

export async function getProgramGraph(programCode: string, filters: GraphFilters) {
  const { program, spoVersion } = await getProgramRecord(programCode, filters.spoVersion);
  const [modules, semesters, specializations, electiveSlots, prerequisites] = await Promise.all([
    curriculumRepository.listModules(program.id, spoVersion.id),
    curriculumRepository.listSemesters(program.id, spoVersion.id),
    curriculumRepository.listSpecializations(program.id, spoVersion.id),
    curriculumRepository.listElectiveSlots(program.id, spoVersion.id),
    curriculumRepository.listModulePrerequisites(program.id, spoVersion.id),
  ]);

  const scopedModules = filterModules(modules, {
    semester: filters.semester,
    specialization: filters.specialization,
  });
  const moduleMap = new Map(modules.map((module) => [module.id, module]));
  const scopedModuleIds = new Set(scopedModules.map((module) => module.id));
  const requiredPrerequisites = prerequisites.filter((entry: CurriculumModulePrerequisiteRecord) =>
    scopedModuleIds.has(entry.sourceModuleId),
  );

  const graphModules = new Map(scopedModules.map((module) => [module.id, module]));

  for (const prerequisite of requiredPrerequisites) {
    const prerequisiteTarget = moduleMap.get(prerequisite.targetModuleId);

    if (prerequisiteTarget) {
      graphModules.set(prerequisite.targetModuleId, prerequisiteTarget);
    }
  }

  const graphModuleIds = new Set(graphModules.keys());
  const graphSemesterNumbers = new Set<number>();

  for (const module of graphModules.values()) {
    if (module.semester?.number) {
      graphSemesterNumbers.add(module.semester.number);
    }
  }

  const graphSlots = electiveSlots.filter((slot) =>
    typeof filters.semester === "number"
      ? slot.semester.number === filters.semester
      : graphSemesterNumbers.has(slot.semester.number),
  );

  for (const slot of graphSlots) {
    graphSemesterNumbers.add(slot.semester.number);
  }

  const graphSemesters = semesters.filter((semester) => graphSemesterNumbers.has(semester.number));
  const graphSpecializations = specializations.filter((specialization) =>
    Array.from(graphModules.values()).some((module) =>
      module.specializations.some((entry) => entry.specialization.code === specialization.code),
    ),
  );
  const graphTags = filters.includeTags
    ? Array.from(
        new Map(
          Array.from(graphModules.values())
            .flatMap((module) => module.tags.map((entry) => [entry.tag.id, entry.tag] as const)),
        ).values(),
      )
    : [];

  const nodes = [
    {
      code: program.code,
      credits: program.totalCredits,
      id: `program:${program.id}`,
      label: program.name,
      regularSemesters: program.regularSemesters,
      type: "program" satisfies GraphNodeType,
    },
    ...graphSemesters.map((semester) => mapGraphSemesterNode({
      area: semester.area,
      credits: semester.credits,
      number: semester.number,
      title: semester.title,
    })),
    ...Array.from(graphModules.values()).map(mapGraphModuleNode),
    ...graphSpecializations.map((specialization) =>
      mapGraphSpecializationNode({ code: specialization.code, name: specialization.name }),
    ),
    ...graphSlots.map(mapGraphSlotNode),
    ...graphTags.map(mapGraphTagNode),
  ];

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges: Array<{ from: string; id: string; to: string; type: GraphEdgeType }> = [];

  for (const semester of graphSemesters) {
    addGraphEdge(edges, `program:${program.id}`, `semester:${semester.number}`, "CONTAINS");
  }

  for (const module of graphModules.values()) {
    if (module.semester?.number && nodeIds.has(`semester:${module.semester.number}`)) {
      addGraphEdge(edges, `semester:${module.semester.number}`, `module:${module.id}`, "SCHEDULED_IN");
    }

    for (const specialization of module.specializations) {
      const specializationNodeId = `specialization:${specialization.specialization.code}`;

      if (nodeIds.has(specializationNodeId)) {
        addGraphEdge(edges, specializationNodeId, `module:${module.id}`, "BELONGS_TO_SPECIALIZATION");
      }
    }

    if (filters.includeTags) {
      for (const tag of module.tags) {
        const tagNodeId = `tag:${tag.tag.id}`;

        if (nodeIds.has(tagNodeId)) {
          addGraphEdge(edges, `module:${module.id}`, tagNodeId, "TAGGED_WITH");
        }
      }
    }
  }

  for (const prerequisite of requiredPrerequisites) {
    if (graphModuleIds.has(prerequisite.sourceModuleId) && graphModuleIds.has(prerequisite.targetModuleId)) {
      addGraphEdge(
        edges,
        `module:${prerequisite.sourceModuleId}`,
        `module:${prerequisite.targetModuleId}`,
        "REQUIRES",
      );
    }
  }

  for (const slot of graphSlots) {
    addGraphEdge(edges, `semester:${slot.semester.number}`, `slot:${slot.id}`, "CONTAINS");
  }

  return {
    edges,
    meta: {
      filters: {
        includeTags: filters.includeTags,
        semester: filters.semester ?? null,
        specialization: filters.specialization ?? null,
        spoVersion: spoVersion.code,
      },
      sourceRefs: mapProgram(program).sourceRefs,
      stats: {
        edgeCount: edges.length,
        moduleCount: Array.from(graphModules.values()).length,
        nodeCount: nodes.length,
      },
    },
    nodes,
  };
}

export async function listElectiveSlots(programCode: string, spoVersionCode?: string) {
  const scope = await getCurriculumScope(programCode, spoVersionCode);
  const slots = await curriculumRepository.listElectiveSlots(scope.program.id, scope.spoVersion.id);
  return slots.map(mapElectiveSlot);
}

export async function listModules(programCode: string, filters: ModuleFilters) {
  const scope = await getCurriculumScope(programCode, filters.spoVersion);
  const modules = await curriculumRepository.listModules(scope.program.id, scope.spoVersion.id);
  return filterModules(modules, filters).map(mapModule);
}

export async function listProgramSemesters(programCode: string, spoVersionCode?: string) {
  const scope = await getCurriculumScope(programCode, spoVersionCode);
  const semesters = await curriculumRepository.listSemesters(scope.program.id, scope.spoVersion.id);
  return semesters.map(mapSemester);
}

export async function listSpecializations(programCode: string, spoVersionCode?: string) {
  const scope = await getCurriculumScope(programCode, spoVersionCode);
  const specializations = await curriculumRepository.listSpecializations(scope.program.id, scope.spoVersion.id);
  return specializations.map(mapSpecialization);
}

export async function listSpoVersions(programCode: string) {
  const program = await curriculumRepository.getProgramByCode(normalizeProgramCode(programCode));

  if (!program) {
    throw notFound("Study program not found.");
  }

  const spoVersions = await curriculumRepository.listSpoVersions(program.id);
  return spoVersions.map(mapSpoVersion);
}

export async function listTags(programCode: string, spoVersionCode?: string) {
  const scope = await getCurriculumScope(programCode, spoVersionCode);
  const tags = await curriculumRepository.listTags(scope.program.id, scope.spoVersion.id);
  return tags.map(mapTag);
}

export function parseGraphFilters(filters: Record<string, string | undefined>): GraphFilters {
  return {
    includeTags: filters.includeTags === "true",
    semester: parseOptionalNumber(filters.semester, "Invalid semester filter."),
    specialization: filters.specialization,
    spoVersion: filters.spoVersion,
  };
}

export function parseModuleFilters(filters: Record<string, string | undefined>): ModuleFilters {
  return {
    area: filters.area,
    assessmentType: filters.assessmentType,
    credits: parseOptionalNumber(filters.credits, "Invalid credits filter."),
    language: filters.language,
    semester: parseOptionalNumber(filters.semester, "Invalid semester filter."),
    specialization: filters.specialization,
    spoVersion: filters.spoVersion,
    tag: filters.tag,
  };
}
