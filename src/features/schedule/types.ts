export type Lesson = {
  day?: string;
  date?: string | null;
  description?: string | null;
  endTime: string;
  encryptedKey?: string | null;
  encryptedPayload?: string | null;
  encryptionIv?: string | null;
  id: number;
  isModuleActive?: boolean;
  isRecurring?: boolean;
  isVisited?: boolean;
  lecturer?: string | null;
  moduleKey?: string;
  ownerId?: number | null;
  room?: string | null;
  source?: string;
  startTime: string;
  title: string;
  syncState?: 'pending' | 'synced';
};

export type ScheduleDay = {
  day: string;
  id: number;
  lessons: Lesson[];
};

export type Option = { id: number | string; name: string; shortname?: string };

export type FacultyOption = Option & { groups: Option[] };

export type ImportOptions = {
  faculties: FacultyOption[];
  groups: Option[];
  semesters: Option[];
  specializations: Option[];
};

export type ParsedGroup = Option & {
  importKey: string;
  semester: string;
  specialization: string;
};

export type UserOption = {
  email: string;
  id: number;
  name: string;
  publicKeyJson?: string | null;
};

export type Invitation = {
  createdAt: string;
  encryptedKey?: string | null;
  encryptedPayload?: string | null;
  encryptionIv?: string | null;
  id: number;
  lesson: {
    date?: string | null;
    description?: string | null;
    endTime: string;
    isRecurring: boolean;
    scheduleDay: { day: string };
    startTime: string;
    title: string;
  };
  sender: {
    email: string;
    name: string;
  };
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
};

export type Meal = {
  canteen: { name: string };
  currency: string;
  day: string;
  date?: string | null;
  id: number;
  mainDish: string;
  priceCents: number;
  vegetarianDish?: string | null;
};

export type AccountStats = {
  courseCount: number;
  totalEvents: number;
  visitedEvents: number;
};

export type CourseOption = {
  lessonCount: number;
  title: string;
};

export type LessonForm = {
  date: string;
  day: string;
  description: string;
  endTime: string;
  isRecurring: boolean;
  startTime: string;
  title: string;
};
