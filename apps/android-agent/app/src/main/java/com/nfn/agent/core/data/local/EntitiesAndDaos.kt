package com.nfn.agent.core.data.local

import androidx.room.Dao
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "cached_sources")
data class CachedSourceEntity(
    @PrimaryKey val sourceId: String,
    val sourceName: String,
    val wilaya: String,
    val gpsLat: Double,
    val gpsLng: Double,
)

@Entity(tableName = "cached_tour_stops")
data class CachedTourStopEntity(
    @PrimaryKey val sourceId: String,
    val sourceName: String,
    val estimatedWeightKg: Double,
    val wilaya: String,
    val gpsLat: Double,
    val gpsLng: Double,
    val status: String,
)

@Entity(tableName = "local_lot_drafts")
data class LocalLotDraftEntity(
    @PrimaryKey val lotId: String,
    val sourceId: String,
    val sourceName: String,
    val shearingDate: String,
    val estimatedWeightKg: Double,
    val observedWeightKg: Double,
    val cleanliness: String,
    val photoPath: String,
    val createdAt: Long,
)

@Entity(tableName = "local_exceptions")
data class LocalExceptionEntity(
    @PrimaryKey val exceptionId: String,
    val sourceId: String,
    val reason: String,
    val note: String,
    val createdAt: Long,
)

@Entity(tableName = "media_captures")
data class MediaCaptureEntity(
    @PrimaryKey val mediaId: String,
    val localPath: String,
    val createdAt: Long,
)

@Entity(tableName = "pending_sync_jobs")
data class PendingSyncJobEntity(
    @PrimaryKey val jobId: String,
    val jobType: String,
    val payloadJson: String,
    val createdAt: Long,
)

@Dao
interface SourceDao {
    @Query("SELECT * FROM cached_sources ORDER BY sourceName")
    fun observeAll(): Flow<List<CachedSourceEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(items: List<CachedSourceEntity>)

    @Query("DELETE FROM cached_sources")
    suspend fun clear()
}

@Dao
interface TourDao {
    @Query("SELECT * FROM cached_tour_stops ORDER BY sourceName")
    fun observeAll(): Flow<List<CachedTourStopEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(items: List<CachedTourStopEntity>)

    @Query("DELETE FROM cached_tour_stops")
    suspend fun clear()
}

@Dao
interface LotDraftDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(item: LocalLotDraftEntity)
}

@Dao
interface ExceptionDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(item: LocalExceptionEntity)
}

@Dao
interface MediaDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(item: MediaCaptureEntity)
}

@Dao
interface PendingSyncDao {
    @Query("SELECT * FROM pending_sync_jobs ORDER BY createdAt DESC")
    fun observeAll(): Flow<List<PendingSyncJobEntity>>

    @Query("SELECT * FROM pending_sync_jobs ORDER BY createdAt DESC")
    suspend fun getAll(): List<PendingSyncJobEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(item: PendingSyncJobEntity)

    @Query("DELETE FROM pending_sync_jobs WHERE jobId = :jobId")
    suspend fun delete(jobId: String)

    @Query("DELETE FROM pending_sync_jobs")
    suspend fun clear()
}

