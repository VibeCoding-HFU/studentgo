import { createHash, randomBytes, randomInt, scrypt, timingSafeEqual } from "crypto";
import { NextFunction, Request, Response } from "express";
import nodemailer from "nodemailer";
import { promisify } from "util";
import { badRequest, conflict, forbidden, unauthorized } from "../../shared/http/http-error";
import { normalizePublicKeyJson } from "../../shared/public-key";
import { objectPayload } from "../../shared/validation";
import { authRepository } from "./auth.repository";

const scryptAsync = promisify(scrypt);
const SESSION_DAYS = 7;
const CONFIRMATION_HOURS = 1;
const CONFIRMATION_CODE_DIGITS = 8;

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

function normalizeConfirmationCode(token: string) {
  return token.replace(/\D/g, "");
}

function createSessionExpiry() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);
  return expiresAt;
}

export function createConfirmationExpiry() {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + CONFIRMATION_HOURS);
  return expiresAt;
}

export function createConfirmationCode() {
  const min = 10 ** (CONFIRMATION_CODE_DIGITS - 1);
  return String(randomInt(min, 10 ** CONFIRMATION_CODE_DIGITS));
}

function gmailConfig() {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  const from = process.env.MAIL_FROM?.trim() || user;

  if (!user || !pass || !from) {
    return null;
  }

  return { from, pass, user };
}

async function sendConfirmationEmail(email: string, token: string) {
  const appUrl = process.env.APP_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
  const confirmationUrl = `${appUrl}/api/auth/confirm?token=${encodeURIComponent(token)}`;
  const config = gmailConfig();

  if (!config && process.env.NODE_ENV === "production") {
    throw new Error("Gmail credentials are required to send confirmation emails in production.");
  }

  if (config) {
    try {
      const transporter = nodemailer.createTransport({
        auth: {
          pass: config.pass,
          user: config.user,
        },
        service: "gmail",
      });

      await transporter.sendMail({
        from: config.from,
        html: [
          "<p>Hallo,</p>",
          "<p>bitte bestaetige deinen StudentGo Account mit diesem Bestaetigungscode:</p>",
          `<p><strong>${token}</strong></p>`,
          "<p>Alternativ kannst du den folgenden Link oeffnen:</p>",
          `<p><a href="${confirmationUrl}">${confirmationUrl}</a></p>`,
          `<p>Der Code ist ${CONFIRMATION_HOURS} Stunde gueltig.</p>`,
        ].join(""),
        subject: "StudentGo Account bestaetigen",
        text: [
          "Hallo,",
          "",
          "bitte bestaetige deinen StudentGo Account mit diesem Bestaetigungscode:",
          token,
          "",
          "Alternativ kannst du den folgenden Link oeffnen:",
          confirmationUrl,
          "",
          `Der Code ist ${CONFIRMATION_HOURS} Stunde gueltig.`,
        ].join("\n"),
        to: email,
      });

      return;
    } catch (error) {
      if (process.env.NODE_ENV === "production") {
        throw error;
      }

      console.warn("Gmail confirmation email could not be sent. Falling back to local confirmation logs.", error);
    }
  }

  console.info(`Email confirmation for ${email}: ${confirmationUrl}`);
  console.info(`Confirmation code for ${email}: ${token}`);
}

export async function ensureAccountCanBeRequested(email: string, role: Role, allowAdmin: boolean) {
  const [existingUser, existingPending] = await authRepository.findAccountRequestState(email);

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
  return (await authRepository.countActiveAdminRequests(new Date())) > 0;
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
  const confirmationToken = createConfirmationCode();

  const pendingAccount = await authRepository.createPendingAccount({
    confirmationTokenHash: hashConfirmationToken(confirmationToken),
    email: data.email,
    expiresAt: createConfirmationExpiry(),
    name: data.name,
    passwordHash: passwordData.hash,
    passwordSalt: passwordData.salt,
    publicKeyJson: data.publicKeyJson ? addPublicKeyToValue(null, data.publicKeyJson) : null,
    requestedById: data.requestedById,
    role: data.role,
  });

  await sendConfirmationEmail(data.email, confirmationToken);

  return pendingAccount;
}

