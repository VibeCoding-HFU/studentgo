export type Invitation = {
  id: number;
  encryptedKey?: string | null;
  encryptedPayload?: string | null;
  encryptionIv?: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
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
};
