import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SyncStatusBadge } from '@/components/sync-status-badge';
import { getBackendUrl } from '@/constants/api';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useAuth } from '@/contexts/auth-context';
import { decryptPayloadWithPrivateKeys, getPrivateKeys } from '@/lib/client-crypto';
import { baseStyles } from './styles';

type Invitation = {
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

function statusLabel(status: Invitation['status']) {
  if (status === 'ACCEPTED') {
    return 'Angenommen';
  }

  if (status === 'REJECTED') {
    return 'Abgelehnt';
  }

  return 'Offen';
}

function formatDate(value?: string | null) {
  if (!value) {
    return 'woechentlich';
  }

  return new Date(value).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function RequestsScreen() {
  const styles = useThemedStyles(baseStyles);
  const { token, user } = useAuth();
  const backendUrl = useMemo(() => getBackendUrl(), []);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [error, setError] = useState('');

  const loadInvitations = useCallback(async () => {
    if (!token) {
      setInvitations([]);
      return;
    }

    const response = await fetch(`${backendUrl}/api/schedule/invitations`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      setError('Anfragen konnten nicht geladen werden.');
      return;
    }

    const data = (await response.json()) as Invitation[];
    const privateKeys = user?.email ? await getPrivateKeys(user.email) : [];
    const decrypted = await Promise.all(data.map(async (invitation) => {
      if (privateKeys.length === 0 || !invitation.encryptedPayload || !invitation.encryptedKey || !invitation.encryptionIv) {
        return invitation;
      }

      try {
        const payload = await decryptPayloadWithPrivateKeys<{ description?: string; title?: string }>(privateKeys, {
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
    setInvitations(decrypted);
  }, [backendUrl, token, user?.email]);

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  async function respond(id: number, decision: 'accept' | 'reject') {
    if (!token) {
      return;
    }

    const response = await fetch(`${backendUrl}/api/schedule/invitations/${id}/${decision}`, {
      headers: { Authorization: `Bearer ${token}` },
      method: 'POST',
    });

    if (!response.ok) {
      setError('Antwort konnte nicht gespeichert werden.');
      return;
    }

    setError('');
    await loadInvitations();
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>StudentGo</Text>
          <Text style={styles.title}>Anfragen</Text>
          <Text style={styles.subtitle}>Einladungen zu persoenlichen Terminen annehmen oder ablehnen.</Text>
          <SyncStatusBadge />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {invitations.length === 0 ? <Text style={styles.empty}>Keine Anfragen vorhanden.</Text> : null}

        <View style={styles.list}>
          {invitations.map((invitation) => (
            <View key={invitation.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{invitation.lesson.title}</Text>
                <Text style={[styles.status, invitation.status === 'PENDING' && styles.statusPending]}>{statusLabel(invitation.status)}</Text>
              </View>
              <Text style={styles.meta}>
                {invitation.lesson.scheduleDay.day} · {formatDate(invitation.lesson.date)} · {invitation.lesson.startTime} - {invitation.lesson.endTime}
              </Text>
              <Text style={styles.meta}>Von {invitation.sender.name} · {invitation.sender.email}</Text>
              {invitation.lesson.description ? <Text style={styles.description}>{invitation.lesson.description}</Text> : null}

              {invitation.status === 'PENDING' ? (
                <View style={styles.actions}>
                  <Pressable style={styles.acceptButton} onPress={() => respond(invitation.id, 'accept')}>
                    <MaterialIcons name="check" size={20} color="#FFFFFF" />
                    <Text style={styles.actionText}>Annehmen</Text>
                  </Pressable>
                  <Pressable style={styles.rejectButton} onPress={() => respond(invitation.id, 'reject')}>
                    <MaterialIcons name="close" size={20} color="#FFFFFF" />
                    <Text style={styles.actionText}>Ablehnen</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
