import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getBackendUrl } from '@/constants/api';
import { useAuth } from '@/contexts/auth-context';

type Entity = 'CONTACT' | 'DEADLINE' | 'MEAL' | 'LESSON' | 'STUDY_INFO';
type Action = 'CREATE' | 'UPDATE' | 'DELETE';

type Contact = {
  email: string;
  id: number;
  name: string;
  phone?: string | null;
  role: string;
  room?: string | null;
};

type Deadline = {
  date: string;
  description?: string | null;
  id: number;
  title: string;
};

type Meal = {
  canteen: { name: string };
  currency: string;
  date?: string | null;
  day: string;
  id: number;
  mainDish: string;
  priceCents: number;
  vegetarianDish?: string | null;
};

type ScheduleDay = {
  day: string;
  id: number;
  lessons: {
    endTime: string;
    id: number;
    lecturer?: string | null;
    room?: string | null;
    startTime: string;
    title: string;
  }[];
};

type StudyInfo = {
  category: string;
  content: string;
  id: number;
  title: string;
};

type ChangeRequest = {
  action: Action;
  createdAt: string;
  entity: Entity;
  id: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
};

const emptyContact = { email: '', name: '', phone: '', role: '', room: '' };
const emptyDeadline = { date: '', description: '', title: '' };
const emptyMeal = { canteenName: '', currency: 'EUR', date: '', day: '', mainDish: '', priceCents: '', vegetarianDish: '' };
const emptyLesson = { day: '', endTime: '', lecturer: '', room: '', startTime: '', title: '' };
const emptyInfo = { category: 'Allgemein', content: '', title: '' };

function formatDate(value: string) {
  return value.includes('T') ? value.slice(0, 10) : value;
}

function statusLabel(status: ChangeRequest['status']) {
  if (status === 'APPROVED') {
    return 'Angenommen';
  }

  if (status === 'REJECTED') {
    return 'Abgelehnt';
  }

  return 'Offen';
}

function itemMeta(item: Contact | Deadline | Meal | (ScheduleDay['lessons'][number] & { day: string }) | StudyInfo) {
  if ('email' in item) {
    return item.email;
  }

  if ('date' in item) {
    return item.date ? formatDate(item.date) : 'day' in item ? item.day : '';
  }

  if ('day' in item) {
    return item.day;
  }

  return item.category;
}

