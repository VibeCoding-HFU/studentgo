import { badRequest, notFound } from "../../shared/http/http-error";
import { numericId } from "../../shared/validation";
import { todoRepository } from "./todos.repository";

function todoCreateData(payload: Record<string, unknown>) {
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const description = typeof payload.description === "string" && payload.description.trim() ? payload.description.trim() : null;
  const subtasks = Array.isArray(payload.subtasks)
    ? payload.subtasks
        .map((subtask: unknown) => (typeof subtask === "string" ? subtask.trim() : ""))
        .filter(Boolean)
    : [];

  if (!title) {
    throw badRequest("Todo title is required.");
  }

  return { description, subtasks, title };
}

export function listTodos(userId: number) {
  return todoRepository.listForOwner(userId);
}

export function createTodo(userId: number, payload: Record<string, unknown>) {
  return todoRepository.createForOwner(userId, todoCreateData(payload));
}

export async function completeTodo(userId: number, todoIdInput: unknown) {
  const todoId = numericId(todoIdInput, "todo id");
  const existingTodo = await todoRepository.findOwnedWithSubtasks(userId, todoId);

  if (!existingTodo) {
    throw notFound("Todo not found.");
  }

  return todoRepository.complete(todoId, new Date());
}

export async function toggleSubtask(userId: number, todoIdInput: unknown, subtaskIdInput: unknown) {
  const todoId = numericId(todoIdInput, "todo id");
  const subtaskId = numericId(subtaskIdInput, "subtask id");
  const todo = await todoRepository.findOwnedWithSubtasks(userId, todoId);

  if (!todo || !todo.subtasks.some((subtask) => subtask.id === subtaskId)) {
    throw notFound("Todo or subtask not found.");
  }

  const currentSubtask = todo.subtasks.find((subtask) => subtask.id === subtaskId);
  const nextCompletedAt = currentSubtask?.completedAt ? null : new Date();

  return todoRepository.toggleSubtaskCompletion(todoId, subtaskId, nextCompletedAt);
}
