import type { Todo } from './types';

export const emptyNoteForm = { category: 'Notiz', content: '', title: '' };

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString('de-DE', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function isTodoDone(todo: Todo) {
  return Boolean(todo.completedAt);
}
