import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SwipeableTabView } from '@/components/swipeable-tab-view';
import { SyncStatusBadge } from '@/components/sync-status-badge';
import { getBackendUrl } from '@/constants/api';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useAuth } from '@/contexts/auth-context';
import { useSync } from '@/contexts/sync-context';
import { decryptPayloadWithPrivateKeys, encryptPayloadForPublicKeys, getPrivateKeys, publicKeyJsonsFromValue } from '@/lib/client-crypto';

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
  syncState?: 'pending' | 'synced';
};

type StudyInfo = {
  category: string;
  content: string;
  encryptedKey?: string | null;
  encryptedPayload?: string | null;
  encryptionIv?: string | null;
  id: number;
  ownerId?: number | null;
  title: string;
};

const emptyNoteForm = { category: 'Notiz', content: '', title: '' };

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
  const styles = useThemedStyles(baseStyles);
  const { token, user } = useAuth();
  const { enqueueCreate, pendingItems, syncVersion } = useSync();
  const backendUrl = useMemo(() => getBackendUrl(), []);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [notes, setNotes] = useState<StudyInfo[]>([]);
  const [notesOpen, setNotesOpen] = useState(false);
  const [noteFormOpen, setNoteFormOpen] = useState(false);
  const [noteForm, setNoteForm] = useState(emptyNoteForm);
  const [noteError, setNoteError] = useState('');
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

    setTodos(((await response.json()) as Todo[]).map((todo) => ({ ...todo, syncState: 'synced' })));
  }, [backendUrl, token]);

  const loadNotes = useCallback(async () => {
    const response = await fetch(`${backendUrl}/api/study-info`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (!response.ok) {
      setNoteError('Notizen konnten nicht geladen werden.');
      return;
    }

    const data = (await response.json()) as { spo: StudyInfo[] };
    const privateKeys = user?.email ? await getPrivateKeys(user.email) : [];
    const decryptedNotes = await Promise.all(data.spo.map(async (item) => {
      if (privateKeys.length === 0 || !item.encryptedPayload || !item.encryptedKey || !item.encryptionIv) {
        return item;
      }

      try {
        const decrypted = await decryptPayloadWithPrivateKeys<{ content?: string; title?: string }>(privateKeys, {
          encryptedKey: item.encryptedKey,
          encryptedPayload: item.encryptedPayload,
          encryptionIv: item.encryptionIv,
        });
        return {
          ...item,
          content: decrypted.content ?? item.content,
          title: decrypted.title ?? item.title,
        };
      } catch {
        return {
          ...item,
          content: 'Private Key fehlt oder passt nicht zu dieser Notiz.',
          title: 'Verschluesselte Notiz',
        };
      }
    }));

    setNoteError('');
    setNotes(decryptedNotes);
  }, [backendUrl, token, user?.email]);

  useEffect(() => {
    loadTodos();
  }, [loadTodos, syncVersion]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

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

    const body = {
      description,
      subtasks,
      title: cleanTitle,
    };
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      const response = await fetch(`${backendUrl}/api/todos`, {
        body: JSON.stringify(body),
        headers,
        method: 'POST',
      });

      if (!response.ok) {
        setError('To-Do konnte nicht gespeichert werden.');
        return;
      }
    } catch {
      const createdAt = new Date().toISOString();
      const localTodo: Todo = {
        completedAt: null,
        createdAt,
        description,
        id: -Date.now(),
        subtasks: subtasks.map((subtask, index) => ({
          completedAt: null,
          createdAt,
          id: -(Date.now() + index + 1),
          title: subtask,
        })),
        syncState: 'pending',
        title: cleanTitle,
      };

      await enqueueCreate({
        body: JSON.stringify(body),
        headers: Object.entries(headers),
        kind: 'todo',
        localData: localTodo,
        url: `${backendUrl}/api/todos`,
      });
      setTodos((current) => [localTodo, ...current]);
    }

    setError('');
    setTitle('');
    setDescription('');
    setSubtaskDrafts(['']);
    setFormOpen(false);
    await loadTodos().catch(() => undefined);
  }

  async function addNote() {
    setNoteError('');

    if (!token) {
      setNoteError('Melde dich an, um Notizen zu speichern.');
      return;
    }

    if (!noteForm.title.trim() || !noteForm.content.trim()) {
      setNoteError('Titel und Inhalt sind erforderlich.');
      return;
    }

    const publicKeys = publicKeyJsonsFromValue(user?.publicKeyJson);

    if (publicKeys.length === 0) {
      setNoteError('Dein Account hat noch keinen Public Key.');
      return;
    }

    const encrypted = await encryptPayloadForPublicKeys(publicKeys, {
      content: noteForm.content,
      title: noteForm.title,
    });

    const response = await fetch(`${backendUrl}/api/study-info`, {
      body: JSON.stringify({
        ...noteForm,
        ...encrypted,
        content: 'Verschluesselte Notiz',
        title: 'Verschluesselte Notiz',
      }),
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    if (!response.ok) {
      setNoteError('Notiz konnte nicht gespeichert werden.');
      return;
    }

    setNoteForm(emptyNoteForm);
    setNoteFormOpen(false);
    await loadNotes();
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
      <SwipeableTabView>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>To-Do</Text>
          <Text style={styles.title}>Aufgaben</Text>
          <Text style={styles.subtitle}>Notizen und offene To-Dos an einem Ort verwalten.</Text>
          <SyncStatusBadge />
        </View>

        <View style={styles.notesPanel}>
          <Pressable style={styles.addHeader} onPress={() => setNotesOpen((current) => !current)}>
            <View style={styles.headerTextBlock}>
              <Text style={styles.addTitle}>Notizen</Text>
              <Text style={styles.addHint}>{notes.length ? `${notes.length} gespeicherte Notiz${notes.length === 1 ? '' : 'en'}` : 'Notizen oberhalb der To-Dos aufklappen.'}</Text>
            </View>
            <MaterialIcons name={notesOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={28} color="#00684F" style={styles.chevronIcon} />
          </Pressable>

          {notesOpen ? (
            <View style={styles.notesContent}>
              {noteError ? <Text style={styles.error}>{noteError}</Text> : null}
              {notes.length === 0 ? <Text style={styles.empty}>Keine Notizen vorhanden.</Text> : null}
              {notes.map((note) => (
                <View key={note.id} style={styles.noteCard}>
                  <View style={styles.noteCardHeader}>
                    <Text style={styles.noteCategory}>{note.category}</Text>
                    {note.ownerId === user?.id ? <Text style={styles.noteBadge}>Persoenlich</Text> : null}
                  </View>
                  <Text style={styles.noteTitle}>{note.title}</Text>
                  <Text style={styles.noteText}>{note.content}</Text>
                </View>
              ))}

              <Pressable style={styles.secondaryButton} onPress={() => setNoteFormOpen((current) => !current)}>
                <MaterialIcons name={noteFormOpen ? 'keyboard-arrow-up' : 'add'} size={21} color="#00684F" style={styles.chevronIconSmall} />
                <Text style={styles.secondaryButtonText}>Notiz hinzufuegen</Text>
              </Pressable>

              {noteFormOpen ? (
                <View style={styles.form}>
                  <TextInput placeholder="Kategorie" placeholderTextColor="#98A2B3" style={styles.input} value={noteForm.category} onChangeText={(category) => setNoteForm((current) => ({ ...current, category }))} />
                  <TextInput placeholder="Titel" placeholderTextColor="#98A2B3" style={styles.input} value={noteForm.title} onChangeText={(nextTitle) => setNoteForm((current) => ({ ...current, title: nextTitle }))} />
                  <TextInput multiline placeholder="Inhalt" placeholderTextColor="#98A2B3" style={[styles.input, styles.textArea]} value={noteForm.content} onChangeText={(content) => setNoteForm((current) => ({ ...current, content }))} />
                  <Pressable style={styles.button} onPress={addNote}>
                    <MaterialIcons name="note-add" size={22} color="#FFFFFF" />
                    <Text style={styles.buttonText}>Notiz speichern</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Offene To-Dos</Text>
          <Text style={styles.sectionCount}>{openTodos.length}</Text>
        </View>

        <View style={styles.todoList}>
          {openTodos.length === 0 ? <Text style={styles.empty}>Keine offenen To-Dos vorhanden.</Text> : null}
          {[...pendingItems.filter((item) => item.kind === 'todo').map((item) => item.localData as Todo), ...openTodos]
            .filter((todo, index, allTodos) => allTodos.findIndex((candidate) => candidate.id === todo.id) === index)
            .map((todo) => (
            <View key={todo.id} style={styles.todoCard}>
              <View style={styles.todoTopRow}>
                <View style={[styles.syncDot, todo.syncState === 'pending' ? styles.syncDotPending : styles.syncDotDone]} />
                <Pressable disabled={todo.syncState === 'pending'} style={[styles.checkbox, todo.syncState === 'pending' && styles.disabledAction]} onPress={() => completeTodo(todo.id)}>
                  <MaterialIcons name="check" size={18} color="#FFFFFF" />
                </Pressable>
                <Pressable style={styles.todoTitleBlock} onPress={() => toggleExpanded(todo.id)}>
                  <Text style={styles.todoTitle}>{todo.title}</Text>
                  <Text style={styles.todoMeta}>Erstellt: {formatDateTime(todo.createdAt)}</Text>
                </Pressable>
                <Pressable style={styles.expandButton} onPress={() => toggleExpanded(todo.id)}>
                  <MaterialIcons name={expandedIds.has(todo.id) ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={26} color="#00684F" style={styles.chevronIcon} />
                </Pressable>
              </View>

              {expandedIds.has(todo.id) ? (
                <View style={styles.todoDetails}>
                  {todo.description ? <Text style={styles.todoDescription}>{todo.description}</Text> : null}
                  {todo.subtasks.length === 0 ? <Text style={styles.empty}>Keine Unteraufgaben.</Text> : null}
                  {todo.subtasks.map((subtask) => (
                    <Pressable disabled={todo.syncState === 'pending'} key={subtask.id} style={[styles.subtaskRow, todo.syncState === 'pending' && styles.disabledAction]} onPress={() => toggleSubtask(todo.id, subtask.id)}>
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
                <View style={[styles.syncDot, styles.syncDotDone]} />
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
            <View style={styles.headerTextBlock}>
              <Text style={styles.addTitle}>To-Do hinzufuegen</Text>
              <Text style={styles.addHint}>Name, Beschreibung und beliebig viele Unteraufgaben erfassen.</Text>
            </View>
            <MaterialIcons name={formOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={28} color="#00684F" style={styles.chevronIcon} />
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
                <MaterialIcons name="add" size={21} color="#00684F" />
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
      </SwipeableTabView>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F7FB' },
  container: { padding: 20, paddingBottom: 36 },
  header: { marginBottom: 20 },
  kicker: { color: '#B54708', fontSize: 14, fontWeight: '800', marginBottom: 6, textTransform: 'uppercase' },
  title: { color: '#101828', fontSize: 28, fontWeight: '800', lineHeight: 34 },
  subtitle: { color: '#667085', fontSize: 15, lineHeight: 22, marginTop: 8 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { color: '#101828', fontSize: 20, fontWeight: '800' },
  sectionCount: { color: '#00684F', fontSize: 15, fontWeight: '800' },
  error: { color: '#B42318', fontSize: 13, fontWeight: '800', marginBottom: 12 },
  todoList: { gap: 10 },
  empty: { color: '#667085', fontSize: 14, lineHeight: 20 },
  todoCard: { backgroundColor: '#FFFFFF', borderColor: '#E4E7EC', borderRadius: 8, borderWidth: 1, padding: 14 },
  todoTopRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  checkbox: { alignItems: 'center', backgroundColor: '#D0D5DD', borderRadius: 8, height: 32, justifyContent: 'center', width: 32 },
  disabledAction: { opacity: 0.5 },
  syncDot: { borderRadius: 5, height: 10, marginTop: 3, width: 10 },
  syncDotDone: { backgroundColor: '#12B76A' },
  syncDotPending: { backgroundColor: '#D92D20' },
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
  notesPanel: { marginBottom: 18 },
  notesContent: { backgroundColor: '#FFFFFF', borderColor: '#E4E7EC', borderRadius: 8, borderWidth: 1, gap: 10, padding: 12 },
  noteCard: { backgroundColor: '#F9FAFB', borderColor: '#EAECF0', borderRadius: 8, borderWidth: 1, padding: 12 },
  noteCardHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  noteCategory: { color: '#00684F', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  noteBadge: { color: '#047857', fontSize: 12, fontWeight: '800' },
  noteTitle: { color: '#101828', fontSize: 16, fontWeight: '800', marginTop: 7 },
  noteText: { color: '#344054', fontSize: 14, lineHeight: 20, marginTop: 5 },
  addPanel: { marginTop: 18 },
  addHeader: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E4E7EC', borderRadius: 8, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, padding: 14 },
  headerTextBlock: { flex: 1, paddingRight: 10 },
  chevronIcon: { flexShrink: 0, textAlign: 'center', width: 28 },
  chevronIconSmall: { flexShrink: 0, textAlign: 'center', width: 22 },
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
  secondaryButton: { alignItems: 'center', backgroundColor: '#E7F4EF', borderColor: '#93D3BA', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 7, justifyContent: 'center', minHeight: 44 },
  secondaryButtonText: { color: '#00684F', fontSize: 14, fontWeight: '800' },
  button: { alignItems: 'center', backgroundColor: '#00684F', borderRadius: 8, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 48 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
