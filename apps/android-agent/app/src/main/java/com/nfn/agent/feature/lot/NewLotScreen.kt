package com.nfn.agent.feature.lot

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@Composable
fun NewLotScreen(
    onOpenQr: (String) -> Unit,
    viewModel: NewLotViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(24.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Text("New tonte lot", style = MaterialTheme.typography.headlineSmall)
            Text("Source: ${state.sourceName}")
            Text("Photo is required before the lot can be queued for sync.")
            OutlinedTextField(
                value = state.observedWeight,
                onValueChange = viewModel::updateObservedWeight,
                label = { Text("Observed weight (kg)") },
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = state.cleanliness,
                onValueChange = viewModel::updateCleanliness,
                label = { Text("Cleanliness") },
                modifier = Modifier.fillMaxWidth(),
            )
            state.errorMessage?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            state.lastSavedLotId?.let { lotId ->
                Text("Saved locally as $lotId")
                Button(onClick = { onOpenQr(lotId) }, modifier = Modifier.fillMaxWidth()) {
                    Text("Open QR handoff screen")
                }
            }
            Button(onClick = viewModel::saveDraft, modifier = Modifier.fillMaxWidth()) {
                Text("Save offline and generate QR")
            }
        }
    }
}
