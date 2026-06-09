import { Express } from "express";
import { HfuContactFilter, listHfuContacts } from "./hfu-contacts.service";

const categories = ["faculty", "service", "function"] as const;

export function registerHfuContactRoutes(app: Express) {
  app.get("/api/hfu-contacts", async (request, response) => {
    const solrFilter = typeof request.query.filter === "string" ? request.query.filter : null;
    const limit = typeof request.query.limit === "string" ? Number.parseInt(request.query.limit, 10) : undefined;
    const offset = typeof request.query.offset === "string" ? Number.parseInt(request.query.offset, 10) : undefined;
    const label = typeof request.query.label === "string" ? request.query.label : null;
    const category = typeof request.query.category === "string" && categories.includes(request.query.category as HfuContactFilter["category"])
      ? (request.query.category as HfuContactFilter["category"])
      : null;
    const activeFilterFallback = solrFilter && label && category ? { category, count: 0, id: solrFilter, label, solrFilter } : null;

    response.json(await listHfuContacts(solrFilter, activeFilterFallback, { limit, offset }));
  });
}
