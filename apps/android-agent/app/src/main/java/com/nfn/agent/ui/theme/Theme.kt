package com.nfn.agent.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val AgentColorScheme = lightColorScheme(
    primary = OcreAccent,
    background = MobileBackground,
    surface = MobileSurface,
    onPrimary = MobileText,
    onBackground = MobileText,
    onSurface = MobileText,
    error = Critical,
)

@Composable
fun NfnAgentTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = AgentColorScheme,
        typography = AppTypography,
        content = content,
    )
}

