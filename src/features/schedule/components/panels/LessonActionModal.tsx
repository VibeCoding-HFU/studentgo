import { Modal, Pressable, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/use-themed-styles';
import { baseStyles } from '../../styles';
import type { ScheduleViewModel } from '../../view-model';

export function LessonActionModal({ model }: { model: ScheduleViewModel }) {
  const styles = useThemedStyles(baseStyles);
  const {
    closeLessonDialog,
    deletePersonalLesson,
    pendingLessonAction,
    updatePersonalLesson,
  } = model;

  return (
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
  );
}
