package com.nfn.agent.di

import android.content.Context
import androidx.room.Room
import com.nfn.agent.core.data.local.NfnDatabase
import com.nfn.agent.core.data.repository.AgentRepository
import com.nfn.agent.core.data.repository.OfflineFirstAgentRepository
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): NfnDatabase =
        Room.databaseBuilder(context, NfnDatabase::class.java, "nfn_agent.db")
            .fallbackToDestructiveMigration()
            .build()

    @Provides
    @Singleton
    fun provideAgentRepository(database: NfnDatabase): AgentRepository =
        OfflineFirstAgentRepository(database)
}

