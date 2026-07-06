#!/usr/bin/env bash
# Installs the nightly database backup cron (03:00 UTC daily). Idempotent:
# safe to re-run; it replaces any previous lenda-backup entry.
#
# Run once on the server:   bash ~/lenda/deploy/install-backup-cron.sh
# Prerequisite: create the "lenda-backups" bucket in the Cloudflare R2
# dashboard (or set BACKUP_BUCKET in the cron line below to an existing one).

set -euo pipefail

REPO_DIR="${REPO_DIR:-$HOME/lenda}"
MARKER="# lenda-backup"
LINE="0 3 * * * /usr/bin/env bash ${REPO_DIR}/deploy/backup-db.sh >> ${HOME}/lenda-backup.log 2>&1 ${MARKER}"

( crontab -l 2>/dev/null | grep -v "${MARKER}" ; echo "${LINE}" ) | crontab -

echo "Installed nightly backup cron:"
crontab -l | grep "${MARKER}"
echo ""
echo "Logs: ${HOME}/lenda-backup.log"
echo "Run a first backup now to verify:  bash ${REPO_DIR}/deploy/backup-db.sh"
