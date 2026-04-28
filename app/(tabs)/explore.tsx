import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const courses = [
  { name: 'Statistik II', professor: 'Prof. Dr. Weber', progress: 72, color: '#2F80ED' },
  { name: 'UX Research', professor: 'Mara Stein', progress: 54, color: '#16A085' },
  { name: 'BWL Grundlagen', professor: 'Dr. Becker', progress: 88, color: '#9B51E0' },
];

const deadlines = [
  { date: '28 Apr', title: 'Literaturreview', detail: 'Abgabe bis 18:00 Uhr' },
  { date: '03 Mai', title: 'Klausuranmeldung', detail: 'Prüfungsamt Portal' },
  { date: '09 Mai', title: 'Gruppenpräsentation', detail: 'Folien finalisieren' },
];

export default function StudyScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Studium</Text>
          <Text style={styles.title}>Kurse, Deadlines und Lernfortschritt</Text>
        </View>

        <View style={styles.searchCard}>
          <MaterialIcons name="search" size={22} color="#667085" />
          <Text style={styles.searchText}>Kurse, Räume oder Aufgaben suchen</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Aktive Kurse</Text>
          <Text style={styles.sectionAction}>Semester 4</Text>
        </View>

        <View style={styles.courseList}>
          {courses.map((course) => (
            <View key={course.name} style={styles.courseCard}>
              <View style={styles.courseTopline}>
                <View>
                  <Text style={styles.courseTitle}>{course.name}</Text>
                  <Text style={styles.courseProfessor}>{course.professor}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#98A2B3" />
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: course.color, width: `${course.progress}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressLabel}>{course.progress}% abgeschlossen</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Deadlines</Text>
          <Text style={styles.sectionAction}>Nächste 14 Tage</Text>
        </View>

        <View style={styles.deadlineList}>
          {deadlines.map((deadline) => (
            <View key={deadline.title} style={styles.deadlineCard}>
              <View style={styles.dateBadge}>
                <Text style={styles.dateText}>{deadline.date}</Text>
              </View>
              <View style={styles.deadlineContent}>
                <Text style={styles.deadlineTitle}>{deadline.title}</Text>
                <Text style={styles.deadlineDetail}>{deadline.detail}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.noteCard}>
          <MaterialIcons name="tips-and-updates" size={24} color="#F2994A" />
          <View style={styles.noteContent}>
            <Text style={styles.noteTitle}>Lernfokus</Text>
            <Text style={styles.noteText}>
              Plane heute 45 Minuten für Statistik ein. Deine nächste Wiederholung ist fällig.
            </Text>
          </View>
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
    marginBottom: 18,
  },
  kicker: {
    color: '#2F80ED',
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
  searchCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E7EC',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  searchText: {
    color: '#667085',
    fontSize: 14,
    fontWeight: '600',
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
  sectionAction: {
    color: '#2F80ED',
    fontSize: 13,
    fontWeight: '700',
  },
  courseList: {
    gap: 12,
    marginBottom: 24,
  },
  courseCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E7EC',
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  courseTopline: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  courseTitle: {
    color: '#101828',
    fontSize: 17,
    fontWeight: '800',
  },
  courseProfessor: {
    color: '#667085',
    fontSize: 13,
    marginTop: 4,
  },
  progressTrack: {
    backgroundColor: '#EAECF0',
    borderRadius: 8,
    height: 8,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: 8,
    height: '100%',
  },
  progressLabel: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  deadlineList: {
    gap: 10,
    marginBottom: 20,
  },
  deadlineCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E7EC',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  dateBadge: {
    alignItems: 'center',
    backgroundColor: '#EEF4FF',
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    width: 58,
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
    fontSize: 15,
    fontWeight: '800',
  },
  deadlineDetail: {
    color: '#667085',
    fontSize: 13,
    marginTop: 3,
  },
  noteCard: {
    alignItems: 'flex-start',
    backgroundColor: '#FFF7E8',
    borderColor: '#FEDF89',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  noteContent: {
    flex: 1,
  },
  noteTitle: {
    color: '#101828',
    fontSize: 16,
    fontWeight: '800',
  },
  noteText: {
    color: '#475467',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
});
