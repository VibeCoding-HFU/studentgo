export type AssessmentSeed = {
  category: "COURSEWORK" | "EXAM";
  code: string;
  credits?: number;
  description?: string;
  label: string;
};

export type CourseSeed = {
  kindCode: string;
  kindLabel: string;
  title: string;
  weeklyHours?: number;
};

export type SourceRefSeed = {
  documentId: string;
  locator?: string;
  note?: string;
  pageEnd: number;
  pageStart: number;
};

export type ModuleSeed = {
  area: "ADVANCED" | "BASIC" | "INTERNSHIP" | "SPECIALIZATION" | "THESIS";
  assessments: AssessmentSeed[];
  contactHours?: number;
  courses: CourseSeed[];
  credits: number;
  duration?: string;
  frequency?: string;
  id: string;
  language?: string;
  prerequisitesText?: string;
  prerequisiteModuleIds?: string[];
  selfStudyHours?: number;
  semesterNumber: number;
  sortOrder: number;
  sourceRefs: SourceRefSeed[];
  specializationCodes?: string[];
  status?: "NEEDS_REVIEW" | "NORMALIZED" | "PARSED" | "RAW" | "VALIDATED";
  tags: string[];
  title: string;
  workloadHours?: number;
};

export type ElectiveSlotSeed = {
  candidateModuleIds?: string[];
  credits: number;
  description: string;
  id: string;
  kind: "FACULTY_CATALOG" | "FREE_CHOICE";
  name: string;
  semesterNumber: number;
  sortOrder: number;
  sourceRefs: SourceRefSeed[];
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

function sourceRefs(spoPageStart: number, spoPageEnd: number, catalogPage: number, locator: string): SourceRefSeed[] {
  return [
    {
      documentId: "AIN_SPO_BT_2026_V14",
      locator,
      pageEnd: spoPageEnd,
      pageStart: spoPageStart,
    },
    {
      documentId: "AIN_MODULE_CATALOG_2026",
      locator,
      pageEnd: catalogPage,
      pageStart: catalogPage,
    },
  ];
}

function moduleSeed(seed: ModuleSeed): ModuleSeed {
  return {
    duration: "1 Semester",
    frequency: "Jedes Semester",
    language: "Deutsch",
    status: "VALIDATED",
    workloadHours: seed.credits * 30,
    ...seed,
  };
}

export const curriculumSeed = {
  documents: [
    {
      effectiveDate: new Date("2026-02-24T00:00:00.000Z"),
      fileName: "AllgemeinerTeil_Bachelor_aktuell_23032026.pdf",
      filePath: "catalog/SPO14/AllgemeinerTeil_Bachelor_aktuell_23032026.pdf",
      id: "HFU_BACHELOR_SPO_2026",
      pageCount: 32,
      programCode: "AIN",
      retrievedAt: new Date("2026-05-19T00:00:00.000Z"),
      sha256: "63be85b607cf213e55ff744e30def3ab5235cff8459c96c495d8429093c9e1ae",
      title: "Allgemeiner Teil Bachelor-SPO",
      type: "SPO_GENERAL" as const,
      versionLabel: "Stand 23.02.2026, letzte Änderung 20.03.2026",
    },
    {
      effectiveDate: new Date("2026-02-24T00:00:00.000Z"),
      fileName: "Allgemeine_Informatik_SPO-BT.pdf",
      filePath: "catalog/SPO14/Allgemeine_Informatik_SPO-BT.pdf",
      id: "AIN_SPO_BT_2026_V14",
      pageCount: 7,
      programCode: "AIN",
      retrievedAt: new Date("2026-05-19T00:00:00.000Z"),
      sha256: "4e15222c26d47d5dd222444650b77c0037b00776419c714c100cea85764b17ea",
      title: "Besonderer Teil Allgemeine Informatik",
      type: "SPO_SPECIAL" as const,
      versionLabel: "SPO Version 14, nach Akkreditierung 15.04.2026",
    },
    {
      fileName: "AIN_Modulkatalog-Allgemeine-Informatik.pdf",
      filePath: "catalog/SPO14/AIN_Modulkatalog-Allgemeine-Informatik.pdf",
      id: "AIN_MODULE_CATALOG_2026",
      pageCount: 67,
      programCode: "AIN",
      retrievedAt: new Date("2026-05-19T00:00:00.000Z"),
      sha256: "07a1fa6b80ef2564d93137c5341af08e558411cd99cd14e97b2119f5d953e843",
      title: "Modulkatalog Allgemeine Informatik B.Sc.",
      type: "MODULE_CATALOG" as const,
      versionLabel: "Stand April 2026",
    },
  ],
  electiveSlots: [
    {
      credits: 6,
      candidateModuleIds: [
        "ain-objektorientierte-programmierung",
        "ain-stochastik-und-optimierung",
        "ain-grundlagen-der-medieninformatik",
        "ain-formale-methoden-swe",
        "ain-deep-learning",
        "ain-verteilte-anwendungen",
        "ain-open-source-basierte-softwareentwicklung",
        "ain-modellierung-autonomer-systeme",
        "ain-human-computer-interaction",
        "ain-plattformen-fuer-iot",
        "ain-formale-methoden-aai",
        "ain-fortgeschrittene-programmierung-fuer-medieninformatiker",
      ],
      description: "Lehrveranstaltungen aus dem fachspezifischen Katalog im Umfang von 6 LP.",
      id: "ain-wahlpflichtmodul-1",
      kind: "FACULTY_CATALOG" as const,
      name: "Wahlpflichtmodul 1",
      semesterNumber: 4,
      sortOrder: 2,
      sourceRefs: [
        {
          documentId: "AIN_SPO_BT_2026_V14",
          locator: "Tabelle 3, Wahlpflichtmodul 1",
          pageEnd: 5,
          pageStart: 5,
        },
      ],
    },
    {
      credits: 6,
      candidateModuleIds: [
        "ain-objektorientierte-programmierung",
        "ain-stochastik-und-optimierung",
        "ain-grundlagen-der-medieninformatik",
        "ain-formale-methoden-swe",
        "ain-deep-learning",
        "ain-verteilte-anwendungen",
        "ain-open-source-basierte-softwareentwicklung",
        "ain-modellierung-autonomer-systeme",
        "ain-human-computer-interaction",
        "ain-plattformen-fuer-iot",
        "ain-formale-methoden-aai",
        "ain-fortgeschrittene-programmierung-fuer-medieninformatiker",
      ],
      description: "Lehrveranstaltungen aus dem fachspezifischen Katalog im Umfang von 6 LP.",
      id: "ain-wahlpflichtmodul-2",
      kind: "FACULTY_CATALOG" as const,
      name: "Wahlpflichtmodul 2",
      semesterNumber: 6,
      sortOrder: 2,
      sourceRefs: [
        {
          documentId: "AIN_SPO_BT_2026_V14",
          locator: "Tabelle 3, Wahlpflichtmodul 2",
          pageEnd: 6,
          pageStart: 6,
        },
      ],
    },
    {
      credits: 6,
      candidateModuleIds: [
        "ain-objektorientierte-programmierung",
        "ain-stochastik-und-optimierung",
        "ain-grundlagen-der-medieninformatik",
        "ain-formale-methoden-swe",
        "ain-deep-learning",
        "ain-verteilte-anwendungen",
        "ain-open-source-basierte-softwareentwicklung",
        "ain-modellierung-autonomer-systeme",
        "ain-human-computer-interaction",
        "ain-plattformen-fuer-iot",
        "ain-formale-methoden-aai",
        "ain-fortgeschrittene-programmierung-fuer-medieninformatiker",
      ],
      description: "Lehrveranstaltungen aus dem fachspezifischen Katalog im Umfang von 6 LP.",
      id: "ain-wahlpflichtmodul-3",
      kind: "FACULTY_CATALOG" as const,
      name: "Wahlpflichtmodul 3",
      semesterNumber: 6,
      sortOrder: 3,
      sourceRefs: [
        {
          documentId: "AIN_SPO_BT_2026_V14",
          locator: "Tabelle 3, Wahlpflichtmodul 3",
          pageEnd: 6,
          pageStart: 6,
        },
      ],
    },
    {
      credits: 6,
      description: "Wahlpflichtveranstaltungen aus Fakultät 1 oder anderen Fakultäten nach SPO-Randbedingungen.",
      id: "ain-wahlpflichtmodul-4",
      kind: "FREE_CHOICE" as const,
      name: "Wahlpflichtmodul 4",
      semesterNumber: 6,
      sortOrder: 4,
      sourceRefs: [
        {
          documentId: "AIN_SPO_BT_2026_V14",
          locator: "Tabelle 3, Wahlpflichtmodul 4",
          pageEnd: 6,
          pageStart: 6,
        },
      ],
    },
    {
      credits: 6,
      description: "Wahlpflichtveranstaltungen aus Fakultät 1 oder anderen Fakultäten nach SPO-Randbedingungen.",
      id: "ain-wahlpflichtmodul-5",
      kind: "FREE_CHOICE" as const,
      name: "Wahlpflichtmodul 5",
      semesterNumber: 7,
      sortOrder: 1,
      sourceRefs: [
        {
          documentId: "AIN_SPO_BT_2026_V14",
          locator: "Tabelle 3, Wahlpflichtmodul 5",
          pageEnd: 7,
          pageStart: 7,
        },
      ],
    },
  ] satisfies ElectiveSlotSeed[],
  modules: [
    moduleSeed({
      area: "BASIC",
      assessments: [exam("1K", "Klausur", 4), coursework("1sbaA", "Praktische Arbeit", 2)],
      courses: [
        course("Grundlagen der Informatik", "V", "Vorlesung", 4),
        course("Grundlagen der Informatik, Übung", "Ü", "Übung", 2),
      ],
      credits: 6,
      id: "ain-grundlagen-der-informatik",
      semesterNumber: 1,
      sortOrder: 1,
      sourceRefs: sourceRefs(2, 2, 22, "Grundlagen der Informatik"),
      tags: ["programmierung", "sem-1", "6-lp", "klausur", "praktische-arbeit"],
      title: "Grundlagen der Informatik",
    }),
    moduleSeed({
      area: "BASIC",
      assessments: [exam("1K", "Klausur", 2), coursework("1sbaA", "Praktische Arbeit", 4)],
      courses: [
        course("Datenbanken", "V", "Vorlesung", 2),
        course("Datenbanken, Praktikum", "P", "Praktikum", 4),
      ],
      credits: 6,
      id: "ain-datenbanken",
      semesterNumber: 1,
      sortOrder: 2,
      sourceRefs: sourceRefs(2, 2, 14, "Datenbanken"),
      tags: ["datenbanken", "sem-1", "6-lp", "klausur", "praktische-arbeit"],
      title: "Datenbanken",
    }),
    moduleSeed({
      area: "BASIC",
      assessments: [exam("1K", "Klausur", 2), coursework("1sbaA", "Praktische Arbeit", 4)],
      courses: [
        course("Programmierung", "V", "Vorlesung", 2),
        course("Programmierung, Praktikum", "P", "Praktikum", 4),
      ],
      credits: 6,
      id: "ain-programmierung",
      semesterNumber: 1,
      sortOrder: 3,
      sourceRefs: sourceRefs(2, 2, 45, "Programmierung"),
      tags: ["programmierung", "java", "sem-1", "6-lp", "klausur", "praktische-arbeit"],
      title: "Programmierung",
    }),
    moduleSeed({
      area: "BASIC",
      assessments: [exam("1K", "Klausur", 4), coursework("1sbA", "Sonstige schriftliche Arbeit", 1), coursework("1sbaA", "Praktische Arbeit", 1)],
      courses: [
        course("Mathematik für Informatik 1", "V", "Vorlesung", 4),
        course("Mathematik für Informatik 1, Übung", "Ü", "Übung", 2),
        course("Grundlagen der Mathematik", "S", "Seminar", 2),
      ],
      credits: 6,
      id: "ain-mathematik-fuer-informatik-1",
      semesterNumber: 1,
      sortOrder: 4,
      sourceRefs: sourceRefs(2, 3, 31, "Mathematik für Informatiker 1"),
      tags: ["mathematik", "sem-1", "6-lp", "klausur"],
      title: "Mathematik für Informatik 1",
    }),
    moduleSeed({
      area: "BASIC",
      assessments: [coursework("1sbR", "Referat", 2), coursework("1sbaA", "Praktische Arbeit", 4)],
      courses: [
        course("Lern- und Präsentationskompetenzen, Seminar", "S", "Seminar", 2),
        course("Studienkompetenzen, Onlinekurse", "O", "Onlinekurs", 4),
      ],
      credits: 6,
      id: "ain-studienkompetenzen",
      semesterNumber: 1,
      sortOrder: 5,
      sourceRefs: sourceRefs(3, 3, 62, "Studienkompetenzen"),
      tags: ["wissenschaftliches-arbeiten", "sem-1", "6-lp", "bericht"],
      title: "Studienkompetenzen",
    }),
    moduleSeed({
      area: "BASIC",
      assessments: [exam("1K", "Klausur", 2), coursework("1sbaA", "Praktische Arbeit", 4)],
      courses: [
        course("Rechnerarchitektur und Betriebssysteme", "V", "Vorlesung", 2),
        course("Rechnerarchitektur und Betriebssysteme, Praktikum", "P", "Praktikum", 4),
      ],
      credits: 6,
      id: "ain-rechnerarchitektur-und-betriebssysteme",
      semesterNumber: 2,
      sortOrder: 1,
      sourceRefs: sourceRefs(3, 3, 53, "Rechnerarchitektur und Betriebssysteme"),
      tags: ["betriebssysteme", "rechnerarchitektur", "sem-2", "6-lp", "klausur", "praktische-arbeit"],
      title: "Rechnerarchitektur und Betriebssysteme",
    }),
    moduleSeed({
      area: "BASIC",
      assessments: [exam("1K", "Klausur", 4), coursework("1sbaA", "Praktische Arbeit", 2)],
      courses: [
        course("Computernetze", "V", "Vorlesung", 4),
        course("Computernetze, Praktikum", "P", "Praktikum", 2),
      ],
      credits: 6,
      id: "ain-computernetze",
      semesterNumber: 2,
      sortOrder: 2,
      sourceRefs: sourceRefs(3, 3, 10, "Computernetze"),
      tags: ["netzwerke", "sem-2", "6-lp", "klausur", "praktische-arbeit"],
      title: "Computernetze",
    }),
    moduleSeed({
      area: "BASIC",
      assessments: [exam("1K", "Klausur", 4), coursework("1sbaA", "Praktische Arbeit", 2)],
      courses: [
        course("Algorithmen und Datenstrukturen", "V", "Vorlesung", 4),
        course("Algorithmen und Datenstrukturen, Praktikum", "P", "Praktikum", 2),
      ],
      credits: 6,
      id: "ain-algorithmen-und-datenstrukturen",
      prerequisiteModuleIds: ["ain-programmierung"],
      prerequisitesText: "Programmierung",
      semesterNumber: 2,
      sortOrder: 3,
      sourceRefs: sourceRefs(3, 3, 4, "Algorithmen und Datenstrukturen"),
      tags: ["algorithmen", "datenstrukturen", "programmierung", "java", "sem-2", "6-lp", "klausur", "praktische-arbeit"],
      title: "Algorithmen und Datenstrukturen",
    }),
    moduleSeed({
      area: "BASIC",
      assessments: [exam("1K", "Klausur", 4), coursework("1sbA", "Sonstige schriftliche Arbeit", 2)],
      courses: [
        course("Mathematik für Informatik 2", "V", "Vorlesung", 4),
        course("Mathematik für Informatik 2, Übung", "Ü", "Übung", 2),
      ],
      credits: 6,
      id: "ain-mathematik-fuer-informatik-2",
      semesterNumber: 2,
      sortOrder: 4,
      sourceRefs: sourceRefs(3, 3, 33, "Mathematik für Informatiker 2"),
      tags: ["mathematik", "sem-2", "6-lp", "klausur"],
      title: "Mathematik für Informatik 2",
    }),
    moduleSeed({
      area: "BASIC",
      assessments: [exam("1K", "Klausur", 3), coursework("1sbaA", "Praktische Arbeit", 3)],
      courses: [
        course("Data Science", "V", "Vorlesung", 2),
        course("Data Science, Praktikum", "P", "Praktikum", 2),
      ],
      credits: 6,
      id: "ain-data-science",
      semesterNumber: 2,
      sortOrder: 5,
      sourceRefs: sourceRefs(3, 3, 12, "Data Science"),
      tags: ["datenanalyse", "statistik", "ki", "sem-2", "6-lp", "klausur", "praktische-arbeit"],
      title: "Data Science",
    }),
    moduleSeed({
      area: "SPECIALIZATION",
      assessments: [exam("1K", "Klausur", 3), coursework("1sbaA", "Praktische Arbeit", 3)],
      courses: [
        course("Objektorientierte Programmierung", "V", "Vorlesung", 2),
        course("Objektorientierte Programmierung, Praktikum", "P", "Praktikum", 2),
      ],
      credits: 6,
      id: "ain-objektorientierte-programmierung",
      semesterNumber: 3,
      sortOrder: 1,
      sourceRefs: sourceRefs(4, 4, 37, "Objektorientierte Programmierung"),
      specializationCodes: ["SWE"],
      tags: ["programmierung", "software-engineering", "swe", "sem-3", "6-lp", "klausur", "praktische-arbeit"],
      title: "Objektorientierte Programmierung",
    }),
    moduleSeed({
      area: "SPECIALIZATION",
      assessments: [exam("1K", "Klausur", 3), coursework("1sbaA", "Praktische Arbeit", 3)],
      courses: [
        course("Stochastik", "V", "Vorlesung", 2),
        course("Stochastik, Übung", "Ü", "Übung", 2),
      ],
      credits: 6,
      id: "ain-stochastik-und-optimierung",
      semesterNumber: 3,
      sortOrder: 2,
      sourceRefs: sourceRefs(4, 4, 60, "Stochastik und Optimierung"),
      specializationCodes: ["AAI"],
      tags: ["statistik", "optimierung", "ki", "aai", "sem-3", "6-lp", "klausur", "praktische-arbeit"],
      title: "Stochastik und Optimierung",
    }),
    moduleSeed({
      area: "SPECIALIZATION",
      assessments: [exam("1M", "Mündliche Prüfung", 3), coursework("1sbaA", "Praktische Arbeit", 3)],
      courses: [
        course("Grundlagen der Medieninformatik", "V", "Vorlesung", 2),
        course("Grundlagen der Medieninformatik, Praktikum", "P", "Praktikum", 2),
      ],
      credits: 6,
      id: "ain-grundlagen-der-medieninformatik",
      semesterNumber: 3,
      sortOrder: 3,
      sourceRefs: sourceRefs(4, 4, 24, "Grundlagen der Medieninformatik"),
      specializationCodes: ["MIN"],
      tags: ["medieninformatik", "min", "sem-3", "6-lp", "muendlich", "praktische-arbeit"],
      title: "Grundlagen der Medieninformatik",
    }),
    moduleSeed({
      area: "SPECIALIZATION",
      assessments: [exam("1K", "Klausur", 3), coursework("1sbaA", "Praktische Arbeit", 3)],
      courses: [
        course("Formale Methoden", "V", "Vorlesung", 2),
        course("Formale Methoden, Praktikum", "P", "Praktikum", 2),
      ],
      credits: 6,
      id: "ain-formale-methoden-swe",
      semesterNumber: 3,
      sortOrder: 4,
      sourceRefs: sourceRefs(4, 4, 18, "Formale Methoden"),
      specializationCodes: ["SWE"],
      tags: ["software-engineering", "formale-methoden", "swe", "sem-3", "6-lp", "klausur", "praktische-arbeit"],
      title: "Formale Methoden",
    }),
    moduleSeed({
      area: "SPECIALIZATION",
      assessments: [exam("1K", "Klausur", 3), coursework("1sbaA", "Praktische Arbeit", 3)],
      courses: [
        course("Deep Learning", "V", "Vorlesung", 2),
        course("Deep Learning, Praktikum", "P", "Praktikum", 2),
      ],
      credits: 6,
      id: "ain-deep-learning",
      semesterNumber: 3,
      sortOrder: 5,
      sourceRefs: sourceRefs(4, 4, 16, "Deep Learning"),
      specializationCodes: ["AAI"],
      tags: ["ki", "machine-learning", "deep-learning", "aai", "sem-3", "6-lp", "klausur", "praktische-arbeit"],
      title: "Deep Learning",
    }),
    moduleSeed({
      area: "SPECIALIZATION",
      assessments: [exam("1K", "Klausur", 3), coursework("1sbaA", "Praktische Arbeit", 3)],
      courses: [
        course("Verteilte Anwendungen", "V", "Vorlesung", 2),
        course("Verteilte Anwendungen, Praktikum", "P", "Praktikum", 2),
      ],
      credits: 6,
      id: "ain-verteilte-anwendungen",
      semesterNumber: 3,
      sortOrder: 6,
      sourceRefs: sourceRefs(4, 4, 66, "Verteilte Anwendungen"),
      specializationCodes: ["MIN"],
      tags: ["verteilte-systeme", "min", "sem-3", "6-lp", "klausur", "praktische-arbeit"],
      title: "Verteilte Anwendungen",
    }),
    moduleSeed({
      area: "ADVANCED",
      assessments: [exam("1K", "Klausur", 3), coursework("1sbaA", "Praktische Arbeit", 3)],
      courses: [
        course("Software Engineering", "V", "Vorlesung", 2),
        course("Software Engineering, Praktikum", "P", "Praktikum", 2),
      ],
      credits: 6,
      id: "ain-software-engineering",
      semesterNumber: 3,
      sortOrder: 7,
      sourceRefs: sourceRefs(4, 4, 58, "Software Engineering"),
      tags: ["software-engineering", "sem-3", "6-lp", "klausur", "praktische-arbeit"],
      title: "Software Engineering",
    }),
    moduleSeed({
      area: "ADVANCED",
      assessments: [exam("1K", "Klausur", 3), coursework("1sbaA", "Praktische Arbeit", 3)],
      courses: [
        course("Computer Vision", "V", "Vorlesung", 2),
        course("Computer Vision, Praktikum", "P", "Praktikum", 2),
      ],
      credits: 6,
      id: "ain-computer-vision",
      semesterNumber: 3,
      sortOrder: 8,
      sourceRefs: sourceRefs(4, 4, 8, "Computer Vision"),
      tags: ["ki", "computer-vision", "machine-learning", "sem-3", "6-lp", "klausur", "praktische-arbeit"],
      title: "Computer Vision",
    }),
    moduleSeed({
      area: "ADVANCED",
      assessments: [exam("1K", "Klausur", 3), coursework("1sbaA", "Praktische Arbeit", 3)],
      courses: [
        course("Maschinelles Lernen", "V", "Vorlesung", 2),
        course("Maschinelles Lernen, Praktikum", "P", "Praktikum", 2),
      ],
      credits: 6,
      id: "ain-maschinelles-lernen",
      semesterNumber: 3,
      sortOrder: 9,
      sourceRefs: sourceRefs(4, 5, 28, "Maschinelles Lernen"),
      tags: ["ki", "machine-learning", "sem-3", "6-lp", "klausur", "praktische-arbeit"],
      title: "Maschinelles Lernen",
    }),
    moduleSeed({
      area: "SPECIALIZATION",
      assessments: [exam("1K", "Klausur", 3), coursework("1sbaA", "Praktische Arbeit", 3)],
      courses: [
        course("Open Source-basierte Softwareentwicklung", "V", "Vorlesung", 2),
        course("Open Source-basierte Softwareentwicklung, Praktikum", "P", "Praktikum", 2),
      ],
      credits: 6,
      id: "ain-open-source-basierte-softwareentwicklung",
      semesterNumber: 4,
      sortOrder: 1,
      sourceRefs: sourceRefs(5, 5, 39, "Open Source-basierte Softwareentwicklung"),
      specializationCodes: ["SWE"],
      tags: ["software-engineering", "open-source", "swe", "sem-4", "6-lp", "klausur", "praktische-arbeit"],
      title: "Open Source-basierte Softwareentwicklung",
    }),
    moduleSeed({
      area: "SPECIALIZATION",
      assessments: [exam("1K", "Klausur", 3), coursework("1sbA", "Sonstige schriftliche Arbeit", 3)],
      courses: [
        course("Modellierung Autonomer Systeme", "V", "Vorlesung", 2),
        course("Modellierung Autonomer Systeme, Praktikum", "P", "Praktikum", 2),
      ],
      credits: 6,
      id: "ain-modellierung-autonomer-systeme",
      semesterNumber: 4,
      sortOrder: 3,
      sourceRefs: sourceRefs(5, 5, 35, "Modellierung Autonomer Systeme"),
      specializationCodes: ["AAI"],
      tags: ["ki", "robotik", "aai", "sem-4", "6-lp", "klausur"],
      title: "Modellierung Autonomer Systeme",
    }),
    moduleSeed({
      area: "SPECIALIZATION",
      assessments: [coursework("1sbR", "Referat", 3), coursework("1sbA", "Sonstige schriftliche Arbeit", 3)],
      courses: [
        course("Human-Computer Interaction, Seminar", "S", "Seminar", 2),
        course("Human-Computer Interaction, Projekt", "Pr", "Projekt", 2),
      ],
      credits: 6,
      id: "ain-human-computer-interaction",
      semesterNumber: 4,
      sortOrder: 4,
      sourceRefs: sourceRefs(5, 5, 26, "Human-Computer Interaction"),
      specializationCodes: ["MIN"],
      tags: ["hci", "medieninformatik", "min", "sem-4", "6-lp", "referat", "praktische-arbeit"],
      title: "Human-Computer Interaction",
    }),
    moduleSeed({
      area: "ADVANCED",
      assessments: [exam("1K", "Klausur", 3), coursework("1sbaA", "Praktische Arbeit", 3)],
      courses: [
        course("Software Design", "V", "Vorlesung", 2),
        course("Software Design, Praktikum", "P", "Praktikum", 2),
      ],
      credits: 6,
      id: "ain-software-design",
      semesterNumber: 4,
      sortOrder: 5,
      sourceRefs: sourceRefs(5, 5, 55, "Software Design"),
      tags: ["software-engineering", "design", "sem-4", "6-lp", "klausur", "praktische-arbeit"],
      title: "Software Design",
    }),
    moduleSeed({
      area: "ADVANCED",
      assessments: [exam("1K", "Klausur", 3), coursework("1sbR", "Referat", 3)],
      courses: [
        course("Projektmanagement", "V", "Vorlesung", 2),
        course("Projektmanagement, Seminar", "S", "Seminar", 2),
      ],
      credits: 6,
      id: "ain-projektmanagement",
      semesterNumber: 4,
      sortOrder: 6,
      sourceRefs: sourceRefs(5, 5, 51, "Projektmanagement"),
      tags: ["projektmanagement", "sem-4", "6-lp", "klausur", "referat"],
      title: "Projektmanagement",
    }),
    moduleSeed({
      area: "ADVANCED",
      assessments: [exam("1A", "Projektarbeit", 4), coursework("1sbaA", "Praktische Arbeit", 3), coursework("1sbR", "Referat", 2)],
      courses: [
        course("Projekt 1", "W", "Workshop", 4),
        course("Projekt 1, Seminar", "S", "Seminar", 1),
      ],
      credits: 6,
      id: "ain-projekt-1",
      semesterNumber: 4,
      sortOrder: 7,
      sourceRefs: sourceRefs(5, 5, 47, "Projekt 1"),
      tags: ["projekt", "teamarbeit", "sem-4", "6-lp", "praktische-arbeit", "referat"],
      title: "Projekt 1",
    }),
    moduleSeed({
      area: "INTERNSHIP",
      assessments: [
        coursework("1sbKO", "Kolloquium", 3),
        coursework("1sbA", "Sonstige schriftliche Arbeit", 24),
        coursework("1sbB", "Bericht", 3),
        coursework("1sbPN", "Präsentation", 3, "Bei Nichtbestehen ist nur die nichtbestandene Studienleistung zu wiederholen."),
      ],
      courses: [
        course("Einführung Praktisches Studiensemester", "S", "Seminar", 1),
        course("Praktisches Studiensemester", "W", "Praxisphase"),
        course("Praktisches Studiensemester, Seminar", "S", "Seminar", 1),
      ],
      credits: 30,
      duration: "1 Semester",
      frequency: "Jedes Semester",
      id: "ain-praktisches-studiensemester",
      semesterNumber: 5,
      sortOrder: 1,
      sourceRefs: sourceRefs(6, 6, 43, "Praktisches Studiensemester"),
      tags: ["praxissemester", "sem-5", "30-lp", "bericht", "praesentation"],
      title: "Praktisches Studiensemester",
    }),
    moduleSeed({
      area: "SPECIALIZATION",
      assessments: [exam("1K", "Klausur", 3), coursework("1sbaA", "Praktische Arbeit", 3)],
      courses: [
        course("Plattformen für IoT", "V", "Vorlesung", 2),
        course("Plattformen für IoT, Praktikum", "P", "Praktikum", 2),
      ],
      credits: 6,
      id: "ain-plattformen-fuer-iot",
      semesterNumber: 6,
      sortOrder: 1,
      sourceRefs: sourceRefs(6, 6, 41, "Plattformen für IoT"),
      specializationCodes: ["SWE"],
      tags: ["iot", "software-engineering", "swe", "sem-6", "6-lp", "klausur", "praktische-arbeit"],
      title: "Plattformen für IoT",
    }),
    moduleSeed({
      area: "SPECIALIZATION",
      assessments: [exam("1K", "Klausur", 3), coursework("1sbaA", "Praktische Arbeit", 3)],
      courses: [
        course("Formale Methoden", "V", "Vorlesung", 2),
        course("Formale Methoden, Praktikum", "P", "Praktikum", 2),
      ],
      credits: 6,
      id: "ain-formale-methoden-aai",
      semesterNumber: 6,
      sortOrder: 5,
      sourceRefs: sourceRefs(6, 6, 18, "Formale Methoden"),
      specializationCodes: ["AAI"],
      tags: ["formale-methoden", "ki", "aai", "sem-6", "6-lp", "klausur", "praktische-arbeit"],
      title: "Formale Methoden",
    }),
    moduleSeed({
      area: "SPECIALIZATION",
      assessments: [exam("1K", "Klausur", 3), coursework("1sbaA", "Praktische Arbeit", 3)],
      courses: [
        course("Fortgeschrittene Programmierung für Medieninformatiker", "V", "Vorlesung", 2),
        course("Fortgeschrittene Programmierung für Medieninformatiker, Praktikum", "P", "Praktikum", 2),
      ],
      credits: 6,
      id: "ain-fortgeschrittene-programmierung-fuer-medieninformatiker",
      semesterNumber: 6,
      sortOrder: 6,
      sourceRefs: sourceRefs(6, 6, 20, "Fortgeschrittene Programmierung für Medieninformatiker"),
      specializationCodes: ["MIN"],
      tags: ["programmierung", "medieninformatik", "min", "sem-6", "6-lp", "klausur", "praktische-arbeit"],
      title: "Fortgeschrittene Programmierung für Medieninformatiker",
    }),
    moduleSeed({
      area: "ADVANCED",
      assessments: [exam("1A", "Projektarbeit", 4), coursework("1sbR", "Referat", 2)],
      courses: [
        course("Projekt 2", "W", "Workshop"),
        course("Projekt 2, Seminar", "S", "Seminar", 1),
      ],
      credits: 6,
      id: "ain-projekt-2",
      semesterNumber: 6,
      sortOrder: 7,
      sourceRefs: sourceRefs(7, 7, 49, "Projekt 2"),
      tags: ["projekt", "teamarbeit", "sem-6", "6-lp", "praktische-arbeit", "referat"],
      title: "Projekt 2",
    }),
    moduleSeed({
      area: "ADVANCED",
      assessments: [exam("1M", "Mündliche Prüfung", 6)],
      courses: [course("Ausgewählte Fragen der Informatik", "Pr", "Prüfung")],
      credits: 6,
      id: "ain-ausgewaehlte-fragen-der-informatik",
      prerequisitesText: "Gleichzeitige Anfertigung einer Bachelorarbeit",
      semesterNumber: 7,
      sortOrder: 2,
      sourceRefs: sourceRefs(7, 7, 6, "Ausgewählte Fragen der Informatik"),
      tags: ["wissenschaftliches-arbeiten", "sem-7", "6-lp", "muendlich"],
      title: "Ausgewählte Fragen der Informatik",
    }),
    moduleSeed({
      area: "THESIS",
      assessments: [coursework("1sbKO", "Kolloquium", 3), exam("1T", "Bachelorarbeit", 12), exam("1PN", "Präsentation", 3)],
      courses: [
        course("Thesis Vorbereitungsseminar", "S", "Seminar", 1),
        course("Bachelorarbeit", "W", "Abschlussarbeit"),
        course("Thesis Seminar", "S", "Seminar", 1),
      ],
      credits: 18,
      duration: "4 Monate",
      frequency: "Jedes Semester",
      id: "ain-thesis",
      semesterNumber: 7,
      sortOrder: 3,
      sourceRefs: sourceRefs(7, 7, 64, "Thesis"),
      tags: ["thesis", "sem-7", "18-lp", "praesentation"],
      title: "Thesis",
      workloadHours: 540,
    }),
  ] satisfies ModuleSeed[],
  program: {
    advancedStudySemesters: 5,
    basicStudySemesters: 2,
    bilingual: true,
    code: "AIN",
    degree: "B.Sc.",
    id: "AIN_BSC",
    name: "Allgemeine Informatik",
    regularSemesters: 7,
    totalCredits: 210,
  },
  programSourceRefs: [
    {
      documentId: "HFU_BACHELOR_SPO_2026",
      locator: "§§ 2-31, Allgemeiner Teil Bachelor-SPO",
      pageEnd: 32,
      pageStart: 1,
    },
    {
      documentId: "AIN_SPO_BT_2026_V14",
      locator: "§ 32 Bachelorstudiengang Allgemeine Informatik",
      pageEnd: 2,
      pageStart: 1,
    },
  ] satisfies SourceRefSeed[],
  semesters: [
    { area: "BASIC" as const, credits: 30, number: 1, title: "1. Lehrplansemester" },
    { area: "BASIC" as const, credits: 30, number: 2, title: "2. Lehrplansemester" },
    { area: "ADVANCED" as const, credits: 30, number: 3, title: "3. Lehrplansemester" },
    { area: "ADVANCED" as const, credits: 30, number: 4, title: "4. Lehrplansemester" },
    { area: "ADVANCED" as const, credits: 30, number: 5, title: "5. Lehrplansemester" },
    { area: "ADVANCED" as const, credits: 30, number: 6, title: "6. Lehrplansemester" },
    { area: "ADVANCED" as const, credits: 30, number: 7, title: "7. Lehrplansemester" },
  ],
  specializations: [
    {
      code: "SWE",
      description: "Software Engineering",
      id: "AIN_SWE",
      name: "Software Engineering",
    },
    {
      code: "AAI",
      description: "Applied Artificial Intelligence",
      id: "AIN_AAI",
      name: "Applied Artificial Intelligence",
    },
    {
      code: "MIN",
      description: "Medieninformatik",
      id: "AIN_MIN",
      name: "Medieninformatik",
    },
  ],
  tags: [
    { category: "content", id: "algorithmen", label: "algorithmen" },
    { category: "content", id: "computer-vision", label: "computer-vision" },
    { category: "content", id: "datenanalyse", label: "datenanalyse" },
    { category: "content", id: "datenbanken", label: "datenbanken" },
    { category: "content", id: "datenstrukturen", label: "datenstrukturen" },
    { category: "content", id: "deep-learning", label: "deep-learning" },
    { category: "content", id: "design", label: "design" },
    { category: "content", id: "betriebssysteme", label: "betriebssysteme" },
    { category: "content", id: "formale-methoden", label: "formale-methoden" },
    { category: "content", id: "hci", label: "hci" },
    { category: "content", id: "iot", label: "iot" },
    { category: "content", id: "java", label: "java" },
    { category: "content", id: "ki", label: "ki" },
    { category: "content", id: "machine-learning", label: "machine-learning" },
    { category: "content", id: "mathematik", label: "mathematik" },
    { category: "content", id: "medieninformatik", label: "medieninformatik" },
    { category: "content", id: "netzwerke", label: "netzwerke" },
    { category: "content", id: "open-source", label: "open-source" },
    { category: "content", id: "optimierung", label: "optimierung" },
    { category: "content", id: "praxissemester", label: "praxissemester" },
    { category: "content", id: "programmierung", label: "programmierung" },
    { category: "content", id: "projekt", label: "projekt" },
    { category: "content", id: "projektmanagement", label: "projektmanagement" },
    { category: "content", id: "rechnerarchitektur", label: "rechnerarchitektur" },
    { category: "content", id: "robotik", label: "robotik" },
    { category: "content", id: "software-engineering", label: "software-engineering" },
    { category: "content", id: "statistik", label: "statistik" },
    { category: "content", id: "teamarbeit", label: "teamarbeit" },
    { category: "content", id: "thesis", label: "thesis" },
    { category: "content", id: "verteilte-systeme", label: "verteilte-systeme" },
    { category: "content", id: "wissenschaftliches-arbeiten", label: "wissenschaftliches-arbeiten" },
    { category: "assessment", id: "bericht", label: "bericht" },
    { category: "assessment", id: "klausur", label: "klausur" },
    { category: "assessment", id: "muendlich", label: "muendlich" },
    { category: "assessment", id: "praktische-arbeit", label: "praktische-arbeit" },
    { category: "assessment", id: "praesentation", label: "praesentation" },
    { category: "assessment", id: "referat", label: "referat" },
    { category: "workload", id: "18-lp", label: "18-lp" },
    { category: "workload", id: "30-lp", label: "30-lp" },
    { category: "workload", id: "6-lp", label: "6-lp" },
    { category: "semester", id: "sem-1", label: "sem-1" },
    { category: "semester", id: "sem-2", label: "sem-2" },
    { category: "semester", id: "sem-3", label: "sem-3" },
    { category: "semester", id: "sem-4", label: "sem-4" },
    { category: "semester", id: "sem-5", label: "sem-5" },
    { category: "semester", id: "sem-6", label: "sem-6" },
    { category: "semester", id: "sem-7", label: "sem-7" },
    { category: "specialization", id: "aai", label: "aai" },
    { category: "specialization", id: "min", label: "min" },
    { category: "specialization", id: "swe", label: "swe" },
  ],
};

export type CurriculumSeedData = typeof curriculumSeed;

export default { curriculumSeed };
