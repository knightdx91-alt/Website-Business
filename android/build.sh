#!/usr/bin/env bash
# Builds the signed Android app and uploads it to R2, where Settings → "Download Android app" serves it.
# Needs ANDROID_HOME pointing at an Android SDK with platforms;android-36 and build-tools.
# The signing key is NOT in git. The owner keeps website-business.jks and its password; put both in
# $KEYDIR (website-business.jks + password.txt) before building. Every update must be signed with this
# same key, or phones will refuse to install it over the old app.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KEYDIR="${KEYDIR:-$HOME/.website-business-keys}"
if [ ! -f "$KEYDIR/website-business.jks" ] || [ ! -f "$KEYDIR/password.txt" ]; then
  echo "Put website-business.jks and password.txt in $KEYDIR first (ask the owner for them)." >&2
  exit 1
fi
cd "$ROOT"
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
(cd android && gradle --no-daemon -q assembleRelease -PwbKeystore="$KEYDIR/website-business.jks" -PwbKeystorePassword="$(cat "$KEYDIR/password.txt")")
npx wrangler r2 object put website-business-sites/_build/website-business.apk --remote \
  --file android/app/build/outputs/apk/release/app-release.apk --content-type application/vnd.android.package-archive
echo "Uploaded. Bump versionCode in android/app/build.gradle.kts before the next release."