export async function confirmPendingAccount(token: string) {
  const pendingAccount = await authRepository.findPendingAccountByConfirmationTokenHash(hashConfirmationToken(token));

  if (!pendingAccount || pendingAccount.expiresAt <= new Date()) {
    return null;
  }

  return authRepository.createUserFromPendingAccount(pendingAccount, publicKeyJsonsFromValue(pendingAccount.publicKeyJson));
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
  await authRepository.createSession({
    activeRole,
    expiresAt: createSessionExpiry(),
    tokenHash: hashSessionToken(token),
    userId,
  });

  return token;
}

export async function getSession(request: Request) {
  const token = bearerTokenFromRequest(request);

  if (!token) {
    return null;
  }

  const session = await authRepository.findSessionByTokenHash(hashSessionToken(token));

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

export async function registerAccount(body: unknown) {
  const payload = objectPayload(body);
  const name = normalizeName(payload.name);
  const email = normalizeEmail(payload.email);
  const password = typeof payload.password === "string" ? payload.password : "";
  const publicKeyJson = normalizePublicKeyJson(payload.publicKeyJson);
  const role = normalizeRole(payload.role);

  if (!name || !email || password.length < 8) {
    throw badRequest("Name, email and a password with at least 8 characters are required.");
  }

  if (payload.publicKeyJson && !publicKeyJson) {
    throw badRequest("A valid public key is required.");
  }

  const allowAdmin = role !== "ADMIN" || !(await hasAnyAdminOrPendingAdmin());
  const accountError = await ensureAccountCanBeRequested(email, role, allowAdmin);

  if (accountError) {
    throw role === "ADMIN" && !allowAdmin ? forbidden(accountError) : conflict(accountError);
  }

  const pendingAccount = await createPendingAccount({ email, name, password, publicKeyJson, role });

  return {
    email: pendingAccount.email,
    expiresAt: pendingAccount.expiresAt,
    requiresConfirmation: true,
  };
}

export async function confirmAccount(tokenInput: unknown) {
  const confirmationToken = typeof tokenInput === "string" ? normalizeConfirmationCode(tokenInput) : "";

  if (!confirmationToken) {
    throw badRequest("Confirmation token is required.");
  }

  if (confirmationToken.length !== CONFIRMATION_CODE_DIGITS) {
    throw badRequest("Confirmation token must contain 8 digits.");
  }

  const user = await confirmPendingAccount(confirmationToken);

  if (!user) {
    throw badRequest("Confirmation token is invalid or expired.");
  }

  const token = await createSession(user.id, user.role);
  return { token, activeRole: user.role, user: publicUser(user) };
}

export async function login(body: unknown) {
  const payload = objectPayload(body);
  const email = normalizeEmail(payload.email);
  const password = typeof payload.password === "string" ? payload.password : "";
  const requestedRole = normalizeRole(payload.loginAs);
  const user = await authRepository.findUserByEmailWithPublicKeys(email);

  if (!user || !(await verifyPassword(password, user.passwordHash, user.passwordSalt))) {
    throw unauthorized("Invalid email or password.");
  }

  if (!canUseRole(user.role, requestedRole)) {
    throw forbidden("This account has no permission for the selected role.");
  }

  const token = await createSession(user.id, requestedRole);
  return { token, activeRole: requestedRole, user: publicUser(user) };
}

export async function logout(token: string) {
  if (token) {
    await authRepository.deleteSessionsByTokenHash(hashSessionToken(token));
  }
}

export async function searchUsers(session: NonNullable<AuthSession>, queryInput: unknown) {
  const query = typeof queryInput === "string" ? queryInput.trim() : "";

  if (query.length < 3) {
    return [];
  }

  const users = await authRepository.searchUsers(session.userId, query);
  return users.map(publicUser);
}

export async function updateAccountPublicKey(session: AuthSession, publicKeyInput: unknown) {
  if (!session) {
    throw unauthorized("Not authenticated.");
  }

  const publicKeyJson = normalizePublicKeyJson(publicKeyInput);

  if (!publicKeyJson) {
    throw badRequest("A valid public key is required.");
  }

  await authRepository.upsertPublicKey(session.userId, publicKeyJson);
  const user = await authRepository.findUserByIdWithPublicKeys(session.userId);
  return publicUser(user);
}
