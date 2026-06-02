require("dotenv/config");

const path = require("node:path");
const { execFileSync } = require("node:child_process");
const Database = require("better-sqlite3");

const BASELINE_MIGRATION = "20260602100000_initial_baseline";
const REQUIRED_MAIN_TABLES = ["User", "Lesson", "ScheduleImportCache"];

function resolveSqlitePath(databaseUrl) {
  if (!databaseUrl || !databaseUrl.startsWith("file:")) {
    throw new Error("DATABASE_URL must point to a SQLite file URL, for example file:./dev.db");
  }

  const withoutProtocol = databaseUrl.slice("file:".length).split("?")[0];
  if (!withoutProtocol) {
    throw new Error("DATABASE_URL does not contain a SQLite path.");
  }

  return path.isAbsolute(withoutProtocol)
    ? withoutProtocol
    : path.resolve(process.cwd(), withoutProtocol);
}

function runPrisma(args) {
  execFileSync("npx", ["prisma", ...args], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });
}

function main() {
  const databasePath = resolveSqlitePath(process.env.DATABASE_URL);
  const database = new Database(databasePath, { readonly: true });

  const tables = new Set(
    database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => row.name),
  );

  database.close();

  const hasMigrationTable = tables.has("_prisma_migrations");
  const nonSystemTables = [...tables].filter(
    (tableName) => tableName !== "_prisma_migrations" && !tableName.startsWith("sqlite_"),
  );

  if (!hasMigrationTable && nonSystemTables.length > 0) {
    const missingMainTables = REQUIRED_MAIN_TABLES.filter((tableName) => !tables.has(tableName));
    if (missingMainTables.length > 0) {
      throw new Error(
        `Existing database does not match the expected main schema. Missing tables: ${missingMainTables.join(", ")}`,
      );
    }

    console.log(`Existing main database detected at ${databasePath}.`);
    console.log(`Marking ${BASELINE_MIGRATION} as applied before deploying curriculum migrations.`);
    runPrisma(["migrate", "resolve", "--applied", BASELINE_MIGRATION]);
  }

  runPrisma(["migrate", "deploy"]);
}

main();
