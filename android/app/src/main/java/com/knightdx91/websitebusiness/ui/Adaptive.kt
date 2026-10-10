package com.knightdx91.websitebusiness.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.unit.dp

/**
 * How much room the window has, so screens lay out for the device they are on: the Fold closed (or any phone) is
 * Compact and gets one column; the Fold open and small tablets are Medium (two columns where it helps); large tablets
 * and desktop-mode windows are Expanded (list + detail side by side). Thresholds follow Android's window size classes.
 */
enum class WidthClass { Compact, Medium, Expanded }

data class WindowInfo(val width: WidthClass, val widthDp: Int, val heightDp: Int) {
    /** Two columns of cards instead of one. */
    val twoColumns get() = width != WidthClass.Compact
    /** A list on the left and the open item on the right. */
    val listDetail get() = width == WidthClass.Expanded
    val landscape get() = widthDp > heightDp
}

val LocalWindowInfo = compositionLocalOf { WindowInfo(WidthClass.Compact, 400, 800) }

@Composable
fun rememberWindowInfo(): WindowInfo {
    val c = LocalConfiguration.current
    val w = c.screenWidthDp
    val cls = when {
        w < 600 -> WidthClass.Compact
        w < 840 -> WidthClass.Medium
        else -> WidthClass.Expanded
    }
    return WindowInfo(cls, w, c.screenHeightDp)
}

/**
 * Lays `blocks` out in one column on a phone and in two balanced columns when the window is wide enough. Each block is
 * a composable (usually one card); order is kept reading left-to-right, top-to-bottom.
 */
@Composable
fun AdaptiveColumns(modifier: Modifier = Modifier, gap: Int = 10, blocks: List<@Composable () -> Unit>) {
    val info = LocalWindowInfo.current
    if (!info.twoColumns || blocks.size < 2) {
        Column(modifier, verticalArrangement = Arrangement.spacedBy(gap.dp)) { blocks.forEach { it() } }
        return
    }
    val left = blocks.filterIndexed { i, _ -> i % 2 == 0 }
    val right = blocks.filterIndexed { i, _ -> i % 2 == 1 }
    Row(modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(gap.dp)) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(gap.dp)) { left.forEach { it() } }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(gap.dp)) { right.forEach { it() } }
    }
}
