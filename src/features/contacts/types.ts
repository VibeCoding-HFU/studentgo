export type Contact = {
  email: string;
  id: number;
  name: string;
  ownerId?: number | null;
  phone?: string | null;
  role: string;
  room?: string | null;
  syncState?: 'pending' | 'synced';
};
