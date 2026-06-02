import type { AssessmentSeed, CourseSeed, ElectiveSlotSeed, ModuleSeed, SourceRefSeed } from "./curriculum-seed-data";

type CurriculumDocumentSeed = {
  effectiveDate?: Date;
  fileName: string;
  filePath: string;
  id: string;
  pageCount: number;
  programCode: string;
  retrievedAt: Date;
  sha256: string;
  title: string;
  type: "MODULE_CATALOG" | "SPO_GENERAL" | "SPO_SPECIAL";
  versionLabel?: string;
};

export type CurriculumVersionSeed = {
  documents: CurriculumDocumentSeed[];
  electiveSlots: ElectiveSlotSeed[];
  modules: ModuleSeed[];
  programSourceRefs: SourceRefSeed[];
  semesters: Array<{ area: "ADVANCED" | "BASIC"; credits: number; number: number; title: string }>;
  specializations: Array<{ code: string; description?: string; id: string; name: string }>;
  spoVersion: {
    code: string;
    effectiveDate?: Date;
    id: string;
    isDefault?: boolean;
    label: string;
    retrievedAt?: Date;
    versionNumber: number;
  };
};

function exam(code: string, label: string, credits?: number, description?: string): AssessmentSeed {
  return { category: "EXAM", code, credits, description, label };
}

function coursework(code: string, label: string, credits?: number, description?: string): AssessmentSeed {
  return { category: "COURSEWORK", code, credits, description, label };
}

function course(title: string, kindCode: string, kindLabel: string, weeklyHours?: number): CourseSeed {
  return { kindCode, kindLabel, title, weeklyHours };
}

function slug(value: string) {
  return value
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/Ä/g, "Ae")
    .replace(/Ö/g, "Oe")
    .replace(/Ü/g, "Ue")
    .replace(/ß/g, "ss")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function sourceRef(documentId: string, page: number, locator: string): SourceRefSeed[] {
  return [{ documentId, locator, pageEnd: page, pageStart: page }];
}

function defaultTags(title: string, semesterNumber: number, credits: number, specializationCodes: string[], assessments: AssessmentSeed[]) {
  const assessmentTags = assessments.flatMap((assessment) => {
    if (assessment.code.includes("1K")) return ["klausur"];
    if (assessment.code.includes("1A")) return ["praktische-arbeit"];
    if (assessment.code.includes("1M")) return ["muendlich"];
    if (assessment.code.includes("1PN") || assessment.code.includes("1sbPN")) return ["praesentation"];
    if (assessment.code.includes("1sbR")) return ["referat"];
    if (assessment.code.includes("1sbB")) return ["bericht"];
    return [];
  });

  return Array.from(
    new Set([slug(title), `sem-${semesterNumber}`, `${credits}-lp`, ...specializationCodes.map((code) => code.toLowerCase()), ...assessmentTags]),
  );
}

function lecturePractice(title: string, lectureHours = 2, practiceHours = 2, practiceKind = "Praktikum"): CourseSeed[] {
  return [
    course(title, "V", "Vorlesung", lectureHours),
    course(`${title}, ${practiceKind}`, practiceKind === "Übung" ? "Ü" : "P", practiceKind, practiceHours),
  ];
}

function moduleSeed({
  area = "ADVANCED",
  assessments = [exam("1K", "Klausur", 3), coursework("1sbA", "Praktische Arbeit", 3)],
  courses,
  credits = 6,
  documentId,
  idSuffix,
  page,
  semesterNumber,
  sortOrder,
  specializationCodes = [],
  title,
}: {
  area?: ModuleSeed["area"];
  assessments?: AssessmentSeed[];
  courses?: CourseSeed[];
  credits?: number;
  documentId: string;
  idSuffix?: string;
  page: number;
  semesterNumber: number;
  sortOrder: number;
  specializationCodes?: string[];
  title: string;
}): ModuleSeed {
  const id = `${documentId.includes("V12") ? "spo12" : "spo13"}-${slug([title, idSuffix].filter(Boolean).join(" "))}`;

  return {
    area,
    assessments,
    courses: courses ?? lecturePractice(title),
    credits,
    duration: "1 Semester",
    frequency: "Jedes Semester",
    id,
    language: "Deutsch",
    semesterNumber,
    sortOrder,
    sourceRefs: sourceRef(documentId, page, title),
    specializationCodes,
    status: "PARSED",
    tags: defaultTags(title, semesterNumber, credits, specializationCodes, assessments),
    title,
    workloadHours: credits * 30,
  };
}

