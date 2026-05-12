export type Subtask = {
  completedAt: string | null;
  createdAt: string;
  id: number;
  title: string;
};

export type Todo = {
  completedAt: string | null;
  createdAt: string;
  description?: string | null;
  id: number;
  title: string;
  subtasks: Subtask[];
  syncState?: 'pending' | 'synced';
};

export type StudyInfo = {
  category: string;
  content: string;
  encryptedKey?: string | null;
  encryptedPayload?: string | null;
  encryptionIv?: string | null;
  id: number;
  ownerId?: number | null;
  title: string;
};
