package com.nfn.agent.feature.source

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.nfn.agent.core.data.repository.AgentRepository
import com.nfn.agent.core.model.FieldSourceInput
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.launch

@HiltViewModel
class FieldSourceRepositoryViewModel @Inject constructor(
    val repository: AgentRepository,
) : androidx.lifecycle.ViewModel()

@Composable
fun NewFieldSourceScreen(viewModel: FieldSourceRepositoryViewModel = hiltViewModel()) {
    val email = remember { mutableStateOf("new-source@example.com") }
    val name = remember { mutableStateOf("Field Source") }
    val commune = remember { mutableStateOf("Messaad") }
    val savedMessage = remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Scaffold { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Text("New field source", style = MaterialTheme.typography.headlineSmall)
            OutlinedTextField(value = email.value, onValueChange = { email.value = it }, label = { Text("Email") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = name.value, onValueChange = { name.value = it }, label = { Text("Name") }, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(value = commune.value, onValueChange = { commune.value = it }, label = { Text("Commune") }, modifier = Modifier.fillMaxWidth())
            savedMessage.value?.let { Text(it) }
            Button(
                onClick = {
                    scope.launch {
                        viewModel.repository.queueFieldSource(
                            FieldSourceInput(
                                email = email.value,
                                name = name.value,
                                sourceType = "eleveur",
                                wilaya = "Djelfa",
                                commune = commune.value,
                                gpsLat = 34.154,
                                gpsLng = 3.503,
                                herdSize = 70,
                            ),
                        )
                        savedMessage.value = "Source queued for admin validation"
                    }
                },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Save field source")
            }
        }
    }
}

