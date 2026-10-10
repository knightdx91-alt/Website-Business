package com.knightdx91.websitebusiness.ui

import android.app.Activity
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.knightdx91.websitebusiness.AppState
import com.knightdx91.websitebusiness.net.AuthConfig
import kotlinx.coroutines.launch

/**
 * Sign in with the company Google account (Credential Manager → Google ID token → the Worker checks it and hands back the
 * session). A password works too while the owner hasn't turned passwords off.
 */
@Composable
fun LoginScreen(state: AppState, onDone: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var cfg by remember { mutableStateOf<AuthConfig?>(null) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var usePassword by remember { mutableStateOf(false) }
    var password by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        cfg = runCatching { state.api.authConfig() }.getOrElse { error = "Can't reach the server: ${it.message}"; AuthConfig(null, "undergroundassociates.com", false, true) }
    }

    fun finish(name: String, role: String, userId: String, token: String, email: String) {
        state.api.prefs.signIn(token, name, role, userId, email)
        onDone()
    }

    fun googleSignIn() {
        val c = cfg ?: return
        val clientId = c.googleClientId ?: run { error = "Google sign-in isn't set up yet. The owner adds the client ID in Settings → Team."; return }
        busy = true
        error = null
        scope.launch {
            try {
                val option = GetGoogleIdOption.Builder()
                    .setFilterByAuthorizedAccounts(false)
                    .setServerClientId(clientId)
                    .setAutoSelectEnabled(false)
                    .build()
                val request = GetCredentialRequest.Builder().addCredentialOption(option).build()
                val result = CredentialManager.create(context).getCredential(context as Activity, request)
                val cred = result.credential
                if (cred is CustomCredential && cred.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                    val g = GoogleIdTokenCredential.createFrom(cred.data)
                    val r = state.api.googleLogin(g.idToken)
                    finish(r.optString("name"), r.optString("role"), r.optString("userId"), r.optString("token"), g.id)
                } else {
                    error = "That wasn't a Google account."
                }
            } catch (e: GetCredentialCancellationException) {
                // They closed the picker.
            } catch (e: NoCredentialException) {
                error = "No Google account on this phone yet. Add your @${c.domain} account in Android Settings → Accounts, then try again."
            } catch (e: GetCredentialException) {
                error = e.message ?: "Google sign-in failed"
            } catch (e: Exception) {
                error = e.message ?: "Sign-in failed"
            } finally {
                busy = false
            }
        }
    }

    fun passwordSignIn() {
        busy = true
        error = null
        scope.launch {
            try {
                val token = state.api.passwordLogin(password)
                state.api.prefs.token = token
                val meta = state.api.meta()
                finish(meta.meName, meta.meRole, meta.meId, token, "")
            } catch (e: Exception) {
                state.api.prefs.signOut()
                error = e.message ?: "Couldn't log in"
            } finally {
                busy = false
            }
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(28.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text("Website Business", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
        Spacer(Modifier.height(6.dp))
        Text("Underground Associates", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(36.dp))
        val c = cfg
        if (c == null) {
            CircularProgressIndicator()
        } else if (!usePassword || c.requireGoogle) {
            Text("Sign in with your @${c.domain} Google account.", style = MaterialTheme.typography.bodyMedium)
            Spacer(Modifier.height(14.dp))
            Button(onClick = { googleSignIn() }, enabled = !busy, modifier = Modifier.fillMaxWidth().height(52.dp)) {
                Text(if (busy) "Signing in…" else "Sign in with Google", style = MaterialTheme.typography.titleMedium)
            }
            if (!c.requireGoogle) TextButton(onClick = { usePassword = true }) { Text("Use a password instead") }
        } else {
            OutlinedTextField(password, { password = it }, label = { Text("Password") }, visualTransformation = PasswordVisualTransformation(), singleLine = true, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(12.dp))
            Button(onClick = { passwordSignIn() }, enabled = !busy && password.isNotEmpty(), modifier = Modifier.fillMaxWidth().height(52.dp)) { Text(if (busy) "Logging in…" else "Log in") }
            TextButton(onClick = { usePassword = false }) { Text("Sign in with Google instead") }
        }
        error?.let {
            Spacer(Modifier.height(16.dp))
            Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
        }
    }
}
