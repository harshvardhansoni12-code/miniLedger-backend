import { Router, type Request, type Response } from "express";
import type { AuthLocals } from "../middleware/auth.middleware.js";
import { prisma } from "../lib/prisma.js";

export const loanRouter = Router();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseAmount(value: unknown): string | null {
  const amount = typeof value === "number" ? String(value) : value;
  if (typeof amount !== "string" || !/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(amount)) {
    return null;
  }

  return Number(amount) > 0 ? amount : null;
}

function parseDueDate(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    ? date
    : null;
}

loanRouter.post("/", async (req: Request, res: Response<unknown, AuthLocals>) => {
  if (!isRecord(req.body)) {
    res.status(400).json({ error: "Request body must be an object" });
    return;
  }

  const friendName =
    typeof req.body.friendName === "string" ? req.body.friendName.trim() : "";
  const amount = parseAmount(req.body.amount);
  const dueDate = parseDueDate(req.body.dueDate);

  if (!friendName || friendName.length > 100 || !amount || !dueDate) {
    res.status(400).json({
      error: "friendName (1-100 characters), a positive amount, and dueDate (YYYY-MM-DD) are required",
    });
    return;
  }

  const loan = await prisma.loan.create({
    data: {
      friendName,
      amount,
      dueDate,
      userId: res.locals.userId,
    },
  });

  res.status(201).json({ loan });
});

loanRouter.get("/", async (_req: Request, res: Response<unknown, AuthLocals>) => {
  const loans = await prisma.loan.findMany({
    where: { userId: res.locals.userId },
    orderBy: { createdAt: "desc" },
  });
  res.json({ loans });
});

loanRouter.patch("/:id/repay", async (req: Request, res: Response<unknown, AuthLocals>) => {
  const loanId = req.params.id;
  if (typeof loanId !== "string") {
    res.status(404).json({ error: "Loan not found" });
    return;
  }

  const loan = await prisma.loan.findFirst({
    where: { id: loanId, userId: res.locals.userId },
  });

  if (!loan) {
    res.status(404).json({ error: "Loan not found" });
    return;
  }
  if (loan.repaidAt) {
    res.status(409).json({ error: "Loan has already been repaid" });
    return;
  }

  const result = await prisma.loan.updateMany({
    where: { id: loan.id, userId: res.locals.userId, repaidAt: null },
    data: { repaidAt: new Date() },
  });

  if (result.count === 0) {
    res.status(409).json({ error: "Loan has already been repaid" });
    return;
  }

  const repaidLoan = await prisma.loan.findUniqueOrThrow({
    where: { id: loan.id },
  });
  res.json({ loan: repaidLoan });
});
