-- Normalize stored emails to lowercase/trimmed so lookups are effectively
-- case-insensitive (the auth service normalizes all incoming emails the same
-- way as of this change).
--
-- Deliberately NOT collision-safe: if two accounts differ only by casing
-- (e.g. Peter@x.com and peter@x.com), this UPDATE violates the unique
-- constraint and the migration fails. That is the correct outcome - such
-- rows are duplicate accounts that need a human decision (merge or delete)
-- before normalization can proceed.
UPDATE "users"
SET "email" = lower(trim("email"))
WHERE "email" <> lower(trim("email"));