function electiveSlot(documentId: string, versionPrefix: "spo12" | "spo13", semesterNumber: number, sortOrder: number): ElectiveSlotSeed {
  const name = `Wahlpflichtmodul ${sortOrder}`;
  return {
    credits: 6,
    description: "Wahlpflichtveranstaltungen im Umfang von 6 LP nach SPO-Randbedingungen.",
    id: `${versionPrefix}-wahlpflichtmodul-${sortOrder}`,
    kind: "FREE_CHOICE",
    name,
    semesterNumber,
    sortOrder: 1,
    sourceRefs: sourceRef(documentId, semesterNumber === 6 ? 5 : 6, name),
  };
}

const semesters = [
  { area: "BASIC" as const, credits: 30, number: 1, title: "1. Lehrplansemester" },
  { area: "BASIC" as const, credits: 30, number: 2, title: "2. Lehrplansemester" },
  { area: "ADVANCED" as const, credits: 30, number: 3, title: "3. Lehrplansemester" },
  { area: "ADVANCED" as const, credits: 30, number: 4, title: "4. Lehrplansemester" },
  { area: "ADVANCED" as const, credits: 30, number: 5, title: "5. Lehrplansemester" },
  { area: "ADVANCED" as const, credits: 30, number: 6, title: "6. Lehrplansemester" },
  { area: "ADVANCED" as const, credits: 30, number: 7, title: "7. Lehrplansemester" },
];

const spo13DocumentId = "AIN_SPO_BT_2024_V13";
const spo12DocumentId = "AIN_SPO_BT_2023_V12";

