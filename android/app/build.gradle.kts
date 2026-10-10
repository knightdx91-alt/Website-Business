import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Signing key lives outside the repo. Pass its path and password on the command line:
//   gradle assembleRelease -PwbKeystore=/path/to/website-business.jks -PwbKeystorePassword=...
val keystorePath = providers.gradleProperty("wbKeystore").orNull
val keystorePassword = providers.gradleProperty("wbKeystorePassword").orNull

android {
    namespace = "com.knightdx91.websitebusiness"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.knightdx91.websitebusiness"
        minSdk = 26
        targetSdk = 35
        versionCode = 5
        versionName = "2.0"
        // The web app the Tap to Pay screen talks to (the intent:// link can override it with ?o=).
        buildConfigField("String", "BASE_URL", "\"https://website-business.knightdx91.workers.dev\"")
        // Stripe's Tap to Pay library ships arm64 + armeabi-v7a natives (~20 MB each). Every phone that can run
        // Tap to Pay (Android 13+) is arm64, so the sideloaded APK only carries that one.
        ndk { abiFilters += listOf("arm64-v8a") }
    }

    signingConfigs {
        if (keystorePath != null) {
            create("release") {
                storeFile = file(keystorePath)
                storePassword = keystorePassword
                keyAlias = "website-business"
                keyPassword = keystorePassword
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            if (keystorePath != null) signingConfig = signingConfigs.getByName("release")
        }
    }

    buildFeatures { buildConfig = true }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin {
    compilerOptions { jvmTarget.set(JvmTarget.JVM_17) }
}

dependencies {
    // The app shell: a Trusted Web Activity showing the live web app.
    implementation("com.google.androidbrowserhelper:androidbrowserhelper:2.6.2")
    // Stripe Terminal, Tap to Pay on Android (in-person card payments on the phone itself).
    implementation("com.stripe:stripeterminal-taptopay:6.0.0")
    implementation("com.stripe:stripeterminal-core:6.0.0")
}
