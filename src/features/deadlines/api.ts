import { apiFetch, apiJson } from '@/src/shared/api/client';
import type { StudyInfo, Todo } from './types';

type AuthParams = {
  token: string;
};

export async function fetchTodos({ token }: AuthParams) {
  return apiJson<Todo[]>('/api/todos', { token });
}

export async function createTodo({ token }: AuthParams, body: { description: string; subtasks: string[]; title: string }) {
  return apiFetch('/api/todos', {
    body,
    method: 'POST',
    token,
  });
}

export async function completeTodoRequest({ token }: AuthParams, todoId: number) {
  return apiFetch(`/api/todos/${todoId}/complete`, {
    method: 'POST',
    token,
  });
}

export async function toggleSubtaskRequest({ token }: AuthParams, todoId: number, subtaskId: number) {
  return apiFetch(`/api/todos/${todoId}/subtasks/${subtaskId}/toggle`, {
    method: 'POST',
    token,
  });
}

export async function fetchStudyInfo(token?: string | null) {
  return apiJson<{ spo: StudyInfo[] }>('/api/study-info', { token });
}

export async function createStudyInfo({ token }: AuthParams, body: Record<string, unknown>) {
  return apiFetch('/api/study-info', {
    body,
    method: 'POST',
    token,
  });
}
