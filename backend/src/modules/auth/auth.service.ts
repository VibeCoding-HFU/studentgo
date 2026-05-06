import { createHash, randomBytes, scrypt, timingSafeEqual } from "crypto";
import { NextFunction, Request, Response } from "express";
import { promisify } from "util";
import { prisma } from "../../prisma";
import { forbidden, unauthorized } from "../../shared/http/http-error";

const scryptAsync = promisify(scrypt);
const SESSION_DAYS = 7;
const CONFIRMATION_HOURS = 24;

export type Role = "USER" | "MANAGER" | "ADMIN";

export function normalizeEmail(email: unknown) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export function normalizeName(name: unknown) {
  return typeof name === "string" ? name.trim() : "";
}

export function normalizeRole(role: unknown): Role {
  if (role === "ADMIN" || role === "MANAGER") {
    return role;
  }

  return "USER";
}

export function canUseRole(accountRole: Role, requestedRole: Role) {
  if (accountRole === "ADMIN") {
    return true;
  }

  if (accountRole === "MANAGER") {
    return requestedRole !== "ADMIN";
  }

  return requestedRole === "USER";
}

export async function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return { hash: hash.toString("hex"), salt };
}

export async function verifyPassword(password: string, storedHash: string, storedSalt: string) {
  const { hash } = await hashPassword(password, storedSalt);
  const storedBuffer = Buffer.from(storedHash, "hex");
  const hashBuffer = Buffer.from(hash, "hex");

  if (storedBuffer.length !== hashBuffer.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, hashBuffer);
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function bearerTokenFromRequest(request: Request) {
  const authorization = request.header("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";
}

function hashConfirmationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createSessionExpiry() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);
  return expiresAt;
}

function createConfirmationExpiry() {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + CONFIRMATION_HOURS);
  return expiresAt;
}

async function sendConfirmationEmail(email: string, token: string) {
  const appUrl = process.env.APP_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
  const confirmationUrl = `${appUrl}/api/auth/confirm?token=${encodeURIComponent(token)}`;

  if (process.env.NODE_ENV === "production") {
    console.info(`Email confirmation requested for ${email}. Configure an email provider to deliver confirmation links.`);
    return;
  }

  console.info(`Email confirmation for ${email}: ${confirmationUrl}`);
  console.info(`Confirmation code for ${email}: ${token}`);
}

export async function ensureAccountCanBeRequested(email: string, role: Role, allowAdmin: boolean) {
  const [existingUser, existingPending] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.pendingAccount.findUnique({ where: { email } }),
  ]);

  if (existingUser) {
    return "An account with this email already exists.";
  }

  if (role === "ADMIN" && !allowAdmin) {
    return "Admin accounts can only be created by an admin.";
  }

  if (existingPending && existingPending.expiresAt > new Date()) {
    return "A confirmation email has already been sent for this account.";
  }

  return null;
}

export async function hasAnyAdminOrPendingAdmin() {
  const [admins, pendingAdmins] = await Promise.all([
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.pendingAccount.count({
      where: {
        expiresAt: { gt: new Date() },
        role: "ADMIN",
      },
    }),
  ]);

  return admins + pendingAdmins > 0;
}

export function publicKeyJsonsFromValue(value?: string | null) {
  if (!value?.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (Array.isArray(parsed)) {
      return [...new Set(parsed.filter((item): item is string => typeof item === "string" && Boolean(item.trim())))];
    }
  } catch {
    // Older rows may contain a single public JWK string.
  }

  return [value];
}

export function addPublicKeyToValue(value: string | null | undefined, publicKeyJson: string) {
  const keys = publicKeyJsonsFromValue(value);

  if (!keys.includes(publicKeyJson)) {
    keys.push(publicKeyJson);
  }

  return JSON.stringify(keys);
}

function publicKeyValueFromKeys(publicKeys?: Array<{ publicKeyJson: string }>) {
  const keys = [...new Set(publicKeys?.map((key) => key.publicKeyJson).filter(Boolean) ?? [])];
  return keys.length ? JSON.stringify(keys) : null;
}

