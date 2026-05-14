import { Express } from "express";
import { objectPayload } from "../../shared/validation";
import { requireSessionValue } from "../auth/auth.service";
import { completeTodo, createTodo, listTodos, toggleSubtask } from "./todos.service";

export function registerTodoRoutes(app: Express) {
  app.get("/api/todos", async (request, response) => {
    const session = await requireSessionValue(request);
    response.json(await listTodos(session.userId));
  });

  app.post("/api/todos", async (request, response) => {
    const session = await requireSessionValue(request);
    response.status(201).json(await createTodo(session.userId, objectPayload(request.body)));
  });

  app.post("/api/todos/:id/complete", async (request, response) => {
    const session = await requireSessionValue(request);
    response.json(await completeTodo(session.userId, request.params.id));
  });

  app.post("/api/todos/:todoId/subtasks/:subtaskId/toggle", async (request, response) => {
    const session = await requireSessionValue(request);
    response.json(await toggleSubtask(session.userId, request.params.todoId, request.params.subtaskId));
  });
}
