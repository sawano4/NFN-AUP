package com.nfn.agent.core.data.remote

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST

data class LoginPayload(
    val email: String,
    val password: String,
)

data class TokenResponse(
    val access_token: String,
    val refresh_token: String,
    val token_type: String,
)

data class BootstrapDto(
    val agent_name: String,
    val reserved_lot_ids: List<String>,
)

data class SyncJobDto(
    val client_job_id: String,
    val job_type: String,
    val occurred_at: String,
    val payload: Map<String, Any>,
)

data class SyncBatchDto(
    val jobs: List<SyncJobDto>,
)

interface AuthApi {
    @POST("/auth/login")
    suspend fun login(@Body payload: LoginPayload): TokenResponse
}

interface MobileApi {
    @GET("/mobile/bootstrap")
    suspend fun bootstrap(@Header("Authorization") authHeader: String): BootstrapDto

    @POST("/mobile/sync/batch")
    suspend fun sync(
        @Header("Authorization") authHeader: String,
        @Body payload: SyncBatchDto,
    )
}

