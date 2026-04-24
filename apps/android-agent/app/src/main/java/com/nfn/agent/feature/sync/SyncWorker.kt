package com.nfn.agent.feature.sync

import android.content.Context
import androidx.room.Room
import androidx.work.CoroutineWorker
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.nfn.agent.core.data.local.NfnDatabase

class SyncWorker(
    appContext: Context,
    workerParams: WorkerParameters,
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        val database = Room.databaseBuilder(applicationContext, NfnDatabase::class.java, "nfn_agent.db").build()
        val pendingJobs = database.pendingSyncDao().getAll()
        pendingJobs.forEach { job -> database.pendingSyncDao().delete(job.jobId) }
        return Result.success()
    }

    companion object {
        fun enqueue(context: Context) {
            val request = OneTimeWorkRequestBuilder<SyncWorker>().build()
            WorkManager.getInstance(context).enqueue(request)
        }
    }
}
