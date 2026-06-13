import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ModuleHeader } from '@/components/module-header';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useAuth } from '@/contexts/auth-context';
import { decryptPayloadWithPrivateKeys, getPrivateKeys } from '@/lib/client-crypto';
import { fetchInvitationRequests, respondToInvitationRequest } from './api';
import { baseStyles } from './styles';
import type { Invitation } from './types';

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
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [error, setError] = useState('');

  const loadInvitations = useCallback(async () => {
    if (!token) {
      setInvitations([]);
      return;
    }

    const data = await fetchInvitationRequests(token).catch(() => null);
    if (!data) {
      setError('Anfragen konnten nicht geladen werden.');
      return;
    }
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
  }, [token, user?.email]);

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  async function respond(id: number, decision: 'accept' | 'reject') {
    if (!token) {
      return;
    }

    const response = await respondToInvitationRequest(token, id, decision);

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
          <ModuleHeader
            accent="#92400E"
            icon="notifications"
            kicker="StudentGo"
            title="Anfragen"
            subtitle="Einladungen zu persoenlichen Terminen annehmen oder ablehnen."
          />
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
