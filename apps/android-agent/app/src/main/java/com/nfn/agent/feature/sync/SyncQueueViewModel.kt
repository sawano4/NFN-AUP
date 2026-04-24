package com.nfn.agent.feature.sync

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.nfn.agent.core.data.repository.AgentRepository
import com.nfn.agent.core.model.PendingSyncJob
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

@HiltViewModel
class SyncQueueViewModel @Inject constructor(
    private val repository: AgentRepository,
) : ViewModel() {
    val pendingJobs: Flow<List<PendingSyncJob>> = repository.pendingSyncJobs

    private val statusMessageFlow = MutableStateFlow("Ready")
    val statusMessage: StateFlow<String> = statusMessageFlow.asStateFlow()

    fun syncNow() {
        viewModelScope.launch {
            repository.syncNow()
                .onSuccess { count -> statusMessageFlow.value = "Synced $count queued actions" }
                .onFailure { throwable -> statusMessageFlow.value = throwable.message ?: "Sync failed" }
        }
    }
}

