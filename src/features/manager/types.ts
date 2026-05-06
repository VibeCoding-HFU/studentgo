export type Entity = 'CONTACT' | 'MEAL' | 'LESSON' | 'STUDY_INFO';
export type ChangeEntity = Entity | 'DEADLINE';
export type Action = 'CREATE' | 'UPDATE' | 'DELETE';

export type Contact = {
  email: string;
  id: number;
  name: string;
  phone?: string | null;
  role: string;
  room?: string | null;
};

export type Meal = {
  canteen: { name: string };
  currency: string;
  date?: string | null;
  day: string;
  id: number;
  mainDish: string;
  priceCents: number;
  vegetarianDish?: string | null;
};

export type ScheduleDay = {
  day: string;
  id: number;
  lessons: {
    date?: string | null;
    description?: string | null;
    endTime: string;
    id: number;
    isRecurring?: boolean;
    lecturer?: string | null;
    room?: string | null;
    startTime: string;
    title: string;
  }[];
};

export type StudyInfo = {
  category: string;
  content: string;
  id: number;
  title: string;
};

export type ChangeRequest = {
  action: Action;
  createdAt: string;
  entity: ChangeEntity;
  id: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
};

export type Option = { id: number | string; name: string; shortname?: string };

export type ManagerItem = Contact | Meal | (ScheduleDay['lessons'][number] & { day: string }) | StudyInfo;
