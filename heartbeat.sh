#!/bin/bash
# whitehack heartbeat — the honest linter
# Rhythm: 4h if scanner broken, daily if recent, weekly if quiet

cd "$(dirname "$0")"

TEST_OUTPUT=$(node bin/whitehack.js scan examples 2>&1)

if [ ! -f "bin/whitehack.js" ] || echo "$TEST_OUTPUT" | grep -q "Cannot find\|TypeError\|SyntaxError"; then
  echo "SCANNER BROKEN"
  echo "NEXT:240"
  exit 0
fi

DAYS_SINCE=$(( ( $(date +%s) - $(git log -1 --format=%ct 2>/dev/null || echo 0) ) / 86400 ))

if [ "$DAYS_SINCE" -lt 7 ]; then
  echo "NEXT:1440"
else
  echo "NEXT:10080"
fi

exit 0