import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SwipeableTabView } from '@/components/swipeable-tab-view';
import { SyncStatusBadge } from '@/components/sync-status-badge';
import { getBackendUrl } from '@/constants/api';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useAuth } from '@/contexts/auth-context';

type Entity = 'CONTACT' | 'MEAL' | 'LESSON' | 'STUDY_INFO';
type ChangeEntity = Entity | 'DEADLINE';
type Action = 'CREATE' | 'UPDATE' | 'DELETE';

type Contact = {
  email: string;
  id: number;
  name: string;
  phone?: string | null;
  role: string;
  room?: string | null;
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
    date?: string | null;
    description?: string | null;
    endTime: string;
    id: number;
    isRecurring?: boolean;
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
  entity: ChangeEntity;
  id: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
};

const emptyContact = { email: '', name: '', phone: '', role: '', room: '' };
const emptyMeal = { canteenName: '', currency: 'EUR', date: '', day: '', mainDish: '', priceCents: '', vegetarianDish: '' };
const emptyLesson = { date: '', day: '', description: '', endTime: '09:45', isRecurring: false, lecturer: '', room: '', startTime: '08:15', title: '' };
const emptyInfo = { category: 'Allgemein', content: '', title: '' };
const actions: Action[] = ['CREATE', 'UPDATE', 'DELETE'];
const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const dayOptions = dayNames.map((day) => ({ id: day, name: day }));
const currencyOptions = ['EUR', 'USD', 'CHF'].map((currency) => ({ id: currency, name: currency }));
const timeOptions = Array.from({ length: 57 }, (_value, index) => {
  const minutes = 6 * 60 + index * 15;
  const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  return { id: time, name: time };
});

type Option = { id: number | string; name: string; shortname?: string };

function formatDate(value: string) {
  return value.includes('T') ? value.slice(0, 10) : value;
}

