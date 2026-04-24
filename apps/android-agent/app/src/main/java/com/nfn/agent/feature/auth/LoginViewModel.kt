package com.nfn.agent.feature.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.nfn.agent.core.data.repository.AgentRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class LoginUiState(
    val email: String = "agent@nfn.example.com",
    val password: String = "agent123",
    val isLoading: Boolean = false,
    val isLoggedIn: Boolean = false,
    val errorMessage: String? = null,
)

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val repository: AgentRepository,
) : ViewModel() {

    private val uiStateFlow = MutableStateFlow(LoginUiState())
    val uiState: StateFlow<LoginUiState> = uiStateFlow.asStateFlow()

    fun onEmailChanged(value: String) {
        uiStateFlow.value = uiStateFlow.value.copy(email = value)
    }

    fun onPasswordChanged(value: String) {
        uiStateFlow.value = uiStateFlow.value.copy(password = value)
    }

    fun submit() {
        val state = uiStateFlow.value
        viewModelScope.launch {
            uiStateFlow.value = state.copy(isLoading = true, errorMessage = null)
            repository.login(state.email, state.password)
                .onSuccess {
                    uiStateFlow.value = uiStateFlow.value.copy(isLoading = false, isLoggedIn = true)
                }
                .onFailure { throwable ->
                    uiStateFlow.value = uiStateFlow.value.copy(
                        isLoading = false,
                        errorMessage = throwable.message ?: "Unable to sign in",
                    )
                }
        }
    }
}

