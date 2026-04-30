import cors from "cors";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "crypto";
import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import { promisify } from "util";
import { prisma } from "./prisma";

const app = express();
const port = Number(process.env.PORT ?? 3001);
const corsOrigin = process.env.CORS_ORIGIN ?? "*";
const scryptAsync = promisify(scrypt);
const SESSION_DAYS = 7;
const CONFIRMATION_HOURS = 24;
const SWFR_MENSA_URL = "https://www.swfr.de/essen/mensen-cafes-speiseplaene/mensa-furtwangen";
const STARPLAN_BASE_URL = "https://splan.hs-furtwangen.de/starplan";
const DAY_NAMES = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

type Role = "USER" | "MANAGER" | "ADMIN";
type ChangeAction = "CREATE" | "UPDATE" | "DELETE";
type ChangeEntity = "CONTACT" | "DEADLINE" | "MEAL" | "LESSON" | "STUDY_INFO";

function normalizeEmail(email: unknown) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function normalizeName(name: unknown) {
  return typeof name === "string" ? name.trim() : "";
}

function normalizeRole(role: unknown): Role {
  if (role === "ADMIN" || role === "MANAGER") {
    return role;
  }

  return "USER";
}

function canUseRole(accountRole: Role, requestedRole: Role) {
  if (accountRole === "ADMIN") {
    return true;
  }

  if (accountRole === "MANAGER") {
    return requestedRole !== "ADMIN";
  }

  return requestedRole === "USER";
}

async function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return { hash: hash.toString("hex"), salt };
}

async function verifyPassword(password: string, storedHash: string, storedSalt: string) {
  const { hash } = await hashPassword(password, storedSalt);
  const storedBuffer = Buffer.from(storedHash, "hex");
  const hashBuffer = Buffer.from(hash, "hex");

  if (storedBuffer.length !== hashBuffer.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, hashBuffer);
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
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
  const appUrl = process.env.APP_URL ?? `http://localhost:${port}`;
  const confirmationUrl = `${appUrl}/api/auth/confirm?token=${encodeURIComponent(token)}`;

  console.log(`Email confirmation for ${email}: ${confirmationUrl}`);
  console.log(`Confirmation code for ${email}: ${token}`);
}

async function ensureAccountCanBeRequested(email: string, role: Role, allowAdmin: boolean) {
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

async function hasAnyAdminOrPendingAdmin() {
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

async function createPendingAccount(data: {
  email: string;
  name: string;
  password: string;
  publicKeyJson?: string | null;
  requestedById?: number | null;
  role: Role;
}) {
  const passwordData = await hashPassword(data.password);
  const confirmationToken = randomBytes(32).toString("base64url");

  await prisma.pendingAccount.deleteMany({
    where: {
      email: data.email,
      expiresAt: { lte: new Date() },
    },
  });

  const pendingAccount = await prisma.pendingAccount.create({
    data: {
      confirmationTokenHash: hashConfirmationToken(confirmationToken),
      email: data.email,
      expiresAt: createConfirmationExpiry(),
      name: data.name,
      passwordHash: passwordData.hash,
      passwordSalt: passwordData.salt,
      publicKeyJson: data.publicKeyJson ?? null,
      requestedById: data.requestedById ?? null,
      role: data.role,
    },
  });

  await sendConfirmationEmail(data.email, confirmationToken);

  return pendingAccount;
}

async function confirmPendingAccount(token: string) {
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
        publicKeyJson: pendingAccount.publicKeyJson,
        role: pendingAccount.role,
      },
    });

    await transaction.pendingAccount.delete({ where: { id: pendingAccount.id } });
    return user;
  });
}

function publicUser(user: { id: number; name: string; email: string; publicKeyJson: string | null; role: Role }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    publicKeyJson: user.publicKeyJson,
    role: user.role,
  };
}

async function createSession(userId: number, activeRole: Role) {
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

async function getSession(request: Request) {
  const authorization = request.header("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    include: { user: true },
    where: { tokenHash: hashSessionToken(token) },
  });

  if (!session || session.expiresAt <= new Date()) {
    return null;
  }

  return session;
}

async function requireAdmin(request: Request, response: Response, next: NextFunction) {
  const session = await getSession(request);

  if (!session || session.activeRole !== "ADMIN") {
    response.status(403).json({ error: "Admin access required" });
    return;
  }

  response.locals.session = session;
  next();
}

async function requireManager(request: Request, response: Response, next: NextFunction) {
  const session = await getSession(request);

  if (!session || (session.activeRole !== "MANAGER" && session.activeRole !== "ADMIN")) {
    response.status(403).json({ error: "Manager access required" });
    return;
  }

  response.locals.session = session;
  next();
}

function normalizeAction(action: unknown): ChangeAction | null {
  return action === "CREATE" || action === "UPDATE" || action === "DELETE" ? action : null;
}

function normalizeEntity(entity: unknown): ChangeEntity | null {
  return entity === "CONTACT" || entity === "DEADLINE" || entity === "MEAL" || entity === "LESSON" || entity === "STUDY_INFO" ? entity : null;
}

function parsePayload(payloadJson: string) {
  return JSON.parse(payloadJson) as Record<string, unknown>;
}

function contactData(payload: Record<string, unknown>) {
  return {
    email: typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "",
    name: typeof payload.name === "string" ? payload.name.trim() : "",
    phone: typeof payload.phone === "string" && payload.phone.trim() ? payload.phone.trim() : null,
    role: typeof payload.role === "string" ? payload.role.trim() : "",
    room: typeof payload.room === "string" && payload.room.trim() ? payload.room.trim() : null,
  };
}

