import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackendStatusBadge } from '@/components/backend-status-badge';
import { getBackendUrl } from '@/constants/api';
import { useAuth } from '@/contexts/auth-context';
import { decryptPayload, getPrivateKey } from '@/lib/client-crypto';

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
    const privateKey = user?.email ? await getPrivateKey(user.email) : null;
    const decrypted = await Promise.all(data.map(async (invitation) => {
      if (!privateKey || !invitation.encryptedPayload || !invitation.encryptedKey || !invitation.encryptionIv) {
        return invitation;
      }

      try {
        const payload = await decryptPayload<{ description?: string; title?: string }>(privateKey, {
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
          <BackendStatusBadge />
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F7FB' },
  container: { padding: 20, paddingBottom: 36 },
  header: { marginBottom: 20 },
  kicker: { color: '#2F80ED', fontSize: 14, fontWeight: '800', marginBottom: 6, textTransform: 'uppercase' },
  title: { color: '#101828', fontSize: 28, fontWeight: '800', lineHeight: 34 },
  subtitle: { color: '#667085', fontSize: 15, lineHeight: 22, marginBottom: 14, marginTop: 8 },
  error: { color: '#B42318', fontSize: 13, fontWeight: '800', marginBottom: 12 },
  empty: { color: '#667085', fontSize: 14, lineHeight: 20 },
  list: { gap: 12 },
  card: { backgroundColor: '#FFFFFF', borderColor: '#E4E7EC', borderRadius: 8, borderWidth: 1, padding: 14 },
  cardHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  cardTitle: { color: '#101828', flex: 1, fontSize: 16, fontWeight: '800' },
  status: { color: '#667085', fontSize: 12, fontWeight: '800' },
  statusPending: { color: '#B54708' },
  meta: { color: '#667085', fontSize: 13, lineHeight: 19, marginTop: 5 },
  description: { color: '#475467', fontSize: 13, lineHeight: 19, marginTop: 8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  acceptButton: { alignItems: 'center', backgroundColor: '#047857', borderRadius: 8, flex: 1, flexDirection: 'row', gap: 7, justifyContent: 'center', minHeight: 44 },
  rejectButton: { alignItems: 'center', backgroundColor: '#B42318', borderRadius: 8, flex: 1, flexDirection: 'row', gap: 7, justifyContent: 'center', minHeight: 44 },
  actionText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
