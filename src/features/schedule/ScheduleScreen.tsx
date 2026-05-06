import { useCallback, useEffect, useMemo, useState } from 'react';

import { getBackendUrl } from '@/constants/api';
import { useAuth } from '@/contexts/auth-context';
import { useSync } from '@/contexts/sync-context';
import { encryptPayloadForPublicKeys, publicKeyJsonsFromValue } from '@/lib/client-crypto';
import { dayNames, dayOptions, startOfMonth, startOfWeek, timeOptions, toInputDate } from '@/src/shared/utils/dates';
import { createLesson, deleteLesson, fetchAccountStats, fetchImportCourses, fetchImportOptions, fetchInvitations, fetchMeals, fetchScheduleDays, importCourseRequest, importScheduleRequest, respondToInvitationRequest, searchUsers, setLessonVisited, setModulePreference, updateLesson } from './api';
import { createEncryptedLessonBody, decryptInvitations, decryptScheduleDays } from './crypto';
import type { AccountStats, CourseOption, FacultyOption, ImportOptions, Invitation, Lesson, LessonForm, Meal, Option, ParsedGroup, ScheduleDay, UserOption } from './types';
import { createEmptyForm, parseGroup, uniqueOptions } from './utils';
import { ScheduleView } from './ScheduleView';
import type { ScheduleViewModel } from './view-model';

export function ScheduleScreen() {
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
    const nextOptions = await fetchImportOptions(backendUrl);
    if (nextOptions) {
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

    const nextOptions = await fetchImportOptions(backendUrl, { facultyId: nextFaculty.id, semesterId: nextSemester.id });
    if (nextOptions) {
      setOptions((current) => ({ ...current, groups: nextOptions.groups }));
      setAcademicSemester(null);
      setSpecialization(null);
    }
  }, [backendUrl]);

  const loadSchedule = useCallback(async () => {
    const body = await fetchScheduleDays({ backendUrl, token }, toInputDate(weekStart));
    if (body) {
      setSchedule(await decryptScheduleDays(body.days, user?.email));
    }
  }, [backendUrl, token, user?.email, weekStart]);

  const loadInvitations = useCallback(async () => {
    if (!token) {
      setInvitations([]);
      return;
    }

    try {
      const data = await fetchInvitations({ backendUrl, token });
      setInvitationError('');
      setInvitations(await decryptInvitations(data, user?.email));
    } catch {
      setInvitationError('Anfragen konnten nicht geladen werden.');
    }
  }, [backendUrl, token, user?.email]);

  const loadMeals = useCallback(async () => {
    const nextMeals = await fetchMeals(backendUrl, toInputDate(weekStart));
    if (nextMeals) {
      setMeals(nextMeals);
    }
  }, [backendUrl, weekStart]);

  const loadAccountStats = useCallback(async () => {
    if (!token) {
      setAccountStats(null);
      return;
    }

    setAccountStats(await fetchAccountStats({ backendUrl, token }));
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

      const users = await searchUsers({ backendUrl, token }, accountQuery);
      if (!cancelled) {
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

    try {
      const result = await fetchImportCourses({ backendUrl, token }, importPayload());
      setCourseOptions(result.courses);
      setImportError('');
    } catch {
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

    let result: { count: number; monthStart?: string };
    try {
      result = await importScheduleRequest({ backendUrl, token }, importPayload());
    } catch {
      setImportError('Stundenplan konnte nicht importiert werden.');
      return;
    }

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

    let result: { count: number; monthStart?: string };
    try {
      result = await importCourseRequest({ backendUrl, token }, {
        ...importPayload(),
        courseTitle: course.title,
      });
    } catch {
      setImportError('Kurs konnte nicht importiert werden.');
      return;
    }

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
      const ownerBody = await createEncryptedLessonBody(form, user ?? {});
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
      const response = await createLesson({ backendUrl, token }, body);

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
      const body = await createEncryptedLessonBody(editForm, user ?? {});
      const response = await updateLesson({ backendUrl, token }, editingLesson.id, body);

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

    const response = await deleteLesson({ backendUrl, token }, editingLesson.id);

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

    const response = await setLessonVisited({ backendUrl, token }, lesson.id, toInputDate(selectedDate));

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

    const response = await setModulePreference({ backendUrl, token }, lesson.moduleKey, lesson.isModuleActive === false);

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

    const response = await respondToInvitationRequest({ backendUrl, token }, id, decision);

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

  const viewModel: ScheduleViewModel = {
    accountQuery,
    accountResults,
    accountStats,
    academicSemester,
    academicSemesters,
    addInvitee,
    addLesson,
    canEditLesson,
    canImport,
    closeLessonDialog,
    courseOptions,
    datePickerOpen,
    deletePersonalLesson,
    editDatePickerOpen,
    editForm,
    editingLesson,
    faculty,
    form,
    formError,
    formMessage,
    importCourse,
    importError,
    importMessage,
    importMode,
    importPanelOpen,
    importSchedule,
    invitations,
    invitationError,
    invitees,
    isCourseLoading,
    loadImportCourses,
    options,
    pendingLessonAction,
    personalFormOpen,
    requestsOpen,
    respondToInvitation,
    selectedDate,
    selectDate,
    selectedDay,
    selectedDayOption,
    selectedEndTime,
    selectedIsToday,
    selectedLessons,
    selectedMeals,
    selectedStartTime,
    semester,
    setAcademicSemester,
    setAccountQuery,
    setDatePickerOpen,
    setEditDatePickerOpen,
    setEditForm,
    setEditingLesson,
    setFaculty,
    setForm,
    setImportError,
    setImportMessage,
    setImportMode,
    setImportPanelOpen,
    setInvitees,
    setPendingLessonAction,
    setPersonalFormOpen,
    setRequestsOpen,
    setSemester,
    setSpecialization,
    specialization,
    specializations,
    startEditingLesson,
    toggleLessonVisit,
    toggleModuleActive,
    updatePersonalLesson,
  };

  return <ScheduleView controller={viewModel} />;
}
