package com.nfn.agent

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.nfn.agent.navigation.AgentNavHost
import com.nfn.agent.ui.theme.NfnAgentTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            NfnAgentTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    AgentNavHost()
                }
            }
        }
    }
}

