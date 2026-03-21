import express, { Application } from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { config } from "./config";
import { errorHandler } from "./middleware/errorHandler";
import listingRoutes from "./routes/listing.routes";
import bookingRoutes from "./routes/booking.routes";
import reviewRoutes from "./routes/review.routes";

const app: Application = express();

app.use(helmet());
app.use(cors({ origin: config.CORS_ORIGINS.split(",") }));
app.use(express.json());
app.use(morgan("dev"));

app.use("/bookings", bookingRoutes);
app.use("/reviews", reviewRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "booking-service" });
});

app.use("/listings", listingRoutes);
app.use(errorHandler);

export default app;