function startOfWeek(date = new Date()) {
  const result = new Date(date);
  const day = result.getDay() || 7;
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - day + 1);
  return result;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function toInputDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function formatDisplayDate(date: Date) {
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

function formatFullDate(value: string) {
  if (!value) {
    return 'Datum auswaehlen';
  }

  return new Date(`${value}T12:00:00`).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function dayFromDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return dayNames[(date.getDay() + 6) % 7];
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

function actionLabel(action: Action) {
  if (action === 'UPDATE') {
    return 'Bearbeiten';
  }

  if (action === 'DELETE') {
    return 'Loeschen';
  }

  return 'Anlegen';
}

function ComboBox<T extends Option>({ disabled, label, onChange, options, value }: {
  disabled?: boolean;
  label: string;
  onChange: (option: T) => void;
  options: T[];
  value: T | null;
}) {
  const styles = useThemedStyles(baseStyles);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={[styles.comboBox, isOpen && styles.comboBoxOpen]}>
      <Text style={styles.comboTitle}>{label}</Text>
      <Pressable accessibilityRole="combobox" disabled={disabled} style={[styles.comboButton, disabled && styles.buttonDisabled]} onPress={() => setIsOpen((current) => !current)}>
        <Text style={styles.comboLabel}>{value?.shortname ?? value?.name ?? 'Auswaehlen'}</Text>
        <MaterialIcons name={isOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={24} color="#475467" style={styles.chevronIcon} />
      </Pressable>
      {isOpen && !disabled ? (
        <View style={styles.comboMenu}>
          <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled style={styles.comboMenuScroll}>
            {options.map((option) => (
              <Pressable
                key={String(option.id)}
                style={[styles.comboOption, value?.id === option.id && styles.comboOptionActive]}
                onPress={() => {
                  onChange(option);
                  setIsOpen(false);
                }}>
                <Text style={[styles.comboOptionText, value?.id === option.id && styles.comboOptionTextActive]}>
                  {option.shortname ? `${option.shortname} - ${option.name}` : option.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

function ActionComboBox({ value, onChange }: { onChange: (action: Action) => void; value: Action }) {
  const actionOptions = actions.map((nextAction) => ({ id: nextAction, name: actionLabel(nextAction) }));
  const selectedAction = actionOptions.find((option) => option.id === value) ?? actionOptions[0];

  return <ComboBox label="Aktion" options={actionOptions} value={selectedAction} onChange={(option) => onChange(option.id as Action)} />;
}

function WeekDatePicker({ value, onChange }: { onChange: (date: string) => void; value: string }) {
  const styles = useThemedStyles(baseStyles);
  const selectedDate = value ? new Date(`${value}T12:00:00`) : new Date();
  const [pickerWeek, setPickerWeek] = useState(startOfWeek(selectedDate));
  const days = dayNames.map((day, index) => {
    const date = addDays(pickerWeek, index);
    return { day, date, value: toInputDate(date) };
  });

  return (
    <View style={styles.datePicker}>
      <View style={styles.datePickerHeader}>
        <Pressable style={styles.smallIconButton} onPress={() => setPickerWeek((current) => addDays(current, -7))}>
          <MaterialIcons name="chevron-left" size={22} color="#00684F" />
        </Pressable>
        <Text style={styles.datePickerTitle}>{formatDisplayDate(pickerWeek)} - {formatDisplayDate(addDays(pickerWeek, 6))}</Text>
        <Pressable style={styles.smallIconButton} onPress={() => setPickerWeek((current) => addDays(current, 7))}>
          <MaterialIcons name="chevron-right" size={22} color="#00684F" />
        </Pressable>
      </View>
      <View style={styles.dateGrid}>
        {days.map((day) => (
          <Pressable key={day.value} style={[styles.dateChip, value === day.value && styles.dateChipActive]} onPress={() => onChange(day.value)}>
            <Text style={[styles.dateChipDay, value === day.value && styles.dateChipTextActive]}>{day.day.slice(0, 2)}</Text>
            <Text style={[styles.dateChipDate, value === day.value && styles.dateChipTextActive]}>{formatDisplayDate(day.date)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function itemMeta(item: Contact | Meal | (ScheduleDay['lessons'][number] & { day: string }) | StudyInfo) {
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

export function ManagerWorkspace({ embedded = false }: { embedded?: boolean }) {
  const styles = useThemedStyles(baseStyles);
  const { isManagerMode, token } = useAuth();
  const backendUrl = useMemo(() => getBackendUrl(), []);
  const [entity, setEntity] = useState<Entity>('CONTACT');
  const [action, setAction] = useState<Action>('CREATE');
  const [targetId, setTargetId] = useState<number | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [lessons, setLessons] = useState<(ScheduleDay['lessons'][number] & { day: string })[]>([]);
  const [infos, setInfos] = useState<StudyInfo[]>([]);
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [contactForm, setContactForm] = useState(emptyContact);
  const [mealForm, setMealForm] = useState(emptyMeal);
  const [lessonForm, setLessonForm] = useState(emptyLesson);
  const [infoForm, setInfoForm] = useState(emptyInfo);
  const [mealDatePickerOpen, setMealDatePickerOpen] = useState(false);
  const [lessonDatePickerOpen, setLessonDatePickerOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const selectedItems =
    entity === 'CONTACT'
      ? contacts
      : entity === 'MEAL'
        ? meals
        : entity === 'LESSON'
          ? lessons
          : infos;
  const selectedCurrency = useMemo(() => currencyOptions.find((option) => option.id === mealForm.currency) ?? currencyOptions[0], [mealForm.currency]);
  const selectedMealDay = useMemo(() => dayOptions.find((option) => option.id === mealForm.day) ?? null, [mealForm.day]);
  const selectedLessonDay = useMemo(() => dayOptions.find((option) => option.id === lessonForm.day) ?? dayOptions[0], [lessonForm.day]);
  const selectedStartTime = useMemo(() => timeOptions.find((option) => option.id === lessonForm.startTime) ?? timeOptions[0], [lessonForm.startTime]);
  const selectedEndTime = useMemo(() => timeOptions.find((option) => option.id === lessonForm.endTime) ?? timeOptions[15], [lessonForm.endTime]);
  const visibleRequests = useMemo(() => requests.filter((request) => request.entity !== 'DEADLINE'), [requests]);

  const loadData = useCallback(async () => {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const [contactsResponse, mealsResponse, scheduleResponse, infoResponse, requestsResponse] = await Promise.all([
        fetch(`${backendUrl}/api/contacts`),
        fetch(`${backendUrl}/api/meals`),
        fetch(`${backendUrl}/api/schedule`),
        fetch(`${backendUrl}/api/study-info`),
        fetch(`${backendUrl}/api/manager/change-requests`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!contactsResponse.ok || !mealsResponse.ok || !scheduleResponse.ok || !infoResponse.ok || !requestsResponse.ok) {
        throw new Error('Verwaltungsdaten konnten nicht geladen werden.');
      }

      const scheduleBody = (await scheduleResponse.json()) as { days: ScheduleDay[] };
      const schedule = scheduleBody.days;
      const info = (await infoResponse.json()) as { spo: StudyInfo[] };
      setContacts((await contactsResponse.json()) as Contact[]);
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
    setMealForm(emptyMeal);
    setLessonForm(emptyLesson);
    setInfoForm(emptyInfo);
    setMealDatePickerOpen(false);
    setLessonDatePickerOpen(false);

    if (action !== 'CREATE') {
      setAction('CREATE');
    }

    if (nextEntity !== entity) {
      setEntity(nextEntity);
    }
  }

  function changeAction(nextAction: Action) {
    setAction(nextAction);
    setTargetId(null);
    setContactForm(emptyContact);
    setMealForm(emptyMeal);
    setLessonForm(emptyLesson);
    setInfoForm(emptyInfo);
    setMealDatePickerOpen(false);
    setLessonDatePickerOpen(false);
    setError('');
    setMessage('');
  }

  function selectItem(item: Contact | Meal | (ScheduleDay['lessons'][number] & { day: string }) | StudyInfo) {
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
        date: lesson.date ? formatDate(lesson.date) : '',
        day: lesson.day,
        description: lesson.description ?? '',
        endTime: lesson.endTime,
        isRecurring: lesson.isRecurring ?? !lesson.date,
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
        : entity === 'MEAL'
          ? { ...mealForm, priceCents: Number(mealForm.priceCents) }
          : entity === 'LESSON'
            ? {
                ...lessonForm,
                date: lessonForm.isRecurring ? '' : lessonForm.date,
              }
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
      <View style={embedded ? styles.embeddedLocked : styles.locked}>
          <MaterialIcons name="lock" size={34} color="#B42318" />
          <Text style={styles.lockedTitle}>Verwalter-Zugang erforderlich</Text>
          <Text style={styles.lockedText}>Melde dich im Account-Tab als Verwalter oder Admin an.</Text>
      </View>
    );
  }

  return (
    <>
        <View style={styles.header}>
          <Text style={styles.kicker}>Verwalter</Text>
          <Text style={styles.title}>Eintraege vorbereiten</Text>
          <Text style={styles.subtitle}>Aenderungen werden als Anfrage gespeichert und erst nach Admin-Freigabe aktiv.</Text>
          <SyncStatusBadge />
        </View>

        <View style={styles.toggleRow}>
          <Pressable style={[styles.toggleButton, entity === 'CONTACT' && styles.toggleButtonActive]} onPress={() => resetForm('CONTACT')}>
            <MaterialIcons name="contacts" size={20} color={entity === 'CONTACT' ? '#FFFFFF' : '#475467'} />
            <Text style={[styles.toggleText, entity === 'CONTACT' && styles.toggleTextActive]}>Kontakte</Text>
          </Pressable>
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

        <ActionComboBox value={action} onChange={changeAction} />

        {action !== 'CREATE' && (
          <View style={styles.itemList}>
            {selectedItems.length === 0 ? <Text style={styles.empty}>Keine bestehenden Eintraege vorhanden.</Text> : null}
            {selectedItems.map((item) => (
              <Pressable key={item.id} style={[styles.itemCard, targetId === item.id && styles.itemCardActive]} onPress={() => selectItem(item)}>
                <Text style={styles.itemTitle}>{'name' in item ? item.name : 'mainDish' in item ? item.mainDish : item.title}</Text>
                <Text style={styles.itemMeta}>{itemMeta(item)}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {action === 'UPDATE' && !targetId ? <Text style={styles.helperText}>Waehle einen Eintrag aus der Liste aus, um ihn zu bearbeiten.</Text> : null}

        {(action === 'CREATE' || (action === 'UPDATE' && targetId)) && (
        <View style={styles.form}>
          {entity === 'CONTACT' ? (
            <>
              <TextInput placeholder="Name" placeholderTextColor="#98A2B3" style={styles.input} value={contactForm.name} onChangeText={(name) => setContactForm((current) => ({ ...current, name }))} />
              <TextInput placeholder="Rolle" placeholderTextColor="#98A2B3" style={styles.input} value={contactForm.role} onChangeText={(role) => setContactForm((current) => ({ ...current, role }))} />
              <TextInput autoCapitalize="none" keyboardType="email-address" placeholder="E-Mail" placeholderTextColor="#98A2B3" style={styles.input} value={contactForm.email} onChangeText={(email) => setContactForm((current) => ({ ...current, email }))} />
              <TextInput placeholder="Telefon" placeholderTextColor="#98A2B3" style={styles.input} value={contactForm.phone} onChangeText={(phone) => setContactForm((current) => ({ ...current, phone }))} />
              <TextInput placeholder="Raum" placeholderTextColor="#98A2B3" style={styles.input} value={contactForm.room} onChangeText={(room) => setContactForm((current) => ({ ...current, room }))} />
            </>
          ) : entity === 'MEAL' ? (
            <>
              <TextInput placeholder="Mensa" placeholderTextColor="#98A2B3" style={styles.input} value={mealForm.canteenName} onChangeText={(canteenName) => setMealForm((current) => ({ ...current, canteenName }))} />
              <View>
                <Text style={styles.comboTitle}>Datum</Text>
                <Pressable style={styles.dateField} onPress={() => setMealDatePickerOpen((current) => !current)}>
                  <MaterialIcons name="calendar-month" size={21} color="#00684F" />
                  <Text style={styles.dateFieldText}>{formatFullDate(mealForm.date)}</Text>
                  <MaterialIcons name={mealDatePickerOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={24} color="#475467" style={styles.chevronIcon} />
                </Pressable>
                {mealDatePickerOpen ? (
                  <WeekDatePicker value={mealForm.date} onChange={(date) => {
                    setMealForm((current) => ({ ...current, date, day: dayFromDate(date) }));
                    setMealDatePickerOpen(false);
                  }} />
                ) : null}
              </View>
              <ComboBox label="Wochentag" options={dayOptions} value={selectedMealDay} onChange={(option) => setMealForm((current) => ({ ...current, day: String(option.id) }))} />
              <TextInput placeholder="Hauptgericht" placeholderTextColor="#98A2B3" style={styles.input} value={mealForm.mainDish} onChangeText={(mainDish) => setMealForm((current) => ({ ...current, mainDish }))} />
              <TextInput placeholder="Vegetarisch optional" placeholderTextColor="#98A2B3" style={styles.input} value={mealForm.vegetarianDish} onChangeText={(vegetarianDish) => setMealForm((current) => ({ ...current, vegetarianDish }))} />
              <View style={styles.timeRow}>
                <TextInput keyboardType="numeric" placeholder="Preis in Cent" placeholderTextColor="#98A2B3" style={[styles.input, styles.flexInput]} value={mealForm.priceCents} onChangeText={(priceCents) => setMealForm((current) => ({ ...current, priceCents }))} />
                <ComboBox label="Waehrung" options={currencyOptions} value={selectedCurrency} onChange={(option) => setMealForm((current) => ({ ...current, currency: String(option.id) }))} />
              </View>
            </>
          ) : entity === 'LESSON' ? (
            <>
              <Pressable
                style={[styles.segmentButton, lessonForm.isRecurring && styles.segmentButtonActive]}
                onPress={() => setLessonForm((current) => ({ ...current, isRecurring: !current.isRecurring }))}>
                <MaterialIcons name="event-repeat" size={21} color={lessonForm.isRecurring ? '#FFFFFF' : '#00684F'} />
                <Text style={[styles.segmentButtonText, lessonForm.isRecurring && styles.segmentButtonTextActive]}>
                  Woechentlich wiederholen
                </Text>
              </Pressable>
              {lessonForm.isRecurring ? (
                <ComboBox label="Wochentag" options={dayOptions} value={selectedLessonDay} onChange={(option) => setLessonForm((current) => ({ ...current, day: String(option.id) }))} />
              ) : (
                <View>
                  <Text style={styles.comboTitle}>Datum</Text>
                  <Pressable style={styles.dateField} onPress={() => setLessonDatePickerOpen((current) => !current)}>
                    <MaterialIcons name="calendar-month" size={21} color="#00684F" />
                    <Text style={styles.dateFieldText}>{formatFullDate(lessonForm.date)}</Text>
                    <MaterialIcons name={lessonDatePickerOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={24} color="#475467" style={styles.chevronIcon} />
                  </Pressable>
                  {lessonDatePickerOpen ? (
                    <WeekDatePicker value={lessonForm.date} onChange={(date) => {
                      setLessonForm((current) => ({ ...current, date, day: dayFromDate(date) }));
                      setLessonDatePickerOpen(false);
                    }} />
                  ) : null}
                </View>
              )}
              <View style={styles.timeRow}>
                <ComboBox label="Start" options={timeOptions} value={selectedStartTime} onChange={(option) => setLessonForm((current) => ({ ...current, startTime: String(option.id) }))} />
                <ComboBox label="Ende" options={timeOptions} value={selectedEndTime} onChange={(option) => setLessonForm((current) => ({ ...current, endTime: String(option.id) }))} />
              </View>
              <TextInput placeholder="Titel" placeholderTextColor="#98A2B3" style={styles.input} value={lessonForm.title} onChangeText={(title) => setLessonForm((current) => ({ ...current, title }))} />
              <TextInput placeholder="Raum" placeholderTextColor="#98A2B3" style={styles.input} value={lessonForm.room} onChangeText={(room) => setLessonForm((current) => ({ ...current, room }))} />
              <TextInput placeholder="Dozierende" placeholderTextColor="#98A2B3" style={styles.input} value={lessonForm.lecturer} onChangeText={(lecturer) => setLessonForm((current) => ({ ...current, lecturer }))} />
              <TextInput multiline placeholder="Beschreibung optional" placeholderTextColor="#98A2B3" style={[styles.input, styles.textArea]} value={lessonForm.description} onChangeText={(description) => setLessonForm((current) => ({ ...current, description }))} />
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
        )}

        {action === 'DELETE' ? (
          <View style={styles.deleteBox}>
            {message ? <Text style={styles.success}>{message}</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable disabled={isLoading || !targetId} style={[styles.button, (!targetId || isLoading) && styles.buttonDisabled]} onPress={submitRequest}>
              <MaterialIcons name="delete" size={21} color="#FFFFFF" />
              <Text style={styles.buttonText}>{targetId ? 'Loeschanfrage senden' : 'Eintrag auswaehlen'}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Meine Anfragen</Text>
          <Text style={styles.sectionCount}>{visibleRequests.length}</Text>
        </View>

        <View style={styles.itemList}>
          {visibleRequests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <Text style={styles.itemTitle}>
                {request.entity === 'CONTACT' ? 'Kontakt' : request.entity === 'MEAL' ? 'Mensa' : request.entity === 'LESSON' ? 'Plan' : 'Info'} · {request.action === 'CREATE' ? 'Neu' : request.action === 'UPDATE' ? 'Bearbeiten' : 'Loeschen'}
              </Text>
              <Text style={styles.itemMeta}>{statusLabel(request.status)}</Text>
            </View>
          ))}
        </View>
    </>
  );
}

export default function ManagerScreen() {
  const styles = useThemedStyles(baseStyles);
  return (
    <SafeAreaView style={styles.safeArea}>
      <SwipeableTabView>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <ManagerWorkspace />
        </ScrollView>
      </SwipeableTabView>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
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
    color: '#00684F',
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
    flexWrap: 'wrap',
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
    minWidth: '47%',
    minHeight: 44,
  },
  toggleButtonActive: {
    backgroundColor: '#00684F',
    borderColor: '#00684F',
  },
  toggleText: {
    color: '#475467',
    fontSize: 14,
    fontWeight: '800',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  comboBox: {
    flex: 1,
    marginBottom: 14,
    position: 'relative',
    zIndex: 1,
  },
  comboBoxOpen: {
    elevation: 12,
    zIndex: 1000,
  },
  comboTitle: {
    color: '#344054',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },
  comboButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D0D5DD',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 46,
    paddingHorizontal: 12,
  },
  comboLabel: {
    color: '#101828',
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
  },
  chevronIcon: { flexShrink: 0, textAlign: 'center', width: 28 },
  comboMenu: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D0D5DD',
    borderRadius: 8,
    borderWidth: 1,
    elevation: 12,
    marginTop: 6,
    maxHeight: 220,
    overflow: 'hidden',
    zIndex: 1001,
  },
  comboMenuScroll: {
    maxHeight: 220,
  },
  comboOption: {
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  comboOptionActive: {
    backgroundColor: '#ECFDF3',
  },
  comboOptionText: {
    color: '#475467',
    fontSize: 14,
    fontWeight: '800',
  },
  comboOptionTextActive: {
    color: '#00684F',
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
    backgroundColor: '#004B3A',
    borderColor: '#004B3A',
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
  empty: {
    color: '#667085',
    fontSize: 14,
    lineHeight: 20,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E7EC',
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  itemCardActive: {
    borderColor: '#00684F',
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
  deleteBox: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E7EC',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    marginBottom: 22,
    padding: 14,
  },
  helperText: {
    color: '#667085',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
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
  flexInput: {
    flex: 1,
  },
  textArea: {
    minHeight: 86,
    textAlignVertical: 'top',
  },
  dateField: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderColor: '#D0D5DD',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  dateFieldText: {
    color: '#101828',
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
  },
  datePicker: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E4E7EC',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    marginTop: 8,
    padding: 10,
  },
  datePickerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  datePickerTitle: {
    color: '#101828',
    fontSize: 14,
    fontWeight: '800',
  },
  dateGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  dateChip: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D0D5DD',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 54,
    justifyContent: 'center',
  },
  dateChipActive: {
    backgroundColor: '#00684F',
    borderColor: '#00684F',
  },
  dateChipDay: {
    color: '#475467',
    fontSize: 12,
    fontWeight: '800',
  },
  dateChipDate: {
    color: '#101828',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  dateChipTextActive: {
    color: '#FFFFFF',
  },
  smallIconButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D0D5DD',
    borderRadius: 8,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  timeRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  segmentButton: {
    alignItems: 'center',
    backgroundColor: '#E7F4EF',
    borderColor: '#93D3BA',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 12,
  },
  segmentButtonActive: {
    backgroundColor: '#00684F',
    borderColor: '#00684F',
  },
  segmentButtonText: {
    color: '#00684F',
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  segmentButtonTextActive: {
    color: '#FFFFFF',
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#00684F',
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
    color: '#00684F',
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
  embeddedLocked: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E7EC',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    marginBottom: 18,
    padding: 18,
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
