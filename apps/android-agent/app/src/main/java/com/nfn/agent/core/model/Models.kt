package com.nfn.agent.core.model

data class AgentSession(
    val email: String,
    val role: String = "agent_collecteur",
)

data class SourceSummary(
    val sourceId: String,
    val sourceName: String,
    val wilaya: String,
    val gpsLat: Double,
    val gpsLng: Double,
)

data class TourStop(
    val sourceId: String,
    val sourceName: String,
    val estimatedWeightKg: Double,
    val wilaya: String,
    val gpsLat: Double,
    val gpsLng: Double,
    val status: String,
)

data class Thresholds(
    val estimateGapPct: Double,
    val receiptGapPct: Double,
    val bdcOverdueHours: Int,
)

data class PendingSyncJob(
    val jobId: String,
    val jobType: String,
    val createdAt: Long,
    val payloadJson: String,
)

data class LotDraftInput(
    val sourceId: String,
    val sourceName: String,
    val shearingDate: String,
    val estimatedWeightKg: Double,
    val observedWeightKg: Double,
    val cleanliness: String,
    val photoPath: String,
)

data class ExceptionInput(
    val sourceId: String,
    val reason: String,
    val note: String,
)

data class FieldSourceInput(
    val email: String,
    val name: String,
    val sourceType: String,
    val wilaya: String,
    val commune: String,
    val gpsLat: Double,
    val gpsLng: Double,
    val herdSize: Int,
)

