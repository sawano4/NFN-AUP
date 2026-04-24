package com.nfn.agent.core.data.local

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [
        CachedSourceEntity::class,
        CachedTourStopEntity::class,
        LocalLotDraftEntity::class,
        LocalExceptionEntity::class,
        MediaCaptureEntity::class,
        PendingSyncJobEntity::class,
    ],
    version = 1,
    exportSchema = false,
)
abstract class NfnDatabase : RoomDatabase() {
    abstract fun sourceDao(): SourceDao
    abstract fun tourDao(): TourDao
    abstract fun lotDraftDao(): LotDraftDao
    abstract fun exceptionDao(): ExceptionDao
    abstract fun mediaDao(): MediaDao
    abstract fun pendingSyncDao(): PendingSyncDao
}

