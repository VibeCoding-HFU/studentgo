import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackendStatusBadge } from '@/components/backend-status-badge';
import { getBackendUrl } from '@/constants/api';
import { useAuth } from '@/contexts/auth-context';
import { decryptPayload, encryptPayload, getPrivateKey } from '@/lib/client-crypto';

type Lesson = {
  date?: string | null;
  description?: string | null;
  endTime: string;
  encryptedKey?: string | null;
  encryptedPayload?: string | null;
  encryptionIv?: string | null;
  id: number;
  isRecurring?: boolean;
  lecturer?: string | null;
  ownerId?: number | null;
  room?: string | null;
  source?: string;
  startTime: string;
  title: string;
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
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.comboBox}>
      <Text style={styles.comboTitle}>{label}</Text>
      <Pressable disabled={disabled} style={[styles.comboButton, disabled && styles.disabled]} onPress={() => setOpen((current) => !current)}>
        <Text style={styles.comboLabel}>{value?.shortname ?? value?.name ?? 'Auswaehlen'}</Text>
        <MaterialIcons name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={24} color="#475467" />
      </Pressable>
      {open && !disabled ? (
        <View style={styles.comboMenu}>
          {options.map((option) => (
            <Pressable key={String(option.id)} style={styles.comboOption} onPress={() => { onChange(option); setOpen(false); }}>
              <Text style={styles.comboOptionText}>{option.shortname ? `${option.shortname} - ${option.name}` : option.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function WeekDatePicker({ value, onChange }: { onChange: (date: string) => void; value: string }) {
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
          <MaterialIcons name="chevron-left" size={22} color="#2F80ED" />
        </Pressable>
        <Text style={styles.datePickerTitle}>{formatDisplayDate(pickerWeek)} - {formatDisplayDate(addDays(pickerWeek, 6))}</Text>
        <Pressable style={styles.smallIconButton} onPress={() => setPickerWeek((current) => addDays(current, 7))}>
          <MaterialIcons name="chevron-right" size={22} color="#2F80ED" />
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
  const { token, user } = useAuth();
  const backendUrl = useMemo(() => getBackendUrl(), []);
  const [weekStart, setWeekStart] = useState(startOfWeek());
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [options, setOptions] = useState<ImportOptions>({ faculties: [], groups: [], semesters: [], specializations: [] });
  const [semester, setSemester] = useState<Option | null>(null);
  const [faculty, setFaculty] = useState<FacultyOption | null>(null);
  const [academicSemester, setAcademicSemester] = useState<Option | null>(null);
  const [specialization, setSpecialization] = useState<Option | null>(null);
  const [form, setForm] = useState(createEmptyForm);
  const [personalFormOpen, setPersonalFormOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [accountQuery, setAccountQuery] = useState('');
  const [accountResults, setAccountResults] = useState<UserOption[]>([]);
  const [invitees, setInvitees] = useState<UserOption[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
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
      const privateKey = user?.email ? getPrivateKey(user.email) : null;
      const decryptedDays = await Promise.all(body.days.map(async (day) => ({
        ...day,
        lessons: await Promise.all(day.lessons.map(async (lesson) => {
          if (!privateKey || !lesson.encryptedPayload || !lesson.encryptedKey || !lesson.encryptionIv) {
            return lesson;
          }

          try {
            const decrypted = await decryptPayload<{ description?: string; title?: string }>(privateKey, {
              encryptedKey: lesson.encryptedKey,
              encryptedPayload: lesson.encryptedPayload,
              encryptionIv: lesson.encryptionIv,
            });
            return {
              ...lesson,
              description: decrypted.description ?? lesson.description,
              title: decrypted.title ?? lesson.title,
            };
          } catch {
            return { ...lesson, title: 'Verschluesselter Termin' };
          }
        })),
      })));
      setSchedule(decryptedDays);
    }
  }, [backendUrl, token, user?.email, weekStart]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

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

  const weekDays = useMemo(() => dayNames.map((day, index) => ({ day, date: addDays(weekStart, index) })), [weekStart]);

  async function importSchedule() {
    setError('');
    setMessage('');

    if (!canImport) {
      setError('Waehle alle Importoptionen aus.');
      return;
    }

    if (!token) {
      setError('Melde dich an, um den Stundenplan zu importieren.');
      return;
    }

    const response = await fetch(`${backendUrl}/api/schedule/import`, {
      body: JSON.stringify({
        facultyId: faculty?.id,
        facultyName: faculty?.name,
        semesterId: semester?.id,
        semesterName: semester?.name,
        specialization: specialization?.id,
        studyGroup: selectedGroup?.importKey,
        weekStart: toInputDate(weekStart),
      }),
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    if (!response.ok) {
      setError('Stundenplan konnte nicht importiert werden.');
      return;
    }

    const result = (await response.json()) as { count: number };
    setMessage(`${result.count} Termine importiert.`);
    await loadSchedule();
  }

  async function addLesson() {
    setError('');
    setMessage('');

    if (!token) {
      setError('Melde dich an, um persoenliche Planeintraege zu speichern.');
      return;
    }

    if (!form.title.trim()) {
      setError('Gib einen Titel fuer den Planeintrag ein.');
      return;
    }

    if (!user?.publicKeyJson) {
      setError('Dein Account hat noch keinen Public Key. Lege den Account neu an oder hinterlege den Key im Account-Bereich.');
      return;
    }

    const personalPayload = { description: form.description, title: form.title };
    const ownerEnvelope = await encryptPayload(user.publicKeyJson, personalPayload);
    const encryptedInvitations = await Promise.all(invitees.map(async (invitee) => {
      if (!invitee.publicKeyJson) {
        throw new Error(`${invitee.name} hat keinen Public Key.`);
      }

      return {
        recipientId: invitee.id,
        ...(await encryptPayload(invitee.publicKeyJson, personalPayload)),
      };
    }));

    const response = await fetch(`${backendUrl}/api/schedule/lessons`, {
      body: JSON.stringify({
        ...form,
        ...ownerEnvelope,
        description: '',
        encryptedInvitations,
        inviteeIds: invitees.map((invitee) => invitee.id),
        title: 'Verschluesselter Termin',
      }),
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

    setForm(createEmptyForm());
    setInvitees([]);
    setAccountQuery('');
    setMessage('Persoenlicher Planeintrag wurde gespeichert.');
    await loadSchedule();
  }

  function addInvitee(account: UserOption) {
    setInvitees((current) => current.some((invitee) => invitee.id === account.id) ? current : [...current, account]);
    setAccountQuery('');
    setAccountResults([]);
  }

  function lessonsForDay(day: string, date: Date) {
    const dateKey = toInputDate(date);
    return schedule
      .find((entry) => entry.day === day)
      ?.lessons.filter((lesson) => !lesson.date || lesson.date.slice(0, 10) === dateKey) ?? [];
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>StudentGo</Text>
          <Text style={styles.title}>Wochenplan</Text>
          <Text style={styles.subtitle}>Importierter Stundenplan und persoenliche Eintraege in einer Wochenansicht.</Text>
          <BackendStatusBadge />
        </View>

        <View style={styles.importPanel}>
          <ComboBox label="Planungssemester" options={options.semesters} value={semester} onChange={(nextSemester) => { setSemester(nextSemester); setAcademicSemester(null); setSpecialization(null); }} />
          <ComboBox label="Fakultaet / Studiengang" options={options.faculties} value={faculty} onChange={(nextFaculty) => { setFaculty(nextFaculty); setAcademicSemester(null); setSpecialization(null); }} />
          <ComboBox disabled={!faculty || academicSemesters.length === 0} label="Fachsemester" options={academicSemesters} value={academicSemester} onChange={(nextSemester) => { setAcademicSemester(nextSemester); setSpecialization(null); }} />
          <ComboBox disabled={!academicSemester || specializations.length === 0} label="Vertiefungsrichtung" options={specializations} value={specialization} onChange={setSpecialization} />
          <Pressable disabled={!canImport} style={[styles.importButton, !canImport && styles.importButtonDisabled]} onPress={importSchedule}>
            <MaterialIcons name="download" size={22} color="#FFFFFF" />
            <Text style={styles.importButtonText}>Stundenplan importieren</Text>
          </Pressable>
        </View>

        <View style={styles.weekNav}>
          <Pressable style={styles.navButton} onPress={() => setWeekStart((current) => addDays(current, -7))}>
            <MaterialIcons name="chevron-left" size={26} color="#2F80ED" />
          </Pressable>
          <Text style={styles.weekTitle}>{formatDisplayDate(weekStart)} - {formatDisplayDate(addDays(weekStart, 6))}</Text>
          <Pressable style={styles.navButton} onPress={() => setWeekStart((current) => addDays(current, 7))}>
            <MaterialIcons name="chevron-right" size={26} color="#2F80ED" />
          </Pressable>
        </View>

        <View style={styles.weekGrid}>
          {weekDays.map(({ day, date }) => {
            const lessons = lessonsForDay(day, date);
            return (
              <View key={day} style={styles.dayColumn}>
                <Text style={styles.dayTitle}>{day}</Text>
                <Text style={styles.dayDate}>{formatDisplayDate(date)}</Text>
                {lessons.length === 0 ? <Text style={styles.empty}>Keine Eintraege</Text> : null}
                {lessons.map((lesson) => (
                  <View key={lesson.id} style={styles.lessonCard}>
                    <Text style={styles.lessonTime}>{lesson.startTime} - {lesson.endTime}</Text>
                    <View style={styles.lessonHeader}>
                      <Text style={styles.lessonTitle}>{lesson.title}</Text>
                      {lesson.ownerId === user?.id ? <Text style={styles.personalBadge}>{lesson.source === 'STARPLAN' ? 'Import' : 'Persoenlich'}</Text> : null}
                    </View>
                    <Text style={styles.lessonMeta}>{lesson.room || '-'} · {lesson.lecturer || '-'}</Text>
                    {lesson.description ? <Text style={styles.lessonDescription}>{lesson.description}</Text> : null}
                  </View>
                ))}
              </View>
            );
          })}
        </View>

        <View style={styles.personalPanel}>
          <Pressable style={styles.personalHeader} onPress={() => setPersonalFormOpen((current) => !current)}>
            <View>
              <Text style={styles.sectionTitle}>Persoenlichen Planeintrag erstellen</Text>
              <Text style={styles.panelHint}>Einmalig, woechentlich oder mit Einladung an andere Accounts.</Text>
            </View>
            <MaterialIcons name={personalFormOpen ? 'expand-less' : 'expand-more'} size={28} color="#2F80ED" />
          </Pressable>

          {personalFormOpen ? (
            <View style={styles.form}>
              <Pressable
                style={[styles.segmentButton, form.isRecurring && styles.segmentButtonActive]}
                onPress={() => setForm((current) => ({ ...current, isRecurring: !current.isRecurring }))}>
                <MaterialIcons name="event-repeat" size={21} color={form.isRecurring ? '#FFFFFF' : '#2F80ED'} />
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
                    <MaterialIcons name="calendar-month" size={21} color="#2F80ED" />
                    <Text style={styles.dateFieldText}>{new Date(`${form.date}T12:00:00`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</Text>
                    <MaterialIcons name={datePickerOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={24} color="#475467" />
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
                    <MaterialIcons name="person-add" size={20} color="#2F80ED" />
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
                        <MaterialIcons name="close" size={16} color="#0E6F63" />
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>

              {message ? <Text style={styles.success}>{message}</Text> : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Pressable style={styles.button} onPress={addLesson}>
                <MaterialIcons name="add" size={22} color="#FFFFFF" />
                <Text style={styles.buttonText}>Persoenlichen Planeintrag speichern</Text>
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
  kicker: { color: '#2F80ED', fontSize: 14, fontWeight: '800', marginBottom: 6, textTransform: 'uppercase' },
  title: { color: '#101828', fontSize: 28, fontWeight: '800', lineHeight: 34 },
  subtitle: { color: '#667085', fontSize: 15, lineHeight: 22, marginBottom: 14, marginTop: 8 },
  importPanel: { backgroundColor: '#FFFFFF', borderColor: '#E4E7EC', borderRadius: 8, borderWidth: 1, gap: 10, marginBottom: 18, padding: 14 },
  comboBox: { flex: 1, position: 'relative', zIndex: 2 },
  comboTitle: { color: '#344054', fontSize: 13, fontWeight: '800', marginBottom: 6 },
  comboButton: { alignItems: 'center', backgroundColor: '#F9FAFB', borderColor: '#D0D5DD', borderRadius: 8, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 46, paddingHorizontal: 12 },
  comboLabel: { color: '#101828', flex: 1, fontSize: 14, fontWeight: '800' },
  comboMenu: { backgroundColor: '#FFFFFF', borderColor: '#D0D5DD', borderRadius: 8, borderWidth: 1, marginTop: 6, maxHeight: 220, overflow: 'scroll' },
  comboOption: { justifyContent: 'center', minHeight: 42, paddingHorizontal: 12 },
  comboOptionText: { color: '#475467', fontSize: 13, fontWeight: '700' },
  disabled: { opacity: 0.55 },
  importButton: { alignItems: 'center', backgroundColor: '#2F80ED', borderRadius: 8, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 48 },
  importButtonDisabled: { backgroundColor: '#98A2B3' },
  importButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  weekNav: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  navButton: { alignItems: 'center', backgroundColor: '#EEF4FF', borderRadius: 8, height: 44, justifyContent: 'center', width: 44 },
  weekTitle: { color: '#101828', fontSize: 18, fontWeight: '800' },
  form: { backgroundColor: '#FFFFFF', borderColor: '#E4E7EC', borderRadius: 8, borderWidth: 1, gap: 10, marginBottom: 22, padding: 14 },
  input: { backgroundColor: '#F9FAFB', borderColor: '#D0D5DD', borderRadius: 8, borderWidth: 1, color: '#101828', fontSize: 15, minHeight: 46, paddingHorizontal: 12 },
  descriptionInput: { minHeight: 88, paddingTop: 12, textAlignVertical: 'top' },
  button: { alignItems: 'center', backgroundColor: '#2F80ED', borderRadius: 8, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 48 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  success: { color: '#047857', fontSize: 13, fontWeight: '800' },
  error: { color: '#B42318', fontSize: 13, fontWeight: '700' },
  weekGrid: { gap: 12, marginBottom: 18 },
  dayColumn: { backgroundColor: '#FFFFFF', borderColor: '#E4E7EC', borderRadius: 8, borderWidth: 1, padding: 12 },
  dayTitle: { color: '#101828', fontSize: 18, fontWeight: '800' },
  dayDate: { color: '#667085', fontSize: 13, fontWeight: '700', marginBottom: 10, marginTop: 2 },
  empty: { color: '#98A2B3', fontSize: 13, lineHeight: 19 },
  lessonCard: { backgroundColor: '#F9FAFB', borderColor: '#EAECF0', borderRadius: 8, borderWidth: 1, marginTop: 8, padding: 10 },
  lessonTime: { color: '#1D4ED8', fontSize: 12, fontWeight: '800' },
  lessonHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: 8, justifyContent: 'space-between', marginTop: 5 },
  lessonTitle: { color: '#101828', flex: 1, fontSize: 15, fontWeight: '800' },
  personalBadge: { color: '#047857', fontSize: 11, fontWeight: '800' },
  lessonMeta: { color: '#667085', fontSize: 12, lineHeight: 18, marginTop: 4 },
  lessonDescription: { color: '#475467', fontSize: 12, lineHeight: 18, marginTop: 6 },
  personalPanel: { marginTop: 4 },
  personalHeader: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E4E7EC', borderRadius: 8, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, padding: 14 },
  sectionTitle: { color: '#101828', fontSize: 17, fontWeight: '800' },
  panelHint: { color: '#667085', fontSize: 13, lineHeight: 19, marginTop: 3, paddingRight: 8 },
  segmentButton: { alignItems: 'center', backgroundColor: '#EEF4FF', borderColor: '#B2CCFF', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 46 },
  segmentButtonActive: { backgroundColor: '#2F80ED', borderColor: '#2F80ED' },
  segmentButtonText: { color: '#2F80ED', fontSize: 14, fontWeight: '800' },
  segmentButtonTextActive: { color: '#FFFFFF' },
  dateField: { alignItems: 'center', backgroundColor: '#F9FAFB', borderColor: '#D0D5DD', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 9, minHeight: 46, paddingHorizontal: 12 },
  dateFieldText: { color: '#101828', flex: 1, fontSize: 14, fontWeight: '800' },
  datePicker: { backgroundColor: '#F9FAFB', borderColor: '#D0D5DD', borderRadius: 8, borderWidth: 1, padding: 10 },
  datePickerHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  datePickerTitle: { color: '#101828', fontSize: 14, fontWeight: '800' },
  smallIconButton: { alignItems: 'center', backgroundColor: '#EEF4FF', borderRadius: 8, height: 34, justifyContent: 'center', width: 34 },
  dateGrid: { flexDirection: 'row', gap: 6 },
  dateChip: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#EAECF0', borderRadius: 8, borderWidth: 1, flex: 1, minHeight: 58, justifyContent: 'center' },
  dateChipActive: { backgroundColor: '#2F80ED', borderColor: '#2F80ED' },
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
  inviteeChipText: { color: '#0E6F63', fontSize: 12, fontWeight: '800' },
});
