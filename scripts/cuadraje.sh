#!/bin/bash
LOG=/home/salo/omnic3ntro/logs/cuadraje.log
mkdir -p "$(dirname $LOG)"
echo "--- $(date '+%Y-%m-%d %H:%M:%S') ---" >> "$LOG"
curl -s -X POST http://localhost:3000/api/admin/cuadraje \
  -H "x-cron-secret: ${CRON_SECRET}" \
  -H "Content-Type: application/json" >> "$LOG" 2>&1
echo "" >> "$LOG"
