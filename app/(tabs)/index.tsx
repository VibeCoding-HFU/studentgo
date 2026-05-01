import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SwipeableTabView } from '@/components/swipeable-tab-view';
import { SyncStatusBadge } from '@/components/sync-status-badge';
import { getBackendUrl } from '@/constants/api';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useAuth } from '@/contexts/auth-context';
import { useSync } from '@/contexts/sync-context';
import { decryptPayloadWithPrivateKeys, encryptPayloadForPublicKeys, getPrivateKey, getPrivateKeys, publicKeyFromPrivateKey, publicKeyJsonsFromValue } from '@/lib/client-crypto';

type Lesson = {
  day?: string;
  date?: string | null;
  description?: string | null;
  endTime: string;
  encryptedKey?: string | null;
  encryptedPayload?: string | null;
  encryptionIv?: string | null;
  id: number;
  isModuleActive?: boolean;
  isRecurring?: boolean;
  isVisited?: boolean;
  lecturer?: string | null;
  moduleKey?: string;
  ownerId?: number | null;
  room?: string | null;
  source?: string;
  startTime: string;
  title: string;
  syncState?: 'pending' | 'synced';
};

type ScheduleDay = {
  day: string;
  id: number;
  lessons: Lesson[];
};

type Option = { id: number | string; name: string; shortname?: string };
type FacultyOption = Option & { groups: Option[] };
type ImportOptions = {
  faculties: FacultyOption[];
  groups: Option[];
  semesters: Option[];
  specializations: Option[];
};
type ParsedGroup = Option & {
  importKey: string;
  semester: string;
  specialization: string;
};
type UserOption = {
  email: string;
  id: number;
  name: string;
  publicKeyJson?: string | null;
};
type Invitation = {
  createdAt: string;
  encryptedKey?: string | null;
  encryptedPayload?: string | null;
  encryptionIv?: string | null;
  id: number;
  lesson: {
    date?: string | null;
    description?: string | null;
    endTime: string;
    isRecurring: boolean;
    scheduleDay: { day: string };
    startTime: string;
    title: string;
  };
  sender: {
    email: string;
    name: string;
  };
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
};

type Meal = {
  canteen: { name: string };
  currency: string;
  day: string;
  date?: string | null;
  id: number;
  mainDish: string;
  priceCents: number;
  vegetarianDish?: string | null;
};

type AccountStats = {
  courseCount: number;
  totalEvents: number;
  visitedEvents: number;
};

type CourseOption = {
  lessonCount: number;
  title: string;
};

type LessonForm = ReturnType<typeof createEmptyForm>;

const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const dayOptions = dayNames.map((day) => ({ id: day, name: day }));
const timeOptions = Array.from({ length: 57 }, (_value, index) => {
  const minutes = 6 * 60 + index * 15;
  const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  return { id: time, name: time };
});

function createEmptyForm() {
  const today = new Date();

  return {
    date: toInputDate(today),
    day: dayNames[(today.getDay() + 6) % 7],
    description: '',
    endTime: '09:45',
    isRecurring: false,
    startTime: '08:15',
    title: '',
  };
}

function startOfWeek(date = new Date()) {
  const result = new Date(date);
  const day = result.getDay() || 7;
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - day + 1);
  return result;
}

function startOfMonth(date = new Date()) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(1);
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

