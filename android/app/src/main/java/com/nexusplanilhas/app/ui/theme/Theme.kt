package com.nexusplanilhas.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val CarminePrimary = Color(0xFFDC143C)
val CarmineDark = Color(0xFF881337)

val DarkBackground = Color(0xFF08090D)
val DarkSurface = Color(0xFF111319)

private val DarkColorScheme = darkColorScheme(
    primary = CarminePrimary,
    onPrimary = Color.White,
    primaryContainer = CarmineDark,
    background = DarkBackground,
    surface = DarkSurface,
    onBackground = Color(0xFFF1F5F9),
    onSurface = Color(0xFFF1F5F9)
)

@Composable
fun NexoTheme(
    darkTheme: Boolean = true,
    content: @Composable () -> Unit
) {
    // Modo escuro permanente
    MaterialTheme(
        colorScheme = DarkColorScheme,
        typography = Typography(),
        content = content
    )
}
