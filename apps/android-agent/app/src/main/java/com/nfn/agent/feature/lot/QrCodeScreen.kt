package com.nfn.agent.feature.lot

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp

@Composable
fun QrCodeScreen(
    lotId: String,
    onDone: () -> Unit,
) {
    Scaffold { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Color.White)
                .padding(24.dp),
            verticalArrangement = Arrangement.SpaceBetween,
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                contentAlignment = Alignment.Center,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text("QR handoff screen", style = MaterialTheme.typography.headlineSmall, color = Color.Black)
                    Text(
                        text = "[[ QR :: $lotId ]]",
                        fontFamily = FontFamily.Monospace,
                        color = Color.Black,
                    )
                    Text(
                        text = lotId,
                        fontFamily = FontFamily.Monospace,
                        style = MaterialTheme.typography.headlineMedium,
                        color = Color.Black,
                    )
                }
            }
            Button(onClick = onDone, modifier = Modifier.fillMaxWidth()) {
                Text("Back to round")
            }
        }
    }
}

