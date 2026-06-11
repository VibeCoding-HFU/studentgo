import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ModuleHeader } from '@/components/module-header';
import { SwipeableTabView } from '@/components/swipeable-tab-view';
import { SyncStatusBadge } from '@/components/sync-status-badge';
import { getBackendUrl } from '@/constants/api';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useAuth } from '@/contexts/auth-context';
import { useSync } from '@/contexts/sync-context';
import { decryptPayloadWithPrivateKeys, encryptPayloadForPublicKeys, getPrivateKeys, publicKeyJsonsFromValue } from '@/lib/client-crypto';
import { completeTodoRequest, createStudyInfo, createTodo, fetchStudyInfo, fetchTodos, toggleSubtaskRequest } from './api';
import { TodoFormPanel } from './components/TodoFormPanel';
import { baseStyles } from './styles';
import type { StudyInfo, Todo } from './types';
import { emptyNoteForm, formatDateTime, isTodoDone } from './utils';

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

    try {
      setTodos((await fetchTodos({ token })).map((todo) => ({ ...todo, syncState: 'synced' })));
      setError('');
    } catch {
      setError('To-Dos konnten nicht geladen werden.');
    }
  }, [token]);

  const loadNotes = useCallback(async () => {
    let data: { spo: StudyInfo[] };

    try {
      data = await fetchStudyInfo(token);
    } catch {
      setNoteError('Notizen konnten nicht geladen werden.');
      return;
    }

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
  }, [token, user?.email]);

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
      const response = await createTodo({ token }, body);

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

    const response = await createStudyInfo({ token }, {
        ...noteForm,
        ...encrypted,
        content: 'Verschluesselte Notiz',
        title: 'Verschluesselte Notiz',
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

    const response = await completeTodoRequest({ token }, todoId);

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

    const response = await toggleSubtaskRequest({ token }, todoId, subtaskId);

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
          <ModuleHeader
            accent="#1D4ED8"
            icon="checklist"
            kicker="To-Do"
            title="Aufgaben"
            subtitle="Notizen und offene To-Dos an einem Ort verwalten."
          >
            <SyncStatusBadge />
          </ModuleHeader>
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

        <TodoFormPanel
          description={description}
          formOpen={formOpen}
          onAddTodo={addTodo}
          onDescriptionChange={setDescription}
          onSubtaskDraftsChange={setSubtaskDrafts}
          onTitleChange={setTitle}
          onToggleOpen={() => setFormOpen((current) => !current)}
          subtaskDrafts={subtaskDrafts}
          title={title}
        />
        </ScrollView>
      </SwipeableTabView>
    </SafeAreaView>
  );
}
