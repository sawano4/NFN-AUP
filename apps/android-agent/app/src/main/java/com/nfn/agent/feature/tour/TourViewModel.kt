package com.nfn.agent.feature.tour

import androidx.lifecycle.ViewModel
import com.nfn.agent.core.data.repository.AgentRepository
import com.nfn.agent.core.model.SourceSummary
import com.nfn.agent.core.model.TourStop
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.Flow

@HiltViewModel
class TourViewModel @Inject constructor(
    repository: AgentRepository,
) : ViewModel() {
    val tourStops: Flow<List<TourStop>> = repository.tourStops
    val activeSources: Flow<List<SourceSummary>> = repository.activeSources
    val pendingSyncJobs = repository.pendingSyncJobs
}

