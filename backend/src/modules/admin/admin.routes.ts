import { Express } from "express";
import { AuthSession, requireAdmin, requireManager } from "../auth/auth.service";
import { adminRepository } from "./admin.repository";
import { changeRequestResponse, changeRequestsResponse, pendingAccountResponse } from "./admin.mapper";
import {
  parseChangeRequestBody,
  parseCreateAdminUserBody,
  parseRejectBody,
  parseReviewParams,
  parseUpdateAdminUserBody,
  parseUserIdParam,
} from "./admin.schemas";
import { deleteAdminUser, getAdminSummary, inviteAdminUser, listAdminUsers, updateAdminUser } from "./admin.service";
import { approveChangeRequest } from "./use-cases/approve-change-request";
import { createChangeRequest } from "./use-cases/create-change-request";
import { rejectChangeRequest } from "./use-cases/reject-change-request";

export function registerAdminRoutes(app: Express) {
  app.get("/api/admin/summary", requireAdmin, async (_request, response) => {
    response.json(await getAdminSummary());
  });

  app.get("/api/admin/users", requireAdmin, async (_request, response) => {
    response.json(await listAdminUsers());
  });

  app.post("/api/admin/users", requireAdmin, async (request, response) => {
    const body = parseCreateAdminUserBody(request.body);
    const session = response.locals.session as AuthSession;
    const pendingAccount = await inviteAdminUser({
      ...body,
      requestedById: session?.userId,
    });

    response.status(202).json(pendingAccountResponse(pendingAccount));
  });

  app.patch("/api/admin/users/:id", requireAdmin, async (request, response) => {
    const id = parseUserIdParam(request.params);
    const body = parseUpdateAdminUserBody(request.body);
    response.json(await updateAdminUser(id, body));
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (request, response) => {
    const id = parseUserIdParam(request.params);
    const session = response.locals.session as AuthSession;
    await deleteAdminUser(session, id);
    response.status(204).send();
  });

  app.get("/api/admin/change-requests", requireAdmin, async (_request, response) => {
    response.json(changeRequestsResponse(await adminRepository.listAdminChangeRequests()));
  });

  app.post("/api/admin/change-requests/:id/approve", requireAdmin, async (request, response) => {
    const requestId = parseReviewParams(request.params);
    const session = response.locals.session as AuthSession;
    const changeRequest = await approveChangeRequest({ adminId: session!.userId, requestId });
    response.json(changeRequestResponse(changeRequest));
  });

  app.post("/api/admin/change-requests/:id/reject", requireAdmin, async (request, response) => {
    const requestId = parseReviewParams(request.params);
    const session = response.locals.session as AuthSession;
    const body = parseRejectBody(request.body);
    const changeRequest = await rejectChangeRequest({
      requestId,
      reviewedById: session!.userId,
      reviewNote: body.note,
    });

    response.json(changeRequestResponse(changeRequest));
  });

  app.get("/api/manager/change-requests", requireManager, async (request, response) => {
    const session = response.locals.session as AuthSession;
    const showAll = session?.activeRole === "ADMIN" && request.query.all === "true";
    response.json(changeRequestsResponse(await adminRepository.listManagerChangeRequests(session!.userId, showAll)));
  });

  app.post("/api/manager/change-requests", requireManager, async (request, response) => {
    const session = response.locals.session as AuthSession;
    const body = parseChangeRequestBody(request.body);
    const changeRequest = await createChangeRequest({
      ...body,
      requestedById: session!.userId,
    });

    response.status(201).json(changeRequestResponse(changeRequest));
  });
}
