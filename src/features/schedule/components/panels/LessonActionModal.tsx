import { Modal, Pressable, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/use-themed-styles';
import { baseStyles } from '../../styles';
import type { ScheduleViewModel } from '../../view-model';

export function LessonActionModal({ model }: { model: ScheduleViewModel }) {
  const styles = useThemedStyles(baseStyles);
  const {
    closeLessonDialog,
    deletePersonalLesson,
    editingLesson,
    pendingLessonAction,
    removeImportedCourse,
    updatePersonalLesson,
  } = model;
  const isDelete = pendingLessonAction === 'delete';
  const isRemoveImport = pendingLessonAction === 'remove-import';

  async function confirmAction() {
    if (isDelete) {
      await deletePersonalLesson();
      return;
    }

    if (isRemoveImport && editingLesson) {
      await removeImportedCourse(editingLesson);
      closeLessonDialog();
      return;
    }

    await updatePersonalLesson();
  }

  return (
    <Modal transparent animationType="fade" visible={Boolean(pendingLessonAction)} onRequestClose={closeLessonDialog}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>
            {isDelete ? 'Termin loeschen?' : isRemoveImport ? 'Kurs aus Plan entfernen?' : 'Aenderungen speichern?'}
          </Text>
          <Text style={styles.modalText}>
            {isDelete
              ? 'Dieser persoenliche Termin wird endgueltig geloescht. Du kannst den Vorgang noch abbrechen.'
              : isRemoveImport
                ? 'Alle Termine dieses importierten Kurses im aktuellen Monat werden aus deinem Plan entfernt. Du kannst den Kurs spaeter wieder importieren.'
                : 'Die Bearbeitung wird endgueltig auf diesen persoenlichen Termin angewendet. Du kannst den Vorgang noch abbrechen.'}
          </Text>
          <View style={styles.modalActions}>
            <Pressable style={styles.modalCancelButton} onPress={closeLessonDialog}>
              <Text style={styles.cancelButtonText}>Abbrechen</Text>
            </Pressable>
            <Pressable
              style={[styles.modalConfirmButton, (isDelete || isRemoveImport) && styles.modalDangerButton]}
              onPress={confirmAction}>
              <Text style={styles.modalConfirmText}>Bestaetigen</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
