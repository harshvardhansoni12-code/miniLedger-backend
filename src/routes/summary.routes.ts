import { Router, type Request, type Response } from "express";
import type { AuthLocals } from "../middleware/auth.middleware.js";
import { prisma } from "../lib/prisma.js";

export const summaryRouter = Router();

summaryRouter.get(
  "/",
  async (_req: Request, res: Response<unknown, AuthLocals>) => {
    const userId = res.locals.userId;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const [totalLent, totalRepaid, overdue] = await Promise.all([
      prisma.loan.aggregate({
        where: { userId },
        _sum: { amount: true },
      }),
      prisma.loan.aggregate({
        where: { userId, repaidAt: { not: null } },
        _sum: { amount: true },
      }),
      prisma.loan.aggregate({
        where: { userId, repaidAt: null, dueDate: { lt: today } },
        _sum: { amount: true },
      }),
    ]);

    res.json({
      totalLent: totalLent._sum.amount ?? "0.00",
      totalRepaid: totalRepaid._sum.amount ?? "0.00",
      overdueAmount: overdue._sum.amount ?? "0.00",
    });
  },
);
