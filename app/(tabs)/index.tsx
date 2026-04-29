import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { BackendStatusBadge } from '@/components/backend-status-badge';
import { getBackendUrl } from '@/constants/api';
import { useAuth } from '@/contexts/auth-context';

type Lesson = {
  endTime: string;
  id: number;
  lecturer?: string | null;
  ownerId?: number | null;
  room?: string | null;
  startTime: string;
  title: string;
};

type ScheduleDay = {
  day: string;
  id: number;
  lessons: Lesson[];
};

const emptyForm = { day: '', endTime: '', lecturer: '', room: '', startTime: '', title: '' };

export default function ScheduleScreen() {
  const { token, user } = useAuth();
  const backendUrl = useMemo(() => getBackendUrl(), []);
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const loadSchedule = useCallback(async () => {
    const response = await fetch(`${backendUrl}/api/schedule`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (response.ok) {
      const days = ((await response.json()) as ScheduleDay[]).filter((day) => day.lessons.length > 0);
      setSchedule(days);
    }
  }, [backendUrl, token]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  async function addLesson() {
    setError('');

    if (!token) {
      setError('Melde dich an, um persoenliche Planeintraege zu speichern.');
      return;
    }

    const response = await fetch(`${backendUrl}/api/schedule/lessons`, {
      body: JSON.stringify(form),
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    if (!response.ok) {
      setError('Planeintrag konnte nicht gespeichert werden.');
      return;
    }

    setForm(emptyForm);
    await loadSchedule();
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>StudentGo</Text>
          <Text style={styles.title}>Eigener Stundenplan</Text>
          <Text style={styles.subtitle}>Oeffentliche Termine und deine persoenlich markierten Planeintraege.</Text>
          <BackendStatusBadge />
        </View>

        <View style={styles.form}>
          <TextInput placeholder="Tag, z. B. Montag" placeholderTextColor="#98A2B3" style={styles.input} value={form.day} onChangeText={(day) => setForm((current) => ({ ...current, day }))} />
          <TextInput placeholder="Start, z. B. 08:15" placeholderTextColor="#98A2B3" style={styles.input} value={form.startTime} onChangeText={(startTime) => setForm((current) => ({ ...current, startTime }))} />
          <TextInput placeholder="Ende, z. B. 09:45" placeholderTextColor="#98A2B3" style={styles.input} value={form.endTime} onChangeText={(endTime) => setForm((current) => ({ ...current, endTime }))} />
          <TextInput placeholder="Titel" placeholderTextColor="#98A2B3" style={styles.input} value={form.title} onChangeText={(title) => setForm((current) => ({ ...current, title }))} />
          <TextInput placeholder="Raum" placeholderTextColor="#98A2B3" style={styles.input} value={form.room} onChangeText={(room) => setForm((current) => ({ ...current, room }))} />
          <TextInput placeholder="Dozierende optional" placeholderTextColor="#98A2B3" style={styles.input} value={form.lecturer} onChangeText={(lecturer) => setForm((current) => ({ ...current, lecturer }))} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable style={styles.button} onPress={addLesson}>
            <MaterialIcons name="add" size={22} color="#FFFFFF" />
            <Text style={styles.buttonText}>Persoenlichen Planeintrag speichern</Text>
          </Pressable>
        </View>

        {schedule.length === 0 ? <Text style={styles.empty}>Keine Planeintraege vorhanden.</Text> : null}
        {schedule.map((day) => (
          <View key={day.id} style={styles.daySection}>
            <Text style={styles.sectionTitle}>{day.day}</Text>
            <View style={styles.lessonList}>
              {day.lessons.map((lesson) => (
                <View key={lesson.id} style={styles.lessonCard}>
                  <Text style={styles.lessonTime}>{lesson.startTime} - {lesson.endTime}</Text>
                  <View style={styles.lessonContent}>
                    <View style={styles.lessonHeader}>
                      <Text style={styles.lessonTitle}>{lesson.title}</Text>
                      {lesson.ownerId === user?.id ? <Text style={styles.personalBadge}>Persoenlich</Text> : null}
                    </View>
                    <Text style={styles.lessonMeta}>{lesson.room || '-'} · {lesson.lecturer || '-'}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}
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
  form: { backgroundColor: '#FFFFFF', borderColor: '#E4E7EC', borderRadius: 8, borderWidth: 1, gap: 10, marginBottom: 22, padding: 14 },
  input: { backgroundColor: '#F9FAFB', borderColor: '#D0D5DD', borderRadius: 8, borderWidth: 1, color: '#101828', fontSize: 15, minHeight: 46, paddingHorizontal: 12 },
  button: { alignItems: 'center', backgroundColor: '#2F80ED', borderRadius: 8, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 48 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  error: { color: '#B42318', fontSize: 13, fontWeight: '700' },
  empty: { color: '#667085', fontSize: 14, lineHeight: 20 },
  daySection: { marginBottom: 22 },
  sectionTitle: { color: '#101828', fontSize: 20, fontWeight: '800', marginBottom: 10 },
  lessonList: { gap: 10 },
  lessonCard: { alignItems: 'flex-start', backgroundColor: '#FFFFFF', borderColor: '#E4E7EC', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 14, padding: 14 },
  lessonTime: { color: '#1D4ED8', fontSize: 13, fontWeight: '800', lineHeight: 19, width: 92 },
  lessonContent: { flex: 1 },
  lessonHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  lessonTitle: { color: '#101828', flex: 1, fontSize: 16, fontWeight: '800' },
  personalBadge: { color: '#047857', fontSize: 12, fontWeight: '800' },
  lessonMeta: { color: '#667085', fontSize: 13, lineHeight: 19, marginTop: 3 },
});
