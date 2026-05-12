import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { SyncStatusBadge } from '@/components/sync-status-badge';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { addDays } from '@/src/shared/utils/dates';
import { baseStyles } from '../../styles';
import { mealLabel, mealTitle } from '../../utils';
import type { ScheduleViewModel } from '../../view-model';

function RemoveFromPlanIcon({ color }: { color: string }) {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Path d="M9 4h6M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
    </Svg>
  );
}

export function TodayOverviewPanel({ model }: { model: ScheduleViewModel }) {
  const styles = useThemedStyles(baseStyles);
  const {
    accountStats,
    canEditLesson,
    selectedDate,
    importError,
    importMessage,
    selectDate,
    selectedDay,
    selectedIsToday,
    selectedLessons,
    selectedMeals,
    setEditingLesson,
    setPendingLessonAction,
    startEditingLesson,
    toggleLessonVisit,
    toggleModuleActive,
  } = model;

  return (
    <>
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
      {importMessage ? <Text style={styles.success}>{importMessage}</Text> : null}
      {importError ? <Text style={styles.error}>{importError}</Text> : null}

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
              {lesson.source === 'STARPLAN' && lesson.syncState !== 'pending' ? (
                <Pressable
                  accessibilityLabel={`${lesson.title} aus dem Plan entfernen`}
                  hitSlop={8}
                  style={styles.lessonRemoveIconButton}
                  onPress={() => {
                    setEditingLesson(lesson);
                    setPendingLessonAction('remove-import');
                  }}>
                  <RemoveFromPlanIcon color="#B42318" />
                </Pressable>
              ) : null}
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
    </>
  );
}
