#!/usr/bin/env bash
set -euo pipefail

ANDROID_SDK_ROOT="${ANDROID_HOME:-$ANDROID_SDK_ROOT}"
ADB="$ANDROID_SDK_ROOT/platform-tools/adb"

echo "Waiting for Android emulator to finish booting..."
"$ADB" wait-for-device

boot_completed=""
until [[ "$boot_completed" == "1" ]]; do
  boot_completed=$("$ADB" shell getprop sys.boot_completed | tr -d '\r')
  sleep 2
done

echo "Emulator boot completed."