export async function createPendingAccount(data: {
  email: string;
  name: string;
  password: string;
  publicKeyJson?: string | null;
  requestedById?: number | null;
  role: Role;
}) {
  const passwordData = await hashPassword(data.password);
  const confirmationToken = randomBytes(32).toString("base64url");

  const pendingAccount = await prisma.$transaction(async (transaction) => {
    await transaction.pendingAccount.deleteMany({
      where: {
        email: data.email,
        expiresAt: { lte: new Date() },
      },
    });

    if (data.role === "ADMIN" && !data.requestedById) {
      const [admins, pendingAdmins] = await Promise.all([
        transaction.user.count({ where: { role: "ADMIN" } }),
        transaction.pendingAccount.count({
          where: {
            expiresAt: { gt: new Date() },
            role: "ADMIN",
          },
        }),
      ]);

      if (admins + pendingAdmins > 0) {
        throw forbidden("Admin accounts can only be created by an admin.");
      }
    }

    return transaction.pendingAccount.create({
      data: {
        confirmationTokenHash: hashConfirmationToken(confirmationToken),
        email: data.email,
        expiresAt: createConfirmationExpiry(),
        name: data.name,
        passwordHash: passwordData.hash,
        passwordSalt: passwordData.salt,
        publicKeyJson: data.publicKeyJson ? addPublicKeyToValue(null, data.publicKeyJson) : null,
        requestedById: data.requestedById ?? null,
        role: data.role,
      },
    });
  });

  await sendConfirmationEmail(data.email, confirmationToken);

  return pendingAccount;
}

export async function confirmPendingAccount(token: string) {
  const pendingAccount = await prisma.pendingAccount.findUnique({
    where: { confirmationTokenHash: hashConfirmationToken(token) },
  });

  if (!pendingAccount || pendingAccount.expiresAt <= new Date()) {
    return null;
  }

  return prisma.$transaction(async (transaction) => {
    const user = await transaction.user.create({
      data: {
        email: pendingAccount.email,
        name: pendingAccount.name,
        passwordHash: pendingAccount.passwordHash,
        passwordSalt: pendingAccount.passwordSalt,
        publicKeys: {
          create: publicKeyJsonsFromValue(pendingAccount.publicKeyJson).map((publicKeyJson) => ({ publicKeyJson })),
        },
        role: pendingAccount.role,
      },
      include: { publicKeys: true },
    });

    await transaction.pendingAccount.delete({ where: { id: pendingAccount.id } });
    return user;
  });
}

export function publicUser(user: { id: number; name: string; email: string; publicKeys?: Array<{ publicKeyJson: string }>; role: Role }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    publicKeyJson: publicKeyValueFromKeys(user.publicKeys),
    role: user.role,
  };
}

export async function createSession(userId: number, activeRole: Role) {
  const token = randomBytes(32).toString("base64url");
  await prisma.session.create({
    data: {
      activeRole,
      expiresAt: createSessionExpiry(),
      tokenHash: hashSessionToken(token),
      userId,
    },
  });

  return token;
}

export async function getSession(request: Request) {
  const token = bearerTokenFromRequest(request);

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    include: { user: { include: { publicKeys: true } } },
    where: { tokenHash: hashSessionToken(token) },
  });

  if (!session || session.expiresAt <= new Date()) {
    return null;
  }

  return session;
}

export type AuthSession = Awaited<ReturnType<typeof getSession>>;

export async function requireSessionValue(request: Request) {
  const session = await getSession(request);

  if (!session) {
    throw unauthorized("Not authenticated.");
  }

  return session;
}

export async function requireSession(request: Request, response: Response, next: NextFunction) {
  const session = await getSession(request);

  if (!session) {
    response.status(401).json({ error: "Not authenticated." });
    return;
  }

  response.locals.session = session;
  next();
}

export async function requireAdmin(request: Request, response: Response, next: NextFunction) {
  const session = await getSession(request);

  if (!session || session.activeRole !== "ADMIN") {
    response.status(403).json({ error: "Admin access required" });
    return;
  }

  response.locals.session = session;
  next();
}

export async function requireManager(request: Request, response: Response, next: NextFunction) {
  const session = await getSession(request);

  if (!session || (session.activeRole !== "MANAGER" && session.activeRole !== "ADMIN")) {
    response.status(403).json({ error: "Manager access required" });
    return;
  }

  response.locals.session = session;
  next();
}
