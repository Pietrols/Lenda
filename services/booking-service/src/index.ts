import "dotenv/config";
import app from "./app";
import { config } from "./config";
import { prisma } from "@lenda/database";

async function main() {
  await prisma.$connect();
  console.log("Database connected");

  app.listen(config.BOOKING_PORT, () => {
    console.log(`Booking Service running on port ${config.BOOKING_PORT}`);
    console.log(`Health: http://localhost:${config.BOOKING_PORT}/health`);
  });
}

main().catch((err) => {
  console.error("Failed to start booking service:", err);
  process.exit(1);
});
