import { NextFunction, Request, Response } from "express";

type RateLimitOptions = {
  keyPrefix: string;
  limit: number;
  windowMs: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitEntry>();

function requestIp(request: Request) {
  const forwardedFor = request.header("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.ip || request.socket.remoteAddress || "unknown";
}

export function resetRateLimitBuckets() {
  buckets.clear();
}

export function createRateLimit({ keyPrefix, limit, windowMs }: RateLimitOptions) {
  return (request: Request, response: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${keyPrefix}:${requestIp(request)}`;
    const current = buckets.get(key);
    const entry = current && current.resetAt > now
      ? current
      : { count: 0, resetAt: now + windowMs };

    entry.count += 1;
    buckets.set(key, entry);

    response.setHeader("RateLimit-Limit", String(limit));
    response.setHeader("RateLimit-Remaining", String(Math.max(0, limit - entry.count)));
    response.setHeader("RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > limit) {
      response.status(429).json({ error: "Too many requests. Please try again later." });
      return;
    }

    next();
  };
}

