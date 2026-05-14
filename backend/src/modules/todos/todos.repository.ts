import { prisma } from "../../prisma";

type TodoCreateData = {
  description: string | null;
  subtasks: string[];
  title: string;
};

export const todoRepository = {
  listForOwner(ownerId: number) {
    return prisma.todo.findMany({
      include: {
        subtasks: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [
        { completedAt: "desc" },
        { createdAt: "desc" },
      ],
      where: { ownerId },
    });
  },

  createForOwner(ownerId: number, data: TodoCreateData) {
    return prisma.todo.create({
      data: {
        description: data.description,
        ownerId,
        subtasks: {
          create: data.subtasks.map((subtask) => ({ title: subtask })),
        },
        title: data.title,
      },
      include: {
        subtasks: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
  },

  findOwnedWithSubtasks(ownerId: number, todoId: number) {
    return prisma.todo.findFirst({
      include: { subtasks: true },
      where: { id: todoId, ownerId },
    });
  },

  complete(todoId: number, completedAt: Date) {
    return prisma.$transaction(async (transaction) => {
      await transaction.todoSubtask.updateMany({
        data: { completedAt },
        where: {
          completedAt: null,
          todoId,
        },
      });

      return transaction.todo.update({
        data: { completedAt },
        include: {
          subtasks: {
            orderBy: { createdAt: "asc" },
          },
        },
        where: { id: todoId },
      });
    });
  },

  toggleSubtaskCompletion(todoId: number, subtaskId: number, completedAt: Date | null) {
    return prisma.$transaction(async (transaction) => {
      await transaction.todoSubtask.update({
        data: { completedAt },
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
  },
};
