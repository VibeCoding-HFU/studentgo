import { NextFunction, Request, Response } from "express";

const localOrigins = new Set([
  "http://localhost:8081",
  "http://127.0.0.1:8081",
  "http://localhost:19006",
  "http://127.0.0.1:19006",
]);

export function configuredCorsOrigin() {
  const configuredOrigin = process.env.CORS_ORIGIN;

  if (!configuredOrigin?.trim()) {
    return process.env.NODE_ENV === "production" ? [] : [...localOrigins];
  }

  return configuredOrigin
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function securityHeaders(_request: Request, response: Response, next: NextFunction) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("Cross-Origin-Resource-Policy", "same-site");
  next();
}

