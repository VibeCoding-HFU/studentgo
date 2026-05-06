import { decryptPayloadWithPrivateKeys, encryptPayloadForPublicKeys, getPrivateKey, getPrivateKeys, publicKeyFromPrivateKey, publicKeyJsonsFromValue } from '@/lib/client-crypto';
import type { Invitation, LessonForm, ScheduleDay } from './types';

type LessonPayload = {
  description?: string;
  title?: string;
};

type LessonOwner = {
  email?: string | null;
  publicKeyJson?: string | null;
};

export async function decryptScheduleDays(days: ScheduleDay[], email?: string | null) {
  const privateKeys = email ? await getPrivateKeys(email) : [];

  return Promise.all(days.map(async (day) => ({
    ...day,
    lessons: await Promise.all(day.lessons.map(async (lesson) => {
      const syncedLesson = { ...lesson, syncState: 'synced' as const };

      if (privateKeys.length === 0 || !lesson.encryptedPayload || !lesson.encryptedKey || !lesson.encryptionIv) {
        return syncedLesson;
      }

      try {
        const decrypted = await decryptPayloadWithPrivateKeys<LessonPayload>(privateKeys, {
          encryptedKey: lesson.encryptedKey,
          encryptedPayload: lesson.encryptedPayload,
          encryptionIv: lesson.encryptionIv,
        });
        return {
          ...syncedLesson,
          description: decrypted.description ?? lesson.description,
          title: decrypted.title ?? lesson.title,
        };
      } catch {
        return { ...syncedLesson, title: 'Verschluesselter Termin' };
      }
    })),
  })));
}

export async function decryptInvitations(invitations: Invitation[], email?: string | null) {
  const privateKeys = email ? await getPrivateKeys(email) : [];

  return Promise.all(invitations.map(async (invitation) => {
    if (privateKeys.length === 0 || !invitation.encryptedPayload || !invitation.encryptedKey || !invitation.encryptionIv) {
      return invitation;
    }

    try {
      const payload = await decryptPayloadWithPrivateKeys<LessonPayload>(privateKeys, {
        encryptedKey: invitation.encryptedKey,
        encryptedPayload: invitation.encryptedPayload,
        encryptionIv: invitation.encryptionIv,
      });
      return {
        ...invitation,
        lesson: {
          ...invitation.lesson,
          description: payload.description ?? invitation.lesson.description,
          title: payload.title ?? invitation.lesson.title,
        },
      };
    } catch {
      return invitation;
    }
  }));
}

export async function createEncryptedLessonBody(lessonForm: LessonForm, owner: LessonOwner) {
  if (!owner.email) {
    throw new Error('Melde dich an, um persoenliche Planeintraege zu speichern.');
  }

  const privateKey = await getPrivateKey(owner.email);
  if (!privateKey) {
    throw new Error('Hinterlege deinen Private Key im Account-Bereich, um persoenliche Planeintraege zu speichern und anzuzeigen.');
  }

  const ownerPublicKeyJson = publicKeyFromPrivateKey(privateKey);
  const ownerPublicKeys = [...new Set([ownerPublicKeyJson, ...publicKeyJsonsFromValue(owner.publicKeyJson)])];
  const ownerEnvelope = await encryptPayloadForPublicKeys(ownerPublicKeys, {
    description: lessonForm.description,
    title: lessonForm.title,
  });

  return {
    ...lessonForm,
    ...ownerEnvelope,
    description: '',
    title: 'Verschluesselter Termin',
  };
}
