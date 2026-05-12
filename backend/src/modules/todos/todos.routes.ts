import { Express } from "express";
import { prisma } from "../../prisma";
import { numericId } from "../../shared/validation";
import { requireSessionValue } from "../auth/auth.service";

export function registerTodoRoutes(app: Express) {
  app.get("/api/todos", async (request, response) => {
    const session = await requireSessionValue(request);

    const todos = await prisma.todo.findMany({
      include: {
        subtasks: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [
        { completedAt: "desc" },
        { createdAt: "desc" },
      ],
      where: { ownerId: session.userId },
    });

    response.json(todos);
  });

  app.post("/api/todos", async (request, response) => {
    const session = await requireSessionValue(request);
    const title = typeof request.body.title === "string" ? request.body.title.trim() : "";
    const description = typeof request.body.description === "string" && request.body.description.trim() ? request.body.description.trim() : null;
    const subtasks = Array.isArray(request.body.subtasks)
      ? request.body.subtasks
          .map((subtask: unknown) => (typeof subtask === "string" ? subtask.trim() : ""))
          .filter(Boolean)
      : [];

    if (!title) {
      response.status(400).json({ error: "Todo title is required." });
      return;
    }

    const todo = await prisma.todo.create({
      data: {
        description,
        ownerId: session.userId,
        subtasks: {
          create: subtasks.map((subtask: string) => ({ title: subtask })),
        },
        title,
      },
      include: {
        subtasks: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    response.status(201).json(todo);
  });

  app.post("/api/todos/:id/complete", async (request, response) => {
    const session = await requireSessionValue(request);
    const id = numericId(request.params.id, "todo id");
    const completedAt = new Date();

    const existingTodo = await prisma.todo.findFirst({ where: { id, ownerId: session.userId } });

    if (!existingTodo) {
      response.status(404).json({ error: "Todo not found." });
      return;
    }

    const todo = await prisma.$transaction(async (transaction) => {
      await transaction.todoSubtask.updateMany({
        data: { completedAt },
        where: {
          completedAt: null,
          todoId: id,
        },
      });

      return transaction.todo.update({
        data: { completedAt },
        include: {
          subtasks: {
            orderBy: { createdAt: "asc" },
          },
        },
        where: { id },
      });
    });

    response.json(todo);
  });

  app.post("/api/todos/:todoId/subtasks/:subtaskId/toggle", async (request, response) => {
    const session = await requireSessionValue(request);
    const todoId = numericId(request.params.todoId, "todo id");
    const subtaskId = numericId(request.params.subtaskId, "subtask id");

    const todo = await prisma.todo.findFirst({
      include: { subtasks: true },
      where: { id: todoId, ownerId: session.userId },
    });

    if (!todo || !todo.subtasks.some((subtask) => subtask.id === subtaskId)) {
      response.status(404).json({ error: "Todo or subtask not found." });
      return;
    }

    const currentSubtask = todo.subtasks.find((subtask) => subtask.id === subtaskId);
    const nextCompletedAt = currentSubtask?.completedAt ? null : new Date();

    const updatedTodo = await prisma.$transaction(async (transaction) => {
      await transaction.todoSubtask.update({
        data: { completedAt: nextCompletedAt },
        where: { id: subtaskId },
      });

      const subtasks = await transaction.todoSubtask.findMany({ where: { todoId } });
      const allDone = subtasks.length > 0 && subtasks.every((subtask) => subtask.completedAt);

      return transaction.todo.update({
        data: {
          completedAt: allDone ? new Date() : null,
        },
        include: {
          subtasks: {
            orderBy: { createdAt: "asc" },
          },
        },
        where: { id: todoId },
      });
    });

    response.json(updatedTodo);
  });
}
