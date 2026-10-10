import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
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
        versionCode = 6
        versionName = "2.0"
        // The Worker the app talks to. The Tap to Pay intent:// link may name another origin with ?o=.
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

    buildFeatures {
        compose = true
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin {
    compilerOptions { jvmTarget.set(JvmTarget.JVM_17) }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2025.10.00")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-core")
    implementation("androidx.activity:activity-compose:1.10.1")
    implementation("androidx.navigation:navigation-compose:2.9.3")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.9.2")
    implementation("androidx.core:core-ktx:1.17.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
    // Sign in with Google (Credential Manager).
    implementation("androidx.credentials:credentials:1.5.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.5.0")
    implementation("com.google.android.libraries.identity.googleid:googleid:1.1.1")
    // Background check for new team activity (there is no Chrome here, so no Web Push).
    implementation("androidx.work:work-runtime-ktx:2.10.3")
    // Stripe Terminal, Tap to Pay on Android (in-person card payments on the phone itself).
    implementation("com.stripe:stripeterminal-taptopay:6.0.0")
    implementation("com.stripe:stripeterminal-core:6.0.0")
}
