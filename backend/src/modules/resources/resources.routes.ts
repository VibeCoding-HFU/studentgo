import { Express } from "express";
import { getSession, requireManager, requireSessionValue } from "../auth/auth.service";
import { prisma } from "../../prisma";
import { endOfWeek, parseWeekStart } from "../../shared/date-utils";
import { contactData, deadlineData, mealData, studyInfoData } from "../../shared/domain-data";
import { badRequest } from "../../shared/http/http-error";
import { numericId, objectPayload } from "../../shared/validation";

function validateContactPayload(payload: Record<string, unknown>) {
  const contact = contactData(payload);

  if (!contact.name) {
    throw badRequest("Contact name is required.");
  }

  if (!contact.role) {
    throw badRequest("Contact role is required.");
  }

  if (!contact.email) {
    throw badRequest("Contact email is required.");
  }

  return contact;
}

function validateDeadlinePayload(payload: Record<string, unknown>) {
  const deadline = deadlineData(payload);

  if (!deadline.title) {
    throw badRequest("Deadline title is required.");
  }

  if (Number.isNaN(deadline.date.getTime())) {
    throw badRequest("Deadline date is required.");
  }

  return deadline;
}

function validateMealPayload(payload: Record<string, unknown>) {
  const meal = mealData(payload, numericId(payload.canteenId, "canteenId"));

  if (!meal.day) {
    throw badRequest("Meal day is required.");
  }

  if (!meal.mainDish) {
    throw badRequest("Meal main dish is required.");
  }

  if (!Number.isInteger(meal.priceCents) || meal.priceCents < 0) {
    throw badRequest("Meal priceCents must be a non-negative integer.");
  }

  if (meal.date && Number.isNaN(meal.date.getTime())) {
    throw badRequest("Meal date is invalid.");
  }

  return meal;
}

export function registerResourceRoutes(app: Express) {
  app.get("/api/contacts", async (request, response) => {
    const session = await getSession(request);
    const contacts = await prisma.contact.findMany({
      orderBy: { name: "asc" },
      where: {
        OR: [{ ownerId: null }, ...(session ? [{ ownerId: session.userId }] : [])],
      },
    });
    response.json(contacts);
  });

  app.post("/api/contacts", async (request, response) => {
    const session = await requireSessionValue(request);

    const contactPayload = validateContactPayload(objectPayload(request.body));
    const contact = await prisma.contact.create({
      data: {
        ...contactPayload,
        ownerId: session.userId,
      },
    });

    response.status(201).json(contact);
  });

  app.get("/api/canteens", async (_request, response) => {
    const canteens = await prisma.canteen.findMany({
      include: { meals: { orderBy: { id: "asc" } } },
      orderBy: { name: "asc" },
    });

    response.json(canteens);
  });

  app.get("/api/meals", async (request, response) => {
    const weekStart = parseWeekStart(request.query.weekStart);
    const weekEnd = endOfWeek(weekStart);
    const meals = await prisma.mealPlan.findMany({
      include: { canteen: true },
      orderBy: [{ date: "asc" }, { id: "asc" }],
      where: {
        date: { gte: weekStart, lt: weekEnd },
      },
    });

    response.json(meals);
  });

  app.post("/api/meals", requireManager, async (request, response) => {
    const mealPayload = validateMealPayload(objectPayload(request.body));
    const meal = await prisma.mealPlan.create({
      data: mealPayload,
    });

    response.status(201).json(meal);
  });

  app.get("/api/deadlines", async (_request, response) => {
    const deadlines = await prisma.deadline.findMany({ orderBy: { date: "asc" } });
    response.json(deadlines);
  });

  app.post("/api/deadlines", requireManager, async (request, response) => {
    const deadlinePayload = validateDeadlinePayload(objectPayload(request.body));
    const deadline = await prisma.deadline.create({
      data: deadlinePayload,
    });

    response.status(201).json(deadline);
  });

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

  app.get("/api/study-info", async (request, response) => {
    const session = await getSession(request);
    const [spo, modules] = await Promise.all([
      prisma.studyInfo.findMany({
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
        where: { OR: [{ ownerId: null }, ...(session ? [{ ownerId: session.userId }] : [])] },
      }),
      prisma.studyModule.findMany({
        orderBy: { title: "asc" },
        where: { OR: [{ ownerId: null }, ...(session ? [{ ownerId: session.userId }] : [])] },
      }),
    ]);

    response.json({ spo, modules });
  });

  app.post("/api/study-info", async (request, response) => {
    const session = await requireSessionValue(request);

    const info = await prisma.studyInfo.create({
      data: {
        ...studyInfoData(request.body),
        ownerId: session.userId,
      },
    });

    response.status(201).json(info);
  });
}
