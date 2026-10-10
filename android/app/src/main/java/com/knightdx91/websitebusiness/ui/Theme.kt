package com.knightdx91.websitebusiness.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val Navy = Color(0xFF14213D)
val Orange = Color(0xFFFCA311)
val Good = Color(0xFF15803D)
val Warn = Color(0xFFA24B08)

private val Light = lightColorScheme(
    primary = Navy,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFDDE3F2),
    onPrimaryContainer = Navy,
    secondary = Orange,
    onSecondary = Navy,
    secondaryContainer = Color(0xFFFFE8C2),
    onSecondaryContainer = Color(0xFF4A2E00),
    background = Color(0xFFF4F5F8),
    surface = Color.White,
    surfaceVariant = Color(0xFFECEEF3),
    onSurfaceVariant = Color(0xFF5B6270),
    outline = Color(0xFFD5D9E1),
)

private val Dark = darkColorScheme(
    primary = Color(0xFFB9C6EA),
    onPrimary = Navy,
    primaryContainer = Color(0xFF2B3A5E),
    onPrimaryContainer = Color(0xFFDDE3F2),
    secondary = Orange,
    onSecondary = Navy,
    secondaryContainer = Color(0xFF5A3A00),
    onSecondaryContainer = Color(0xFFFFE8C2),
    background = Color(0xFF0F131C),
    surface = Color(0xFF171C27),
    surfaceVariant = Color(0xFF232A3A),
    onSurfaceVariant = Color(0xFFB4BAC8),
    outline = Color(0xFF3B4357),
)

@Composable
fun WbTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = if (isSystemInDarkTheme()) Dark else Light, content = content)
}
