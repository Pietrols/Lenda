import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { config, isDev } from "./config";
import authRoutes from "./routes/auth.routes";
import profileRoutes from "./routes/profile.routes";
import adminRoutes from "./routes/admin.routes";
import subscriptionRoutes from "./routes/subscription.routes";
import floatRouter from "./routes/float.routes";
import { errorHandler } from "./middleware/errorHandler";

export function createApp(): Express {
  const app = express();
  app.set("trust proxy", 1);

  app.use(helmet());

  const allowedOrigins = config.CORS_ORIGINS.split(",").map((o) => o.trim());
  app.use(cors({ origin: allowedOrigins, credentials: true }));

  app.use(express.json({ limit: "10kb" }));
  app.use(morgan(isDev ? "dev" : "combined"));

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: { message: "Too many requests. Please try again later." },
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "auth-service",
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/auth", authRoutes);
  app.use("/profiles", profileRoutes);
  app.use("/admin", adminRoutes);
  app.use("/subscriptions", subscriptionRoutes);
  app.use("/float", floatRouter);

  app.use((_req, res) => {
    res.status(404).json({ message: "Route not found" });
  });

  app.use(errorHandler);

  return app;
}
