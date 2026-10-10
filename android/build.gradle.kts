plugins {
    id("com.android.application") version "8.13.2" apply false
    // Same Kotlin the Stripe Terminal SDK 6.0.0 is built with; the Compose compiler ships with it.
    id("org.jetbrains.kotlin.android") version "2.3.21" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.3.21" apply false
}
