-- Normalize stored emails to lowercase/trimmed so lookups are effectively
-- case-insensitive (the auth service normalizes all incoming emails the same
-- way as of this change).
--
-- Case-duplicate accounts (rows whose emails differ only in case/whitespace,
-- e.g. Kabambapeter24@gmail.com vs kabambapeter24@gmail.com) would violate
-- the unique constraint when normalized. Rather than failing the deploy or
-- silently deleting data, one account per group is kept on the real address
-- (verified accounts win, then the oldest) and the rest are renamed to
-- "<email>.duplicate-<id-prefix>". Renamed accounts keep all their data but
-- can no longer log in; support can merge or delete them deliberately.
WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY lower(trim("email"))
      ORDER BY "emailVerified" DESC, "createdAt" ASC
    ) AS rn,
    COUNT(*) OVER (PARTITION BY lower(trim("email"))) AS group_size
  FROM "users"
)
UPDATE "users" u
SET "email" = lower(trim(u."email")) || '.duplicate-' || left(u."id", 8)
FROM ranked r
WHERE u."id" = r."id"
  AND r.group_size > 1
  AND r.rn > 1;

UPDATE "users"
SET "email" = lower(trim("email"))
WHERE "email" <> lower(trim("email"));
