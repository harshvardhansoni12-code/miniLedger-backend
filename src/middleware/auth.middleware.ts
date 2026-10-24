import type { NextFunction, Request, Response } from "express";
import { getSessionUserId } from "../auth/session-store.js";

export type AuthLocals = {
  userId: string;
};

export function requireAuth(
  req: Request,
  res: Response<unknown, AuthLocals>,
  next: NextFunction,
): void {
  const authorization = req.get("authorization");
  const match = authorization?.match(/^Bearer ([A-Za-z0-9_-]+)$/);
  const token = match?.[1];
  const userId = token ? getSessionUserId(token) : undefined;

  if (!userId) {
    res.status(401).json({ error: "A valid bearer token is required" });
    return;
  }

  res.locals.userId = userId;
  next();
}
