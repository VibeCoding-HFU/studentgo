import { Express } from "express";
import {
  bearerTokenFromRequest,
  confirmAccount,
  confirmPendingAccount,
  getSession,
  login,
  logout,
  publicUser,
  registerAccount,
  requireSessionValue,
  searchUsers,
  updateAccountPublicKey,
} from "./auth.service";

export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/register", async (request, response) => {
    response.status(202).json(await registerAccount(request.body));
  });

  app.post("/api/auth/confirm", async (request, response) => {
    response.status(201).json(await confirmAccount(request.body.token));
  });

  app.get("/api/auth/confirm", async (request, response) => {
    const token = typeof request.query.token === "string" ? request.query.token.trim() : "";
    const user = token ? await confirmPendingAccount(token) : null;

    if (!user) {
      response.status(400).send("Confirmation token is invalid or expired.");
      return;
    }

    response.send("Email confirmed. You can now sign in to StudentGo.");
  });

  app.post("/api/auth/login", async (request, response) => {
    response.json(await login(request.body));
  });

  app.get("/api/auth/me", async (request, response) => {
    const session = await requireSessionValue(request);

    response.json({ activeRole: session.activeRole, user: publicUser(session.user) });
  });

  app.post("/api/auth/logout", async (request, response) => {
    await logout(bearerTokenFromRequest(request));
    response.status(204).send();
  });

  app.get("/api/users/search", async (request, response) => {
    const session = await requireSessionValue(request);

    response.json(await searchUsers(session, request.query.q));
  });

  app.patch("/api/account/public-key", async (request, response) => {
    const session = await getSession(request);
    response.json(await updateAccountPublicKey(session, request.body.publicKeyJson));
  });
}
