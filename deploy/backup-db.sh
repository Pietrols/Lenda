#!/usr/bin/env bash
# Nightly Postgres backup to Cloudflare R2.
#
# What it does:
#   1. pg_dump the database (custom DATABASE_URL or the auth service's .env)
#   2. gzip it to a timestamped file
#   3. upload it to R2 under backups/ using the auth service's R2 credentials
#      (reuses @aws-sdk/client-s3 from the existing node_modules)
#   4. prune remote backups older than RETENTION_DAYS (default 14)
#
# Configuration (env vars, all optional):
#   BACKUP_BUCKET    R2 bucket to store backups (default: lenda-backups —
#                    create it once in the Cloudflare dashboard)
#   RETENTION_DAYS   how many days of backups to keep (default: 14)
#   ENV_FILE         .env file to source credentials from
#                    (default: ~/lenda/services/auth-service/.env)
#
# Install as a nightly cron with deploy/install-backup-cron.sh.
#
# Restore:
#   gunzip -c lenda-YYYYMMDD-HHMMSS.sql.gz | psql "$DATABASE_URL"
#   (download the object from R2 first; test restores periodically!)

set -euo pipefail

REPO_DIR="${REPO_DIR:-$HOME/lenda}"
ENV_FILE="${ENV_FILE:-$REPO_DIR/services/auth-service/.env}"
BACKUP_BUCKET="${BACKUP_BUCKET:-lenda-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

# Pull individual keys out of the .env rather than sourcing it: secrets may
# contain characters (spaces, $, quotes) that break shell sourcing.
env_get() {
  grep -E "^${1}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- \
    | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'\$//"
}

if [ -f "$ENV_FILE" ]; then
  DATABASE_URL="${DATABASE_URL:-$(env_get DATABASE_URL)}"
  R2_ACCOUNT_ID="${R2_ACCOUNT_ID:-$(env_get R2_ACCOUNT_ID)}"
  R2_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID:-$(env_get R2_ACCESS_KEY_ID)}"
  R2_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY:-$(env_get R2_SECRET_ACCESS_KEY)}"
  export R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY
fi

: "${DATABASE_URL:?DATABASE_URL is not set (not in environment or $ENV_FILE)}"
: "${R2_ACCOUNT_ID:?R2_ACCOUNT_ID is not set}"
: "${R2_ACCESS_KEY_ID:?R2_ACCESS_KEY_ID is not set}"
: "${R2_SECRET_ACCESS_KEY:?R2_SECRET_ACCESS_KEY is not set}"

STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="/tmp/lenda-${STAMP}.sql.gz"

echo "[backup] dumping database..."
pg_dump "$DATABASE_URL" | gzip > "$OUT"
SIZE=$(du -h "$OUT" | cut -f1)
echo "[backup] dump complete: $OUT ($SIZE)"

echo "[backup] uploading to r2://${BACKUP_BUCKET}/backups/ and pruning > ${RETENTION_DAYS}d..."
# Run from the auth service dir so @aws-sdk/client-s3 resolves from its
# node_modules (pnpm strict layout).
cd "$REPO_DIR/services/auth-service"
BACKUP_FILE="$OUT" BACKUP_BUCKET="$BACKUP_BUCKET" RETENTION_DAYS="$RETENTION_DAYS" \
node --input-type=module - << 'NODE'
import { readFileSync } from "fs";
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  BACKUP_FILE,
  BACKUP_BUCKET,
  RETENTION_DAYS,
} = process.env;

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const key = `backups/${BACKUP_FILE.split("/").pop()}`;
await s3.send(
  new PutObjectCommand({
    Bucket: BACKUP_BUCKET,
    Key: key,
    Body: readFileSync(BACKUP_FILE),
    ContentType: "application/gzip",
  }),
);
console.log(`[backup] uploaded ${key}`);

const cutoff = Date.now() - Number(RETENTION_DAYS) * 24 * 60 * 60 * 1000;
const listed = await s3.send(
  new ListObjectsV2Command({ Bucket: BACKUP_BUCKET, Prefix: "backups/" }),
);
for (const obj of listed.Contents ?? []) {
  if (obj.LastModified && obj.LastModified.getTime() < cutoff) {
    await s3.send(
      new DeleteObjectCommand({ Bucket: BACKUP_BUCKET, Key: obj.Key }),
    );
    console.log(`[backup] pruned ${obj.Key}`);
  }
}
console.log("[backup] done");
NODE

rm -f "$OUT"
echo "[backup] local temp removed; backup complete"
