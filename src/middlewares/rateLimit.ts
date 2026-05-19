import type { Response, NextFunction } from "express";
import { checkRateLimit } from "../utils/rateLimiter";
import type { AuthenticatedRequest } from "./authenticate";

export const jobRateLimit = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.user!.userId;

  const { allowed, remaining, resetIn } = await checkRateLimit(userId);

  res.setHeader("X-RateLimit-Limit", "10");
  res.setHeader("X-RateLimit-Remaining", remaining.toString());
  res.setHeader("X-RateLimit-Reset", resetIn.toString());

  if (!allowed) {
    res.status(429).json({
      success: false,
      message: `Too many requests. You can submit a maximum of 10 jobs per minute. Try again in ${resetIn} seconds.`,
      retryAfter: resetIn,
    });
    return;
  }

  next();
};
