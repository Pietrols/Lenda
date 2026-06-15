import { execSync } from "node:child_process";

// Vitest globalSetup: runs once before the whole suite.
//
// The integration tests run against a real Postgres database (the DATABASE_URL
// from the workspace .env). If the schema is behind the committed migrations,
// queries like prisma.user.create() fail with PrismaClientKnownRequestError
// because columns added since the tests were written don't exist yet.
//
// Applying `prisma migrate deploy` here guarantees the test database matches
// the current schema before any test file imports the Prisma client. We use
// `deploy` (not `dev`) because it only applies committed migrations and never
// prompts — the right behaviour for tests and CI.
export default function setup() {
  console.log("[test] Applying database migrations before tests...");
  execSync("pnpm --filter @lenda/database exec prisma migrate deploy", {
    stdio: "inherit",
  });
}
