import express, { Application } from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { config } from "./config";
import { errorHandler } from "./middleware/errorHandler";
import listingRoutes from "./routes/listing.routes";
import bookingRoutes from "./routes/booking.routes";
import reviewRoutes from "./routes/review.routes";
import likeRoutes from "./routes/like.routes";
import notificationRoutes from "./routes/notification.routes";
import adminRoutes from "./routes/admin.routes";
import messageRouter from "./routes/message.routes";
import { authenticate, requireRole } from "./middleware/authenticate";
import { Role } from "@lenda/types";
import { prisma } from "@lenda/database";

const app: Application = express();
app.set("trust proxy", 1);

app.use(helmet());
app.use(cors({ origin: config.CORS_ORIGINS.split(",") }));
app.use(express.json());
app.use(morgan("dev"));

app.use("/bookings", bookingRoutes);
app.use("/reviews", reviewRoutes);
app.use("/likes", likeRoutes);
app.use("/notifications", notificationRoutes);
app.use("/admin", adminRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "booking-service" });
});

app.use("/listings", listingRoutes);
app.use(errorHandler);

app.use("/bookings/:bookingId/messages", messageRouter);

app.get(
  "/admin/listings",
  authenticate,
  requireRole(Role.ADMIN),
  async (req, res, next) => {
    try {
      const listings = await prisma.listing.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          title: true,
          pillar: true,
          category: true,
          status: true,
          createdAt: true,
          host: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json({ listings, total: listings.length });
    } catch (err) {
      next(err);
    }
  },
);

export default app;
