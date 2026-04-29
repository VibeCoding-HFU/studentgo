import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getBackendUrl } from '@/constants/api';
import { useAuth } from '@/contexts/auth-context';

type Subtask = {
  completedAt: string | null;
  createdAt: string;
  id: number;
  title: string;
};

type Todo = {
  completedAt: string | null;
  createdAt: string;
  description?: string | null;
  id: number;
  title: string;
  subtasks: Subtask[];
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('de-DE', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function isTodoDone(todo: Todo) {
  return Boolean(todo.completedAt);
}

export default function DeadlinesScreen() {
  const { token } = useAuth();
  const backendUrl = useMemo(() => getBackendUrl(), []);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subtaskDrafts, setSubtaskDrafts] = useState(['']);
  const [formOpen, setFormOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState('');

  const loadTodos = useCallback(async () => {
    if (!token) {
      setTodos([]);
      return;
    }

    const response = await fetch(`${backendUrl}/api/todos`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      setError('To-Dos konnten nicht geladen werden.');
      return;
    }

    setTodos((await response.json()) as Todo[]);
  }, [backendUrl, token]);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  const openTodos = useMemo(() => todos.filter((todo) => !isTodoDone(todo)), [todos]);
  const completedTodos = useMemo(
    () => todos.filter(isTodoDone).sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')),
    [todos],
  );

  async function addTodo() {
    const cleanTitle = title.trim();
    setError('');

    if (!token) {
      setError('Melde dich an, um To-Dos zu speichern.');
      return;
    }

    if (!cleanTitle) {
      return;
    }

    const subtasks = subtaskDrafts
      .map((draft) => draft.trim())
      .filter(Boolean);

    const response = await fetch(`${backendUrl}/api/todos`, {
      body: JSON.stringify({
        description,
        subtasks,
        title: cleanTitle,
      }),
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    if (!response.ok) {
      setError('To-Do konnte nicht gespeichert werden.');
      return;
    }

    setTitle('');
    setDescription('');
    setSubtaskDrafts(['']);
    setFormOpen(false);
    await loadTodos();
  }

  async function completeTodo(todoId: number) {
    if (!token) {
      setError('Melde dich an, um To-Dos abzuhaken.');
      return;
    }

    const response = await fetch(`${backendUrl}/api/todos/${todoId}/complete`, {
      headers: { Authorization: `Bearer ${token}` },
      method: 'POST',
    });

    if (!response.ok) {
      setError('To-Do konnte nicht abgehakt werden.');
      return;
    }

    setExpandedIds((current) => {
      const next = new Set(current);
      next.delete(todoId);
      return next;
    });
    await loadTodos();
  }

  async function toggleSubtask(todoId: number, subtaskId: number) {
    if (!token) {
      setError('Melde dich an, um Unteraufgaben abzuhaken.');
      return;
    }

    const response = await fetch(`${backendUrl}/api/todos/${todoId}/subtasks/${subtaskId}/toggle`, {
      headers: { Authorization: `Bearer ${token}` },
      method: 'POST',
    });

    if (!response.ok) {
      setError('Unteraufgabe konnte nicht aktualisiert werden.');
      return;
    }

    await loadTodos();
  }

  function toggleExpanded(todoId: number) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(todoId)) {
        next.delete(todoId);
      } else {
        next.add(todoId);
      }
      return next;
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>To-Do</Text>
          <Text style={styles.title}>Aufgaben</Text>
          <Text style={styles.subtitle}>Offene To-Dos mit Unteraufgaben abhaken und erledigte Aufgaben im Verlauf behalten.</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Offene To-Dos</Text>
          <Text style={styles.sectionCount}>{openTodos.length}</Text>
        </View>

        <View style={styles.todoList}>
          {openTodos.length === 0 ? <Text style={styles.empty}>Keine offenen To-Dos vorhanden.</Text> : null}
          {openTodos.map((todo) => (
            <View key={todo.id} style={styles.todoCard}>
              <View style={styles.todoTopRow}>
                <Pressable style={styles.checkbox} onPress={() => completeTodo(todo.id)}>
                  <MaterialIcons name="check" size={18} color="#FFFFFF" />
                </Pressable>
                <Pressable style={styles.todoTitleBlock} onPress={() => toggleExpanded(todo.id)}>
                  <Text style={styles.todoTitle}>{todo.title}</Text>
                  <Text style={styles.todoMeta}>Erstellt: {formatDateTime(todo.createdAt)}</Text>
                </Pressable>
                <Pressable style={styles.expandButton} onPress={() => toggleExpanded(todo.id)}>
                  <MaterialIcons name={expandedIds.has(todo.id) ? 'expand-less' : 'expand-more'} size={26} color="#2F80ED" />
                </Pressable>
              </View>

              {expandedIds.has(todo.id) ? (
                <View style={styles.todoDetails}>
                  {todo.description ? <Text style={styles.todoDescription}>{todo.description}</Text> : null}
                  {todo.subtasks.length === 0 ? <Text style={styles.empty}>Keine Unteraufgaben.</Text> : null}
                  {todo.subtasks.map((subtask) => (
                    <Pressable key={subtask.id} style={styles.subtaskRow} onPress={() => toggleSubtask(todo.id, subtask.id)}>
                      <View style={[styles.subtaskCheckbox, Boolean(subtask.completedAt) && styles.subtaskCheckboxDone]}>
                        {subtask.completedAt ? <MaterialIcons name="check" size={15} color="#FFFFFF" /> : null}
                      </View>
                      <Text style={[styles.subtaskText, Boolean(subtask.completedAt) && styles.subtaskTextDone]}>{subtask.title}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
        </View>

        <View style={styles.historySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Verlauf</Text>
            <Text style={styles.sectionCount}>{completedTodos.length}</Text>
          </View>
          <View style={styles.todoList}>
            {completedTodos.length === 0 ? <Text style={styles.empty}>Noch keine erledigten To-Dos.</Text> : null}
            {completedTodos.map((todo) => (
              <View key={todo.id} style={styles.historyCard}>
                <Text style={styles.todoTitle}>{todo.title}</Text>
                <Text style={styles.todoMeta}>Erstellt: {formatDateTime(todo.createdAt)}</Text>
                {todo.completedAt ? <Text style={styles.todoMeta}>Erledigt: {formatDateTime(todo.completedAt)}</Text> : null}
                {todo.description ? <Text style={styles.todoDescription}>{todo.description}</Text> : null}
                {todo.subtasks.length > 0 ? (
                  <View style={styles.historySubtasks}>
                    {todo.subtasks.map((subtask) => (
                      <Text key={subtask.id} style={styles.historySubtask}>
                        {subtask.title}{subtask.completedAt ? ` · ${formatDateTime(subtask.completedAt)}` : ''}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.addPanel}>
          <Pressable style={styles.addHeader} onPress={() => setFormOpen((current) => !current)}>
            <View>
              <Text style={styles.addTitle}>To-Do hinzufuegen</Text>
              <Text style={styles.addHint}>Name, Beschreibung und beliebig viele Unteraufgaben erfassen.</Text>
            </View>
            <MaterialIcons name={formOpen ? 'expand-less' : 'expand-more'} size={28} color="#2F80ED" />
          </Pressable>

          {formOpen ? (
            <View style={styles.form}>
              <TextInput placeholder="Name des To-Dos" placeholderTextColor="#98A2B3" style={styles.input} value={title} onChangeText={setTitle} />
              <TextInput
                multiline
                placeholder="Beschreibung"
                placeholderTextColor="#98A2B3"
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
              />
              <Text style={styles.fieldLabel}>Unteraufgaben</Text>
              {subtaskDrafts.map((draft, index) => (
                <View key={index} style={styles.subtaskInputRow}>
                  <TextInput
                    placeholder={`Unteraufgabe ${index + 1}`}
                    placeholderTextColor="#98A2B3"
                    style={[styles.input, styles.subtaskInput]}
                    value={draft}
                    onChangeText={(value) => setSubtaskDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? value : item))}
                  />
                  <Pressable
                    disabled={subtaskDrafts.length === 1}
                    style={[styles.removeButton, subtaskDrafts.length === 1 && styles.removeButtonDisabled]}
                    onPress={() => setSubtaskDrafts((current) => current.filter((_item, itemIndex) => itemIndex !== index))}>
                    <MaterialIcons name="remove" size={22} color="#B42318" />
                  </Pressable>
                </View>
              ))}
              <Pressable style={styles.secondaryButton} onPress={() => setSubtaskDrafts((current) => [...current, ''])}>
                <MaterialIcons name="add" size={21} color="#2F80ED" />
                <Text style={styles.secondaryButtonText}>Unteraufgabe</Text>
              </Pressable>
              <Pressable style={styles.button} onPress={addTodo}>
                <MaterialIcons name="add-task" size={22} color="#FFFFFF" />
                <Text style={styles.buttonText}>To-Do speichern</Text>
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
  kicker: { color: '#B54708', fontSize: 14, fontWeight: '800', marginBottom: 6, textTransform: 'uppercase' },
  title: { color: '#101828', fontSize: 28, fontWeight: '800', lineHeight: 34 },
  subtitle: { color: '#667085', fontSize: 15, lineHeight: 22, marginTop: 8 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { color: '#101828', fontSize: 20, fontWeight: '800' },
  sectionCount: { color: '#2F80ED', fontSize: 15, fontWeight: '800' },
  error: { color: '#B42318', fontSize: 13, fontWeight: '800', marginBottom: 12 },
  todoList: { gap: 10 },
  empty: { color: '#667085', fontSize: 14, lineHeight: 20 },
  todoCard: { backgroundColor: '#FFFFFF', borderColor: '#E4E7EC', borderRadius: 8, borderWidth: 1, padding: 14 },
  todoTopRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  checkbox: { alignItems: 'center', backgroundColor: '#D0D5DD', borderRadius: 8, height: 32, justifyContent: 'center', width: 32 },
  todoTitleBlock: { flex: 1 },
  todoTitle: { color: '#101828', fontSize: 16, fontWeight: '800' },
  todoMeta: { color: '#667085', fontSize: 12, lineHeight: 18, marginTop: 3 },
  expandButton: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
  todoDetails: { borderTopColor: '#EAECF0', borderTopWidth: 1, gap: 8, marginTop: 12, paddingTop: 12 },
  todoDescription: { color: '#475467', fontSize: 13, lineHeight: 19 },
  subtaskRow: { alignItems: 'center', flexDirection: 'row', gap: 9, minHeight: 34 },
  subtaskCheckbox: { alignItems: 'center', borderColor: '#D0D5DD', borderRadius: 7, borderWidth: 1, height: 24, justifyContent: 'center', width: 24 },
  subtaskCheckboxDone: { backgroundColor: '#047857', borderColor: '#047857' },
  subtaskText: { color: '#344054', flex: 1, fontSize: 14, fontWeight: '700' },
  subtaskTextDone: { color: '#98A2B3', textDecorationLine: 'line-through' },
  historySection: { marginTop: 24 },
  historyCard: { backgroundColor: '#FFFFFF', borderColor: '#E4E7EC', borderRadius: 8, borderWidth: 1, padding: 14 },
  historySubtasks: { gap: 4, marginTop: 10 },
  historySubtask: { color: '#667085', fontSize: 12, lineHeight: 18 },
  addPanel: { marginTop: 18 },
  addHeader: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E4E7EC', borderRadius: 8, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, padding: 14 },
  addTitle: { color: '#101828', fontSize: 17, fontWeight: '800' },
  addHint: { color: '#667085', fontSize: 13, lineHeight: 19, marginTop: 3, paddingRight: 8 },
  form: { backgroundColor: '#FFFFFF', borderColor: '#E4E7EC', borderRadius: 8, borderWidth: 1, gap: 10, padding: 14 },
  input: { backgroundColor: '#F9FAFB', borderColor: '#D0D5DD', borderRadius: 8, borderWidth: 1, color: '#101828', fontSize: 15, minHeight: 46, paddingHorizontal: 12, paddingVertical: 10 },
  textArea: { minHeight: 86, textAlignVertical: 'top' },
  fieldLabel: { color: '#344054', fontSize: 13, fontWeight: '800' },
  subtaskInputRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  subtaskInput: { flex: 1 },
  removeButton: { alignItems: 'center', backgroundColor: '#FEF3F2', borderColor: '#FECDCA', borderRadius: 8, borderWidth: 1, height: 46, justifyContent: 'center', width: 46 },
  removeButtonDisabled: { opacity: 0.4 },
  secondaryButton: { alignItems: 'center', backgroundColor: '#EEF4FF', borderColor: '#B2CCFF', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 7, justifyContent: 'center', minHeight: 44 },
  secondaryButtonText: { color: '#2F80ED', fontSize: 14, fontWeight: '800' },
  button: { alignItems: 'center', backgroundColor: '#2F80ED', borderRadius: 8, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 48 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
