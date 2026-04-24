package com.nfn.agent.feature.tour

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@Composable
fun TourScreen(
    onNewLot: () -> Unit,
    onException: () -> Unit,
    onNewSource: () -> Unit,
    onSyncQueue: () -> Unit,
    viewModel: TourViewModel = hiltViewModel(),
) {
    val tourStops by viewModel.tourStops.collectAsStateWithLifecycle(initialValue = emptyList())
    val pendingJobs by viewModel.pendingSyncJobs.collectAsStateWithLifecycle(initialValue = emptyList())

    Scaffold { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Color(0xFFF8F9FA))
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Today's round", style = MaterialTheme.typography.headlineSmall)
                        Text("Offline mode stays available even when the map cannot refresh.")
                        Text("Pending sync jobs: ${pendingJobs.size}")
                    }
                }
            }
            item {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = onNewLot, modifier = Modifier.weight(1f)) { Text("New lot") }
                    Button(onClick = onException, modifier = Modifier.weight(1f)) { Text("Exception") }
                }
            }
            item {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = onNewSource, modifier = Modifier.weight(1f)) { Text("New source") }
                    Button(onClick = onSyncQueue, modifier = Modifier.weight(1f)) { Text("Sync queue") }
                }
            }
            items(tourStops) { stop ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(stop.sourceName, style = MaterialTheme.typography.titleMedium)
                        Text("${stop.estimatedWeightKg} kg estimated")
                        Text(stop.wilaya)
                        Text("Status: ${stop.status}")
                    }
                }
            }
        }
    }
}

