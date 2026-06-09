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

export type HfuContactPerson = {
  campus?: string | null;
  department?: string | null;
  email?: string | null;
  faculty?: string | null;
  fullName: string;
  function?: string | null;
  id: string;
  institution?: string | null;
  phone?: string | null;
  profileUrl: string;
  role?: string | null;
  room?: string | null;
  sourceUrl: string;
  tags: string[];
  title?: string | null;
};

export type HfuContactFilter = {
  category: 'faculty' | 'service' | 'function';
  count: number;
  id: string;
  label: string;
  solrFilter: string;
};

export type HfuContactsResult = {
  contacts: HfuContactPerson[];
  filters: HfuContactFilter[];
  hasMore: boolean;
  sourceUrl: string;
  totalCount: number;
};
