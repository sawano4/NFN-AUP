package com.nfn.agent.feature.exception

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.nfn.agent.core.data.repository.AgentRepository
import com.nfn.agent.core.model.ExceptionInput
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.launch

@HiltViewModel
class ExceptionRepositoryViewModel @Inject constructor(
    val repository: AgentRepository,
) : androidx.lifecycle.ViewModel()

@Composable
fun ExceptionScreen(viewModel: ExceptionRepositoryViewModel = hiltViewModel()) {
    val reason = remember { mutableStateOf("source_absente") }
    val note = remember { mutableStateOf("") }
    val savedMessage = remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Scaffold { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Text("Report exception", style = MaterialTheme.typography.headlineSmall)
            OutlinedTextField(
                value = reason.value,
                onValueChange = { reason.value = it },
                label = { Text("Reason") },
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = note.value,
                onValueChange = { note.value = it },
                label = { Text("Note") },
                modifier = Modifier.fillMaxWidth(),
            )
            savedMessage.value?.let { Text(it) }
            Button(
                onClick = {
                    scope.launch {
                        viewModel.repository.queueException(
                            ExceptionInput(
                                sourceId = "SRC-2026-001",
                                reason = reason.value,
                                note = note.value,
                            ),
                        )
                        savedMessage.value = "Exception queued for sync"
                    }
                },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Save exception offline")
            }
        }
    }
}
