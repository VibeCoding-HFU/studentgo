import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getBackendUrl } from '@/constants/api';
import { useAuth } from '@/contexts/auth-context';
import { decryptPayload, encryptPayload, getPrivateKey } from '@/lib/client-crypto';

type StudyInfo = {
  category: string;
  content: string;
  encryptedKey?: string | null;
  encryptedPayload?: string | null;
  encryptionIv?: string | null;
  id: number;
  ownerId?: number | null;
  title: string;
};

const emptyForm = { category: 'Persoenlich', content: '', title: '' };

export default function InfoScreen() {
  const { token, user } = useAuth();
  const backendUrl = useMemo(() => getBackendUrl(), []);
  const [items, setItems] = useState<StudyInfo[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState('');

  const loadInfo = useCallback(async () => {
    const response = await fetch(`${backendUrl}/api/study-info`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (response.ok) {
      const data = (await response.json()) as { spo: StudyInfo[] };
      const privateKey = user?.email ? getPrivateKey(user.email) : null;
      const decryptedItems = await Promise.all(data.spo.map(async (item) => {
        if (!privateKey || !item.encryptedPayload || !item.encryptedKey || !item.encryptionIv) {
          return item;
        }

        try {
          const decrypted = await decryptPayload<{ content?: string; title?: string }>(privateKey, {
            encryptedKey: item.encryptedKey,
            encryptedPayload: item.encryptedPayload,
            encryptionIv: item.encryptionIv,
          });
          return {
            ...item,
            content: decrypted.content ?? item.content,
            title: decrypted.title ?? item.title,
          };
        } catch {
          return {
            ...item,
            content: 'Private Key fehlt oder passt nicht zu diesem Eintrag.',
            title: 'Verschluesselte Info',
          };
        }
      }));
      setItems(decryptedItems);
    }
  }, [backendUrl, token, user?.email]);

  useEffect(() => {
    loadInfo();
  }, [loadInfo]);

  async function addInfo() {
    setError('');

    if (!token) {
      setError('Melde dich an, um persoenliche Infos zu speichern.');
      return;
    }

    if (!user?.publicKeyJson) {
      setError('Dein Account hat noch keinen Public Key.');
      return;
    }

    const encrypted = await encryptPayload(user.publicKeyJson, {
      content: form.content,
      title: form.title,
    });

    const response = await fetch(`${backendUrl}/api/study-info`, {
      body: JSON.stringify({
        ...form,
        ...encrypted,
        content: 'Verschluesselte Info',
        title: 'Verschluesselte Info',
      }),
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    if (!response.ok) {
      setError('Info konnte nicht gespeichert werden.');
      return;
    }

    setForm(emptyForm);
    await loadInfo();
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Infos</Text>
          <Text style={styles.title}>Studieninfos</Text>
          <Text style={styles.subtitle}>Oeffentliche Informationen und deine persoenlich markierten Notizen.</Text>
        </View>

        <View style={styles.infoList}>
          {items.length === 0 ? <Text style={styles.empty}>Keine Infos vorhanden.</Text> : null}
          {items.map((item) => (
            <View key={item.id} style={styles.infoCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.category}>{item.category}</Text>
                {item.ownerId === user?.id ? <Text style={styles.personalBadge}>Persoenlich</Text> : null}
              </View>
              <Text style={styles.infoTitle}>{item.title}</Text>
              <Text style={styles.infoText}>{item.content}</Text>
            </View>
          ))}
        </View>

        <View style={styles.addPanel}>
          <Pressable style={styles.addHeader} onPress={() => setFormOpen((current) => !current)}>
            <View>
              <Text style={styles.addTitle}>Persoenliche Info hinzufuegen</Text>
              <Text style={styles.addHint}>Notizen und Infos werden nur fuer deinen Account gespeichert.</Text>
            </View>
            <MaterialIcons name={formOpen ? 'expand-less' : 'expand-more'} size={28} color="#2F80ED" />
          </Pressable>

          {formOpen ? (
            <View style={styles.form}>
              <TextInput placeholder="Kategorie" placeholderTextColor="#98A2B3" style={styles.input} value={form.category} onChangeText={(category) => setForm((current) => ({ ...current, category }))} />
              <TextInput placeholder="Titel" placeholderTextColor="#98A2B3" style={styles.input} value={form.title} onChangeText={(title) => setForm((current) => ({ ...current, title }))} />
              <TextInput multiline placeholder="Inhalt" placeholderTextColor="#98A2B3" style={[styles.input, styles.textArea]} value={form.content} onChangeText={(content) => setForm((current) => ({ ...current, content }))} />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Pressable style={styles.button} onPress={addInfo}>
                <MaterialIcons name="add" size={22} color="#FFFFFF" />
                <Text style={styles.buttonText}>Persoenliche Info speichern</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F7FB' },
  container: { padding: 20, paddingBottom: 36 },
  header: { marginBottom: 20 },
  kicker: { color: '#7A5AF8', fontSize: 14, fontWeight: '800', marginBottom: 6, textTransform: 'uppercase' },
  title: { color: '#101828', fontSize: 28, fontWeight: '800', lineHeight: 34 },
  subtitle: { color: '#667085', fontSize: 15, lineHeight: 22, marginTop: 8 },
  form: { backgroundColor: '#FFFFFF', borderColor: '#E4E7EC', borderRadius: 8, borderWidth: 1, gap: 10, padding: 14 },
  input: { backgroundColor: '#F9FAFB', borderColor: '#D0D5DD', borderRadius: 8, borderWidth: 1, color: '#101828', fontSize: 15, minHeight: 46, paddingHorizontal: 12, paddingVertical: 10 },
  textArea: { minHeight: 86, textAlignVertical: 'top' },
  button: { alignItems: 'center', backgroundColor: '#2F80ED', borderRadius: 8, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 48 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  error: { color: '#B42318', fontSize: 13, fontWeight: '700' },
  empty: { color: '#667085', fontSize: 14, lineHeight: 20 },
  infoList: { gap: 10, marginBottom: 18 },
  infoCard: { backgroundColor: '#FFFFFF', borderColor: '#E4E7EC', borderRadius: 8, borderWidth: 1, padding: 15 },
  cardHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  category: { color: '#7A5AF8', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  personalBadge: { color: '#047857', fontSize: 12, fontWeight: '800' },
  infoTitle: { color: '#101828', fontSize: 17, fontWeight: '800', marginTop: 8 },
  infoText: { color: '#344054', fontSize: 15, lineHeight: 22, marginTop: 6 },
  addPanel: { marginTop: 4 },
  addHeader: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E4E7EC', borderRadius: 8, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, padding: 14 },
  addTitle: { color: '#101828', fontSize: 17, fontWeight: '800' },
  addHint: { color: '#667085', fontSize: 13, lineHeight: 19, marginTop: 3, paddingRight: 8 },
});
