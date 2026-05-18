import cors from "cors";
import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import { registerAccountRoutes } from "./modules/account/account.routes";
import { registerAdminRoutes } from "./modules/admin/admin.routes";
import { requireAdmin } from "./modules/auth/auth.service";
import { registerAuthRoutes } from "./modules/auth/auth.routes";
import { registerContactRoutes } from "./modules/contacts/contacts.routes";
import { registerDeadlineRoutes } from "./modules/deadlines/deadlines.routes";
import { registerHfuContactRoutes } from "./modules/hfu-contacts/hfu-contacts.routes";
import { registerMealRoutes } from "./modules/meals/meals.routes";
import { importSwfrMeals, scheduleDailySwfrImport } from "./modules/schedule/schedule-imports";
import { registerScheduleRoutes } from "./modules/schedule/schedule.routes";
import { registerStudyInfoRoutes } from "./modules/study-info/study-info.routes";
import { registerTodoRoutes } from "./modules/todos/todos.routes";
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
registerAccountRoutes(app);
registerAdminRoutes(app);
registerContactRoutes(app);
registerDeadlineRoutes(app);
registerHfuContactRoutes(app);
registerMealRoutes(app);
registerScheduleRoutes(app);
registerStudyInfoRoutes(app);
registerTodoRoutes(app);

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
