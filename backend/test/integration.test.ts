import assert from "node:assert/strict";
import { existsSync, rmSync } from "node:fs";
import { ServerResponse } from "node:http";
import { Readable, Writable } from "node:stream";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { after, before } from "node:test";
import Database from "better-sqlite3";
import type { app as expressApp } from "../src/app";
import type { prisma as prismaClient } from "../src/prisma";
import type { hashPassword as hashPasswordFunction } from "../src/modules/auth/auth.service";

const databasePath = path.join(tmpdir(), `studentgo-integration-${process.pid}.db`);
const databaseUrl = `file:${databasePath}`;

if (existsSync(databasePath)) {
  rmSync(databasePath);
}

process.env.DATABASE_URL = databaseUrl;
Object.assign(process.env, { NODE_ENV: "test" });
process.env.CORS_ORIGIN = "http://localhost:8081";
process.env.AUTH_RATE_LIMIT = "1000";

let adminToken = "";
let canteenId = 0;
let app: typeof expressApp;
let prisma: typeof prismaClient;
let hashPassword: typeof hashPasswordFunction;

function createTestSchema() {
  const database = new Database(databasePath);

  database.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE "User" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL UNIQUE,
      "passwordHash" TEXT NOT NULL,
      "passwordSalt" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'USER',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "UserPublicKey" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "userId" INTEGER NOT NULL,
      "publicKeyJson" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "UserPublicKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
    CREATE UNIQUE INDEX "UserPublicKey_userId_publicKeyJson_key" ON "UserPublicKey"("userId", "publicKeyJson");

    CREATE TABLE "Session" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "tokenHash" TEXT NOT NULL UNIQUE,
      "activeRole" TEXT NOT NULL,
      "userId" INTEGER NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "expiresAt" DATETIME NOT NULL,
      CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE TABLE "Canteen" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL,
      "location" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "MealPlan" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "canteenId" INTEGER NOT NULL,
      "day" TEXT NOT NULL,
      "date" DATETIME,
      "mainDish" TEXT NOT NULL,
      "vegetarianDish" TEXT,
      "priceCents" INTEGER NOT NULL,
      "currency" TEXT NOT NULL DEFAULT 'EUR',
      "isPersonal" BOOLEAN NOT NULL DEFAULT false,
      "source" TEXT NOT NULL DEFAULT 'MANUAL',
      "sourceKey" TEXT UNIQUE,
      "importedAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "MealPlan_canteenId_fkey" FOREIGN KEY ("canteenId") REFERENCES "Canteen" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );

    CREATE TABLE "Deadline" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "title" TEXT NOT NULL,
      "date" DATETIME NOT NULL,
      "description" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  database.close();
}

class MockRequest extends Readable {
  private isBodySent = false;

  constructor(
    public url: string,
    public method: string,
    public headers: Record<string, string>,
    private body: string,
  ) {
    super();
    (this as unknown as { socket: unknown }).socket = { remoteAddress: "127.0.0.1" };
  }

  _read() {
    if (this.isBodySent) {
      return;
    }

    this.isBodySent = true;

    if (this.body) {
      this.push(this.body);
    }

    this.push(null);
  }
}

async function api(pathname: string, options: { body?: string; headers?: Record<string, string>; method?: string } = {}) {
  const headers = Object.fromEntries(
    Object.entries(options.headers ?? {}).map(([name, value]) => [name.toLowerCase(), value]),
  );
  const request = new MockRequest(pathname, options.method ?? "GET", {
    host: "127.0.0.1",
    ...headers,
  }, "");

  if (options.body) {
    (request as unknown as { body: unknown }).body = JSON.parse(options.body);
  }
  let responseBody = "";
  const response = new ServerResponse(request as never);
  const socket = new Writable({
    write(chunk, _encoding, callback) {
      responseBody += chunk.toString();
      callback();
    },
  });

  Object.assign(socket, {
    cork() {},
    destroySoon() {},
    setTimeout() {
      return socket;
    },
    uncork() {},
  });
  response.assignSocket(socket as never);

  await new Promise<void>((resolve, reject) => {
    response.once("finish", resolve);
    (app as unknown as { handle: (request: never, response: never, callback: (error?: unknown) => void) => void })
      .handle(request as never, response as never, reject);
  });

  return {
    json: async () => JSON.parse(responseBody.split("\r\n\r\n").at(-1) ?? responseBody),
    status: response.statusCode,
    text: async () => responseBody,
  };
}

before(async () => {
  createTestSchema();

  ({ app } = await import("../src/app"));
  ({ prisma } = await import("../src/prisma"));
  ({ hashPassword } = await import("../src/modules/auth/auth.service"));

  const passwordData = await hashPassword("test-password");
  await prisma.user.create({
    data: {
      email: "admin@studentgo.test",
      name: "Integration Admin",
      passwordHash: passwordData.hash,
      passwordSalt: passwordData.salt,
      role: "ADMIN",
    },
  });

  const canteen = await prisma.canteen.create({
    data: {
      location: "Campus",
      name: "Integration Mensa",
    },
  });
  canteenId = canteen.id;

  const loginResponse = await api("/api/auth/login", {
    body: JSON.stringify({
      email: "admin@studentgo.test",
      loginAs: "ADMIN",
      password: "test-password",
    }),
    method: "POST",
  });
  const loginBody = await loginResponse.json() as { token: string };

  assert.equal(loginResponse.status, 200);
  assert.equal(typeof loginBody.token, "string");
  adminToken = loginBody.token;
});

after(async () => {
  await prisma.$disconnect();

  for (const suffix of ["", "-journal", "-shm", "-wal"]) {
    const candidate = `${databasePath}${suffix}`;
    if (existsSync(candidate)) {
      rmSync(candidate);
    }
  }
});

test("rejects unauthenticated global resource mutations", async () => {
  const deadlineResponse = await api("/api/deadlines", {
    body: JSON.stringify({ date: "2026-05-06", title: "Blocked" }),
    method: "POST",
  });
  const mealResponse = await api("/api/meals", {
    body: JSON.stringify({ canteenId, day: "Montag", mainDish: "Blocked", priceCents: 100 }),
    method: "POST",
  });

  assert.equal(deadlineResponse.status, 403);
  assert.equal(mealResponse.status, 403);
  assert.equal(await prisma.deadline.count(), 0);
  assert.equal(await prisma.mealPlan.count(), 0);
});

test("allows managers and admins to create validated global resources", async () => {
  const deadlineResponse = await api("/api/deadlines", {
    body: JSON.stringify({ date: "2026-05-06", description: "Exam registration", title: "Registration closes" }),
    headers: { Authorization: `Bearer ${adminToken}` },
    method: "POST",
  });
  const mealResponse = await api("/api/meals", {
    body: JSON.stringify({ canteenId, currency: "EUR", day: "Mittwoch", mainDish: "Pasta", priceCents: 450 }),
    headers: { Authorization: `Bearer ${adminToken}` },
    method: "POST",
  });

  assert.equal(deadlineResponse.status, 201);
  assert.equal(mealResponse.status, 201);
  assert.equal(await prisma.deadline.count(), 1);
  assert.equal(await prisma.mealPlan.count(), 1);
});

test("returns validation errors for malformed authenticated resource writes", async () => {
  const response = await api("/api/meals", {
    body: JSON.stringify({ canteenId, day: "Montag", mainDish: "", priceCents: -1 }),
    headers: { Authorization: `Bearer ${adminToken}` },
    method: "POST",
  });
  const body = await response.json() as { error: string };

  assert.equal(response.status, 400);
  assert.match(body.error, /main dish|required|priceCents/i);
});
