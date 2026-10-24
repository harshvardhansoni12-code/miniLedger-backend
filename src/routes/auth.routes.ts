import { randomBytes, randomInt } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { createSession } from "../auth/session-store.js";
import { prisma } from "../lib/prisma.js";

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

type OtpChallenge = {
  code: string;
  expiresAt: number;
  attempts: number;
};

const otpChallenges = new Map<string, OtpChallenge>();
export const authRouter = Router();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidPhone(phone: unknown): phone is string {
  return typeof phone === "string" && /^\+[1-9]\d{7,14}$/.test(phone);
}

authRouter.post("/request-otp", (req: Request, res: Response) => {
  if (!isRecord(req.body) || !isValidPhone(req.body.phone)) {
    res.status(400).json({ error: "phone must be a valid E.164 number" });
    return;
  }

  const phone = req.body.phone;
  const code = randomInt(100_000, 1_000_000).toString();
  otpChallenges.set(phone, {
    code,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
  });

  console.info(`Mock OTP for ${phone}: ${code}`);
  res.json({
    message: "OTP generated.",
    ...(process.env.NODE_ENV === "production" ? {} : { mockOtp: code }),
  });
});

authRouter.post("/verify-otp", async (req: Request, res: Response) => {
  if (
    !isRecord(req.body) ||
    !isValidPhone(req.body.phone) ||
    typeof req.body.otp !== "string" ||
    !/^\d{6}$/.test(req.body.otp)
  ) {
    res.status(400).json({ error: "A valid phone number and six-digit OTP are required" });
    return;
  }

  const phone = req.body.phone;
  const challenge = otpChallenges.get(phone);

  if (!challenge || challenge.expiresAt <= Date.now()) {
    otpChallenges.delete(phone);
    res.status(401).json({ error: "OTP is invalid or expired" });
    return;
  }

  challenge.attempts += 1;
  if (challenge.attempts > MAX_OTP_ATTEMPTS) {
    otpChallenges.delete(phone);
    res.status(429).json({ error: "Too many OTP attempts. Request a new OTP." });
    return;
  }

  if (challenge.code !== req.body.otp) {
    res.status(401).json({ error: "OTP is invalid or expired" });
    return;
  }

  otpChallenges.delete(phone);
  const user = await prisma.user.upsert({
    where: { phone },
    create: { phone },
    update: {},
    select: { id: true, phone: true },
  });
  const accessToken = randomBytes(32).toString("base64url");
  createSession(accessToken, user.id);

  res.json({ accessToken, user });
});