export default function ManagerScreen() {
  const { isManagerMode, token } = useAuth();
  const backendUrl = useMemo(() => getBackendUrl(), []);
  const [entity, setEntity] = useState<Entity>('CONTACT');
  const [action, setAction] = useState<Action>('CREATE');
  const [targetId, setTargetId] = useState<number | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [lessons, setLessons] = useState<(ScheduleDay['lessons'][number] & { day: string })[]>([]);
  const [infos, setInfos] = useState<StudyInfo[]>([]);
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [contactForm, setContactForm] = useState(emptyContact);
  const [deadlineForm, setDeadlineForm] = useState(emptyDeadline);
  const [mealForm, setMealForm] = useState(emptyMeal);
  const [lessonForm, setLessonForm] = useState(emptyLesson);
  const [infoForm, setInfoForm] = useState(emptyInfo);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const selectedItems =
    entity === 'CONTACT'
      ? contacts
      : entity === 'DEADLINE'
        ? deadlines
        : entity === 'MEAL'
          ? meals
          : entity === 'LESSON'
            ? lessons
            : infos;

  const loadData = useCallback(async () => {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const [contactsResponse, deadlinesResponse, mealsResponse, scheduleResponse, infoResponse, requestsResponse] = await Promise.all([
        fetch(`${backendUrl}/api/contacts`),
        fetch(`${backendUrl}/api/deadlines`),
        fetch(`${backendUrl}/api/meals`),
        fetch(`${backendUrl}/api/schedule`),
        fetch(`${backendUrl}/api/study-info`),
        fetch(`${backendUrl}/api/manager/change-requests`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!contactsResponse.ok || !deadlinesResponse.ok || !mealsResponse.ok || !scheduleResponse.ok || !infoResponse.ok || !requestsResponse.ok) {
        throw new Error('Verwaltungsdaten konnten nicht geladen werden.');
      }

      const schedule = (await scheduleResponse.json()) as ScheduleDay[];
      const info = (await infoResponse.json()) as { spo: StudyInfo[] };
      setContacts((await contactsResponse.json()) as Contact[]);
      setDeadlines((await deadlinesResponse.json()) as Deadline[]);
      setMeals((await mealsResponse.json()) as Meal[]);
      setLessons(schedule.flatMap((day) => day.lessons.map((lesson) => ({ ...lesson, day: day.day }))));
      setInfos(info.spo);
      setRequests((await requestsResponse.json()) as ChangeRequest[]);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Verwaltungsdaten konnten nicht geladen werden.');
    } finally {
      setIsLoading(false);
    }
  }, [backendUrl, token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function resetForm(nextEntity = entity) {
    setTargetId(null);
    setContactForm(emptyContact);
    setDeadlineForm(emptyDeadline);
    setMealForm(emptyMeal);
    setLessonForm(emptyLesson);
    setInfoForm(emptyInfo);

    if (action !== 'CREATE') {
      setAction('CREATE');
    }

    if (nextEntity !== entity) {
      setEntity(nextEntity);
    }
  }

  function selectItem(item: Contact | Deadline | Meal | (ScheduleDay['lessons'][number] & { day: string }) | StudyInfo) {
    setTargetId(item.id);

    if (entity === 'CONTACT') {
      const contact = item as Contact;
      setContactForm({
        email: contact.email,
        name: contact.name,
        phone: contact.phone ?? '',
        role: contact.role,
        room: contact.room ?? '',
      });
      return;
    }

    if (entity === 'DEADLINE') {
      const deadline = item as Deadline;
      setDeadlineForm({
        date: formatDate(deadline.date),
        description: deadline.description ?? '',
        title: deadline.title,
      });
      return;
    }

    if (entity === 'MEAL') {
      const meal = item as Meal;
      setMealForm({
        canteenName: meal.canteen.name,
        currency: meal.currency,
        date: meal.date ? formatDate(meal.date) : '',
        day: meal.day,
        mainDish: meal.mainDish,
        priceCents: String(meal.priceCents),
        vegetarianDish: meal.vegetarianDish ?? '',
      });
      return;
    }

    if (entity === 'LESSON') {
      const lesson = item as ScheduleDay['lessons'][number] & { day: string };
      setLessonForm({
        day: lesson.day,
        endTime: lesson.endTime,
        lecturer: lesson.lecturer ?? '',
        room: lesson.room ?? '',
        startTime: lesson.startTime,
        title: lesson.title,
      });
      return;
    }

    const info = item as StudyInfo;
    setInfoForm({
      category: info.category,
      content: info.content,
      title: info.title,
    });
  }

  async function submitRequest() {
    setError('');
    setMessage('');

    const payload =
      entity === 'CONTACT'
        ? contactForm
        : entity === 'DEADLINE'
          ? deadlineForm
          : entity === 'MEAL'
            ? { ...mealForm, priceCents: Number(mealForm.priceCents) }
            : entity === 'LESSON'
              ? lessonForm
              : infoForm;

    if (action !== 'CREATE' && !targetId) {
      setError('Waehle zuerst einen bestehenden Eintrag aus.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${backendUrl}/api/manager/change-requests`, {
        body: JSON.stringify({
          action,
          entity,
          payload,
          targetId: action === 'CREATE' ? null : targetId,
        }),
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Anfrage konnte nicht gespeichert werden.');
      }

      setMessage('Anfrage an den Admin wurde erstellt.');
      resetForm();
      await loadData();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Anfrage konnte nicht gespeichert werden.');
    } finally {
      setIsLoading(false);
    }
  }

  if (!isManagerMode) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.locked}>
          <MaterialIcons name="lock" size={34} color="#B42318" />
          <Text style={styles.lockedTitle}>Verwalter-Zugang erforderlich</Text>
          <Text style={styles.lockedText}>Melde dich im Account-Tab als Verwalter oder Admin an.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Verwalter</Text>
          <Text style={styles.title}>Eintraege vorbereiten</Text>
          <Text style={styles.subtitle}>Aenderungen werden als Anfrage gespeichert und erst nach Admin-Freigabe aktiv.</Text>
        </View>

        <View style={styles.toggleRow}>
          <Pressable style={[styles.toggleButton, entity === 'CONTACT' && styles.toggleButtonActive]} onPress={() => resetForm('CONTACT')}>
            <MaterialIcons name="contacts" size={20} color={entity === 'CONTACT' ? '#FFFFFF' : '#475467'} />
            <Text style={[styles.toggleText, entity === 'CONTACT' && styles.toggleTextActive]}>Kontakte</Text>
          </Pressable>
          <Pressable style={[styles.toggleButton, entity === 'DEADLINE' && styles.toggleButtonActive]} onPress={() => resetForm('DEADLINE')}>
            <MaterialIcons name="event-available" size={20} color={entity === 'DEADLINE' ? '#FFFFFF' : '#475467'} />
            <Text style={[styles.toggleText, entity === 'DEADLINE' && styles.toggleTextActive]}>Fristen</Text>
          </Pressable>
        </View>
        <View style={styles.toggleRow}>
          <Pressable style={[styles.toggleButton, entity === 'MEAL' && styles.toggleButtonActive]} onPress={() => resetForm('MEAL')}>
            <MaterialIcons name="restaurant" size={20} color={entity === 'MEAL' ? '#FFFFFF' : '#475467'} />
            <Text style={[styles.toggleText, entity === 'MEAL' && styles.toggleTextActive]}>Mensa</Text>
          </Pressable>
          <Pressable style={[styles.toggleButton, entity === 'LESSON' && styles.toggleButtonActive]} onPress={() => resetForm('LESSON')}>
            <MaterialIcons name="calendar-month" size={20} color={entity === 'LESSON' ? '#FFFFFF' : '#475467'} />
            <Text style={[styles.toggleText, entity === 'LESSON' && styles.toggleTextActive]}>Plan</Text>
          </Pressable>
          <Pressable style={[styles.toggleButton, entity === 'STUDY_INFO' && styles.toggleButtonActive]} onPress={() => resetForm('STUDY_INFO')}>
            <MaterialIcons name="menu-book" size={20} color={entity === 'STUDY_INFO' ? '#FFFFFF' : '#475467'} />
            <Text style={[styles.toggleText, entity === 'STUDY_INFO' && styles.toggleTextActive]}>Infos</Text>
          </Pressable>
        </View>

        <View style={styles.toggleRow}>
          {(['CREATE', 'UPDATE', 'DELETE'] as Action[]).map((nextAction) => (
            <Pressable key={nextAction} style={[styles.actionButton, action === nextAction && styles.actionButtonActive]} onPress={() => setAction(nextAction)}>
              <Text style={[styles.actionText, action === nextAction && styles.actionTextActive]}>
                {nextAction === 'CREATE' ? 'Neu' : nextAction === 'UPDATE' ? 'Bearbeiten' : 'Loeschen'}
              </Text>
            </Pressable>
          ))}
        </View>

        {action !== 'CREATE' && selectedItems.length > 0 && (
          <View style={styles.itemList}>
            {selectedItems.map((item) => (
              <Pressable key={item.id} style={[styles.itemCard, targetId === item.id && styles.itemCardActive]} onPress={() => selectItem(item)}>
                <Text style={styles.itemTitle}>{'name' in item ? item.name : 'mainDish' in item ? item.mainDish : item.title}</Text>
                <Text style={styles.itemMeta}>{itemMeta(item)}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.form}>
          {entity === 'CONTACT' ? (
            <>
              <TextInput placeholder="Name" placeholderTextColor="#98A2B3" style={styles.input} value={contactForm.name} onChangeText={(name) => setContactForm((current) => ({ ...current, name }))} />
              <TextInput placeholder="Rolle" placeholderTextColor="#98A2B3" style={styles.input} value={contactForm.role} onChangeText={(role) => setContactForm((current) => ({ ...current, role }))} />
              <TextInput autoCapitalize="none" keyboardType="email-address" placeholder="E-Mail" placeholderTextColor="#98A2B3" style={styles.input} value={contactForm.email} onChangeText={(email) => setContactForm((current) => ({ ...current, email }))} />
              <TextInput placeholder="Telefon" placeholderTextColor="#98A2B3" style={styles.input} value={contactForm.phone} onChangeText={(phone) => setContactForm((current) => ({ ...current, phone }))} />
              <TextInput placeholder="Raum" placeholderTextColor="#98A2B3" style={styles.input} value={contactForm.room} onChangeText={(room) => setContactForm((current) => ({ ...current, room }))} />
            </>
          ) : entity === 'DEADLINE' ? (
            <>
              <TextInput placeholder="Titel" placeholderTextColor="#98A2B3" style={styles.input} value={deadlineForm.title} onChangeText={(title) => setDeadlineForm((current) => ({ ...current, title }))} />
              <TextInput placeholder="Datum, z. B. 2026-05-30" placeholderTextColor="#98A2B3" style={styles.input} value={deadlineForm.date} onChangeText={(date) => setDeadlineForm((current) => ({ ...current, date }))} />
              <TextInput multiline placeholder="Beschreibung" placeholderTextColor="#98A2B3" style={[styles.input, styles.textArea]} value={deadlineForm.description} onChangeText={(description) => setDeadlineForm((current) => ({ ...current, description }))} />
            </>
          ) : entity === 'MEAL' ? (
            <>
              <TextInput placeholder="Mensa" placeholderTextColor="#98A2B3" style={styles.input} value={mealForm.canteenName} onChangeText={(canteenName) => setMealForm((current) => ({ ...current, canteenName }))} />
              <TextInput placeholder="Tag" placeholderTextColor="#98A2B3" style={styles.input} value={mealForm.day} onChangeText={(day) => setMealForm((current) => ({ ...current, day }))} />
              <TextInput placeholder="Datum dieser Woche, z. B. 2026-05-01" placeholderTextColor="#98A2B3" style={styles.input} value={mealForm.date} onChangeText={(date) => setMealForm((current) => ({ ...current, date }))} />
              <TextInput placeholder="Hauptgericht" placeholderTextColor="#98A2B3" style={styles.input} value={mealForm.mainDish} onChangeText={(mainDish) => setMealForm((current) => ({ ...current, mainDish }))} />
              <TextInput placeholder="Vegetarisch optional" placeholderTextColor="#98A2B3" style={styles.input} value={mealForm.vegetarianDish} onChangeText={(vegetarianDish) => setMealForm((current) => ({ ...current, vegetarianDish }))} />
              <TextInput keyboardType="numeric" placeholder="Preis in Cent" placeholderTextColor="#98A2B3" style={styles.input} value={mealForm.priceCents} onChangeText={(priceCents) => setMealForm((current) => ({ ...current, priceCents }))} />
            </>
          ) : entity === 'LESSON' ? (
            <>
              <TextInput placeholder="Tag" placeholderTextColor="#98A2B3" style={styles.input} value={lessonForm.day} onChangeText={(day) => setLessonForm((current) => ({ ...current, day }))} />
              <TextInput placeholder="Start" placeholderTextColor="#98A2B3" style={styles.input} value={lessonForm.startTime} onChangeText={(startTime) => setLessonForm((current) => ({ ...current, startTime }))} />
              <TextInput placeholder="Ende" placeholderTextColor="#98A2B3" style={styles.input} value={lessonForm.endTime} onChangeText={(endTime) => setLessonForm((current) => ({ ...current, endTime }))} />
              <TextInput placeholder="Titel" placeholderTextColor="#98A2B3" style={styles.input} value={lessonForm.title} onChangeText={(title) => setLessonForm((current) => ({ ...current, title }))} />
              <TextInput placeholder="Raum" placeholderTextColor="#98A2B3" style={styles.input} value={lessonForm.room} onChangeText={(room) => setLessonForm((current) => ({ ...current, room }))} />
              <TextInput placeholder="Dozierende" placeholderTextColor="#98A2B3" style={styles.input} value={lessonForm.lecturer} onChangeText={(lecturer) => setLessonForm((current) => ({ ...current, lecturer }))} />
            </>
          ) : (
            <>
              <TextInput placeholder="Kategorie" placeholderTextColor="#98A2B3" style={styles.input} value={infoForm.category} onChangeText={(category) => setInfoForm((current) => ({ ...current, category }))} />
              <TextInput placeholder="Titel" placeholderTextColor="#98A2B3" style={styles.input} value={infoForm.title} onChangeText={(title) => setInfoForm((current) => ({ ...current, title }))} />
              <TextInput multiline placeholder="Inhalt" placeholderTextColor="#98A2B3" style={[styles.input, styles.textArea]} value={infoForm.content} onChangeText={(content) => setInfoForm((current) => ({ ...current, content }))} />
            </>
          )}

          {message ? <Text style={styles.success}>{message}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable disabled={isLoading} style={[styles.button, isLoading && styles.buttonDisabled]} onPress={submitRequest}>
            <MaterialIcons name="send" size={21} color="#FFFFFF" />
            <Text style={styles.buttonText}>{isLoading ? 'Bitte warten' : 'Anfrage senden'}</Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Meine Anfragen</Text>
          <Text style={styles.sectionCount}>{requests.length}</Text>
        </View>

        <View style={styles.itemList}>
          {requests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <Text style={styles.itemTitle}>
                {request.entity === 'CONTACT' ? 'Kontakt' : request.entity === 'DEADLINE' ? 'Frist' : request.entity === 'MEAL' ? 'Mensa' : request.entity === 'LESSON' ? 'Plan' : 'Info'} · {request.action === 'CREATE' ? 'Neu' : request.action === 'UPDATE' ? 'Bearbeiten' : 'Loeschen'}
              </Text>
              <Text style={styles.itemMeta}>{statusLabel(request.status)}</Text>
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
    color: '#0E6F63',
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
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  toggleButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D0D5DD',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 44,
  },
  toggleButtonActive: {
    backgroundColor: '#0E6F63',
    borderColor: '#0E6F63',
  },
  toggleText: {
    color: '#475467',
    fontSize: 14,
    fontWeight: '800',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D0D5DD',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
  },
  actionButtonActive: {
    backgroundColor: '#14213D',
    borderColor: '#14213D',
  },
  actionText: {
    color: '#475467',
    fontSize: 13,
    fontWeight: '800',
  },
  actionTextActive: {
    color: '#FFFFFF',
  },
  itemList: {
    gap: 10,
    marginBottom: 16,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E7EC',
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  itemCardActive: {
    borderColor: '#0E6F63',
    borderWidth: 2,
  },
  itemTitle: {
    color: '#101828',
    fontSize: 15,
    fontWeight: '800',
  },
  itemMeta: {
    color: '#667085',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
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
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  success: {
    color: '#047857',
    fontSize: 13,
    fontWeight: '800',
  },
  error: {
    color: '#B42318',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
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
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E7EC',
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  locked: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  lockedTitle: {
    color: '#101828',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 14,
    textAlign: 'center',
  },
  lockedText: {
    color: '#667085',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
  },
});
