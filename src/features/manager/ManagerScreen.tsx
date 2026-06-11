import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ModuleHeader } from '@/components/module-header';
import { SwipeableTabView } from '@/components/swipeable-tab-view';
import { SyncStatusBadge } from '@/components/sync-status-badge';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useAuth } from '@/contexts/auth-context';
import { dayFromDate, dayOptions, timeOptions } from '@/src/shared/utils/dates';
import { createManagerChangeRequest, fetchManagerBundle } from './api';
import { ActionComboBox, ComboBox } from './components/ManagerComboBox';
import { WeekDatePicker } from './components/ManagerWeekDatePicker';
import { baseStyles } from './styles';
import type { Action, ChangeRequest, Contact, Entity, Meal, ScheduleDay, StudyInfo } from './types';
import { currencyOptions, emptyContact, emptyInfo, emptyLesson, emptyMeal, formatDate, formatFullDate, itemMeta, statusLabel } from './utils';

export function ManagerWorkspace({ embedded = false }: { embedded?: boolean }) {
  const styles = useThemedStyles(baseStyles);
  const { isManagerMode, token } = useAuth();
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
      const data = await fetchManagerBundle(token);
      setContacts(data.contacts);
      setMeals(data.meals);
      setLessons(data.lessons);
      setInfos(data.infos);
      setRequests(data.requests);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Verwaltungsdaten konnten nicht geladen werden.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

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

    if (!token) {
      setError('Verwalter-Sitzung ist nicht geladen.');
      return;
    }

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
      const response = await createManagerChangeRequest(token, {
        action,
        entity,
        payload,
        targetId: action === 'CREATE' ? null : targetId,
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
          <ModuleHeader
            accent="#047857"
            icon="edit-note"
            kicker="Verwalter"
            title="Eintraege vorbereiten"
            subtitle="Aenderungen werden als Anfrage gespeichert und erst nach Admin-Freigabe aktiv."
          >
            <SyncStatusBadge />
          </ModuleHeader>
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