function deadlineData(payload: Record<string, unknown>) {
  return {
    date: typeof payload.date === "string" ? new Date(payload.date) : new Date(""),
    description: typeof payload.description === "string" && payload.description.trim() ? payload.description.trim() : null,
    title: typeof payload.title === "string" ? payload.title.trim() : "",
  };
}

function studyInfoData(payload: Record<string, unknown>) {
  return {
    category: typeof payload.category === "string" && payload.category.trim() ? payload.category.trim() : "allgemein",
    content: typeof payload.content === "string" ? payload.content.trim() : "",
    encryptedKey: typeof payload.encryptedKey === "string" && payload.encryptedKey.trim() ? payload.encryptedKey.trim() : null,
    encryptedPayload: typeof payload.encryptedPayload === "string" && payload.encryptedPayload.trim() ? payload.encryptedPayload.trim() : null,
    encryptionIv: typeof payload.encryptionIv === "string" && payload.encryptionIv.trim() ? payload.encryptionIv.trim() : null,
    sortOrder: Number(payload.sortOrder ?? 0),
    title: typeof payload.title === "string" ? payload.title.trim() : "",
  };
}

function mealData(payload: Record<string, unknown>, canteenId: number) {
  return {
    canteenId,
    currency: typeof payload.currency === "string" && payload.currency.trim() ? payload.currency.trim() : "EUR",
    date: typeof payload.date === "string" && payload.date.trim() ? new Date(payload.date) : null,
    day: typeof payload.day === "string" ? payload.day.trim() : "",
    mainDish: typeof payload.mainDish === "string" ? payload.mainDish.trim() : "",
    priceCents: Number(payload.priceCents ?? 0),
    vegetarianDish: typeof payload.vegetarianDish === "string" && payload.vegetarianDish.trim() ? payload.vegetarianDish.trim() : null,
  };
}

function startOfWeek(date = new Date()) {
  const start = new Date(date);
  const day = start.getDay() || 7;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - day + 1);
  return start;
}

function toDateInput(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function parseDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function parseWeekStart(value: unknown) {
  const input = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) ? parseDateInput(value.trim()) : new Date();
  return startOfWeek(Number.isNaN(input.getTime()) ? new Date() : input);
}

function decodeHtml(value: string) {
  return value
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&auml;/g, "ä")
    .replace(/&ouml;/g, "ö")
    .replace(/&uuml;/g, "ü")
    .replace(/&Auml;/g, "Ä")
    .replace(/&Ouml;/g, "Ö")
    .replace(/&Uuml;/g, "Ü")
    .replace(/&szlig;/g, "ß");
}

function endOfWeek(date = new Date()) {
  const end = startOfWeek(date);
  end.setDate(end.getDate() + 7);
  return end;
}

