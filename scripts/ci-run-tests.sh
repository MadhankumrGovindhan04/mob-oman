#!/usr/bin/env bash
set -euo pipefail

ADB="${ANDROID_HOME}/platform-tools/adb"
MAX_ATTEMPTS=120

echo "ADB devices before boot wait:"
"$ADB" devices -l || true

echo "Waiting for emulator device..."
"$ADB" wait-for-device

echo "Waiting for sys.boot_completed..."
attempt=0
boot_completed=""
until [[ "$boot_completed" == "1" ]]; do
  attempt=$((attempt + 1))
  if [[ $attempt -gt $MAX_ATTEMPTS ]]; then
    echo "Emulator failed to finish booting within timeout."
    "$ADB" devices -l || true
    exit 1
  fi

  boot_completed=$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)
  if [[ "$boot_completed" != "1" ]]; then
    sleep 5
  fi
done

echo "Emulator boot completed."
"$ADB" shell input keyevent 82 || true
"$ADB" devices -l

npm run test:ci
