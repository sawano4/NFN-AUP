package com.nfn.agent.core.data.repository

import com.nfn.agent.core.model.AgentSession
import com.nfn.agent.core.model.ExceptionInput
import com.nfn.agent.core.model.FieldSourceInput
import com.nfn.agent.core.model.LotDraftInput
import com.nfn.agent.core.model.PendingSyncJob
import com.nfn.agent.core.model.SourceSummary
import com.nfn.agent.core.model.TourStop
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.StateFlow

interface AgentRepository {
    val session: StateFlow<AgentSession?>
    val tourStops: Flow<List<TourStop>>
    val activeSources: Flow<List<SourceSummary>>
    val pendingSyncJobs: Flow<List<PendingSyncJob>>

    suspend fun login(email: String, password: String): Result<Unit>
    suspend fun queueLotDraft(input: LotDraftInput): Result<String>
    suspend fun queueException(input: ExceptionInput): Result<String>
    suspend fun queueFieldSource(input: FieldSourceInput): Result<String>
    suspend fun syncNow(): Result<Int>
}