export const legacyCurriculumSeeds: CurriculumVersionSeed[] = [
  {
    documents: [
      {
        effectiveDate: new Date("2024-01-24T00:00:00.000Z"),
        fileName: "AIN_SPO_13.pdf",
        filePath: "catalog/SPO13/AIN_SPO_13.pdf",
        id: spo13DocumentId,
        pageCount: 6,
        programCode: "AIN",
        retrievedAt: new Date("2026-06-02T00:00:00.000Z"),
        sha256: "91e0c0181fefe4431577948a7dfe0a41a6578b39374e90ffe1ed9cc1778d2921",
        title: "Besonderer Teil Allgemeine Informatik",
        type: "SPO_SPECIAL",
        versionLabel: "SPO Version 13, Stand 24.01.2024",
      },
      {
        fileName: "Modulkatalog_AIN_KIR_ITS.pdf",
        filePath: "catalog/SPO13/Modulkatalog_AIN_KIR_ITS.pdf",
        id: "AIN_MODULE_CATALOG_2024",
        pageCount: 116,
        programCode: "AIN",
        retrievedAt: new Date("2026-06-02T00:00:00.000Z"),
        sha256: "b8fcad91aab79d10ec49a380441b0232d9d1ac4ccdad3e9bb96464d12e6c1787",
        title: "Modulkatalog AIN, KIR und ITS",
        type: "MODULE_CATALOG",
        versionLabel: "Stand März 2024",
      },
    ],
    electiveSlots: [electiveSlot(spo13DocumentId, "spo13", 6, 1), electiveSlot(spo13DocumentId, "spo13", 7, 2)],
    modules: [
      moduleSeed({ area: "BASIC", documentId: spo13DocumentId, page: 2, semesterNumber: 1, sortOrder: 1, title: "Grundlagen der Informatik", courses: lecturePractice("Grundlagen der Informatik", 4, 2, "Übung"), assessments: [exam("1K", "Klausur", 4), coursework("1sbA", "Praktische Arbeit", 2)] }),
      moduleSeed({ area: "BASIC", documentId: spo13DocumentId, page: 2, semesterNumber: 1, sortOrder: 2, title: "Datenbanken", courses: lecturePractice("Datenbanken", 2, 4), assessments: [exam("1K", "Klausur", 2), coursework("1sbA", "Praktische Arbeit", 4)] }),
      moduleSeed({ area: "BASIC", documentId: spo13DocumentId, page: 2, semesterNumber: 1, sortOrder: 3, title: "Programmierung", courses: lecturePractice("Programmierung", 2, 4), assessments: [exam("1K", "Klausur", 2), coursework("1sbA", "Praktische Arbeit", 4)] }),
      moduleSeed({ area: "BASIC", documentId: spo13DocumentId, page: 2, semesterNumber: 1, sortOrder: 4, title: "Mathematik für Informatiker 1", courses: lecturePractice("Mathematik für Informatiker 1", 4, 2, "Übung"), assessments: [exam("1K", "Klausur", 4), coursework("1sbA", "Praktische Arbeit", 2)] }),
      moduleSeed({ area: "BASIC", documentId: spo13DocumentId, page: 2, semesterNumber: 1, sortOrder: 5, title: "Englisch Teil 1", credits: 3, courses: [course("Englisch", "V", "Vorlesung", 2)], assessments: [exam("1K", "Klausur", 2), coursework("1sbA", "Praktische Arbeit", 1)] }),
      moduleSeed({ area: "BASIC", documentId: spo13DocumentId, page: 2, semesterNumber: 1, sortOrder: 6, title: "Studienkompetenzen Teil 1", credits: 3, courses: [course("Lern- und Präsentationkompetenzen, Seminar", "S", "Seminar", 2)], assessments: [exam("1sbR", "Referat", 3)] }),
      moduleSeed({ area: "BASIC", documentId: spo13DocumentId, page: 3, semesterNumber: 2, sortOrder: 1, title: "Rechnerarchitektur und Betriebssysteme", courses: lecturePractice("Rechnerarchitektur und Betriebssysteme", 2, 4), assessments: [exam("1K", "Klausur", 2), coursework("1sbA", "Praktische Arbeit", 4)] }),
      moduleSeed({ area: "BASIC", documentId: spo13DocumentId, page: 3, semesterNumber: 2, sortOrder: 2, title: "Computernetze", courses: lecturePractice("Computernetze", 4, 2), assessments: [exam("1K", "Klausur", 4), coursework("1sbA", "Praktische Arbeit", 2)] }),
      moduleSeed({ area: "BASIC", documentId: spo13DocumentId, page: 3, semesterNumber: 2, sortOrder: 3, title: "Algorithmen und Datenstrukturen", courses: lecturePractice("Algorithmen und Datenstrukturen", 4, 2), assessments: [exam("1K", "Klausur", 4), coursework("1sbA", "Praktische Arbeit", 2)] }),
      moduleSeed({ area: "BASIC", documentId: spo13DocumentId, page: 3, semesterNumber: 2, sortOrder: 4, title: "Mathematik für Informatiker 2", courses: lecturePractice("Mathematik für Informatiker 2", 4, 2, "Übung"), assessments: [exam("1K", "Klausur", 4), coursework("1sbA", "Praktische Arbeit", 2)] }),
      moduleSeed({ area: "BASIC", documentId: spo13DocumentId, page: 3, semesterNumber: 2, sortOrder: 5, title: "Englisch Teil 2", credits: 3, courses: [course("Englisch", "V", "Vorlesung", 2)], assessments: [exam("1K", "Klausur", 2), coursework("1sbA", "Praktische Arbeit", 1)] }),
      moduleSeed({ area: "BASIC", documentId: spo13DocumentId, page: 3, semesterNumber: 2, sortOrder: 6, title: "Studienkompetenzen Teil 2", credits: 3, courses: [course("Digital- und Schreibkompetenzen, Seminar", "S", "Seminar", 2)], assessments: [exam("1sbR", "Referat", 3)] }),
      moduleSeed({ area: "SPECIALIZATION", documentId: spo13DocumentId, page: 4, semesterNumber: 3, sortOrder: 1, title: "Requirements Engineering", specializationCodes: ["SWE"], courses: [course("Requirements Engineering", "V", "Vorlesung", 2), course("Requirements Engineering, Seminar", "S", "Seminar", 2)], assessments: [exam("1K", "Klausur", 3), coursework("1sbR", "Referat", 3)] }),
      moduleSeed({ area: "SPECIALIZATION", documentId: spo13DocumentId, page: 4, semesterNumber: 3, sortOrder: 2, title: "Grundlagen der IT-Sicherheit", specializationCodes: ["CN"] }),
      moduleSeed({ area: "SPECIALIZATION", documentId: spo13DocumentId, page: 4, semesterNumber: 3, sortOrder: 3, title: "Open Source-basierte Softwareentwicklung", specializationCodes: ["SWE"] }),
      moduleSeed({ area: "SPECIALIZATION", documentId: spo13DocumentId, page: 4, semesterNumber: 3, sortOrder: 4, title: "Internetprotokolle", specializationCodes: ["CN"] }),
      moduleSeed({ documentId: spo13DocumentId, page: 4, semesterNumber: 3, sortOrder: 5, title: "Objektorientierte Programmierung" }),
      moduleSeed({ documentId: spo13DocumentId, page: 4, semesterNumber: 3, sortOrder: 6, title: "Automaten und Formale Sprachen" }),
      moduleSeed({ documentId: spo13DocumentId, page: 4, semesterNumber: 3, sortOrder: 7, title: "Software Engineering" }),
      moduleSeed({ area: "SPECIALIZATION", documentId: spo13DocumentId, page: 4, semesterNumber: 4, sortOrder: 1, title: "User Interfaces", specializationCodes: ["SWE"] }),
      moduleSeed({ area: "SPECIALIZATION", documentId: spo13DocumentId, page: 4, semesterNumber: 4, sortOrder: 2, title: "Netzwerkmanagement und -sicherheit", specializationCodes: ["CN"] }),
      moduleSeed({ area: "SPECIALIZATION", documentId: spo13DocumentId, page: 5, semesterNumber: 4, sortOrder: 3, title: "Software Engineering 2", specializationCodes: ["SWE"] }),
      moduleSeed({ area: "SPECIALIZATION", documentId: spo13DocumentId, page: 5, semesterNumber: 4, sortOrder: 4, title: "Plattformen für IoT", specializationCodes: ["CN"] }),
      moduleSeed({ documentId: spo13DocumentId, page: 5, semesterNumber: 4, sortOrder: 5, title: "Data Science" }),
      moduleSeed({ documentId: spo13DocumentId, page: 5, semesterNumber: 4, sortOrder: 6, title: "Projektmanagement", courses: [course("Projektmanagement", "V", "Vorlesung", 2), course("Projektmanagement, Seminar", "S", "Seminar", 2)], assessments: [exam("1K", "Klausur", 3), coursework("1sbR", "Referat", 3)] }),
      moduleSeed({ documentId: spo13DocumentId, page: 5, semesterNumber: 4, sortOrder: 7, title: "Softwareprojekt 1", courses: [course("Softwareprojekt 1", "W", "Workshop"), course("Softwareprojekt 1, Seminar", "S", "Seminar", 1)], assessments: [exam("1A", "Projektarbeit", 4), coursework("1sbR", "Referat", 2)] }),
      moduleSeed({ area: "INTERNSHIP", documentId: spo13DocumentId, page: 5, semesterNumber: 5, sortOrder: 1, title: "Praktisches Studiensemester", credits: 30, courses: [course("Einführung Praktisches Studiensemester", "S", "Seminar", 1), course("Praktisches Studiensemester", "W", "Praxisphase"), course("Praktisches Studiensemester, Seminar", "S", "Seminar", 1)], assessments: [coursework("1sbKO", "Kolloquium", 3), coursework("1sbA", "Praktische Arbeit", 24), coursework("1sbB", "Bericht", 3), coursework("1sbPN", "Präsentation", 3)] }),
      moduleSeed({ area: "SPECIALIZATION", documentId: spo13DocumentId, page: 5, semesterNumber: 6, sortOrder: 2, title: "Softwarearchitektur", specializationCodes: ["SWE"] }),
      moduleSeed({ area: "SPECIALIZATION", documentId: spo13DocumentId, page: 5, semesterNumber: 6, sortOrder: 3, title: "Drahtlose Netzwerke", specializationCodes: ["CN"] }),
      moduleSeed({ documentId: spo13DocumentId, page: 6, semesterNumber: 6, sortOrder: 4, title: "Maschinelles Lernen" }),
      moduleSeed({ documentId: spo13DocumentId, page: 6, semesterNumber: 6, sortOrder: 5, title: "Softwarequalität" }),
      moduleSeed({ documentId: spo13DocumentId, page: 6, semesterNumber: 6, sortOrder: 6, title: "Softwareprojekt 2", courses: [course("Softwareprojekt 2", "W", "Workshop"), course("Softwareprojekt 2, Seminar", "S", "Seminar", 1)], assessments: [exam("1A", "Projektarbeit", 4), coursework("1sbR", "Referat", 2)] }),
      moduleSeed({ documentId: spo13DocumentId, page: 6, semesterNumber: 7, sortOrder: 2, title: "Ausgewählte Fragen der Informatik", courses: [course("Ausgewählte Fragen der Informatik", "Pr", "Prüfung")], assessments: [exam("1M", "Mündliche Prüfung", 6)] }),
      moduleSeed({ area: "THESIS", documentId: spo13DocumentId, page: 6, semesterNumber: 7, sortOrder: 3, title: "Thesis", credits: 18, courses: [course("Thesis Vorbereitungsseminar", "S", "Seminar", 1), course("Bachelorarbeit", "W", "Abschlussarbeit"), course("Thesis Seminar", "S", "Seminar", 1)], assessments: [coursework("1sbKO", "Kolloquium", 3), exam("1T", "Bachelorarbeit", 12), exam("1PN", "Präsentation", 3)] }),
    ],
    programSourceRefs: [{ documentId: spo13DocumentId, locator: "§ 32 Bachelorstudiengang Allgemeine Informatik", pageEnd: 1, pageStart: 1 }],
    semesters,
    specializations: [
      { code: "SWE", description: "Software Engineering", id: "SPO13_AIN_SWE", name: "Software Engineering" },
      { code: "CN", description: "Computer Networking", id: "SPO13_AIN_CN", name: "Computer Networking" },
    ],
    spoVersion: {
      code: "SPO13",
      effectiveDate: new Date("2024-01-24T00:00:00.000Z"),
      id: "SPO13",
      label: "SPO Version 13",
      retrievedAt: new Date("2026-06-02T00:00:00.000Z"),
      versionNumber: 13,
    },
  },
  {
    documents: [
      {
        effectiveDate: new Date("2023-01-25T00:00:00.000Z"),
        fileName: "Allgemeine-Informatik_SPO-12_aktuell.pdf",
        filePath: "catalog/SPO12/Allgemeine-Informatik_SPO-12_aktuell.pdf",
        id: spo12DocumentId,
        pageCount: 8,
        programCode: "AIN",
        retrievedAt: new Date("2026-06-02T00:00:00.000Z"),
        sha256: "ee3d7a7794352fd3d74e965c0c25d238bdb9e389245f5f92325d61124e0120fa",
        title: "Besonderer Teil Allgemeine Informatik",
        type: "SPO_SPECIAL",
        versionLabel: "SPO Version 12, Stand 25.01.2023",
      },
    ],
    electiveSlots: [electiveSlot(spo12DocumentId, "spo12", 6, 1), electiveSlot(spo12DocumentId, "spo12", 7, 2)],
    modules: [
      moduleSeed({ area: "BASIC", documentId: spo12DocumentId, page: 2, semesterNumber: 1, sortOrder: 1, title: "Einführung in die Informatik", courses: lecturePractice("Einführung in die Informatik", 4, 2, "Übung"), assessments: [exam("1K", "Klausur", 4), coursework("1sbA", "Praktische Arbeit", 2)] }),
      moduleSeed({ area: "BASIC", documentId: spo12DocumentId, page: 2, semesterNumber: 1, sortOrder: 2, title: "Datenbanken", courses: lecturePractice("Datenbanken", 2, 4), assessments: [exam("1K", "Klausur", 2), coursework("1sbA", "Praktische Arbeit", 4)] }),
      moduleSeed({ area: "BASIC", documentId: spo12DocumentId, page: 2, semesterNumber: 1, sortOrder: 3, title: "Programmierung", courses: lecturePractice("Programmierung", 2, 4), assessments: [exam("1K", "Klausur", 2), coursework("1sbA", "Praktische Arbeit", 4)] }),
      moduleSeed({ area: "BASIC", documentId: spo12DocumentId, page: 2, semesterNumber: 1, sortOrder: 4, title: "Mathematik für Informatiker 1", courses: lecturePractice("Mathematik für Informatiker 1", 4, 2, "Übung"), assessments: [exam("1K", "Klausur", 4), coursework("1sbA", "Praktische Arbeit", 2)] }),
      moduleSeed({ area: "BASIC", documentId: spo12DocumentId, page: 2, semesterNumber: 1, sortOrder: 5, title: "Englisch Teil 1", credits: 3, courses: [course("Englisch", "S", "Seminar", 2)], assessments: [exam("1K", "Klausur", 2), coursework("1sbA", "Praktische Arbeit", 1)] }),
      moduleSeed({ area: "BASIC", documentId: spo12DocumentId, page: 3, semesterNumber: 1, sortOrder: 6, title: "Wissenschaftliches Arbeiten Teil 1", credits: 3, courses: [course("Lern- und Präsentationstechniken, Seminar", "S", "Seminar", 2)], assessments: [exam("1sbR", "Referat", 3)] }),
      moduleSeed({ area: "BASIC", documentId: spo12DocumentId, page: 3, semesterNumber: 2, sortOrder: 1, title: "Englisch Teil 2", credits: 3, courses: [course("Englisch", "S", "Seminar", 2)], assessments: [exam("1K", "Klausur", 2), coursework("1sbA", "Praktische Arbeit", 1)] }),
      moduleSeed({ area: "BASIC", documentId: spo12DocumentId, page: 3, semesterNumber: 2, sortOrder: 2, title: "Wissenschaftliches Arbeiten Teil 2", credits: 3, courses: [course("Wissenschaftliches Schreiben und Recherchieren, Seminar", "S", "Seminar", 2)], assessments: [exam("1sbR", "Referat", 3)] }),
      moduleSeed({ area: "BASIC", documentId: spo12DocumentId, page: 3, semesterNumber: 2, sortOrder: 3, title: "Plattformen für Autonome Systeme", courses: lecturePractice("Plattformen für Autonome Systeme", 2, 4), assessments: [exam("1K", "Klausur", 2), coursework("1sbA", "Praktische Arbeit", 4)] }),
      moduleSeed({ area: "BASIC", documentId: spo12DocumentId, page: 3, semesterNumber: 2, sortOrder: 4, title: "Computernetze", courses: lecturePractice("Computernetze", 4, 2), assessments: [exam("1K", "Klausur", 4), coursework("1sbA", "Praktische Arbeit", 2)] }),
      moduleSeed({ area: "BASIC", documentId: spo12DocumentId, page: 3, semesterNumber: 2, sortOrder: 5, title: "Algorithmen und Datenstrukturen", courses: lecturePractice("Algorithmen und Datenstrukturen", 4, 2), assessments: [exam("1K", "Klausur", 4), coursework("1sbA", "Praktische Arbeit", 2)] }),
      moduleSeed({ area: "BASIC", documentId: spo12DocumentId, page: 3, semesterNumber: 2, sortOrder: 6, title: "Mathematik für Informatiker 2", courses: lecturePractice("Mathematik für Informatiker 2", 4, 2, "Übung"), assessments: [exam("1K", "Klausur", 4), coursework("1sbA", "Praktische Arbeit", 2)] }),
      moduleSeed({ area: "SPECIALIZATION", documentId: spo12DocumentId, page: 4, semesterNumber: 3, sortOrder: 1, title: "Grundlagen der IT-Sicherheit", specializationCodes: ["NITS"] }),
      moduleSeed({ area: "SPECIALIZATION", documentId: spo12DocumentId, page: 4, semesterNumber: 3, sortOrder: 2, title: "Rechnerarchitektur", specializationCodes: ["RAS"] }),
      moduleSeed({ area: "SPECIALIZATION", documentId: spo12DocumentId, page: 4, semesterNumber: 3, sortOrder: 3, title: "User Interfaces", specializationCodes: ["SWE"] }),
      moduleSeed({ area: "SPECIALIZATION", documentId: spo12DocumentId, page: 4, semesterNumber: 3, sortOrder: 4, title: "Data Science", idSuffix: "KI", specializationCodes: ["KI"] }),
      moduleSeed({ area: "SPECIALIZATION", documentId: spo12DocumentId, page: 4, semesterNumber: 3, sortOrder: 5, title: "Computernetze 2", specializationCodes: ["NITS"] }),
      moduleSeed({ area: "SPECIALIZATION", documentId: spo12DocumentId, page: 4, semesterNumber: 3, sortOrder: 6, title: "Open Source-basierte Softwareentwicklung", specializationCodes: ["SWE"] }),
      moduleSeed({ area: "SPECIALIZATION", documentId: spo12DocumentId, page: 4, semesterNumber: 3, sortOrder: 7, title: "Grundlagen der Robotik", specializationCodes: ["RAS"] }),
      moduleSeed({ area: "SPECIALIZATION", documentId: spo12DocumentId, page: 4, semesterNumber: 3, sortOrder: 8, title: "Maschinelles Lernen", idSuffix: "KI", specializationCodes: ["KI"] }),
      moduleSeed({ documentId: spo12DocumentId, page: 5, semesterNumber: 3, sortOrder: 9, title: "Software Engineering" }),
      moduleSeed({ documentId: spo12DocumentId, page: 5, semesterNumber: 3, sortOrder: 10, title: "Automaten und Formale Sprachen" }),
      moduleSeed({ documentId: spo12DocumentId, page: 5, semesterNumber: 3, sortOrder: 11, title: "Objektorientierte Programmierung" }),
      moduleSeed({ area: "SPECIALIZATION", documentId: spo12DocumentId, page: 5, semesterNumber: 4, sortOrder: 1, title: "Modellierung von Autonomen Systemen", specializationCodes: ["RAS"] }),
      moduleSeed({ area: "SPECIALIZATION", documentId: spo12DocumentId, page: 5, semesterNumber: 4, sortOrder: 2, title: "Netzwerksicherheit", specializationCodes: ["NITS"] }),
      moduleSeed({ area: "SPECIALIZATION", documentId: spo12DocumentId, page: 5, semesterNumber: 4, sortOrder: 3, title: "Data Science", idSuffix: "SWE", specializationCodes: ["SWE"] }),
      moduleSeed({ area: "SPECIALIZATION", documentId: spo12DocumentId, page: 5, semesterNumber: 4, sortOrder: 4, title: "Deep Learning", specializationCodes: ["KI"] }),
      moduleSeed({ area: "SPECIALIZATION", documentId: spo12DocumentId, page: 6, semesterNumber: 4, sortOrder: 5, title: "Maschinelles Lernen", idSuffix: "RAS", specializationCodes: ["RAS"] }),
      moduleSeed({ area: "SPECIALIZATION", documentId: spo12DocumentId, page: 6, semesterNumber: 4, sortOrder: 6, title: "Netzwerkmanagement", specializationCodes: ["NITS"] }),
      moduleSeed({ area: "SPECIALIZATION", documentId: spo12DocumentId, page: 6, semesterNumber: 4, sortOrder: 7, title: "Software Engineering 2", specializationCodes: ["SWE"] }),
      moduleSeed({ area: "SPECIALIZATION", documentId: spo12DocumentId, page: 6, semesterNumber: 4, sortOrder: 8, title: "Künstliche Intelligenz für Cyber Security", idSuffix: "KI", specializationCodes: ["KI"] }),
      moduleSeed({ documentId: spo12DocumentId, page: 6, semesterNumber: 4, sortOrder: 9, title: "Projektmanagement", courses: [course("Projektmanagement", "V", "Vorlesung", 2), course("Projektmanagement, Seminar", "S", "Seminar", 2)], assessments: [exam("1K", "Klausur", 3), coursework("1sbR", "Referat", 3)] }),
      moduleSeed({ documentId: spo12DocumentId, page: 6, semesterNumber: 4, sortOrder: 10, title: "Betriebssysteme" }),
      moduleSeed({ documentId: spo12DocumentId, page: 6, semesterNumber: 4, sortOrder: 11, title: "Softwareprojekt 1", courses: [course("Softwareprojekt 1", "W", "Workshop"), course("Softwareprojekt 1, Seminar", "S", "Seminar", 1)], assessments: [exam("1A", "Projektarbeit", 4), coursework("1sbR", "Referat", 2)] }),
      moduleSeed({ area: "INTERNSHIP", documentId: spo12DocumentId, page: 6, semesterNumber: 5, sortOrder: 1, title: "Praktisches Studiensemester", credits: 30, courses: [course("Einführung Praktisches Studiensemester", "S", "Seminar", 1), course("Praktisches Studiensemester", "W", "Praxisphase"), course("Praktisches Studiensemester, Seminar", "S", "Seminar", 1)], assessments: [coursework("1sbKO", "Kolloquium", 3), coursework("1sbA", "Praktische Arbeit", 24), coursework("1sbB", "Bericht", 3), coursework("1sbPN", "Präsentation", 3)] }),
      moduleSeed({ area: "SPECIALIZATION", documentId: spo12DocumentId, page: 7, semesterNumber: 6, sortOrder: 2, title: "Künstliche Intelligenz für Cyber Security", idSuffix: "NITS", specializationCodes: ["NITS"] }),
      moduleSeed({ area: "SPECIALIZATION", documentId: spo12DocumentId, page: 7, semesterNumber: 6, sortOrder: 3, title: "Autonome Roboter", specializationCodes: ["RAS", "KI"] }),
      moduleSeed({ area: "SPECIALIZATION", documentId: spo12DocumentId, page: 7, semesterNumber: 6, sortOrder: 4, title: "Softwarearchitektur", specializationCodes: ["SWE"] }),
      moduleSeed({ documentId: spo12DocumentId, page: 7, semesterNumber: 6, sortOrder: 5, title: "Softwarequalität" }),
      moduleSeed({ documentId: spo12DocumentId, page: 7, semesterNumber: 6, sortOrder: 6, title: "Allgemeine BWL" }),
      moduleSeed({ documentId: spo12DocumentId, page: 7, semesterNumber: 6, sortOrder: 7, title: "Softwareprojekt 2", courses: [course("Softwareprojekt 2", "W", "Workshop"), course("Softwareprojekt 2, Seminar", "S", "Seminar", 1)], assessments: [exam("1A", "Projektarbeit", 4), coursework("1sbR", "Referat", 2)] }),
      moduleSeed({ documentId: spo12DocumentId, page: 7, semesterNumber: 7, sortOrder: 2, title: "Ausgewählte Fragen der Informatik", courses: [course("Ausgewählte Fragen der Informatik", "Pr", "Prüfung")], assessments: [exam("1M", "Mündliche Prüfung", 6)] }),
      moduleSeed({ area: "THESIS", documentId: spo12DocumentId, page: 8, semesterNumber: 7, sortOrder: 3, title: "Thesis", credits: 18, courses: [course("Thesis Vorbereitungsseminar", "S", "Seminar", 1), course("Bachelorarbeit", "W", "Abschlussarbeit"), course("Thesis Seminar", "S", "Seminar", 1)], assessments: [coursework("1sbKO", "Kolloquium", 3), exam("1T", "Bachelorarbeit", 12), exam("1sbPN", "Präsentation", 3)] }),
    ],
    programSourceRefs: [{ documentId: spo12DocumentId, locator: "§ 32 Bachelorstudiengang Allgemeine Informatik", pageEnd: 1, pageStart: 1 }],
    semesters,
    specializations: [
      { code: "SWE", description: "Software Engineering", id: "SPO12_AIN_SWE", name: "Software Engineering" },
      { code: "NITS", description: "Netze und IT-Sicherheit", id: "SPO12_AIN_NITS", name: "Netze und IT-Sicherheit" },
      { code: "RAS", description: "Robotik und Autonome Systeme", id: "SPO12_AIN_RAS", name: "Robotik und Autonome Systeme" },
      { code: "KI", description: "Künstliche Intelligenz", id: "SPO12_AIN_KI", name: "Künstliche Intelligenz" },
    ],
    spoVersion: {
      code: "SPO12",
      effectiveDate: new Date("2023-01-25T00:00:00.000Z"),
      id: "SPO12",
      label: "SPO Version 12",
      retrievedAt: new Date("2026-06-02T00:00:00.000Z"),
      versionNumber: 12,
    },
  },
];

export default { legacyCurriculumSeeds };
