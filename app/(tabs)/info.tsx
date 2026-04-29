import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getBackendUrl } from '@/constants/api';
import { useAuth } from '@/contexts/auth-context';

type StudyInfo = {
  category: string;
  content: string;
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
  const [error, setError] = useState('');

  const loadInfo = useCallback(async () => {
    const response = await fetch(`${backendUrl}/api/study-info`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (response.ok) {
      const data = (await response.json()) as { spo: StudyInfo[] };
      setItems(data.spo);
    }
  }, [backendUrl, token]);

  useEffect(() => {
    loadInfo();
  }, [loadInfo]);

  async function addInfo() {
    setError('');

    if (!token) {
      setError('Melde dich an, um persoenliche Infos zu speichern.');
      return;
    }

    const response = await fetch(`${backendUrl}/api/study-info`, {
      body: JSON.stringify(form),
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
  form: { backgroundColor: '#FFFFFF', borderColor: '#E4E7EC', borderRadius: 8, borderWidth: 1, gap: 10, marginBottom: 22, padding: 14 },
  input: { backgroundColor: '#F9FAFB', borderColor: '#D0D5DD', borderRadius: 8, borderWidth: 1, color: '#101828', fontSize: 15, minHeight: 46, paddingHorizontal: 12, paddingVertical: 10 },
  textArea: { minHeight: 86, textAlignVertical: 'top' },
  button: { alignItems: 'center', backgroundColor: '#2F80ED', borderRadius: 8, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 48 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  error: { color: '#B42318', fontSize: 13, fontWeight: '700' },
  empty: { color: '#667085', fontSize: 14, lineHeight: 20 },
  infoList: { gap: 10 },
  infoCard: { backgroundColor: '#FFFFFF', borderColor: '#E4E7EC', borderRadius: 8, borderWidth: 1, padding: 15 },
  cardHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  category: { color: '#7A5AF8', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  personalBadge: { color: '#047857', fontSize: 12, fontWeight: '800' },
  infoTitle: { color: '#101828', fontSize: 17, fontWeight: '800', marginTop: 8 },
  infoText: { color: '#344054', fontSize: 15, lineHeight: 22, marginTop: 6 },
});
