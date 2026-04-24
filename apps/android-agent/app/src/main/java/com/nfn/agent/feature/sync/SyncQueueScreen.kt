package com.nfn.agent.feature.sync

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
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
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@Composable
fun SyncQueueScreen(viewModel: SyncQueueViewModel = hiltViewModel()) {
    val jobs by viewModel.pendingJobs.collectAsStateWithLifecycle(initialValue = emptyList())
    val statusMessage by viewModel.statusMessage.collectAsStateWithLifecycle()

    Scaffold { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text("Pending sync queue", style = MaterialTheme.typography.headlineSmall)
            Text(statusMessage)
            Button(onClick = viewModel::syncNow, modifier = Modifier.fillMaxWidth()) {
                Text("Run sync now")
            }
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(jobs) { job ->
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(job.jobType, style = MaterialTheme.typography.titleMedium)
                            Text(job.jobId)
                        }
                    }
                }
            }
        }
    }
}