function stripHtml(value: string) {
  return decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseGermanPrice(value: string) {
  const match = value.match(/(\d+),(\d{2})\s*€/);
  return match ? Number(match[1]) * 100 + Number(match[2]) : 0;
}

function dateForDay(day: string, datePart: string) {
  const [dayOfMonth, month] = datePart.split(".").map(Number);
  const now = new Date();
  let year = now.getFullYear();
  const parsed = new Date(year, month - 1, dayOfMonth);

  if (parsed < new Date(now.getFullYear(), 0, 1) && now.getMonth() === 11) {
    year += 1;
  }

  const result = new Date(year, month - 1, dayOfMonth);
  result.setHours(12, 0, 0, 0);

  if (DAY_NAMES[result.getDay()] !== day) {
    const currentWeek = startOfWeek();
    for (let index = 0; index < 7; index += 1) {
      const candidate = new Date(currentWeek);
      candidate.setDate(currentWeek.getDate() + index);
      if (DAY_NAMES[candidate.getDay()] === day && candidate.getDate() === dayOfMonth && candidate.getMonth() === month - 1) {
        candidate.setHours(12, 0, 0, 0);
        return candidate;
      }
    }
  }

  return result;
}

function parseSwfrMeals(html: string) {
  const planStart = html.indexOf("Aktueller Speiseplan");
  const planEnd = html.indexOf("Legende", planStart);
  const planHtml = html.slice(planStart, planEnd > planStart ? planEnd : undefined);
  const dayRegex = /<h3[^>]*>\s*(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag)\s+(\d{2}\.\d{2}\.)\s*<\/h3>/gi;
  const dayMatches = [...planHtml.matchAll(dayRegex)];
  const meals: Array<{ date: Date; day: string; mainDish: string; priceCents: number; vegetarianDish: string | null }> = [];

  for (let index = 0; index < dayMatches.length; index += 1) {
    const match = dayMatches[index];
    const nextMatch = dayMatches[index + 1];
    const day = match[1];
    const date = dateForDay(day, match[2]);
    const section = planHtml.slice((match.index ?? 0) + match[0].length, nextMatch?.index ?? planHtml.length);
    const dishRegex = /<h5[^>]*>([\s\S]*?)<\/h5>([\s\S]*?)(?=<div class="col-span-1|<h3|$)/gi;
    const dishMatches = [...section.matchAll(dishRegex)];

    for (const dishMatch of dishMatches) {
      const heading = stripHtml(dishMatch[1]);
      const label = heading.match(/Essen\s+\d+/i)?.[0] ?? "Essen";
      const flags = heading.toLowerCase();
      const body = dishMatch[2];
      const smallMatch = body.match(/<small[^>]*class="[^"]*extra-text[^"]*"[^>]*>([\s\S]*?)<\/small>/i);
      const title = smallMatch
        ? smallMatch[1]
            .replace(/<br\s*\/?>/gi, ", ")
            .split(",")
            .map((line) => stripHtml(line))
            .filter(Boolean)
            .join(", ")
        : "";

      if (!title || /heute keine essensausgabe/i.test(title)) {
        continue;
      }

      const priceText = stripHtml(body.slice(body.search(/Studierende/iu)));
      meals.push({
        date,
        day,
        mainDish: `${label}: ${title}`,
        priceCents: parseGermanPrice(priceText),
        vegetarianDish: flags.includes("vegetarisch") || flags.includes("pflanzlich") ? title : null,
      });
    }
  }

  return meals.filter((meal) => meal.date >= startOfWeek() && meal.date < endOfWeek());
}

async function importSwfrMeals() {
  const response = await fetch(SWFR_MENSA_URL);

  if (!response.ok) {
    throw new Error(`SWFR import failed with status ${response.status}`);
  }

  const html = await response.text();
  const meals = parseSwfrMeals(html);
  const canteen = await getOrCreateCanteen("Mensa Furtwangen");
  const importedAt = new Date();

  await prisma.$transaction(async (transaction) => {
    await transaction.mealPlan.deleteMany({ where: { source: "SWFR" } });

    for (const meal of meals) {
      await transaction.mealPlan.create({
        data: {
          canteenId: canteen.id,
          currency: "EUR",
          date: meal.date,
          day: meal.day,
          importedAt,
          mainDish: meal.mainDish,
          priceCents: meal.priceCents,
          source: "SWFR",
          sourceKey: `swfr-${meal.date.toISOString().slice(0, 10)}-${meal.mainDish}`,
          vegetarianDish: meal.vegetarianDish,
        },
      });
    }
  });

  return meals.length;
}

function scheduleDailySwfrImport() {
  const runImport = async () => {
    try {
      const count = await importSwfrMeals();
      console.log(`Imported ${count} SWFR meals for the current week.`);
    } catch (error) {
      console.error("SWFR meal import failed:", error);
    }
  };

  runImport();
  setInterval(runImport, 24 * 60 * 60 * 1000);
}

function lessonData(payload: Record<string, unknown>, scheduleDayId: number) {
  const isRecurring = payload.isRecurring === true;

  return {
    date: !isRecurring && typeof payload.date === "string" && payload.date.trim() ? new Date(payload.date) : null,
    description: typeof payload.description === "string" && payload.description.trim() ? payload.description.trim() : null,
    endTime: typeof payload.endTime === "string" ? payload.endTime.trim() : "",
    encryptedKey: typeof payload.encryptedKey === "string" && payload.encryptedKey.trim() ? payload.encryptedKey.trim() : null,
    encryptedPayload: typeof payload.encryptedPayload === "string" && payload.encryptedPayload.trim() ? payload.encryptedPayload.trim() : null,
    encryptionIv: typeof payload.encryptionIv === "string" && payload.encryptionIv.trim() ? payload.encryptionIv.trim() : null,
    isRecurring,
    lecturer: typeof payload.lecturer === "string" && payload.lecturer.trim() ? payload.lecturer.trim() : null,
    room: typeof payload.room === "string" && payload.room.trim() ? payload.room.trim() : null,
    scheduleDayId,
    startTime: typeof payload.startTime === "string" ? payload.startTime.trim() : "",
    title: typeof payload.title === "string" ? payload.title.trim() : "",
  };
}

async function getOrCreateScheduleDay(day: string, transaction: typeof prisma = prisma) {
  const cleanDay = day.trim();
  const existingDay = await transaction.scheduleDay.findUnique({ where: { day: cleanDay } });

  if (existingDay) {
    return existingDay;
  }

  return transaction.scheduleDay.create({
    data: {
      day: cleanDay,
      sortOrder: 99,
    },
  });
}

async function getOrCreateCanteen(name: string, transaction: typeof prisma = prisma) {
  const cleanName = name.trim() || "Mensa";
  const existingCanteen = await transaction.canteen.findFirst({ where: { name: cleanName } });

  if (existingCanteen) {
    return existingCanteen;
  }

  return transaction.canteen.create({ data: { name: cleanName } });
}

async function fetchStarPlanJson<T>(path: string): Promise<T[]> {
  const response = await fetch(`${STARPLAN_BASE_URL}/${path}`);

  if (!response.ok) {
    throw new Error(`StarPlan request failed with status ${response.status}`);
  }

  const text = await response.text();
  const parsed = JSON.parse(text) as [T[]] | T[];
  return Array.isArray(parsed[0]) ? (parsed[0] as T[]) : (parsed as T[]);
}

type StarPlanUnit = { id: number; name: string; shortname: string; startdate?: string; enddate?: string };
type StarPlanOrgGroup = { id: number; name: string; shortname: string };
type StarPlanPlanningGroup = { id: number; name: string; shortname: string };

async function getStarPlanOptions(facultyId?: string, semesterId?: string) {
  const semesters = await fetchStarPlanJson<StarPlanUnit>("json?m=getpus");
  const currentSemester = semesters.find((semester) => String(semester.id) === semesterId) ?? semesters[0];
  const faculties = await fetchStarPlanJson<StarPlanOrgGroup>(
    `json?m=getogs${currentSemester ? `&pu=${currentSemester.id}` : ""}`,
  );
  const groups = currentSemester && facultyId
    ? await fetchStarPlanJson<StarPlanPlanningGroup>(`json?m=getPgsExt&pu=${currentSemester.id}&og=${facultyId}`).catch(() => [])
    : [];

  return {
    faculties: faculties.map((faculty) => ({ ...faculty, groups: [] })),
    groups: groups.map((group) => ({ id: group.shortname, name: group.name, shortname: group.shortname })),
    semesters: semesters.map((semester) => ({
      enddate: semester.enddate,
      id: semester.id,
      name: semester.name,
      shortname: semester.shortname,
      startdate: semester.startdate,
    })),
    specializations: [
      { id: "standard", name: "Standard" },
      { id: "all", name: "Alle Vertiefungen" },
    ],
  };
}

function minutesToTime(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function invitationLessonData(lesson: {
  date: Date | null;
  description: string | null;
  endTime: string;
  encryptedKey: string | null;
  encryptedPayload: string | null;
  encryptionIv: string | null;
  isRecurring: boolean;
  lecturer: string | null;
  room: string | null;
  scheduleDayId: number;
  startTime: string;
  title: string;
}) {
  return {
    date: lesson.date,
    description: lesson.description,
    endTime: lesson.endTime,
    encryptedKey: lesson.encryptedKey,
    encryptedPayload: lesson.encryptedPayload,
    encryptionIv: lesson.encryptionIv,
    isRecurring: lesson.isRecurring,
    lecturer: lesson.lecturer,
    room: lesson.room,
    scheduleDayId: lesson.scheduleDayId,
    startTime: lesson.startTime,
    title: lesson.title,
  };
}

function parseStarPlanTimetable(html: string, weekStart: Date) {
  const dayCells = [...html.matchAll(/ttweekdaycell[^>]*left:(-?\d+)px[\s\S]*?data-date="(\d{4}-\d{2}-\d{2})"/gi)].map((match) => ({
    date: match[2],
    left: Number(match[1]),
  }));
  const events = [...html.matchAll(/<div style="position:absolute;([^"]+)" class="ttevent[^"]*"[\s\S]*?<div class="tooltip">([\s\S]*?)<\/div>([\s\S]*?)<div class="ttIconContainer">/gi)];

  return events
    .map((match) => {
      const style = match[1];
      const left = Number(style.match(/left:(-?\d+)px/)?.[1] ?? 0);
      const dateCell = dayCells.reduce((closest, current) => (Math.abs(current.left - left) < Math.abs(closest.left - left) ? current : closest), dayCells[0]);
      const lines = match[2].split(/<br\s*\/?>/i).map((line) => stripHtml(line)).filter(Boolean);
      const time = lines.find((line) => /^\d{2}:\d{2}-\d{2}:\d{2}$/.test(line));

      if (!dateCell || !time) {
        return null;
      }

      const [startTime, endTime] = time.split("-");
      const date = parseDateInput(dateCell.date);
      const day = DAY_NAMES[date.getDay()];

      if (date < weekStart || date >= endOfWeek(weekStart)) {
        return null;
      }

      return {
        date: dateCell.date,
        day,
        endTime,
        lecturer: lines[1] ?? null,
        room: lines[3] ?? null,
        startTime,
        title: lines[0] ?? "Termin",
      };
    })
    .filter((event): event is NonNullable<typeof event> => Boolean(event));
}

async function importStarPlanSchedule(input: {
  facultyId: string;
  facultyName: string;
  semesterId: string;
  semesterName: string;
  specialization?: string | null;
  studyGroup: string;
  userId: number;
  weekStart: Date;
}) {
  const cacheKey = [
    input.semesterId,
    input.facultyId,
    input.studyGroup,
    input.specialization ?? "standard",
    toDateInput(input.weekStart),
  ].join(":");
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const existingCache = await prisma.scheduleImportCache.findUnique({ where: { cacheKey } });
  let parsedLessons: ReturnType<typeof parseStarPlanTimetable>;

  if (existingCache && existingCache.importedAt >= todayStart) {
    parsedLessons = JSON.parse(existingCache.payloadJson) as ReturnType<typeof parseStarPlanTimetable>;
  } else {
    const params = new URLSearchParams({
      dfc: toDateInput(input.weekStart),
      m: "getTT",
      og: input.facultyId,
      pg: input.studyGroup,
      pu: input.semesterId,
      sa: "false",
      sd: "true",
      sel: "pg",
    });
    const response = await fetch(`${STARPLAN_BASE_URL}/json?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`StarPlan timetable failed with status ${response.status}`);
    }

    parsedLessons = parseStarPlanTimetable(await response.text(), input.weekStart);
    await prisma.scheduleImportCache.upsert({
      create: {
        cacheKey,
        facultyId: input.facultyId,
        facultyName: input.facultyName,
        importedAt: new Date(),
        payloadJson: JSON.stringify(parsedLessons),
        semesterId: input.semesterId,
        semesterName: input.semesterName,
        specialization: input.specialization,
        studyGroup: input.studyGroup,
        weekStart: input.weekStart,
      },
      update: {
        importedAt: new Date(),
        payloadJson: JSON.stringify(parsedLessons),
      },
      where: { cacheKey },
    });
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.lesson.deleteMany({
      where: {
        ownerId: input.userId,
        source: "STARPLAN",
      },
    });

    for (const lesson of parsedLessons) {
      const day = await getOrCreateScheduleDay(lesson.day, transaction as typeof prisma);
      await transaction.lesson.create({
        data: {
          date: new Date(`${lesson.date}T12:00:00`),
          endTime: lesson.endTime,
          importedAt: new Date(),
          lecturer: lesson.lecturer,
          ownerId: input.userId,
          room: lesson.room,
          scheduleDayId: day.id,
          source: "STARPLAN",
          sourceKey: `${cacheKey}:${lesson.date}:${lesson.startTime}:${lesson.title}:${lesson.room ?? ""}`,
          startTime: lesson.startTime,
          title: lesson.title,
        },
      });
    }
  });

  return parsedLessons.length;
}

async function applyManagementChange(requestId: number, adminId: number) {
  return prisma.$transaction(async (transaction) => {
    const changeRequest = await transaction.managementChangeRequest.findUnique({
      where: { id: requestId },
    });

    if (!changeRequest || changeRequest.status !== "PENDING") {
      throw new Error("Change request is not pending.");
    }

    const payload = parsePayload(changeRequest.payloadJson);

    if (changeRequest.entity === "CONTACT") {
      if (changeRequest.action === "CREATE") {
        const data = contactData(payload);
        await transaction.contact.create({ data });
      }

      if (changeRequest.action === "UPDATE" && changeRequest.targetId) {
        const data = contactData(payload);
        await transaction.contact.update({ data, where: { id: changeRequest.targetId } });
      }

      if (changeRequest.action === "DELETE" && changeRequest.targetId) {
        await transaction.contact.delete({ where: { id: changeRequest.targetId } });
      }
    }

    if (changeRequest.entity === "DEADLINE") {
      if (changeRequest.action === "CREATE") {
        const data = deadlineData(payload);
        await transaction.deadline.create({ data });
      }

      if (changeRequest.action === "UPDATE" && changeRequest.targetId) {
        const data = deadlineData(payload);
        await transaction.deadline.update({ data, where: { id: changeRequest.targetId } });
      }

      if (changeRequest.action === "DELETE" && changeRequest.targetId) {
        await transaction.deadline.delete({ where: { id: changeRequest.targetId } });
      }
    }

    if (changeRequest.entity === "STUDY_INFO") {
      if (changeRequest.action === "CREATE") {
        await transaction.studyInfo.create({ data: studyInfoData(payload) });
      }

      if (changeRequest.action === "UPDATE" && changeRequest.targetId) {
        await transaction.studyInfo.update({ data: studyInfoData(payload), where: { id: changeRequest.targetId } });
      }

      if (changeRequest.action === "DELETE" && changeRequest.targetId) {
        await transaction.studyInfo.delete({ where: { id: changeRequest.targetId } });
      }
    }

    if (changeRequest.entity === "MEAL") {
      const canteen = await getOrCreateCanteen(typeof payload.canteenName === "string" ? payload.canteenName : "Mensa", transaction as typeof prisma);

      if (changeRequest.action === "CREATE") {
        await transaction.mealPlan.create({ data: mealData(payload, canteen.id) });
      }

      if (changeRequest.action === "UPDATE" && changeRequest.targetId) {
        await transaction.mealPlan.update({ data: mealData(payload, canteen.id), where: { id: changeRequest.targetId } });
      }

      if (changeRequest.action === "DELETE" && changeRequest.targetId) {
        await transaction.mealPlan.delete({ where: { id: changeRequest.targetId } });
      }
    }

    if (changeRequest.entity === "LESSON") {
      const day = await getOrCreateScheduleDay(typeof payload.day === "string" ? payload.day : "Allgemein", transaction as typeof prisma);

      if (changeRequest.action === "CREATE") {
        await transaction.lesson.create({ data: lessonData(payload, day.id) });
      }

      if (changeRequest.action === "UPDATE" && changeRequest.targetId) {
        await transaction.lesson.update({ data: lessonData(payload, day.id), where: { id: changeRequest.targetId } });
      }

      if (changeRequest.action === "DELETE" && changeRequest.targetId) {
        await transaction.lesson.delete({ where: { id: changeRequest.targetId } });
      }
    }

    return transaction.managementChangeRequest.update({
      data: {
        reviewedAt: new Date(),
        reviewedById: adminId,
        status: "APPROVED",
      },
      where: { id: requestId },
    });
  });
}

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({ status: "ok", service: "studentgo-backend" });
});

app.post("/api/auth/register", async (request, response) => {
  const name = normalizeName(request.body.name);
  const email = normalizeEmail(request.body.email);
  const password = typeof request.body.password === "string" ? request.body.password : "";
  const publicKeyJson = typeof request.body.publicKeyJson === "string" ? request.body.publicKeyJson : null;
  const role = normalizeRole(request.body.role);

  if (!name || !email || password.length < 8) {
    response.status(400).json({ error: "Name, email and a password with at least 8 characters are required." });
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
  const user = await prisma.user.findUnique({ where: { email } });

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
  const session = await getSession(request);

  if (!session) {
    response.status(401).json({ error: "Not authenticated." });
    return;
  }

  response.json({ activeRole: session.activeRole, user: publicUser(session.user) });
});

app.post("/api/auth/logout", async (request, response) => {
  const authorization = request.header("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";

  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
  }

  response.status(204).send();
});

app.get("/api/users/search", async (request, response) => {
  const session = await getSession(request);

  if (!session) {
    response.status(401).json({ error: "Not authenticated." });
    return;
  }

  const query = typeof request.query.q === "string" ? request.query.q.trim() : "";

  if (query.length < 2) {
    response.json([]);
    return;
  }

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: {
      email: true,
      id: true,
      name: true,
      publicKeyJson: true,
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

  response.json(users);
});

app.patch("/api/account/public-key", async (request, response) => {
  const session = await getSession(request);
  const publicKeyJson = typeof request.body.publicKeyJson === "string" ? request.body.publicKeyJson : "";

  if (!session) {
    response.status(401).json({ error: "Not authenticated." });
    return;
  }

  if (!publicKeyJson.trim()) {
    response.status(400).json({ error: "Public key is required." });
    return;
  }

  const user = await prisma.user.update({
    data: { publicKeyJson },
    where: { id: session.userId },
  });

  response.json(publicUser(user));
});

app.get("/api/admin/summary", requireAdmin, async (_request, response) => {
  const [users, sessions, contacts, meals, deadlines, modules, pendingRequests] = await Promise.all([
    prisma.user.count(),
    prisma.session.count({ where: { expiresAt: { gt: new Date() } } }),
    prisma.contact.count(),
    prisma.mealPlan.count(),
    prisma.deadline.count(),
    prisma.module.count(),
    prisma.managementChangeRequest.count({ where: { status: "PENDING" } }),
  ]);

  response.json({ contacts, deadlines, meals, modules, pendingRequests, sessions, users });
});

app.get("/api/admin/users", requireAdmin, async (_request, response) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      email: true,
      id: true,
      name: true,
      role: true,
    },
  });

  response.json(users);
});

app.post("/api/admin/users", requireAdmin, async (request, response) => {
  const name = normalizeName(request.body.name);
  const email = normalizeEmail(request.body.email);
  const password = typeof request.body.password === "string" ? request.body.password : "";
  const role = normalizeRole(request.body.role);
  const session = response.locals.session as Awaited<ReturnType<typeof getSession>>;

  if (!name || !email || password.length < 8) {
    response.status(400).json({ error: "Name, email and a password with at least 8 characters are required." });
    return;
  }

  const accountError = await ensureAccountCanBeRequested(email, role, true);

  if (accountError) {
    response.status(409).json({ error: accountError });
    return;
  }

  const pendingAccount = await createPendingAccount({
    email,
    name,
    password,
    publicKeyJson: typeof request.body.publicKeyJson === "string" ? request.body.publicKeyJson : null,
    requestedById: session?.userId,
    role,
  });

  response.status(202).json({
    email: pendingAccount.email,
    expiresAt: pendingAccount.expiresAt,
    requiresConfirmation: true,
  });
});

app.patch("/api/admin/users/:id", requireAdmin, async (request, response) => {
  const id = Number(request.params.id);
  const data: {
    email?: string;
    name?: string;
    passwordHash?: string;
    passwordSalt?: string;
    role?: Role;
  } = {};

  if (Number.isNaN(id)) {
    response.status(400).json({ error: "Invalid user id." });
    return;
  }

  if (typeof request.body.name === "string" && request.body.name.trim()) {
    data.name = request.body.name.trim();
  }

  if (typeof request.body.email === "string" && request.body.email.trim()) {
    data.email = normalizeEmail(request.body.email);
  }

  if (typeof request.body.role === "string") {
    data.role = normalizeRole(request.body.role);
  }

  if (typeof request.body.password === "string" && request.body.password.length > 0) {
    if (request.body.password.length < 8) {
      response.status(400).json({ error: "Password must have at least 8 characters." });
      return;
    }

    const passwordData = await hashPassword(request.body.password);
    data.passwordHash = passwordData.hash;
    data.passwordSalt = passwordData.salt;
  }

  const user = await prisma.user.update({
    data,
    select: {
      createdAt: true,
      email: true,
      id: true,
      name: true,
      role: true,
    },
    where: { id },
  });

  if (data.role || data.passwordHash) {
    await prisma.session.deleteMany({ where: { userId: id } });
  }

  response.json(user);
});

app.delete("/api/admin/users/:id", requireAdmin, async (request, response) => {
  const id = Number(request.params.id);
  const session = response.locals.session as Awaited<ReturnType<typeof getSession>>;

  if (Number.isNaN(id)) {
    response.status(400).json({ error: "Invalid user id." });
    return;
  }

  if (session?.userId === id) {
    response.status(400).json({ error: "You cannot delete your own account while signed in." });
    return;
  }

  await prisma.user.delete({ where: { id } });
  response.status(204).send();
});

app.get("/api/admin/change-requests", requireAdmin, async (_request, response) => {
  const requests = await prisma.managementChangeRequest.findMany({
    include: {
      requestedBy: {
        select: {
          email: true,
          id: true,
          name: true,
          role: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  response.json(requests.map((request) => ({ ...request, payload: parsePayload(request.payloadJson) })));
});

app.post("/api/admin/change-requests/:id/approve", requireAdmin, async (request, response) => {
  const id = Number(request.params.id);
  const session = response.locals.session as Awaited<ReturnType<typeof getSession>>;

  if (Number.isNaN(id) || !session) {
    response.status(400).json({ error: "Invalid change request." });
    return;
  }

  const changeRequest = await applyManagementChange(id, session.userId);
  response.json({ ...changeRequest, payload: parsePayload(changeRequest.payloadJson) });
});

app.post("/api/admin/change-requests/:id/reject", requireAdmin, async (request, response) => {
  const id = Number(request.params.id);
  const session = response.locals.session as Awaited<ReturnType<typeof getSession>>;

  if (Number.isNaN(id) || !session) {
    response.status(400).json({ error: "Invalid change request." });
    return;
  }

  const existingRequest = await prisma.managementChangeRequest.findUnique({ where: { id } });

  if (!existingRequest || existingRequest.status !== "PENDING") {
    response.status(400).json({ error: "Change request is not pending." });
    return;
  }

  const changeRequest = await prisma.managementChangeRequest.update({
    data: {
      reviewedAt: new Date(),
      reviewedById: session.userId,
      reviewNote: typeof request.body.note === "string" ? request.body.note.trim() : null,
      status: "REJECTED",
    },
    where: { id },
  });

  response.json({ ...changeRequest, payload: parsePayload(changeRequest.payloadJson) });
});

app.get("/api/manager/change-requests", requireManager, async (request, response) => {
  const session = response.locals.session as Awaited<ReturnType<typeof getSession>>;
  const showAll = session?.activeRole === "ADMIN" && request.query.all === "true";

  const requests = await prisma.managementChangeRequest.findMany({
    orderBy: { createdAt: "desc" },
    where: showAll ? undefined : { requestedById: session?.userId },
  });

  response.json(requests.map((changeRequest) => ({ ...changeRequest, payload: parsePayload(changeRequest.payloadJson) })));
});

app.post("/api/manager/change-requests", requireManager, async (request, response) => {
  const session = response.locals.session as Awaited<ReturnType<typeof getSession>>;
  const action = normalizeAction(request.body.action);
  const entity = normalizeEntity(request.body.entity);
  const targetId = request.body.targetId === null || request.body.targetId === undefined ? null : Number(request.body.targetId);
  const payload = typeof request.body.payload === "object" && request.body.payload ? request.body.payload : {};

  if (!session || !action || !entity || (action !== "CREATE" && !targetId)) {
    response.status(400).json({ error: "Action, entity and target are required." });
    return;
  }

  const changeRequest = await prisma.managementChangeRequest.create({
    data: {
      action,
      entity,
      payloadJson: JSON.stringify(payload),
      requestedById: session.userId,
      targetId,
    },
  });

  response.status(201).json({ ...changeRequest, payload: parsePayload(changeRequest.payloadJson) });
});

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
  const session = await getSession(request);

  if (!session) {
    response.status(401).json({ error: "Not authenticated." });
    return;
  }

  const contact = await prisma.contact.create({
    data: {
      ownerId: session.userId,
      name: request.body.name,
      role: request.body.role,
      email: request.body.email,
      phone: request.body.phone,
      room: request.body.room,
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

app.get("/api/meals", async (_request, response) => {
  const weekStart = startOfWeek();
  const weekEnd = endOfWeek();
  const meals = await prisma.mealPlan.findMany({
    include: { canteen: true },
    orderBy: [{ date: "asc" }, { id: "asc" }],
    where: {
      date: { gte: weekStart, lt: weekEnd },
    },
  });

  response.json(meals);
});

app.post("/api/meals", async (request, response) => {
  const meal = await prisma.mealPlan.create({
    data: {
      canteenId: Number(request.body.canteenId),
      day: request.body.day,
      date: request.body.date ? new Date(request.body.date) : undefined,
      mainDish: request.body.mainDish,
      vegetarianDish: request.body.vegetarianDish,
      priceCents: Number(request.body.priceCents),
      currency: request.body.currency ?? "EUR",
    },
  });

  response.status(201).json(meal);
});

app.post("/api/admin/import/swfr-meals", requireAdmin, async (_request, response) => {
  const count = await importSwfrMeals();
  response.json({ count });
});

app.get("/api/deadlines", async (_request, response) => {
  const deadlines = await prisma.deadline.findMany({ orderBy: { date: "asc" } });
  response.json(deadlines);
});

app.post("/api/deadlines", async (request, response) => {
  const deadline = await prisma.deadline.create({
    data: {
      title: request.body.title,
      date: new Date(request.body.date),
      description: request.body.description,
    },
  });

  response.status(201).json(deadline);
});

app.get("/api/todos", async (request, response) => {
  const session = await getSession(request);

  if (!session) {
    response.status(401).json({ error: "Not authenticated." });
    return;
  }

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
  const session = await getSession(request);
  const title = typeof request.body.title === "string" ? request.body.title.trim() : "";
  const description = typeof request.body.description === "string" && request.body.description.trim() ? request.body.description.trim() : null;
  const subtasks = Array.isArray(request.body.subtasks)
    ? request.body.subtasks
        .map((subtask: unknown) => (typeof subtask === "string" ? subtask.trim() : ""))
        .filter(Boolean)
    : [];

  if (!session) {
    response.status(401).json({ error: "Not authenticated." });
    return;
  }

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
  const session = await getSession(request);
  const id = Number(request.params.id);
  const completedAt = new Date();

  if (!session) {
    response.status(401).json({ error: "Not authenticated." });
    return;
  }

  if (Number.isNaN(id)) {
    response.status(400).json({ error: "Invalid todo id." });
    return;
  }

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
  const session = await getSession(request);
  const todoId = Number(request.params.todoId);
  const subtaskId = Number(request.params.subtaskId);

  if (!session) {
    response.status(401).json({ error: "Not authenticated." });
    return;
  }

  if (Number.isNaN(todoId) || Number.isNaN(subtaskId)) {
    response.status(400).json({ error: "Invalid todo or subtask id." });
    return;
  }

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
    prisma.module.findMany({
      orderBy: { title: "asc" },
      where: { OR: [{ ownerId: null }, ...(session ? [{ ownerId: session.userId }] : [])] },
    }),
  ]);

  response.json({ spo, modules });
});

app.post("/api/study-info", async (request, response) => {
  const session = await getSession(request);

  if (!session) {
    response.status(401).json({ error: "Not authenticated." });
    return;
  }

  const info = await prisma.studyInfo.create({
    data: {
      ...studyInfoData(request.body),
      ownerId: session.userId,
    },
  });

  response.status(201).json(info);
});

app.get("/api/schedule", async (request, response) => {
  const session = await getSession(request);
  const weekStart = parseWeekStart(request.query.weekStart);
  const weekEnd = endOfWeek(weekStart);
  const schedule = await prisma.scheduleDay.findMany({
    include: {
      lessons: {
        orderBy: { startTime: "asc" },
        where: {
          OR: [{ ownerId: null }, ...(session ? [{ ownerId: session.userId }] : [])],
          AND: [{ OR: [{ date: null }, { date: { gte: weekStart, lt: weekEnd } }] }],
        },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  response.json({ days: schedule, weekEnd, weekStart });
});

app.get("/api/schedule/import-options", async (request, response) => {
  response.json(await getStarPlanOptions(
    typeof request.query.facultyId === "string" ? request.query.facultyId : undefined,
    typeof request.query.semesterId === "string" ? request.query.semesterId : undefined,
  ));
});

app.post("/api/schedule/import", async (request, response) => {
  const session = await getSession(request);

  if (!session) {
    response.status(401).json({ error: "Not authenticated." });
    return;
  }

  const weekStart = parseWeekStart(request.body.weekStart);
  const count = await importStarPlanSchedule({
    facultyId: String(request.body.facultyId ?? ""),
    facultyName: String(request.body.facultyName ?? ""),
    semesterId: String(request.body.semesterId ?? ""),
    semesterName: String(request.body.semesterName ?? ""),
    specialization: typeof request.body.specialization === "string" ? request.body.specialization : null,
    studyGroup: String(request.body.studyGroup ?? ""),
    userId: session.userId,
    weekStart,
  });

  response.json({ count, weekStart });
});

app.post("/api/schedule/lessons", async (request, response) => {
  const session = await getSession(request);

  if (!session) {
    response.status(401).json({ error: "Not authenticated." });
    return;
  }

  const day = await getOrCreateScheduleDay(typeof request.body.day === "string" ? request.body.day : "Allgemein");
  const inviteeIds = Array.isArray(request.body.inviteeIds)
    ? request.body.inviteeIds.map(Number).filter((id: number) => !Number.isNaN(id) && id !== session.userId)
    : [];
  const inviteeEmails = Array.isArray(request.body.inviteeEmails)
    ? request.body.inviteeEmails.map(normalizeEmail).filter(Boolean)
    : [];
  const encryptedInvitations = Array.isArray(request.body.encryptedInvitations)
    ? request.body.encryptedInvitations as Array<Record<string, unknown>>
    : [];
  const invitees = inviteeIds.length || inviteeEmails.length
    ? await prisma.user.findMany({
        select: { id: true },
        where: {
          id: { not: session.userId },
          OR: [
            ...(inviteeIds.length ? [{ id: { in: inviteeIds } }] : []),
            ...(inviteeEmails.length ? [{ email: { in: inviteeEmails } }] : []),
          ],
        },
      })
    : [];

  const lesson = await prisma.$transaction(async (transaction) => {
    const createdLesson = await transaction.lesson.create({
      data: {
        ...lessonData(request.body, day.id),
        ownerId: session.userId,
      },
    });

    for (const invitee of invitees) {
      const encryptedInvitation = encryptedInvitations.find((item) => Number(item.recipientId) === invitee.id);
      await transaction.lessonInvitation.create({
        data: {
          encryptedKey: typeof encryptedInvitation?.encryptedKey === "string" ? encryptedInvitation.encryptedKey : null,
          encryptedPayload: typeof encryptedInvitation?.encryptedPayload === "string" ? encryptedInvitation.encryptedPayload : null,
          encryptionIv: typeof encryptedInvitation?.encryptionIv === "string" ? encryptedInvitation.encryptionIv : null,
          lessonId: createdLesson.id,
          recipientId: invitee.id,
          senderId: session.userId,
        },
      }).catch(() => undefined);
    }

    return createdLesson;
  });

  response.status(201).json(lesson);
});

app.get("/api/schedule/invitations", async (request, response) => {
  const session = await getSession(request);

  if (!session) {
    response.status(401).json({ error: "Not authenticated." });
    return;
  }

  const invitations = await prisma.lessonInvitation.findMany({
    include: {
      lesson: {
        include: { scheduleDay: true },
      },
      sender: {
        select: {
          email: true,
          id: true,
          name: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    where: { recipientId: session.userId },
  });

  response.json(invitations);
});

app.post("/api/schedule/invitations/:id/accept", async (request, response) => {
  const session = await getSession(request);
  const id = Number(request.params.id);

  if (!session) {
    response.status(401).json({ error: "Not authenticated." });
    return;
  }

  if (Number.isNaN(id)) {
    response.status(400).json({ error: "Invalid invitation id." });
    return;
  }

  const invitation = await prisma.lessonInvitation.findFirst({
    include: { lesson: true },
    where: {
      id,
      recipientId: session.userId,
      status: "PENDING",
    },
  });

  if (!invitation) {
    response.status(404).json({ error: "Invitation not found." });
    return;
  }

  const acceptedInvitation = await prisma.$transaction(async (transaction) => {
    await transaction.lesson.create({
      data: {
        ...invitationLessonData({
          ...invitation.lesson,
          encryptedKey: invitation.encryptedKey ?? invitation.lesson.encryptedKey,
          encryptedPayload: invitation.encryptedPayload ?? invitation.lesson.encryptedPayload,
          encryptionIv: invitation.encryptionIv ?? invitation.lesson.encryptionIv,
        }),
        ownerId: session.userId,
        source: "INVITATION",
        sourceKey: `invitation-${invitation.id}`,
      },
    });

    return transaction.lessonInvitation.update({
      data: {
        respondedAt: new Date(),
        status: "ACCEPTED",
      },
      where: { id: invitation.id },
    });
  });

  response.json(acceptedInvitation);
});

app.post("/api/schedule/invitations/:id/reject", async (request, response) => {
  const session = await getSession(request);
  const id = Number(request.params.id);

  if (!session) {
    response.status(401).json({ error: "Not authenticated." });
    return;
  }

  if (Number.isNaN(id)) {
    response.status(400).json({ error: "Invalid invitation id." });
    return;
  }

  const invitation = await prisma.lessonInvitation.findFirst({
    where: {
      id,
      recipientId: session.userId,
      status: "PENDING",
    },
  });

  if (!invitation) {
    response.status(404).json({ error: "Invitation not found." });
    return;
  }

  const rejectedInvitation = await prisma.lessonInvitation.update({
    data: {
      respondedAt: new Date(),
      status: "REJECTED",
    },
    where: { id: invitation.id },
  });

  response.json(rejectedInvitation);
});

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  console.error(error);
  response.status(500).json({ error: "Internal server error" });
});

const server = app.listen(port, () => {
  console.log(`StudentGo backend listening on http://localhost:${port}`);
  scheduleDailySwfrImport();
});

process.on("SIGINT", async () => {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
});
