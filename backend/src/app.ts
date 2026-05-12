import cors from "cors";
import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import { registerAccountRoutes } from "./modules/account/account.routes";
import { registerAdminRoutes } from "./modules/admin/admin.routes";
import { registerAuthRoutes } from "./modules/auth/auth.routes";
import { importSwfrMeals, scheduleDailySwfrImport } from "./modules/schedule/schedule-imports";
import { registerScheduleRoutes } from "./modules/schedule/schedule.routes";
import { registerResourceRoutes } from "./modules/resources/resources.routes";
import { requireAdmin } from "./modules/auth/auth.service";
import { HttpError } from "./shared/http/http-error";
import { createRateLimit } from "./shared/rate-limit";
import { configuredCorsOrigin, securityHeaders } from "./shared/security";

const app = express();
const port = Number(process.env.PORT ?? 3001);
const authRateLimit = createRateLimit({
  keyPrefix: "auth",
  limit: Number(process.env.AUTH_RATE_LIMIT ?? 20),
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
});
const userSearchRateLimit = createRateLimit({
  keyPrefix: "user-search",
  limit: Number(process.env.USER_SEARCH_RATE_LIMIT ?? 60),
  windowMs: Number(process.env.USER_SEARCH_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
});

app.use(securityHeaders);
app.use(cors({ origin: configuredCorsOrigin() }));
app.use(express.json({ limit: "100kb" }));

app.get("/health", (_request, response) => {
  response.json({ status: "ok", service: "studentgo-backend" });
});

app.use(["/api/auth/login", "/api/auth/register", "/api/auth/confirm"], authRateLimit);
app.use("/api/users/search", userSearchRateLimit);

registerAuthRoutes(app);
registerAdminRoutes(app);
registerAccountRoutes(app);
registerResourceRoutes(app);
registerScheduleRoutes(app);

app.post("/api/admin/import/swfr-meals", requireAdmin, async (_request, response) => {
  const count = await importSwfrMeals();
  response.json({ count });
});

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  if (error instanceof HttpError) {
    response.status(error.status).json({ error: error.message });
    return;
  }

  console.error(error);
  response.status(500).json({ error: "Internal server error" });
});

export function startMaintenanceTasks() {
  scheduleDailySwfrImport();
}

export { app, port };
