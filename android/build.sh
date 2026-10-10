#!/usr/bin/env bash
# Builds the signed Android app and uploads it to R2, where Settings → "Download Android app" serves it.
# Needs ANDROID_HOME pointing at an Android SDK with platforms;android-36 and build-tools.
# The signing key is NOT in git and isn't backed up anywhere, by the owner's choice. If $KEYDIR has no key,
# this makes a new one. A new key means phones must uninstall the old app and install the new one (leads,
# notes and logins live on the server, so nothing is lost), and ASSET_LINKS in src/worker/index.ts must get
# the new fingerprint printed below, then `npm run deploy`.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KEYDIR="${KEYDIR:-$HOME/.website-business-keys}"
mkdir -p "$KEYDIR" && chmod 700 "$KEYDIR"
if [ ! -f "$KEYDIR/website-business.jks" ]; then
  python3 -c "import secrets;print(secrets.token_urlsafe(18),end='')" > "$KEYDIR/password.txt"
  keytool -genkeypair -keystore "$KEYDIR/website-business.jks" -alias website-business -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$(cat "$KEYDIR/password.txt")" -keypass "$(cat "$KEYDIR/password.txt")" -dname "CN=Website Business, L=Cullman, ST=AL, C=US"
  echo "NEW signing key. Put this fingerprint in ASSET_LINKS (src/worker/index.ts) and redeploy; phones must reinstall:"
  keytool -list -v -keystore "$KEYDIR/website-business.jks" -storepass "$(cat "$KEYDIR/password.txt")" | grep "SHA256:"
fi
cd "$ROOT"
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
(cd android && gradle --no-daemon -q assembleRelease -PwbKeystore="$KEYDIR/website-business.jks" -PwbKeystorePassword="$(cat "$KEYDIR/password.txt")")
npx wrangler r2 object put website-business-sites/_build/website-business.apk --remote \
  --file android/app/build/outputs/apk/release/app-release.apk --content-type application/vnd.android.package-archive
# Version file the app's updater checks (GET /api/android/version).
VC=$(grep -oE 'versionCode = [0-9]+' android/app/build.gradle.kts | grep -oE '[0-9]+')
VN=$(grep -oE 'versionName = "[^"]+"' android/app/build.gradle.kts | cut -d'"' -f2)
printf '{"versionCode":%s,"versionName":"%s","uploadedAt":"%s"}' "$VC" "$VN" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > android/app/build/outputs/apk/release/version.json
npx wrangler r2 object put website-business-sites/_build/website-business.json --remote \
  --file android/app/build/outputs/apk/release/version.json --content-type application/json
echo "Uploaded $VN ($VC). Phones with an older build get an update prompt. Bump versionCode in android/app/build.gradle.kts before the next release."
