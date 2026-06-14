# Deployment & Database Migrations

Prisma Migrate is the **only** supported path for schema changes. The production
database is **never** touched with raw `psql` for DDL again.

The schema source of truth is `packages/database/prisma/schema.prisma`. Every
change to it must be accompanied by a committed migration under
`packages/database/prisma/migrations/`.

---

## Making a schema change (local)

1. Edit `packages/database/prisma/schema.prisma`.
2. Generate the migration (runs against your **local dev** database only):

   ```bash
   cd packages/database
   npx prisma migrate dev --name <short_change_name>
   ```

3. Review the generated `prisma/migrations/<timestamp>_<short_change_name>/migration.sql`.
4. Commit the **entire** new migration folder together with the `schema.prisma` change.

Never hand-edit production. Never run ad-hoc `ALTER`/`CREATE` against the server.

---

## Deploying to the server

```bash
git pull
pnpm --filter @lenda/database exec prisma migrate deploy
pnpm --filter @lenda/database exec prisma generate
pm2 restart all
```

`prisma migrate deploy` applies only migrations that are not yet recorded in the
`_prisma_migrations` table, in order. It never generates new migrations and never
prompts.

---

## ⚠️ ONE-TIME baseline step (run once, before the first `migrate deploy`)

The migration history previously ended at `20260430162144_add_pricing_mode`.
After that, several changes were applied to production **manually via psql**:

- `Category` model + `CategoryStatus` enum
- Booking negotiation fields + `NEGOTIATION_FAILED` on `BookingStatus`
- `notifications.referenceId` column
- `NotificationType` values (booking-notification set + `NEGOTIATION_COUNTER` / `NEGOTIATION_FAILED`)
- `CommissionLedger` model + `CommissionStatus` enum

These are now consolidated into the migration
`20260614120000_baseline_manual_changes`. **Because production already has all of
these objects**, this migration must NOT be executed there — it must instead be
recorded as already-applied:

```bash
# Run ONCE on the server, before the first `prisma migrate deploy`:
pnpm --filter @lenda/database exec prisma migrate resolve --applied 20260614120000_baseline_manual_changes
```

`migrate resolve --applied` writes a row into `_prisma_migrations` marking the
baseline as done **without running its SQL**. This aligns Prisma's migration
history with the actual state of production, so the very next `migrate deploy`
starts cleanly from this point and applies only genuinely new migrations going
forward.

### Notes

- The baseline `migration.sql` is fully idempotent (`IF NOT EXISTS`,
  `ADD VALUE IF NOT EXISTS`, guarded `DO` blocks). So even if it were ever run
  against the already-migrated production database, it would be a harmless no-op.
  We still use `resolve --applied` rather than executing it, per the rule above.
- On a **fresh** database (e.g. a new environment), do **not** run the resolve
  step — just run `prisma migrate deploy`, which will execute the baseline and
  all prior migrations from scratch to build the full schema.

---

## Quick reference

| Situation                              | Command                                                                 |
| -------------------------------------- | ----------------------------------------------------------------------- |
| New schema change (local)              | `npx prisma migrate dev --name <name>`                                  |
| Deploy to server                       | `prisma migrate deploy` → `prisma generate` → `pm2 restart all`         |
| First deploy on existing prod (once)   | `prisma migrate resolve --applied 20260614120000_baseline_manual_changes` first |
| Fresh/new environment                  | `prisma migrate deploy` (no resolve step)                               |
| Verify no drift (CI / pre-deploy)      | `prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --exit-code` |
