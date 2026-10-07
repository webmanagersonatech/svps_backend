import { Request, Response, NextFunction } from "express";

/**
 * Tiny in-memory rate limiter for public form endpoints (stops spam / double-submits).
 * Allows `max` requests per `windowMs` for each IP. Resets when the server restarts.
 */
export const rateLimit = (max: number, windowMs: number) => {
  const hits = new Map<string, { count: number; resetAt: number }>();

  // forget old entries so the map cannot grow forever
  setInterval(() => {
    const now = Date.now();
    hits.forEach((v, k) => v.resetAt <= now && hits.delete(k));
  }, windowMs).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || "unknown";
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (entry.count >= max) {
      res.setHeader("Retry-After", Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({ message: "Too many requests. Please try again in a few minutes." });
    }
    entry.count += 1;
    next();
  };
};
