import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.routes.js";
import { loanRouter } from "./routes/loan.routes.js";
import { summaryRouter } from "./routes/summary.routes.js";
import { requireAuth } from "./middleware/auth.middleware.js";
import { errorHandler } from "./middleware/error-handler.js";

const configuredOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function isDevelopmentOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:") return false;
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return true;

    const octets = url.hostname.split(".").map(Number);
    const firstOctet = octets[0];
    const secondOctet = octets[1];
    return (
      octets.length === 4 &&
      octets.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255) &&
      firstOctet !== undefined &&
      secondOctet !== undefined &&
      (firstOctet === 10 ||
        (firstOctet === 192 && secondOctet === 168) ||
        (firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31))
    );
  } catch {
    return false;
  }
}

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin(origin, callback) {
        if (
          !origin ||
          configuredOrigins.includes(origin) ||
          (process.env.NODE_ENV !== "production" && isDevelopmentOrigin(origin))
        ) {
          callback(null, true);
          return;
        }

        callback(new Error("Origin is not allowed by CORS"));
      },
      allowedHeaders: ["Authorization", "Content-Type"],
      methods: ["GET", "POST", "PATCH", "OPTIONS"],
    }),
  );
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.json({ message: "MiniLedger API" });
  });

  app.use("/auth", authRouter);
  app.use("/api", requireAuth);
  app.use("/api/loans", loanRouter);
  app.use("/api/summary", summaryRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: "Route not found" });
  });

  app.use(errorHandler);

  return app;
}
