import { Express } from "express";
import { prisma } from "../../prisma";
import { contactData } from "../../shared/domain-data";
import { badRequest } from "../../shared/http/http-error";
import { objectPayload } from "../../shared/validation";
import { getSession, requireSessionValue } from "../auth/auth.service";

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

export function registerContactRoutes(app: Express) {
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
}
