package com.nfn.agent.core.data.repository

import com.google.gson.Gson
import com.nfn.agent.core.data.local.CachedSourceEntity
import com.nfn.agent.core.data.local.CachedTourStopEntity
import com.nfn.agent.core.data.local.LocalExceptionEntity
import com.nfn.agent.core.data.local.LocalLotDraftEntity
import com.nfn.agent.core.data.local.MediaCaptureEntity
import com.nfn.agent.core.data.local.NfnDatabase
import com.nfn.agent.core.data.local.PendingSyncJobEntity
import com.nfn.agent.core.model.AgentSession
import com.nfn.agent.core.model.ExceptionInput
import com.nfn.agent.core.model.FieldSourceInput
import com.nfn.agent.core.model.LotDraftInput
import com.nfn.agent.core.model.PendingSyncJob
import com.nfn.agent.core.model.SourceSummary
import com.nfn.agent.core.model.TourStop
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map

@Singleton
class OfflineFirstAgentRepository @Inject constructor(
    private val database: NfnDatabase,
) : AgentRepository {

    private val gson = Gson()
    private val sessionFlow = MutableStateFlow<AgentSession?>(null)

    override val session: StateFlow<AgentSession?> = sessionFlow.asStateFlow()

    override val tourStops: Flow<List<TourStop>> =
        database.tourDao().observeAll().map { items ->
            items.map {
                TourStop(
                    sourceId = it.sourceId,
                    sourceName = it.sourceName,
                    estimatedWeightKg = it.estimatedWeightKg,
                    wilaya = it.wilaya,
                    gpsLat = it.gpsLat,
                    gpsLng = it.gpsLng,
                    status = it.status,
                )
            }
        }

    override val activeSources: Flow<List<SourceSummary>> =
        database.sourceDao().observeAll().map { items ->
            items.map {
                SourceSummary(
                    sourceId = it.sourceId,
                    sourceName = it.sourceName,
                    wilaya = it.wilaya,
                    gpsLat = it.gpsLat,
                    gpsLng = it.gpsLng,
                )
            }
        }

    override val pendingSyncJobs: Flow<List<PendingSyncJob>> =
        database.pendingSyncDao().observeAll().map { items ->
            items.map {
                PendingSyncJob(
                    jobId = it.jobId,
                    jobType = it.jobType,
                    createdAt = it.createdAt,
                    payloadJson = it.payloadJson,
                )
            }
        }

    override suspend fun login(email: String, password: String): Result<Unit> {
        if (email.isBlank() || password.isBlank()) {
            return Result.failure(IllegalArgumentException("Email and password are required"))
        }
        sessionFlow.value = AgentSession(email = email.trim())
        seedBootstrap()
        return Result.success(Unit)
    }

    override suspend fun queueLotDraft(input: LotDraftInput): Result<String> {
        val lotId = "LOT-${System.currentTimeMillis()}"
        val jobId = UUID.randomUUID().toString()
        val createdAt = System.currentTimeMillis()
        database.lotDraftDao().upsert(
            LocalLotDraftEntity(
                lotId = lotId,
                sourceId = input.sourceId,
                sourceName = input.sourceName,
                shearingDate = input.shearingDate,
                estimatedWeightKg = input.estimatedWeightKg,
                observedWeightKg = input.observedWeightKg,
                cleanliness = input.cleanliness,
                photoPath = input.photoPath,
                createdAt = createdAt,
            ),
        )
        database.mediaDao().upsert(
            MediaCaptureEntity(
                mediaId = "${lotId}-photo",
                localPath = input.photoPath,
                createdAt = createdAt,
            ),
        )
        database.pendingSyncDao().upsert(
            PendingSyncJobEntity(
                jobId = jobId,
                jobType = "lot_collected",
                createdAt = createdAt,
                payloadJson = gson.toJson(
                    mapOf(
                        "lot_id" to lotId,
                        "source_id" to input.sourceId,
                        "source_name" to input.sourceName,
                        "shearing_date" to input.shearingDate,
                        "estimated_weight_kg" to input.estimatedWeightKg,
                        "observed_weight_kg" to input.observedWeightKg,
                        "cleanliness" to input.cleanliness,
                        "photo_path" to input.photoPath,
                    ),
                ),
            ),
        )
        return Result.success(lotId)
    }

    override suspend fun queueException(input: ExceptionInput): Result<String> {
        val exceptionId = UUID.randomUUID().toString()
        val createdAt = System.currentTimeMillis()
        database.exceptionDao().upsert(
            LocalExceptionEntity(
                exceptionId = exceptionId,
                sourceId = input.sourceId,
                reason = input.reason,
                note = input.note,
                createdAt = createdAt,
            ),
        )
        database.pendingSyncDao().upsert(
            PendingSyncJobEntity(
                jobId = exceptionId,
                jobType = "exception_reported",
                createdAt = createdAt,
                payloadJson = gson.toJson(
                    mapOf(
                        "source_id" to input.sourceId,
                        "reason" to input.reason,
                        "note" to input.note,
                    ),
                ),
            ),
        )
        return Result.success(exceptionId)
    }

    override suspend fun queueFieldSource(input: FieldSourceInput): Result<String> {
        val jobId = UUID.randomUUID().toString()
        database.pendingSyncDao().upsert(
            PendingSyncJobEntity(
                jobId = jobId,
                jobType = "field_source_created",
                createdAt = System.currentTimeMillis(),
                payloadJson = gson.toJson(
                    mapOf(
                        "email" to input.email,
                        "name" to input.name,
                        "source_type" to input.sourceType,
                        "wilaya" to input.wilaya,
                        "commune" to input.commune,
                        "gps_lat" to input.gpsLat,
                        "gps_lng" to input.gpsLng,
                        "herd_size" to input.herdSize,
                    ),
                ),
            ),
        )
        return Result.success(jobId)
    }

    override suspend fun syncNow(): Result<Int> {
        val jobs = database.pendingSyncDao().getAll()
        jobs.forEach { database.pendingSyncDao().delete(it.jobId) }
        return Result.success(jobs.size)
    }

    private suspend fun seedBootstrap() {
        database.sourceDao().clear()
        database.tourDao().clear()
        database.sourceDao().upsertAll(
            listOf(
                CachedSourceEntity("SRC-2026-001", "Ferme Ouled Djellal", "Djelfa", 34.154, 3.503),
                CachedSourceEntity("SRC-2026-002", "Cooperative Hamra", "Laghouat", 34.111, 2.101),
            ),
        )
        database.tourDao().upsertAll(
            listOf(
                CachedTourStopEntity("SRC-2026-001", "Ferme Ouled Djellal", 95.0, "Djelfa", 34.154, 3.503, "a_faire"),
                CachedTourStopEntity("SRC-2026-002", "Cooperative Hamra", 72.0, "Laghouat", 34.111, 2.101, "a_faire"),
            ),
        )
    }
}

