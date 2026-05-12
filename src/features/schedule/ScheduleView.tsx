import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SwipeableTabView } from '@/components/swipeable-tab-view';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { dayNames, dayOptions, timeOptions } from '@/src/shared/utils/dates';
import { ComboBox } from './components/ComboBox';
import { WeekDatePicker } from './components/WeekDatePicker';
import { baseStyles } from './styles';
import type { ScheduleViewModel } from './view-model';
import { LessonActionModal } from './components/panels/LessonActionModal';
import { TodayOverviewPanel } from './components/panels/TodayOverviewPanel';
import { formatInvitationDate, invitationStatusLabel } from './utils';

type ScheduleViewProps = {
  controller: ScheduleViewModel;
};

export function ScheduleView({ controller }: ScheduleViewProps) {
  const styles = useThemedStyles(baseStyles);
  const {
    accountQuery,
    accountResults,
    academicSemester,
    academicSemesters,
    addInvitee,
    addLesson,
    canImport,
    courseOptions,
    datePickerOpen,
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
    selectedDayOption,
    selectedEndTime,
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
  } = controller;

  return (
    <SafeAreaView style={styles.safeArea}>
      <SwipeableTabView>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <TodayOverviewPanel model={controller} />

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
                    <WeekDatePicker value={editForm.date} onChange={(date: string) => {
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
                    <WeekDatePicker value={form.date} onChange={(date: string) => {
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
      <LessonActionModal model={controller} />
    </SafeAreaView>
  );
}
