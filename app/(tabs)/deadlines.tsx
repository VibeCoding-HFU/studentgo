import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { initialDeadlines } from '@/constants/student-data';

type Deadline = {
  title: string;
  date: string;
  description: string;
};

export default function DeadlinesScreen() {
  const [deadlines, setDeadlines] = useState<Deadline[]>(initialDeadlines);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');

  const sortedDeadlines = useMemo(
    () => [...deadlines].sort((a, b) => a.date.localeCompare(b.date)),
    [deadlines],
  );

  const addDeadline = () => {
    if (!title.trim() || !date.trim()) {
      return;
    }

    setDeadlines((current) => [
      ...current,
      {
        title: title.trim(),
        date: date.trim(),
        description: description.trim() || 'Keine Beschreibung hinterlegt.',
      },
    ]);
    setTitle('');
    setDate('');
    setDescription('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Fristen</Text>
          <Text style={styles.title}>Persoenliche Fristen verwalten</Text>
          <Text style={styles.subtitle}>Neue Fristen erfassen und direkt in der Liste wiederfinden.</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            placeholder="Titel der Frist"
            placeholderTextColor="#98A2B3"
            style={styles.input}
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            placeholder="Datum, z. B. 2026-05-30"
            placeholderTextColor="#98A2B3"
            style={styles.input}
            value={date}
            onChangeText={setDate}
          />
          <TextInput
            multiline
            placeholder="Beschreibung optional"
            placeholderTextColor="#98A2B3"
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
          />
          <Pressable style={styles.button} onPress={addDeadline}>
            <MaterialIcons name="add" size={22} color="#FFFFFF" />
            <Text style={styles.buttonText}>Frist speichern</Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Gespeicherte Fristen</Text>
          <Text style={styles.sectionCount}>{sortedDeadlines.length}</Text>
        </View>

        <View style={styles.deadlineList}>
          {sortedDeadlines.map((deadline, index) => (
            <View key={`${deadline.title}-${deadline.date}-${index}`} style={styles.deadlineCard}>
              <View style={styles.dateBadge}>
                <Text style={styles.dateText}>{deadline.date}</Text>
              </View>
              <View style={styles.deadlineContent}>
                <Text style={styles.deadlineTitle}>{deadline.title}</Text>
                <Text style={styles.deadlineDetail}>{deadline.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  container: {
    padding: 20,
    paddingBottom: 36,
  },
  header: {
    marginBottom: 20,
  },
  kicker: {
    color: '#B54708',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  title: {
    color: '#101828',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  subtitle: {
    color: '#667085',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E7EC',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    marginBottom: 22,
    padding: 14,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderColor: '#D0D5DD',
    borderRadius: 8,
    borderWidth: 1,
    color: '#101828',
    fontSize: 15,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textArea: {
    minHeight: 86,
    textAlignVertical: 'top',
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#2F80ED',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#101828',
    fontSize: 20,
    fontWeight: '800',
  },
  sectionCount: {
    color: '#2F80ED',
    fontSize: 15,
    fontWeight: '800',
  },
  deadlineList: {
    gap: 10,
  },
  deadlineCard: {
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E7EC',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  dateBadge: {
    backgroundColor: '#EEF4FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: 104,
  },
  dateText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '800',
  },
  deadlineContent: {
    flex: 1,
  },
  deadlineTitle: {
    color: '#101828',
    fontSize: 16,
    fontWeight: '800',
  },
  deadlineDetail: {
    color: '#667085',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
});
