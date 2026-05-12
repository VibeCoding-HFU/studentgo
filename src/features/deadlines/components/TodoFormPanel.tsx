import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useThemedStyles } from '@/hooks/use-themed-styles';
import { baseStyles } from '../styles';

type TodoFormPanelProps = {
  description: string;
  formOpen: boolean;
  onAddTodo: () => void;
  onDescriptionChange: (value: string) => void;
  onSubtaskDraftsChange: (updater: (current: string[]) => string[]) => void;
  onTitleChange: (value: string) => void;
  onToggleOpen: () => void;
  subtaskDrafts: string[];
  title: string;
};

export function TodoFormPanel({
  description,
  formOpen,
  onAddTodo,
  onDescriptionChange,
  onSubtaskDraftsChange,
  onTitleChange,
  onToggleOpen,
  subtaskDrafts,
  title,
}: TodoFormPanelProps) {
  const styles = useThemedStyles(baseStyles);

  return (
    <View style={styles.addPanel}>
      <Pressable style={styles.addHeader} onPress={onToggleOpen}>
        <View style={styles.headerTextBlock}>
          <Text style={styles.addTitle}>To-Do hinzufuegen</Text>
          <Text style={styles.addHint}>Name, Beschreibung und beliebig viele Unteraufgaben erfassen.</Text>
        </View>
        <MaterialIcons name={formOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={28} color="#00684F" style={styles.chevronIcon} />
      </Pressable>

      {formOpen ? (
        <View style={styles.form}>
          <TextInput placeholder="Name des To-Dos" placeholderTextColor="#98A2B3" style={styles.input} value={title} onChangeText={onTitleChange} />
          <TextInput multiline placeholder="Beschreibung" placeholderTextColor="#98A2B3" style={[styles.input, styles.textArea]} value={description} onChangeText={onDescriptionChange} />
          <Text style={styles.fieldLabel}>Unteraufgaben</Text>
          {subtaskDrafts.map((draft, index) => (
            <View key={index} style={styles.subtaskInputRow}>
              <TextInput
                placeholder={`Unteraufgabe ${index + 1}`}
                placeholderTextColor="#98A2B3"
                style={[styles.input, styles.subtaskInput]}
                value={draft}
                onChangeText={(value) => onSubtaskDraftsChange((current) => current.map((item, itemIndex) => itemIndex === index ? value : item))}
              />
              <Pressable
                disabled={subtaskDrafts.length === 1}
                style={[styles.removeButton, subtaskDrafts.length === 1 && styles.removeButtonDisabled]}
                onPress={() => onSubtaskDraftsChange((current) => current.filter((_item, itemIndex) => itemIndex !== index))}>
                <MaterialIcons name="remove" size={22} color="#B42318" />
              </Pressable>
            </View>
          ))}
          <Pressable style={styles.secondaryButton} onPress={() => onSubtaskDraftsChange((current) => [...current, ''])}>
            <MaterialIcons name="add" size={21} color="#00684F" />
            <Text style={styles.secondaryButtonText}>Unteraufgabe</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={onAddTodo}>
            <MaterialIcons name="add-task" size={22} color="#FFFFFF" />
            <Text style={styles.buttonText}>To-Do speichern</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
