package com.nfn.agent.feature.lot

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.nfn.agent.core.data.repository.AgentRepository
import com.nfn.agent.core.model.LotDraftInput
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class NewLotUiState(
    val sourceId: String = "SRC-2026-001",
    val sourceName: String = "Ferme Ouled Djellal",
    val shearingDate: String = "2026-04-24",
    val estimatedWeight: String = "95",
    val observedWeight: String = "",
    val cleanliness: String = "propre",
    val photoPath: String = "demo-photo.jpg",
    val lastSavedLotId: String? = null,
    val errorMessage: String? = null,
)

@HiltViewModel
class NewLotViewModel @Inject constructor(
    private val repository: AgentRepository,
) : ViewModel() {

    private val uiStateFlow = MutableStateFlow(NewLotUiState())
    val uiState: StateFlow<NewLotUiState> = uiStateFlow.asStateFlow()

    fun updateObservedWeight(value: String) {
        uiStateFlow.value = uiStateFlow.value.copy(observedWeight = value)
    }

    fun updateCleanliness(value: String) {
        uiStateFlow.value = uiStateFlow.value.copy(cleanliness = value)
    }

    fun saveDraft() {
        val state = uiStateFlow.value
        viewModelScope.launch {
            val observed = state.observedWeight.toDoubleOrNull()
            val estimated = state.estimatedWeight.toDoubleOrNull()
            if (observed == null || estimated == null) {
                uiStateFlow.value = state.copy(errorMessage = "Both weight fields must be numeric")
                return@launch
            }
            repository.queueLotDraft(
                LotDraftInput(
                    sourceId = state.sourceId,
                    sourceName = state.sourceName,
                    shearingDate = state.shearingDate,
                    estimatedWeightKg = estimated,
                    observedWeightKg = observed,
                    cleanliness = state.cleanliness,
                    photoPath = state.photoPath,
                ),
            ).onSuccess { lotId ->
                uiStateFlow.value = state.copy(lastSavedLotId = lotId, errorMessage = null)
            }.onFailure { throwable ->
                uiStateFlow.value = state.copy(errorMessage = throwable.message)
            }
        }
    }
}