function formatInvitationDate(value?: string | null) {
  if (!value) {
    return 'woechentlich';
  }

  return new Date(value).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function mealLabel(meal: Meal, index: number) {
  return meal.mainDish.match(/^Essen\s+\d+/i)?.[0] ?? `Essen ${index + 1}`;
}

function mealTitle(meal: Meal) {
  return meal.mainDish.replace(/^Essen\s+\d+\s*:\s*/i, '').trim();
}

function invitationStatusLabel(status: Invitation['status']) {
  if (status === 'ACCEPTED') {
    return 'Angenommen';
  }

  if (status === 'REJECTED') {
    return 'Abgelehnt';
  }

  return 'Offen';
}

function uniqueOptions(options: Option[]) {
  const seen = new Set<string>();
  return options.filter((option) => {
    const key = String(option.id);
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function parseGroup(group: Option): ParsedGroup | null {
  const label = group.shortname ?? group.name;
  const match = label.match(/\b(\d+)\b(?:\s+(.+))?$/);

  if (!match) {
    return null;
  }

  const semester = match[1];
  const specialization = match[2]?.trim() || 'Standard';

  return {
    ...group,
    importKey: label,
    semester,
    specialization,
  };
}

function ComboBox<T extends Option>({ disabled, label, onChange, options, value }: {
  disabled?: boolean;
  label: string;
  onChange: (option: T) => void;
  options: T[];
  value: T | null;
}) {
  const styles = useThemedStyles(baseStyles);
  const [open, setOpen] = useState(false);

  return (
    <View style={[styles.comboBox, open && styles.comboBoxOpen]}>
      <Text style={styles.comboTitle}>{label}</Text>
      <Pressable disabled={disabled} style={[styles.comboButton, disabled && styles.disabled]} onPress={() => setOpen((current) => !current)}>
        <Text style={styles.comboLabel}>{value?.shortname ?? value?.name ?? 'Auswaehlen'}</Text>
        <MaterialIcons name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={24} color="#475467" style={styles.chevronIcon} />
      </Pressable>
      {open && !disabled ? (
        <View style={styles.comboMenu}>
          <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled style={styles.comboMenuScroll}>
            {options.map((option) => (
              <Pressable key={String(option.id)} style={styles.comboOption} onPress={() => { onChange(option); setOpen(false); }}>
                <Text style={styles.comboOptionText}>{option.shortname ? `${option.shortname} - ${option.name}` : option.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
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

export default function ScheduleScreen() {
  const styles = useThemedStyles(baseStyles);
  const { token, user } = useAuth();
  const { enqueueCreate, pendingItems, syncVersion } = useSync();
  const backendUrl = useMemo(() => getBackendUrl(), []);
  const [weekStart, setWeekStart] = useState(startOfWeek());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [options, setOptions] = useState<ImportOptions>({ faculties: [], groups: [], semesters: [], specializations: [] });
  const [semester, setSemester] = useState<Option | null>(null);
  const [faculty, setFaculty] = useState<FacultyOption | null>(null);
  const [academicSemester, setAcademicSemester] = useState<Option | null>(null);
  const [specialization, setSpecialization] = useState<Option | null>(null);
  const [form, setForm] = useState(createEmptyForm);
  const [editForm, setEditForm] = useState<LessonForm>(createEmptyForm);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [pendingLessonAction, setPendingLessonAction] = useState<'update' | 'delete' | null>(null);
  const [personalFormOpen, setPersonalFormOpen] = useState(false);
  const [importPanelOpen, setImportPanelOpen] = useState(false);
  const [importMode, setImportMode] = useState<'schedule' | 'course'>('schedule');
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [editDatePickerOpen, setEditDatePickerOpen] = useState(false);
  const [accountQuery, setAccountQuery] = useState('');
  const [accountResults, setAccountResults] = useState<UserOption[]>([]);
  const [accountStats, setAccountStats] = useState<AccountStats | null>(null);
  const [invitees, setInvitees] = useState<UserOption[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [formError, setFormError] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [importError, setImportError] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const [courseOptions, setCourseOptions] = useState<CourseOption[]>([]);
  const [isCourseLoading, setIsCourseLoading] = useState(false);
  const [invitationError, setInvitationError] = useState('');
  const parsedGroups = useMemo(() => options.groups.map(parseGroup).filter((group): group is ParsedGroup => Boolean(group)), [options.groups]);
  const academicSemesters = useMemo(() => uniqueOptions(parsedGroups.map((group) => ({
    id: group.semester,
    name: `${group.semester}. Semester`,
  }))), [parsedGroups]);
  const specializations = useMemo(() => uniqueOptions(parsedGroups
    .filter((group) => !academicSemester || group.semester === String(academicSemester.id))
    .map((group) => ({
      id: group.specialization,
      name: group.specialization,
      shortname: group.specialization,
    }))), [academicSemester, parsedGroups]);
  const selectedGroup = useMemo(() => parsedGroups.find((group) => (
    group.semester === String(academicSemester?.id ?? '') && group.specialization === String(specialization?.id ?? '')
  )) ?? null, [academicSemester, parsedGroups, specialization]);
  const canImport = Boolean(semester && faculty && selectedGroup);
  const selectedDayOption = useMemo(() => dayOptions.find((option) => option.id === form.day) ?? dayOptions[0], [form.day]);
  const selectedStartTime = useMemo(() => timeOptions.find((option) => option.id === form.startTime) ?? timeOptions[0], [form.startTime]);
  const selectedEndTime = useMemo(() => timeOptions.find((option) => option.id === form.endTime) ?? timeOptions[15], [form.endTime]);

  const loadOptions = useCallback(async () => {
    const response = await fetch(`${backendUrl}/api/schedule/import-options`);
    if (response.ok) {
      const nextOptions = (await response.json()) as ImportOptions;
      setOptions(nextOptions);
      setSemester(nextOptions.semesters[0] ?? null);
    }
  }, [backendUrl]);

  const loadGroups = useCallback(async (nextFaculty: FacultyOption | null, nextSemester: Option | null) => {
    if (!nextFaculty || !nextSemester) {
      setOptions((current) => ({ ...current, groups: [] }));
      setAcademicSemester(null);
      setSpecialization(null);
      return;
    }

    const response = await fetch(`${backendUrl}/api/schedule/import-options?facultyId=${nextFaculty.id}&semesterId=${nextSemester.id}`);
    if (response.ok) {
      const nextOptions = (await response.json()) as ImportOptions;
      setOptions((current) => ({ ...current, groups: nextOptions.groups }));
      setAcademicSemester(null);
      setSpecialization(null);
    }
  }, [backendUrl]);

  const loadSchedule = useCallback(async () => {
    const response = await fetch(`${backendUrl}/api/schedule?weekStart=${toInputDate(weekStart)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (response.ok) {
      const body = (await response.json()) as { days: ScheduleDay[] };
      const privateKeys = user?.email ? await getPrivateKeys(user.email) : [];
      const decryptedDays = await Promise.all(body.days.map(async (day) => ({
        ...day,
        lessons: await Promise.all(day.lessons.map(async (lesson) => {
          const syncedLesson = { ...lesson, syncState: 'synced' as const };

          if (privateKeys.length === 0 || !lesson.encryptedPayload || !lesson.encryptedKey || !lesson.encryptionIv) {
            return syncedLesson;
          }

          try {
            const decrypted = await decryptPayloadWithPrivateKeys<{ description?: string; title?: string }>(privateKeys, {
              encryptedKey: lesson.encryptedKey,
              encryptedPayload: lesson.encryptedPayload,
              encryptionIv: lesson.encryptionIv,
            });
            return {
              ...syncedLesson,
              description: decrypted.description ?? lesson.description,
              title: decrypted.title ?? lesson.title,
            };
          } catch {
            return { ...syncedLesson, title: 'Verschluesselter Termin' };
          }
        })),
      })));
      setSchedule(decryptedDays);
    }
  }, [backendUrl, token, user?.email, weekStart]);

  const loadInvitations = useCallback(async () => {
    if (!token) {
      setInvitations([]);
      return;
    }

    const response = await fetch(`${backendUrl}/api/schedule/invitations`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      setInvitationError('Anfragen konnten nicht geladen werden.');
      return;
    }

    const data = (await response.json()) as Invitation[];
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

    setInvitationError('');
    setInvitations(decrypted);
  }, [backendUrl, token, user?.email]);

  const loadMeals = useCallback(async () => {
    const response = await fetch(`${backendUrl}/api/meals?weekStart=${toInputDate(weekStart)}`);

    if (response.ok) {
      setMeals((await response.json()) as Meal[]);
    }
  }, [backendUrl, weekStart]);

  const loadAccountStats = useCallback(async () => {
    if (!token) {
      setAccountStats(null);
      return;
    }

    const response = await fetch(`${backendUrl}/api/account/statistics`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      setAccountStats((await response.json()) as AccountStats);
    }
  }, [backendUrl, token]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule, syncVersion]);

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  useEffect(() => {
    loadMeals();
  }, [loadMeals]);

  useEffect(() => {
    loadAccountStats();
  }, [loadAccountStats, syncVersion]);

  useEffect(() => {
    loadGroups(faculty, semester);
  }, [faculty, loadGroups, semester]);

  useEffect(() => {
    if (!academicSemester && academicSemesters.length > 0) {
      setAcademicSemester(academicSemesters[0]);
    }
  }, [academicSemester, academicSemesters]);

  useEffect(() => {
    if (!specialization && specializations.length > 0) {
      setSpecialization(specializations[0]);
    }
  }, [specialization, specializations]);

  useEffect(() => {
    let cancelled = false;

    async function searchAccounts() {
      if (!token || accountQuery.trim().length < 2) {
        setAccountResults([]);
        return;
      }

      const response = await fetch(`${backendUrl}/api/users/search?q=${encodeURIComponent(accountQuery.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok && !cancelled) {
        const users = (await response.json()) as UserOption[];
        setAccountResults(users.filter((account) => !invitees.some((invitee) => invitee.id === account.id)));
      }
    }

    searchAccounts();
    return () => {
      cancelled = true;
    };
  }, [accountQuery, backendUrl, invitees, token]);

  function canEditLesson(lesson: Lesson) {
    return Boolean(user?.id && lesson.ownerId === user.id && lesson.source !== 'STARPLAN' && lesson.syncState !== 'pending');
  }

  function formFromLesson(lesson: Lesson): LessonForm {
    const lessonDate = lesson.date ? new Date(`${lesson.date.slice(0, 10)}T12:00:00`) : selectedDate;

    return {
      date: lesson.date?.slice(0, 10) ?? toInputDate(selectedDate),
      day: dayNames[(lessonDate.getDay() + 6) % 7],
      description: lesson.description ?? '',
      endTime: lesson.endTime,
      isRecurring: Boolean(lesson.isRecurring),
      startTime: lesson.startTime,
      title: lesson.title,
    };
  }

  function selectDate(date: Date) {
    setSelectedDate(date);
    setWeekStart(startOfWeek(date));
  }

  async function encryptedLessonBody(lessonForm: LessonForm) {
    if (!user?.email) {
      throw new Error('Melde dich an, um persoenliche Planeintraege zu speichern.');
    }

    const privateKey = await getPrivateKey(user.email);
    if (!privateKey) {
      throw new Error('Hinterlege deinen Private Key im Account-Bereich, um persoenliche Planeintraege zu speichern und anzuzeigen.');
    }

    const ownerPublicKeyJson = publicKeyFromPrivateKey(privateKey);
    const ownerPublicKeys = [...new Set([ownerPublicKeyJson, ...publicKeyJsonsFromValue(user.publicKeyJson)])];
    const ownerEnvelope = await encryptPayloadForPublicKeys(ownerPublicKeys, {
      description: lessonForm.description,
      title: lessonForm.title,
    });

    return {
      ...lessonForm,
      ...ownerEnvelope,
      description: '',
      title: 'Verschluesselter Termin',
    };
  }

  const importPayload = useCallback(() => {
    return {
      facultyId: faculty?.id,
      facultyName: faculty?.name,
      monthStart: toInputDate(startOfMonth()),
      semesterId: semester?.id,
      semesterName: semester?.name,
      specialization: specialization?.id,
      studyGroup: selectedGroup?.importKey,
    };
  }, [faculty, selectedGroup, semester, specialization]);

  const loadImportCourses = useCallback(async () => {
    if (!canImport || !token) {
      setCourseOptions([]);
      setIsCourseLoading(false);
      return;
    }

    setIsCourseLoading(true);
    const response = await fetch(`${backendUrl}/api/schedule/import-courses`, {
      body: JSON.stringify(importPayload()),
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    if (response.ok) {
      const result = (await response.json()) as { courses: CourseOption[] };
      setCourseOptions(result.courses);
      setImportError('');
    } else {
      setCourseOptions([]);
      setImportError('Kurse konnten nicht geladen werden.');
    }

    setIsCourseLoading(false);
  }, [backendUrl, canImport, importPayload, token]);

  useEffect(() => {
    if (importPanelOpen && importMode === 'course') {
      loadImportCourses();
    }
  }, [importMode, importPanelOpen, loadImportCourses]);

  async function importSchedule() {
    setImportError('');
    setImportMessage('');

    if (!canImport) {
      setImportError('Waehle alle Importoptionen aus.');
      return;
    }

    if (!token) {
      setImportError('Melde dich an, um den Stundenplan zu importieren.');
      return;
    }

    const response = await fetch(`${backendUrl}/api/schedule/import`, {
      body: JSON.stringify(importPayload()),
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    if (!response.ok) {
      setImportError('Stundenplan konnte nicht importiert werden.');
      return;
    }

    const result = (await response.json()) as { count: number; monthStart?: string };
    const importedMonth = result.monthStart
      ? new Date(result.monthStart).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
      : 'aktuellen Monat';
    setImportMessage(`${result.count} Termine fuer ${importedMonth} importiert. Nicht kollidierende Termine bleiben erhalten.`);
    await loadSchedule();
    await loadAccountStats();
  }

  async function importCourse(course: CourseOption) {
    setImportError('');
    setImportMessage('');

    if (!canImport || !token) {
      setImportError('Waehle alle Importoptionen aus und melde dich an.');
      return;
    }

    const response = await fetch(`${backendUrl}/api/schedule/import-course`, {
      body: JSON.stringify({
        ...importPayload(),
        courseTitle: course.title,
      }),
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    if (!response.ok) {
      setImportError('Kurs konnte nicht importiert werden.');
      return;
    }

    const result = (await response.json()) as { count: number; monthStart?: string };
    const importedMonth = result.monthStart
      ? new Date(result.monthStart).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
      : 'aktuellen Monat';
    setImportMessage(`${course.title}: ${result.count} Termine fuer ${importedMonth} importiert.`);
    await loadSchedule();
    await loadAccountStats();
  }

  async function addLesson() {
    setFormError('');
    setFormMessage('');

    if (!token) {
      setFormError('Melde dich an, um persoenliche Planeintraege zu speichern.');
      return;
    }

    if (!form.title.trim()) {
      setFormError('Gib einen Titel fuer den Planeintrag ein.');
      return;
    }

    let body: Record<string, unknown>;

    try {
      const personalPayload = { description: form.description, title: form.title };
      const ownerBody = await encryptedLessonBody(form);
      const encryptedInvitations = await Promise.all(invitees.map(async (invitee) => {
        const publicKeys = publicKeyJsonsFromValue(invitee.publicKeyJson);

        if (publicKeys.length === 0) {
          throw new Error(`${invitee.name} hat keinen Public Key.`);
        }

        return {
          recipientId: invitee.id,
          ...(await encryptPayloadForPublicKeys(publicKeys, personalPayload)),
        };
      }));
      body = {
        ...ownerBody,
        encryptedInvitations,
        inviteeIds: invitees.map((invitee) => invitee.id),
      };
    } catch (caughtError) {
      setFormError(caughtError instanceof Error ? caughtError.message : 'Planeintrag konnte nicht verschluesselt werden.');
      return;
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      const response = await fetch(`${backendUrl}/api/schedule/lessons`, {
        body: JSON.stringify(body),
        headers,
        method: 'POST',
      });

      if (!response.ok) {
        setFormError('Planeintrag konnte nicht gespeichert werden.');
        return;
      }
    } catch (caughtError) {
      if (caughtError instanceof TypeError || (caughtError instanceof Error && ['AbortError', 'Network request failed'].some((message) => caughtError.message.includes(message)))) {
        const localLesson: Lesson = {
          date: form.isRecurring ? null : `${form.date}T00:00:00.000Z`,
          day: form.day,
          description: form.description,
          endTime: form.endTime,
          id: -Date.now(),
          isRecurring: form.isRecurring,
          lecturer: null,
          ownerId: user?.id,
          room: null,
          source: 'PERSONAL',
          startTime: form.startTime,
          syncState: 'pending',
          title: form.title,
        };
        await enqueueCreate({
          body: JSON.stringify(body),
          headers: Object.entries(headers),
          kind: 'lesson',
          localData: localLesson,
          url: `${backendUrl}/api/schedule/lessons`,
        });
        setSchedule((current) => current.map((day) => (
          day.day === form.day ? { ...day, lessons: [localLesson, ...day.lessons] } : day
        )));
        setForm(createEmptyForm());
        setInvitees([]);
        setAccountQuery('');
        setPersonalFormOpen(false);
        setFormMessage('Persoenlicher Planeintrag wurde offline gespeichert.');
        return;
      }

      setFormError(caughtError instanceof Error ? caughtError.message : 'Planeintrag konnte nicht verschluesselt werden.');
      return;
    }

    setForm(createEmptyForm());
    setInvitees([]);
    setAccountQuery('');
    setFormMessage('Persoenlicher Planeintrag wurde gespeichert.');
    await loadSchedule();
    await loadAccountStats();
  }

  function addInvitee(account: UserOption) {
    setInvitees((current) => current.some((invitee) => invitee.id === account.id) ? current : [...current, account]);
    setAccountQuery('');
    setAccountResults([]);
  }

  function startEditingLesson(lesson: Lesson) {
    setEditingLesson(lesson);
    setEditForm(formFromLesson(lesson));
    setEditDatePickerOpen(false);
    setFormError('');
  }

  function closeLessonDialog() {
    if (pendingLessonAction === 'delete') {
      setEditingLesson(null);
    }
    setPendingLessonAction(null);
  }

  async function updatePersonalLesson() {
    if (!token || !editingLesson) {
      return;
    }

    setFormError('');

    try {
      const body = await encryptedLessonBody(editForm);
      const response = await fetch(`${backendUrl}/api/schedule/lessons/${editingLesson.id}`, {
        body: JSON.stringify(body),
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('Planeintrag konnte nicht gespeichert werden.');
      }

      setEditingLesson(null);
      setPendingLessonAction(null);
      await loadSchedule();
      await loadAccountStats();
    } catch (caughtError) {
      setPendingLessonAction(null);
      setFormError(caughtError instanceof Error ? caughtError.message : 'Planeintrag konnte nicht gespeichert werden.');
    }
  }

  async function deletePersonalLesson() {
    if (!token || !editingLesson) {
      return;
    }

    const response = await fetch(`${backendUrl}/api/schedule/lessons/${editingLesson.id}`, {
      headers: { Authorization: `Bearer ${token}` },
      method: 'DELETE',
    });

    if (!response.ok) {
      setPendingLessonAction(null);
      setFormError('Planeintrag konnte nicht geloescht werden.');
      return;
    }

    setEditingLesson(null);
    setPendingLessonAction(null);
    await loadSchedule();
    await loadAccountStats();
  }

  async function toggleLessonVisit(lesson: Lesson) {
    if (!token) {
      setFormError('Melde dich an, um Termine abzuhaken.');
      return;
    }

    const response = await fetch(`${backendUrl}/api/schedule/lessons/${lesson.id}/visit`, {
      body: JSON.stringify({ date: toInputDate(selectedDate) }),
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    if (!response.ok) {
      setFormError('Besuchsstatus konnte nicht gespeichert werden.');
      return;
    }

    await loadSchedule();
    await loadAccountStats();
  }

  async function toggleModuleActive(lesson: Lesson) {
    if (!token || !lesson.moduleKey) {
      setFormError('Modulstatus konnte nicht gespeichert werden.');
      return;
    }

    const response = await fetch(`${backendUrl}/api/schedule/module-preferences`, {
      body: JSON.stringify({
        isActive: lesson.isModuleActive === false,
        moduleKey: lesson.moduleKey,
      }),
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      method: 'PATCH',
    });

    if (!response.ok) {
      setFormError('Modulstatus konnte nicht gespeichert werden.');
      return;
    }

    await loadSchedule();
    await loadAccountStats();
  }

  async function respondToInvitation(id: number, decision: 'accept' | 'reject') {
    if (!token) {
      return;
    }

    const response = await fetch(`${backendUrl}/api/schedule/invitations/${id}/${decision}`, {
      headers: { Authorization: `Bearer ${token}` },
      method: 'POST',
    });

    if (!response.ok) {
      setInvitationError('Antwort konnte nicht gespeichert werden.');
      return;
    }

    setInvitationError('');
    await loadInvitations();
    await loadSchedule();
  }

  function lessonsForDay(day: string, date: Date) {
    const dateKey = toInputDate(date);
    const pendingLessons = pendingItems
      .filter((item) => item.kind === 'lesson')
      .map((item) => item.localData as Lesson)
      .filter((lesson) => {
        if (lesson.isRecurring) {
          return lesson.day === day;
        }

        return lesson.date?.slice(0, 10) === dateKey;
      });
    const backendLessons = schedule
      .find((entry) => entry.day === day)
      ?.lessons.filter((lesson) => !lesson.date || lesson.date.slice(0, 10) === dateKey) ?? [];

    return [...pendingLessons, ...backendLessons]
      .filter((lesson, index, lessons) => lessons.findIndex((candidate) => candidate.id === lesson.id) === index);
  }

  function mealsForDay(day: string, date: Date) {
    const dateKey = toInputDate(date);
    return meals.filter((meal) => (meal.date ? meal.date.slice(0, 10) === dateKey : meal.day === day));
  }

  const today = new Date();
  const selectedDay = dayNames[(selectedDate.getDay() + 6) % 7];
  const selectedLessons = lessonsForDay(selectedDay, selectedDate);
  const selectedMeals = mealsForDay(selectedDay, selectedDate);
  const selectedIsToday = toInputDate(selectedDate) === toInputDate(today);

  return (
    <SafeAreaView style={styles.safeArea}>
      <SwipeableTabView>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>StudentGo</Text>
          <Text style={styles.title}>Tagesplan</Text>
          <Text style={styles.subtitle}>Termine und Mensa-Angebote fuer den ausgewaehlten Tag.</Text>
          <SyncStatusBadge />
        </View>

        {accountStats ? (
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{accountStats.courseCount}</Text>
              <Text style={styles.statLabel}>Kurse belegt</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{accountStats.visitedEvents}/{accountStats.totalEvents}</Text>
              <Text style={styles.statLabel}>Veranstaltungen besucht</Text>
            </View>
          </View>
        ) : null}

        <View style={[styles.todayCard, selectedIsToday && styles.todayCardActive]}>
          <View style={styles.dayNav}>
            <Pressable style={styles.navButton} onPress={() => selectDate(addDays(selectedDate, -1))}>
              <MaterialIcons name="chevron-left" size={26} color="#00684F" />
            </Pressable>
            <View style={styles.dayNavTitleBlock}>
              <Text style={[styles.todayKicker, selectedIsToday && styles.todayKickerCurrent]}>{selectedIsToday ? 'Heute' : 'Tagesansicht'}</Text>
              <Text style={styles.todayTitle}>{selectedDay} · {selectedDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</Text>
            </View>
            <Pressable style={styles.navButton} onPress={() => selectDate(addDays(selectedDate, 1))}>
              <MaterialIcons name="chevron-right" size={26} color="#00684F" />
            </Pressable>
          </View>

          <View style={styles.todayHeader}>
            <View>
              <Text style={styles.todaySectionTitle}>Termine</Text>
              <Text style={styles.panelHint}>{selectedLessons.length ? `${selectedLessons.length} Termin${selectedLessons.length === 1 ? '' : 'e'}` : 'Keine Termine'}</Text>
            </View>
            <Text style={styles.todayCount}>{selectedLessons.length}</Text>
          </View>

          <View style={styles.todaySection}>
            {selectedLessons.length === 0 ? <Text style={styles.empty}>Keine Termine fuer diesen Tag.</Text> : null}
            {selectedLessons.map((lesson) => (
              <View key={lesson.id} style={[styles.todayLessonCard, canEditLesson(lesson) && styles.editableLessonCard, lesson.isModuleActive === false && styles.inactiveLessonCard]}>
                <Text style={styles.lessonTime}>{lesson.startTime} - {lesson.endTime}</Text>
                <View style={styles.lessonHeader}>
                  <View style={[styles.syncDot, lesson.syncState === 'pending' ? styles.syncDotPending : styles.syncDotDone]} />
                  <Text style={[styles.lessonTitle, lesson.isModuleActive === false && styles.inactiveLessonText]}>{lesson.title}</Text>
                  <View style={styles.lessonBadges}>
                    {lesson.isVisited ? <Text style={styles.visitedBadge}>Besucht</Text> : null}
                    {lesson.isModuleActive === false ? <Text style={styles.inactiveBadge}>Nicht belegt</Text> : null}
                    {canEditLesson(lesson) ? <Text style={styles.personalBadge}>Persoenlich</Text> : null}
                  </View>
                </View>
                <Text style={styles.lessonMeta}>{lesson.room || '-'} · {lesson.lecturer || '-'}</Text>
                {lesson.description ? <Text style={styles.lessonDescription}>{lesson.description}</Text> : null}
                <View style={styles.lessonActions}>
                  <Pressable disabled={lesson.syncState === 'pending'} style={[styles.lessonStatusButton, lesson.isVisited && styles.lessonStatusButtonActive, lesson.syncState === 'pending' && styles.disabled]} onPress={() => toggleLessonVisit(lesson)}>
                    <MaterialIcons name={lesson.isVisited ? 'check-circle' : 'radio-button-unchecked'} size={18} color={lesson.isVisited ? '#FFFFFF' : '#00684F'} />
                    <Text style={[styles.lessonStatusButtonText, lesson.isVisited && styles.lessonStatusButtonTextActive]}>
                      {lesson.isVisited ? 'Besucht' : 'Als besucht markieren'}
                    </Text>
                  </Pressable>
                  <Pressable disabled={lesson.syncState === 'pending'} style={[styles.lessonModuleButton, lesson.syncState === 'pending' && styles.disabled]} onPress={() => toggleModuleActive(lesson)}>
                    <MaterialIcons name={lesson.isModuleActive === false ? 'visibility' : 'visibility-off'} size={18} color="#00684F" />
                    <Text style={styles.lessonModuleButtonText}>{lesson.isModuleActive === false ? 'Belegt' : 'Nicht belegt'}</Text>
                  </Pressable>
                </View>
                {canEditLesson(lesson) ? (
                  <View style={styles.lessonActions}>
                    <Pressable style={styles.lessonEditButton} onPress={() => startEditingLesson(lesson)}>
                      <MaterialIcons name="edit" size={18} color="#00684F" />
                      <Text style={styles.lessonEditButtonText}>Bearbeiten</Text>
                    </Pressable>
                    <Pressable style={styles.lessonDeleteButton} onPress={() => { setEditingLesson(lesson); setPendingLessonAction('delete'); }}>
                      <MaterialIcons name="delete" size={18} color="#B42318" />
                      <Text style={styles.lessonDeleteButtonText}>Loeschen</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))}
          </View>

          <View style={styles.todaySection}>
            <Text style={styles.todaySectionTitle}>Mensa</Text>
            {selectedMeals.length === 0 ? <Text style={styles.empty}>Kein Essen fuer diesen Tag hinterlegt.</Text> : null}
            {selectedMeals.map((meal, index) => {
              const title = mealTitle(meal);
              const vegetarianDish = meal.vegetarianDish?.trim();
              const showVegetarianDish = vegetarianDish && vegetarianDish !== title;

              return (
                <View key={meal.id} style={[styles.todayMealCard, index > 0 && styles.mealItemDivider]}>
                  <View style={styles.mealItemHeader}>
                    <Text style={styles.mealLabel}>{mealLabel(meal, index)} · {meal.canteen.name}</Text>
                    <Text style={styles.mealPrice}>{(meal.priceCents / 100).toFixed(2)} {meal.currency}</Text>
                  </View>
                  <Text style={styles.mealTitle}>{title}</Text>
                  {showVegetarianDish ? <Text style={styles.mealAlt}>{vegetarianDish}</Text> : null}
                </View>
              );
            })}
          </View>
        </View>

        {editingLesson && pendingLessonAction !== 'delete' ? (
          <View style={styles.editPanel}>
            <View style={styles.editHeader}>
              <View>
                <Text style={styles.sectionTitle}>Termin bearbeiten</Text>
                <Text style={styles.panelHint}>Aenderungen werden erst nach deiner Bestaetigung gespeichert.</Text>
              </View>
              <Pressable style={styles.iconButton} onPress={() => setEditingLesson(null)}>
                <MaterialIcons name="close" size={22} color="#475467" />
              </Pressable>
            </View>

            <View style={styles.form}>
              <Pressable
                style={[styles.segmentButton, editForm.isRecurring && styles.segmentButtonActive]}
                onPress={() => setEditForm((current) => ({ ...current, isRecurring: !current.isRecurring }))}>
                <MaterialIcons name="event-repeat" size={21} color={editForm.isRecurring ? '#FFFFFF' : '#00684F'} />
                <Text style={[styles.segmentButtonText, editForm.isRecurring && styles.segmentButtonTextActive]}>
                  Woechentlich wiederholen
                </Text>
              </Pressable>

              {editForm.isRecurring ? (
                <ComboBox label="Wochentag" options={dayOptions} value={dayOptions.find((option) => option.id === editForm.day) ?? dayOptions[0]} onChange={(option) => setEditForm((current) => ({ ...current, day: String(option.id) }))} />
              ) : (
                <View>
                  <Text style={styles.comboTitle}>Datum</Text>
                  <Pressable style={styles.dateField} onPress={() => setEditDatePickerOpen((current) => !current)}>
                    <MaterialIcons name="calendar-month" size={21} color="#00684F" />
                    <Text style={styles.dateFieldText}>{new Date(`${editForm.date}T12:00:00`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</Text>
                    <MaterialIcons name={editDatePickerOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={24} color="#475467" style={styles.chevronIcon} />
                  </Pressable>
                  {editDatePickerOpen ? (
                    <WeekDatePicker value={editForm.date} onChange={(date) => {
                      const nextDate = new Date(`${date}T12:00:00`);
                      setEditForm((current) => ({
                        ...current,
                        date,
                        day: dayNames[(nextDate.getDay() + 6) % 7],
                      }));
                      setEditDatePickerOpen(false);
                    }} />
                  ) : null}
                </View>
              )}

              <View style={styles.timeRow}>
                <ComboBox label="Start" options={timeOptions} value={timeOptions.find((option) => option.id === editForm.startTime) ?? timeOptions[0]} onChange={(option) => setEditForm((current) => ({ ...current, startTime: String(option.id) }))} />
                <ComboBox label="Ende" options={timeOptions} value={timeOptions.find((option) => option.id === editForm.endTime) ?? timeOptions[15]} onChange={(option) => setEditForm((current) => ({ ...current, endTime: String(option.id) }))} />
              </View>

              <TextInput placeholder="Titel" placeholderTextColor="#98A2B3" style={styles.input} value={editForm.title} onChangeText={(title) => setEditForm((current) => ({ ...current, title }))} />
              <TextInput
                multiline
                placeholder="Beschreibung optional"
                placeholderTextColor="#98A2B3"
                style={[styles.input, styles.descriptionInput]}
                value={editForm.description}
                onChangeText={(description) => setEditForm((current) => ({ ...current, description }))}
              />

              <View style={styles.editActions}>
                <Pressable style={styles.cancelButton} onPress={() => setEditingLesson(null)}>
                  <Text style={styles.cancelButtonText}>Abbrechen</Text>
                </Pressable>
                <Pressable style={styles.button} onPress={() => setPendingLessonAction('update')}>
                  <MaterialIcons name="save" size={22} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Speichern</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.requestsPanel}>
          <Pressable style={styles.personalHeader} onPress={() => setRequestsOpen((current) => !current)}>
            <View style={styles.headerTextBlock}>
              <Text style={styles.sectionTitle}>Terminanfragen</Text>
              <Text style={styles.panelHint}>Einladungen zu persoenlichen Terminen annehmen oder ablehnen.</Text>
            </View>
            <View style={styles.panelHeaderActions}>
              <Text style={styles.sectionCount}>{invitations.filter((invitation) => invitation.status === 'PENDING').length}</Text>
              <MaterialIcons name={requestsOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={28} color="#00684F" style={styles.chevronIcon} />
            </View>
          </Pressable>

          {requestsOpen ? (
            <View style={styles.requestsContent}>
              {invitationError ? <Text style={styles.error}>{invitationError}</Text> : null}
              {invitations.length === 0 ? <Text style={styles.empty}>Keine Terminanfragen vorhanden.</Text> : null}
              <View style={styles.requestList}>
                {invitations.map((invitation) => (
                  <View key={invitation.id} style={styles.requestCard}>
                    <View style={styles.requestCardHeader}>
                      <Text style={styles.requestTitle}>{invitation.lesson.title}</Text>
                      <Text style={[styles.requestStatus, invitation.status === 'PENDING' && styles.requestStatusPending]}>
                        {invitationStatusLabel(invitation.status)}
                      </Text>
                    </View>
                    <Text style={styles.requestMeta}>
                      {invitation.lesson.scheduleDay.day} · {formatInvitationDate(invitation.lesson.date)} · {invitation.lesson.startTime} - {invitation.lesson.endTime}
                    </Text>
                    <Text style={styles.requestMeta}>Von {invitation.sender.name} · {invitation.sender.email}</Text>
                    {invitation.lesson.description ? <Text style={styles.requestDescription}>{invitation.lesson.description}</Text> : null}

                    {invitation.status === 'PENDING' ? (
                      <View style={styles.requestActions}>
                        <Pressable style={styles.acceptButton} onPress={() => respondToInvitation(invitation.id, 'accept')}>
                          <MaterialIcons name="check" size={20} color="#FFFFFF" />
                          <Text style={styles.requestActionText}>Annehmen</Text>
                        </Pressable>
                        <Pressable style={styles.rejectButton} onPress={() => respondToInvitation(invitation.id, 'reject')}>
                          <MaterialIcons name="close" size={20} color="#FFFFFF" />
                          <Text style={styles.requestActionText}>Ablehnen</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.personalPanel}>
          <Pressable style={styles.personalHeader} onPress={() => setPersonalFormOpen((current) => !current)}>
            <View style={styles.headerTextBlock}>
              <Text style={styles.sectionTitle}>Persoenlichen Planeintrag erstellen</Text>
              <Text style={styles.panelHint}>Einmalig, woechentlich oder mit Einladung an andere Accounts.</Text>
            </View>
            <MaterialIcons name={personalFormOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={28} color="#00684F" style={styles.chevronIcon} />
          </Pressable>

          {personalFormOpen ? (
            <View style={styles.form}>
              <Pressable
                style={[styles.segmentButton, form.isRecurring && styles.segmentButtonActive]}
                onPress={() => setForm((current) => ({ ...current, isRecurring: !current.isRecurring }))}>
                <MaterialIcons name="event-repeat" size={21} color={form.isRecurring ? '#FFFFFF' : '#00684F'} />
                <Text style={[styles.segmentButtonText, form.isRecurring && styles.segmentButtonTextActive]}>
                  Woechentlich wiederholen
                </Text>
              </Pressable>

              {form.isRecurring ? (
                <ComboBox label="Wochentag" options={dayOptions} value={selectedDayOption} onChange={(option) => setForm((current) => ({ ...current, day: String(option.id) }))} />
              ) : (
                <View>
                  <Text style={styles.comboTitle}>Datum</Text>
                  <Pressable style={styles.dateField} onPress={() => setDatePickerOpen((current) => !current)}>
                    <MaterialIcons name="calendar-month" size={21} color="#00684F" />
                    <Text style={styles.dateFieldText}>{new Date(`${form.date}T12:00:00`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</Text>
                    <MaterialIcons name={datePickerOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={24} color="#475467" style={styles.chevronIcon} />
                  </Pressable>
                  {datePickerOpen ? (
                    <WeekDatePicker value={form.date} onChange={(date) => {
                      const nextDate = new Date(`${date}T12:00:00`);
                      setForm((current) => ({
                        ...current,
                        date,
                        day: dayNames[(nextDate.getDay() + 6) % 7],
                      }));
                      setDatePickerOpen(false);
                    }} />
                  ) : null}
                </View>
              )}

              <View style={styles.timeRow}>
                <ComboBox label="Start" options={timeOptions} value={selectedStartTime} onChange={(option) => setForm((current) => ({ ...current, startTime: String(option.id) }))} />
                <ComboBox label="Ende" options={timeOptions} value={selectedEndTime} onChange={(option) => setForm((current) => ({ ...current, endTime: String(option.id) }))} />
              </View>

              <TextInput placeholder="Titel" placeholderTextColor="#98A2B3" style={styles.input} value={form.title} onChangeText={(title) => setForm((current) => ({ ...current, title }))} />
              <TextInput
                multiline
                placeholder="Beschreibung optional"
                placeholderTextColor="#98A2B3"
                style={[styles.input, styles.descriptionInput]}
                value={form.description}
                onChangeText={(description) => setForm((current) => ({ ...current, description }))}
              />

              <View style={styles.inviteBox}>
                <Text style={styles.comboTitle}>Accounts einladen</Text>
                <TextInput
                  autoCapitalize="none"
                  placeholder="Name oder E-Mail suchen"
                  placeholderTextColor="#98A2B3"
                  style={styles.input}
                  value={accountQuery}
                  onChangeText={setAccountQuery}
                />
                {accountResults.map((account) => (
                  <Pressable key={account.id} style={styles.accountResult} onPress={() => addInvitee(account)}>
                    <MaterialIcons name="person-add" size={20} color="#00684F" />
                    <View style={styles.accountTextBlock}>
                      <Text style={styles.accountName}>{account.name}</Text>
                      <Text style={styles.accountEmail}>{account.email}</Text>
                    </View>
                  </Pressable>
                ))}
                {invitees.length > 0 ? (
                  <View style={styles.inviteeList}>
                    {invitees.map((invitee) => (
                      <Pressable key={invitee.id} style={styles.inviteeChip} onPress={() => setInvitees((current) => current.filter((account) => account.id !== invitee.id))}>
                        <Text style={styles.inviteeChipText}>{invitee.name}</Text>
                        <MaterialIcons name="close" size={16} color="#00684F" />
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>

              {formMessage ? <Text style={styles.success}>{formMessage}</Text> : null}
              {formError ? <Text style={styles.error}>{formError}</Text> : null}
              <Pressable style={styles.button} onPress={addLesson}>
                <MaterialIcons name="add" size={22} color="#FFFFFF" />
                <Text style={styles.buttonText}>Persoenlichen Planeintrag speichern</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <View style={styles.importSection}>
          <Pressable style={styles.personalHeader} onPress={() => setImportPanelOpen((current) => !current)}>
            <View style={styles.headerTextBlock}>
              <Text style={styles.sectionTitle}>Importieren</Text>
              <Text style={styles.panelHint}>Stundenplan komplett oder einzelne Kurse fuer den aktuellen Monat laden.</Text>
            </View>
            <MaterialIcons name={importPanelOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={28} color="#00684F" style={styles.chevronIcon} />
          </Pressable>

          {importPanelOpen ? (
            <View style={styles.importPanel}>
              <View style={styles.importModeRow}>
                <Pressable
                  style={[styles.importModeButton, importMode === 'schedule' && styles.importModeButtonActive]}
                  onPress={() => {
                    setImportMode('schedule');
                    setImportError('');
                    setImportMessage('');
                  }}>
                  <MaterialIcons name="calendar-month" size={20} color={importMode === 'schedule' ? '#FFFFFF' : '#475467'} />
                  <Text style={[styles.importModeText, importMode === 'schedule' && styles.importModeTextActive]}>Stundenplan importieren</Text>
                </Pressable>
                <Pressable
                  style={[styles.importModeButton, importMode === 'course' && styles.importModeButtonActive]}
                  onPress={() => {
                    setImportMode('course');
                    setImportError('');
                    setImportMessage('');
                  }}>
                  <MaterialIcons name="school" size={20} color={importMode === 'course' ? '#FFFFFF' : '#475467'} />
                  <Text style={[styles.importModeText, importMode === 'course' && styles.importModeTextActive]}>Kurs importieren</Text>
                </Pressable>
              </View>
              <ComboBox label="Planungssemester" options={options.semesters} value={semester} onChange={(nextSemester) => { setSemester(nextSemester); setAcademicSemester(null); setSpecialization(null); }} />
              <ComboBox label="Fakultaet / Studiengang" options={options.faculties} value={faculty} onChange={(nextFaculty) => { setFaculty(nextFaculty); setAcademicSemester(null); setSpecialization(null); }} />
              <ComboBox disabled={!faculty || academicSemesters.length === 0} label="Fachsemester" options={academicSemesters} value={academicSemester} onChange={(nextSemester) => { setAcademicSemester(nextSemester); setSpecialization(null); }} />
              <ComboBox disabled={!academicSemester || specializations.length === 0} label="Vertiefungsrichtung" options={specializations} value={specialization} onChange={setSpecialization} />
              {importMessage ? <Text style={styles.success}>{importMessage}</Text> : null}
              {importError ? <Text style={styles.error}>{importError}</Text> : null}
              {importMode === 'schedule' ? (
                <Pressable disabled={!canImport} style={[styles.importButton, !canImport && styles.importButtonDisabled]} onPress={importSchedule}>
                  <MaterialIcons name="download" size={22} color="#FFFFFF" />
                  <Text style={styles.importButtonText}>Stundenplan importieren</Text>
                </Pressable>
              ) : (
                <View style={styles.courseImportList}>
                  <View style={styles.courseImportHeader}>
                    <Text style={styles.comboTitle}>Kurse</Text>
                    <Pressable disabled={!canImport || isCourseLoading} style={[styles.refreshCoursesButton, (!canImport || isCourseLoading) && styles.disabled]} onPress={loadImportCourses}>
                      <MaterialIcons name="refresh" size={18} color="#00684F" />
                      <Text style={styles.refreshCoursesText}>{isCourseLoading ? 'Laedt' : 'Aktualisieren'}</Text>
                    </Pressable>
                  </View>
                  {isCourseLoading ? <Text style={styles.empty}>Kurse werden geladen.</Text> : null}
                  {!isCourseLoading && courseOptions.length === 0 ? <Text style={styles.empty}>Keine Kurse fuer diese Auswahl gefunden.</Text> : null}
                  {courseOptions.map((course) => (
                    <View key={course.title} style={styles.courseImportCard}>
                      <View style={styles.courseImportText}>
                        <Text style={styles.courseImportTitle}>{course.title}</Text>
                        <Text style={styles.courseImportMeta}>{course.lessonCount} Termin{course.lessonCount === 1 ? '' : 'e'} im aktuellen Monat</Text>
                      </View>
                      <Pressable style={styles.courseImportButton} onPress={() => importCourse(course)}>
                        <MaterialIcons name="download" size={18} color="#FFFFFF" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : null}
        </View>
        </ScrollView>
      </SwipeableTabView>
      <Modal transparent animationType="fade" visible={Boolean(pendingLessonAction)} onRequestClose={closeLessonDialog}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {pendingLessonAction === 'delete' ? 'Termin loeschen?' : 'Aenderungen speichern?'}
            </Text>
            <Text style={styles.modalText}>
              {pendingLessonAction === 'delete'
                ? 'Dieser persoenliche Termin wird endgueltig geloescht. Du kannst den Vorgang noch abbrechen.'
                : 'Die Bearbeitung wird endgueltig auf diesen persoenlichen Termin angewendet. Du kannst den Vorgang noch abbrechen.'}
            </Text>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelButton} onPress={closeLessonDialog}>
                <Text style={styles.cancelButtonText}>Abbrechen</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirmButton, pendingLessonAction === 'delete' && styles.modalDangerButton]}
                onPress={pendingLessonAction === 'delete' ? deletePersonalLesson : updatePersonalLesson}>
                <Text style={styles.modalConfirmText}>Bestaetigen</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F7FB' },
  container: { padding: 20, paddingBottom: 36 },
  header: { marginBottom: 20 },
  kicker: { color: '#00684F', fontSize: 14, fontWeight: '800', marginBottom: 6, textTransform: 'uppercase' },
  title: { color: '#101828', fontSize: 28, fontWeight: '800', lineHeight: 34 },
  subtitle: { color: '#667085', fontSize: 15, lineHeight: 22, marginBottom: 14, marginTop: 8 },
  importSection: { marginTop: 18, zIndex: 1 },
  importPanel: { backgroundColor: '#FFFFFF', borderColor: '#E4E7EC', borderRadius: 8, borderWidth: 1, gap: 10, padding: 14, zIndex: 1 },
  importModeRow: { backgroundColor: '#EAECF0', borderRadius: 8, flexDirection: 'row', gap: 6, padding: 4 },
  importModeButton: { alignItems: 'center', borderRadius: 7, flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', minHeight: 42, paddingHorizontal: 8 },
  importModeButtonActive: { backgroundColor: '#00684F' },
  importModeText: { color: '#475467', flexShrink: 1, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  importModeTextActive: { color: '#FFFFFF' },
  comboBox: { flex: 1, position: 'relative', zIndex: 1 },
  comboBoxOpen: { elevation: 12, zIndex: 1000 },
  comboTitle: { color: '#344054', fontSize: 13, fontWeight: '800', marginBottom: 6 },
  comboButton: { alignItems: 'center', backgroundColor: '#F9FAFB', borderColor: '#D0D5DD', borderRadius: 8, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 46, paddingHorizontal: 12 },
  comboLabel: { color: '#101828', flex: 1, fontSize: 14, fontWeight: '800' },
  chevronIcon: { flexShrink: 0, textAlign: 'center', width: 28 },
  comboMenu: { backgroundColor: '#FFFFFF', borderColor: '#D0D5DD', borderRadius: 8, borderWidth: 1, elevation: 12, marginTop: 6, maxHeight: 220, overflow: 'hidden', zIndex: 1001 },
  comboMenuScroll: { maxHeight: 220 },
  comboOption: { justifyContent: 'center', minHeight: 42, paddingHorizontal: 12 },
  comboOptionText: { color: '#475467', fontSize: 13, fontWeight: '700' },
  disabled: { opacity: 0.55 },
  importButton: { alignItems: 'center', backgroundColor: '#00684F', borderRadius: 8, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 48 },
  importButtonDisabled: { backgroundColor: '#98A2B3' },
  importButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  courseImportList: { gap: 8 },
  courseImportHeader: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  refreshCoursesButton: { alignItems: 'center', backgroundColor: '#E7F4EF', borderColor: '#93D3BA', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 5, minHeight: 36, paddingHorizontal: 10 },
  refreshCoursesText: { color: '#00684F', fontSize: 12, fontWeight: '800' },
  courseImportCard: { alignItems: 'center', backgroundColor: '#F9FAFB', borderColor: '#EAECF0', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 10, padding: 10 },
  courseImportText: { flex: 1 },
  courseImportTitle: { color: '#101828', fontSize: 14, fontWeight: '800', lineHeight: 20 },
  courseImportMeta: { color: '#667085', fontSize: 12, fontWeight: '700', marginTop: 2 },
  courseImportButton: { alignItems: 'center', backgroundColor: '#00684F', borderRadius: 8, height: 38, justifyContent: 'center', width: 42 },
  todayCard: { backgroundColor: '#FFFFFF', borderColor: '#D0D5DD', borderRadius: 8, borderWidth: 1, gap: 14, marginBottom: 14, padding: 14 },
  todayCardActive: {},
  statsBar: { alignItems: 'stretch', backgroundColor: '#FFFFFF', borderColor: '#D0D5DD', borderRadius: 8, borderWidth: 1, flexDirection: 'row', marginBottom: 14, overflow: 'hidden' },
  statItem: { flex: 1, gap: 2, justifyContent: 'center', minHeight: 72, paddingHorizontal: 12, paddingVertical: 10 },
  statDivider: { backgroundColor: '#EAECF0', width: 1 },
  statValue: { color: '#00684F', fontSize: 21, fontWeight: '800', textAlign: 'center' },
  statLabel: { color: '#667085', fontSize: 12, fontWeight: '800', lineHeight: 17, textAlign: 'center', textTransform: 'uppercase' },
  dayNav: { alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  dayNavTitleBlock: { alignItems: 'center', flex: 1 },
  todayHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  todayKicker: { color: '#00684F', fontSize: 13, fontWeight: '800', textTransform: 'uppercase' },
  todayKickerCurrent: { color: '#D4A017' },
  todayTitle: { color: '#101828', fontSize: 20, fontWeight: '800', marginTop: 4 },
  todayCount: { backgroundColor: '#00684F', borderRadius: 8, color: '#FFFFFF', fontSize: 16, fontWeight: '800', minWidth: 34, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6, textAlign: 'center' },
  todaySection: { gap: 8 },
  todaySectionTitle: { color: '#344054', fontSize: 13, fontWeight: '800', textTransform: 'uppercase' },
  todayLessonCard: { backgroundColor: '#F9FAFB', borderColor: '#D0D5DD', borderRadius: 8, borderWidth: 1, padding: 10 },
  editableLessonCard: { borderColor: '#93D3BA' },
  inactiveLessonCard: { opacity: 0.68 },
  inactiveLessonText: { color: '#667085' },
  todayMealCard: { gap: 5 },
  weekPanel: { marginBottom: 18, zIndex: 20 },
  weekContent: { backgroundColor: '#FFFFFF', borderColor: '#E4E7EC', borderRadius: 8, borderWidth: 1, padding: 12 },
  weekNav: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  navButton: { alignItems: 'center', backgroundColor: '#E7F4EF', borderRadius: 8, height: 44, justifyContent: 'center', width: 44 },
  weekTitle: { color: '#101828', fontSize: 18, fontWeight: '800' },
  form: { backgroundColor: '#FFFFFF', borderColor: '#E4E7EC', borderRadius: 8, borderWidth: 1, gap: 10, marginBottom: 22, padding: 14 },
  input: { backgroundColor: '#F9FAFB', borderColor: '#D0D5DD', borderRadius: 8, borderWidth: 1, color: '#101828', fontSize: 15, minHeight: 46, paddingHorizontal: 12 },
  descriptionInput: { minHeight: 88, paddingTop: 12, textAlignVertical: 'top' },
  button: { alignItems: 'center', backgroundColor: '#00684F', borderRadius: 8, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 48 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  success: { color: '#047857', fontSize: 13, fontWeight: '800' },
  error: { color: '#B42318', fontSize: 13, fontWeight: '700' },
  weekGrid: { gap: 12, marginBottom: 18 },
  dayColumn: { backgroundColor: '#FFFFFF', borderColor: '#E4E7EC', borderRadius: 8, borderWidth: 1, padding: 12 },
  dayColumnToday: { backgroundColor: '#F0FDF4', borderColor: '#22C55E', borderWidth: 2 },
  dayHeaderRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  dayTitle: { color: '#101828', fontSize: 18, fontWeight: '800' },
  dayTitleToday: { color: '#00684F' },
  dayDate: { color: '#667085', fontSize: 13, fontWeight: '700', marginBottom: 10, marginTop: 2 },
  todayBadge: { backgroundColor: '#00684F', borderRadius: 999, color: '#FFFFFF', fontSize: 11, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 4 },
  empty: { color: '#98A2B3', fontSize: 13, lineHeight: 19 },
  mealPanel: { backgroundColor: '#ECFDF3', borderColor: '#A6F4C5', borderRadius: 8, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  mealHeaderButton: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'space-between', minHeight: 48, paddingHorizontal: 10, paddingVertical: 8 },
  mealHeaderText: { flex: 1 },
  mealPanelTitle: { color: '#00684F', fontSize: 13, fontWeight: '800', textTransform: 'uppercase' },
  mealPanelMeta: { color: '#475467', fontSize: 12, fontWeight: '700', marginTop: 2 },
  mealList: { backgroundColor: '#FFFFFF', borderTopColor: '#A6F4C5', borderTopWidth: 1, padding: 10 },
  mealItem: { gap: 5 },
  mealItemDivider: { borderTopColor: '#EAECF0', borderTopWidth: 1, marginTop: 10, paddingTop: 10 },
  mealItemHeader: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  mealLabel: { color: '#344054', flex: 1, fontSize: 12, fontWeight: '800' },
  mealPrice: { color: '#B54708', flexShrink: 0, fontSize: 12, fontWeight: '800' },
  mealTitle: { color: '#101828', fontSize: 14, fontWeight: '800', lineHeight: 20 },
  mealAlt: { color: '#475467', fontSize: 13, lineHeight: 18 },
  lessonCard: { backgroundColor: '#F9FAFB', borderColor: '#EAECF0', borderRadius: 8, borderWidth: 1, marginTop: 8, padding: 10 },
  lessonTime: { color: '#1D4ED8', fontSize: 12, fontWeight: '800' },
  lessonHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: 8, justifyContent: 'space-between', marginTop: 5 },
  lessonTitle: { color: '#101828', flex: 1, fontSize: 15, fontWeight: '800' },
  syncDot: { borderRadius: 5, height: 10, marginTop: 4, width: 10 },
  syncDotDone: { backgroundColor: '#12B76A' },
  syncDotPending: { backgroundColor: '#D92D20' },
  lessonBadges: { alignItems: 'flex-end', gap: 4 },
  personalBadge: { color: '#047857', fontSize: 11, fontWeight: '800' },
  visitedBadge: { color: '#00684F', fontSize: 11, fontWeight: '800' },
  inactiveBadge: { color: '#B54708', fontSize: 11, fontWeight: '800' },
  lessonMeta: { color: '#667085', fontSize: 12, lineHeight: 18, marginTop: 4 },
  lessonDescription: { color: '#475467', fontSize: 12, lineHeight: 18, marginTop: 6 },
  lessonActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  lessonStatusButton: { alignItems: 'center', backgroundColor: '#E7F4EF', borderColor: '#93D3BA', borderRadius: 8, borderWidth: 1, flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', minHeight: 40, paddingHorizontal: 8 },
  lessonStatusButtonActive: { backgroundColor: '#00684F', borderColor: '#00684F' },
  lessonStatusButtonText: { color: '#00684F', flexShrink: 1, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  lessonStatusButtonTextActive: { color: '#FFFFFF' },
  lessonModuleButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#D0D5DD', borderRadius: 8, borderWidth: 1, flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', minHeight: 40, paddingHorizontal: 8 },
  lessonModuleButtonText: { color: '#00684F', flexShrink: 1, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  lessonEditButton: { alignItems: 'center', backgroundColor: '#E7F4EF', borderColor: '#93D3BA', borderRadius: 8, borderWidth: 1, flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', minHeight: 40 },
  lessonEditButtonText: { color: '#00684F', fontSize: 13, fontWeight: '800' },
  lessonDeleteButton: { alignItems: 'center', backgroundColor: '#FEF3F2', borderColor: '#FECDCA', borderRadius: 8, borderWidth: 1, flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', minHeight: 40 },
  lessonDeleteButtonText: { color: '#B42318', fontSize: 13, fontWeight: '800' },
  editPanel: { marginBottom: 18, zIndex: 40 },
  editHeader: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E4E7EC', borderRadius: 8, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, padding: 14 },
  iconButton: { alignItems: 'center', backgroundColor: '#F9FAFB', borderColor: '#EAECF0', borderRadius: 8, borderWidth: 1, height: 38, justifyContent: 'center', width: 38 },
  editActions: { flexDirection: 'row', gap: 10 },
  cancelButton: { alignItems: 'center', backgroundColor: '#F9FAFB', borderColor: '#D0D5DD', borderRadius: 8, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 48 },
  cancelButtonText: { color: '#344054', fontSize: 14, fontWeight: '800' },
  personalPanel: { marginTop: 4, zIndex: 30 },
  personalHeader: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E4E7EC', borderRadius: 8, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, padding: 14 },
  headerTextBlock: { flex: 1, paddingRight: 10 },
  requestsPanel: { marginTop: 18, zIndex: 10 },
  requestsContent: { backgroundColor: '#FFFFFF', borderColor: '#E4E7EC', borderRadius: 8, borderWidth: 1, gap: 10, padding: 12 },
  panelHeaderActions: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { color: '#101828', fontSize: 17, fontWeight: '800' },
  sectionCount: { color: '#00684F', fontSize: 17, fontWeight: '800' },
  panelHint: { color: '#667085', fontSize: 13, lineHeight: 19, marginTop: 3, paddingRight: 8 },
  requestList: { gap: 12 },
  requestCard: { backgroundColor: '#FFFFFF', borderColor: '#E4E7EC', borderRadius: 8, borderWidth: 1, padding: 14 },
  requestCardHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  requestTitle: { color: '#101828', flex: 1, fontSize: 16, fontWeight: '800' },
  requestStatus: { color: '#667085', fontSize: 12, fontWeight: '800' },
  requestStatusPending: { color: '#B54708' },
  requestMeta: { color: '#667085', fontSize: 13, lineHeight: 19, marginTop: 5 },
  requestDescription: { color: '#475467', fontSize: 13, lineHeight: 19, marginTop: 8 },
  requestActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  acceptButton: { alignItems: 'center', backgroundColor: '#047857', borderRadius: 8, flex: 1, flexDirection: 'row', gap: 7, justifyContent: 'center', minHeight: 44 },
  rejectButton: { alignItems: 'center', backgroundColor: '#B42318', borderRadius: 8, flex: 1, flexDirection: 'row', gap: 7, justifyContent: 'center', minHeight: 44 },
  requestActionText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  segmentButton: { alignItems: 'center', backgroundColor: '#E7F4EF', borderColor: '#93D3BA', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 46 },
  segmentButtonActive: { backgroundColor: '#00684F', borderColor: '#00684F' },
  segmentButtonText: { color: '#00684F', fontSize: 14, fontWeight: '800' },
  segmentButtonTextActive: { color: '#FFFFFF' },
  dateField: { alignItems: 'center', backgroundColor: '#F9FAFB', borderColor: '#D0D5DD', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 9, minHeight: 46, paddingHorizontal: 12 },
  dateFieldText: { color: '#101828', flex: 1, fontSize: 14, fontWeight: '800' },
  datePicker: { backgroundColor: '#F9FAFB', borderColor: '#D0D5DD', borderRadius: 8, borderWidth: 1, padding: 10 },
  datePickerHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  datePickerTitle: { color: '#101828', fontSize: 14, fontWeight: '800' },
  smallIconButton: { alignItems: 'center', backgroundColor: '#E7F4EF', borderRadius: 8, height: 34, justifyContent: 'center', width: 34 },
  dateGrid: { flexDirection: 'row', gap: 6 },
  dateChip: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#EAECF0', borderRadius: 8, borderWidth: 1, flex: 1, minHeight: 58, justifyContent: 'center' },
  dateChipActive: { backgroundColor: '#00684F', borderColor: '#00684F' },
  dateChipDay: { color: '#667085', fontSize: 11, fontWeight: '800' },
  dateChipDate: { color: '#101828', fontSize: 11, fontWeight: '800', marginTop: 3 },
  dateChipTextActive: { color: '#FFFFFF' },
  timeRow: { flexDirection: 'row', gap: 10 },
  inviteBox: { gap: 8 },
  accountResult: { alignItems: 'center', backgroundColor: '#F9FAFB', borderColor: '#EAECF0', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 10, padding: 10 },
  accountTextBlock: { flex: 1 },
  accountName: { color: '#101828', fontSize: 14, fontWeight: '800' },
  accountEmail: { color: '#667085', fontSize: 12, marginTop: 2 },
  inviteeList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  inviteeChip: { alignItems: 'center', backgroundColor: '#ECFDF3', borderColor: '#A6F4C5', borderRadius: 999, borderWidth: 1, flexDirection: 'row', gap: 5, paddingHorizontal: 10, paddingVertical: 7 },
  inviteeChipText: { color: '#00684F', fontSize: 12, fontWeight: '800' },
  modalOverlay: { alignItems: 'center', backgroundColor: 'rgba(16, 24, 40, 0.45)', flex: 1, justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 8, gap: 12, maxWidth: 420, padding: 18, width: '100%' },
  modalTitle: { color: '#101828', fontSize: 19, fontWeight: '800' },
  modalText: { color: '#475467', fontSize: 14, lineHeight: 20 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalCancelButton: { alignItems: 'center', backgroundColor: '#F9FAFB', borderColor: '#D0D5DD', borderRadius: 8, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 46 },
  modalConfirmButton: { alignItems: 'center', backgroundColor: '#00684F', borderRadius: 8, flex: 1, justifyContent: 'center', minHeight: 46 },
  modalDangerButton: { backgroundColor: '#B42318' },
  modalConfirmText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
