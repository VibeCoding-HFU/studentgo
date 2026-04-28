import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const nextLessons = [
  { time: '09:15', course: 'Data Science', room: 'A2.14', accent: '#2F80ED' },
  { time: '11:00', course: 'Marketing', room: 'B1.03', accent: '#16A085' },
  { time: '14:30', course: 'Projektarbeit', room: 'Lab 4', accent: '#F2994A' },
];

const tasks = [
  { title: 'Essay abgeben', course: 'Wissenschaftliches Arbeiten', due: 'Heute' },
  { title: 'Lernkarten wiederholen', course: 'Statistik', due: 'Morgen' },
  { title: 'Teammeeting vorbereiten', course: 'UX Research', due: 'Freitag' },
];

const quickStats = [
  { label: 'Credits', value: '42/60', icon: 'school', color: '#2F80ED' },
  { label: 'Ø Note', value: '1,8', icon: 'auto-graph', color: '#16A085' },
  { label: 'Budget', value: '312€', icon: 'account-balance-wallet', color: '#9B51E0' },
];

export default function DashboardScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>Guten Morgen, Lina</Text>
            <Text style={styles.title}>Dein StudentGo Dashboard</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>LS</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroText}>
            <Text style={styles.heroLabel}>Nächste Vorlesung</Text>
            <Text style={styles.heroTitle}>Data Science</Text>
            <Text style={styles.heroMeta}>09:15 Uhr · Gebäude A · Raum 2.14</Text>
          </View>
          <View style={styles.heroIcon}>
            <MaterialIcons name="calendar-month" size={32} color="#F9FAFB" />
          </View>
        </View>

        <View style={styles.statsGrid}>
          {quickStats.map((item) => (
            <View key={item.label} style={styles.statCard}>
              <MaterialIcons name={item.icon as keyof typeof MaterialIcons.glyphMap} size={22} color={item.color} />
              <Text style={styles.statValue}>{item.value}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Heute</Text>
          <Text style={styles.sectionAction}>3 Termine</Text>
        </View>

        <View style={styles.timeline}>
          {nextLessons.map((lesson) => (
            <View key={`${lesson.time}-${lesson.course}`} style={styles.timelineItem}>
              <Text style={styles.lessonTime}>{lesson.time}</Text>
              <View style={[styles.timelineDot, { backgroundColor: lesson.accent }]} />
              <View style={styles.lessonCard}>
                <Text style={styles.lessonTitle}>{lesson.course}</Text>
                <Text style={styles.lessonMeta}>{lesson.room}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Aufgaben</Text>
          <Text style={styles.sectionAction}>Alle ansehen</Text>
        </View>

        <View style={styles.taskList}>
          {tasks.map((task) => (
            <View key={task.title} style={styles.taskCard}>
              <View style={styles.checkbox}>
                <MaterialIcons name="check" size={16} color="#16A085" />
              </View>
              <View style={styles.taskContent}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.taskMeta}>{task.course}</Text>
              </View>
              <Text style={styles.taskDue}>{task.due}</Text>
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
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  kicker: {
    color: '#667085',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    color: '#101828',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
    marginTop: 4,
    maxWidth: 260,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#E8F2FF',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarText: {
    color: '#1D4ED8',
    fontSize: 16,
    fontWeight: '800',
  },
  hero: {
    backgroundColor: '#14213D',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
    overflow: 'hidden',
    padding: 20,
  },
  heroText: {
    flex: 1,
    paddingRight: 12,
  },
  heroLabel: {
    color: '#A7B7D8',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  heroMeta: {
    color: '#D6E0F5',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: '#2F80ED',
    borderRadius: 8,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E7EC',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  statValue: {
    color: '#101828',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 10,
  },
  statLabel: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
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
  timeline: {
    gap: 10,
    marginBottom: 24,
  },
  timelineItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  lessonTime: {
    color: '#475467',
    fontSize: 13,
    fontWeight: '800',
    width: 44,
  },
  timelineDot: {
    borderRadius: 6,
    height: 12,
    width: 12,
  },
  lessonCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E7EC',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  lessonTitle: {
    color: '#101828',
    fontSize: 16,
    fontWeight: '800',
  },
  lessonMeta: {
    color: '#667085',
    fontSize: 13,
    marginTop: 3,
  },
  taskList: {
    gap: 10,
  },
  taskCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E7EC',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  checkbox: {
    alignItems: 'center',
    backgroundColor: '#E9F8F3',
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    color: '#101828',
    fontSize: 15,
    fontWeight: '800',
  },
  taskMeta: {
    color: '#667085',
    fontSize: 13,
    marginTop: 3,
  },
  taskDue: {
    color: '#B54708',
    fontSize: 12,
    fontWeight: '800',
  },
});
