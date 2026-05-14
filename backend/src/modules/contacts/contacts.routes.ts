import { Express } from "express";
import { objectPayload } from "../../shared/validation";
import { getSession, requireSessionValue } from "../auth/auth.service";
import { createContact, listContacts } from "./contacts.service";

export function registerContactRoutes(app: Express) {
  app.get("/api/contacts", async (request, response) => {
    const session = await getSession(request);
    response.json(await listContacts(session?.userId ?? null));
  });

  app.post("/api/contacts", async (request, response) => {
    const session = await requireSessionValue(request);
    response.status(201).json(await createContact(session.userId, objectPayload(request.body)));
  });
}
