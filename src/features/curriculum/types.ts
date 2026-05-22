export type CurriculumSourceRef = {
  document: {
    fileName: string;
    id: string;
    pageCount: number;
    title: string;
    type: string;
    versionLabel?: string | null;
  };
  locator?: string | null;
  note?: string | null;
  pageEnd: number;
  pageStart: number;
};

export type CurriculumModule = {
  area: string;
  assessments: Array<{
    category: string;
    code: string;
    credits?: number | null;
    description?: string | null;
    label: string;
  }>;
  contactHours?: number | null;
  courses: Array<{
    kindCode: string;
    kindLabel: string;
    title: string;
    weeklyHours?: number | null;
  }>;
  credits: number;
  duration?: string | null;
  frequency?: string | null;
  id: string;
  language?: string | null;
  prerequisiteModules: Array<{
    id: string;
    semesterNumber: number | null;
    title: string;
  }>;
  prerequisites: string[];
  semester: {
    credits: number;
    number: number;
    title: string;
  } | null;
  sourceRefs: CurriculumSourceRef[];
  specializations: Array<{
    code: string;
    id: string;
    name: string;
  }>;
  status: string;
  tags: Array<{
    category: string;
    id: string;
    label: string;
  }>;
  title: string;
  workloadHours?: number | null;
};

export type CurriculumSemester = {
  area: string;
  credits: number;
  electiveSlots: Array<{
    candidateModules: Array<{
      area: string;
      id: string;
      semesterNumber: number | null;
      specializations: string[];
      title: string;
    }>;
    credits: number;
    description?: string | null;
    id: string;
    kind: string;
    name: string;
    semester: {
      credits: number;
      number: number;
      title: string;
    };
    sourceRefs: CurriculumSourceRef[];
    status: string;
  }>;
  id: number;
  modules: CurriculumModule[];
  number: number;
  title: string;
};

export type CurriculumProgram = {
  basicStudySemesters: number;
  bilingual: boolean;
  code: string;
  degree: string;
  id: string;
  name: string;
  regularSemesters: number;
  sourceRefs: CurriculumSourceRef[];
  specializations: Array<{
    code: string;
    description?: string | null;
    id: string;
    name: string;
  }>;
  totalCredits: number;
};

export type CurriculumElectiveSlot = CurriculumSemester['electiveSlots'][number];

export type CurriculumTag = {
  category: string;
  id: string;
  label: string;
  moduleCount: number;
};

export type CurriculumSpecialization = {
  code: string;
  description?: string | null;
  id: string;
  modules: Array<{
    id: string;
    semesterNumber: number | null;
    title: string;
  }>;
  name: string;
};

export type CurriculumGraphNode = {
  area?: string;
  category?: string;
  code?: string;
  credits?: number;
  id: string;
  kind?: string;
  label: string;
  number?: number;
  regularSemesters?: number;
  semesterNumber?: number | null;
  type: 'electiveSlot' | 'module' | 'program' | 'semester' | 'specialization' | 'tag';
};

export type CurriculumGraphEdge = {
  from: string;
  id: string;
  to: string;
  type: 'BELONGS_TO_SPECIALIZATION' | 'CAN_FILL_SLOT' | 'CONTAINS' | 'REQUIRES' | 'SCHEDULED_IN' | 'TAGGED_WITH';
};

export type CurriculumGraph = {
  edges: CurriculumGraphEdge[];
  meta: {
    filters: {
      includeTags: boolean;
      semester: number | null;
      specialization: string | null;
    };
    sourceRefs: CurriculumSourceRef[];
    stats: {
      edgeCount: number;
      moduleCount: number;
      nodeCount: number;
    };
  };
  nodes: CurriculumGraphNode[];
};
