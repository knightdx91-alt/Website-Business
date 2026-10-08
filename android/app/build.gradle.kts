plugins {
    id("com.android.application")
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
        versionCode = 2
        versionName = "1.1"
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

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("com.google.androidbrowserhelper:androidbrowserhelper:2.6.2")
}
