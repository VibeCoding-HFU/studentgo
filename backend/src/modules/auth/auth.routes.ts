import { Express } from "express";
import { prisma } from "../../prisma";
import {
  bearerTokenFromRequest,
  canUseRole,
  confirmPendingAccount,
  createPendingAccount,
  createSession,
  ensureAccountCanBeRequested,
  getSession,
  hashSessionToken,
  hasAnyAdminOrPendingAdmin,
  normalizeEmail,
  normalizeName,
  normalizeRole,
  publicUser,
  requireSessionValue,
  verifyPassword,
} from "./auth.service";
import { normalizePublicKeyJson } from "../../shared/public-key";

export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/register", async (request, response) => {
    const name = normalizeName(request.body.name);
    const email = normalizeEmail(request.body.email);
    const password = typeof request.body.password === "string" ? request.body.password : "";
    const publicKeyJson = normalizePublicKeyJson(request.body.publicKeyJson);
    const role = normalizeRole(request.body.role);

    if (!name || !email || password.length < 8) {
      response.status(400).json({ error: "Name, email and a password with at least 8 characters are required." });
      return;
    }

    if (request.body.publicKeyJson && !publicKeyJson) {
      response.status(400).json({ error: "A valid public key is required." });
      return;
    }

    const allowAdmin = role !== "ADMIN" || !(await hasAnyAdminOrPendingAdmin());
    const accountError = await ensureAccountCanBeRequested(email, role, allowAdmin);

    if (accountError) {
      response.status(role === "ADMIN" && !allowAdmin ? 403 : 409).json({ error: accountError });
      return;
    }

    const pendingAccount = await createPendingAccount({ email, name, password, publicKeyJson, role });

    response.status(202).json({
      email: pendingAccount.email,
      expiresAt: pendingAccount.expiresAt,
      requiresConfirmation: true,
    });
  });

  app.post("/api/auth/confirm", async (request, response) => {
    const token = typeof request.body.token === "string" ? request.body.token.trim() : "";

    if (!token) {
      response.status(400).json({ error: "Confirmation token is required." });
      return;
    }

    const user = await confirmPendingAccount(token);

    if (!user) {
      response.status(400).json({ error: "Confirmation token is invalid or expired." });
      return;
    }

    const sessionToken = await createSession(user.id, user.role);
    response.status(201).json({ token: sessionToken, activeRole: user.role, user: publicUser(user) });
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
    const email = normalizeEmail(request.body.email);
    const password = typeof request.body.password === "string" ? request.body.password : "";
    const requestedRole = normalizeRole(request.body.loginAs);
    const user = await prisma.user.findUnique({
      include: { publicKeys: true },
      where: { email },
    });

    if (!user || !(await verifyPassword(password, user.passwordHash, user.passwordSalt))) {
      response.status(401).json({ error: "Invalid email or password." });
      return;
    }

    if (!canUseRole(user.role, requestedRole)) {
      response.status(403).json({ error: "This account has no permission for the selected role." });
      return;
    }

    const token = await createSession(user.id, requestedRole);
    response.json({ token, activeRole: requestedRole, user: publicUser(user) });
  });

  app.get("/api/auth/me", async (request, response) => {
    const session = await requireSessionValue(request);

    response.json({ activeRole: session.activeRole, user: publicUser(session.user) });
  });

  app.post("/api/auth/logout", async (request, response) => {
    const token = bearerTokenFromRequest(request);

    if (token) {
      await prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
    }

    response.status(204).send();
  });

  app.get("/api/users/search", async (request, response) => {
    const session = await requireSessionValue(request);

    const query = typeof request.query.q === "string" ? request.query.q.trim() : "";

    if (query.length < 3) {
      response.json([]);
      return;
    }

    const users = await prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        email: true,
        id: true,
        name: true,
        publicKeys: { select: { publicKeyJson: true } },
        role: true,
      },
      take: 12,
      where: {
        id: { not: session.userId },
        OR: [
          { email: { contains: query } },
          { name: { contains: query } },
        ],
      },
    });

    response.json(users.map(publicUser));
  });

  app.patch("/api/account/public-key", async (request, response) => {
    const session = await getSession(request);
    const publicKeyJson = normalizePublicKeyJson(request.body.publicKeyJson);

    if (!session) {
      response.status(401).json({ error: "Not authenticated." });
      return;
    }

    if (!publicKeyJson) {
      response.status(400).json({ error: "A valid public key is required." });
      return;
    }

    await prisma.userPublicKey.upsert({
      create: {
        publicKeyJson,
        userId: session.userId,
      },
      update: {},
      where: {
        userId_publicKeyJson: {
          publicKeyJson,
          userId: session.userId,
        },
      },
    });

    const user = await prisma.user.findUniqueOrThrow({
      include: { publicKeys: true },
      where: { id: session.userId },
    });

    response.json(publicUser(user));
  });
}
