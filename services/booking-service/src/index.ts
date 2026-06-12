import "dotenv/config";
import app from "./app";
import { config } from "./config";
import { prisma } from "@lenda/database";
import { expireNegotiations } from "./services/negotiation.service";

async function main() {
  await prisma.$connect();
  console.log("Database connected");

  app.listen(config.BOOKING_PORT, () => {
    console.log(`Booking Service running on port ${config.BOOKING_PORT}`);
    console.log(`Health: http://localhost:${config.BOOKING_PORT}/health`);
    setInterval(() => {
      expireNegotiations().catch((err) =>
        console.error("Negotiation expiry sweep failed:", err),
      );
    }, 5 * 60 * 1000);
  });
}

main().catch((err) => {
  console.error("Failed to start booking service:", err);
  process.exit(1);
});
