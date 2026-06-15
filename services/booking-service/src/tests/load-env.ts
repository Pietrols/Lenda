import { config as loadEnv } from "dotenv";

// Runs as the first vitest setup file, before any test imports src/config,
// which validates process.env and calls process.exit(1) on missing vars.
//
// Load the developer's real .env first (present locally, absent on CI), then
// fill any still-missing vars from the committed .env.test stubs. dotenv never
// overrides already-set variables, so real local values always win (the
// integration tests need the real DATABASE_URL) and CI — which has no .env —
// gets the stubs needed to pass config validation.
//
// Paths are relative to the package root, which is the cwd when vitest runs.
loadEnv({ path: ".env" });
loadEnv({ path: ".env.test" });
