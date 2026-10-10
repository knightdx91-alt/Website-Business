package com.knightdx91.websitebusiness

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.knightdx91.websitebusiness.net.Api
import com.knightdx91.websitebusiness.net.Meta
import com.knightdx91.websitebusiness.ui.HomeScreen
import com.knightdx91.websitebusiness.ui.LeadScreen
import com.knightdx91.websitebusiness.ui.LoginScreen
import com.knightdx91.websitebusiness.ui.NotificationsScreen
import com.knightdx91.websitebusiness.ui.PitchScreen
import com.knightdx91.websitebusiness.ui.RunScreen
import com.knightdx91.websitebusiness.ui.SettingsScreen
import com.knightdx91.websitebusiness.ui.TasksScreen
import com.knightdx91.websitebusiness.ui.WbTheme
import com.knightdx91.websitebusiness.ui.WebScreen
import com.knightdx91.websitebusiness.update.Updater
import java.net.URLDecoder
import java.net.URLEncoder

/** Everything the app shows lives in one Compose activity; the Tap to Pay screen is the only other activity. */
class MainActivity : ComponentActivity() {
    private val askNotifications = registerForActivityResult(ActivityResultContracts.RequestPermission()) {}

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val startLead = intent?.getStringExtra("lead")
        setContent { WbTheme { AppRoot(startLead) } }
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            askNotifications.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }
}

/** Shared, refreshable app state: who is signed in and what /meta says. */
class AppState(val api: Api) {
    var meta by mutableStateOf<Meta?>(null)
    var unread by mutableIntStateOf(0)
    var loggedIn by mutableStateOf(api.prefs.loggedIn)

    suspend fun refreshMeta() {
        try {
            meta = api.meta()
            unread = runCatching { api.unreadCount() }.getOrDefault(unread)
        } catch (e: Api.Unauthorized) {
            signOut()
        } catch (e: Exception) {
            // Offline: keep what we had.
        }
    }

    fun signOut() {
        api.prefs.signOut()
        meta = null
        unread = 0
        loggedIn = false
    }
}

fun webRoute(path: String): String = "web/" + URLEncoder.encode(path, "UTF-8")

@Composable
fun AppRoot(startLead: String?) {
    val context = LocalContext.current
    val state = remember { AppState(Api(context)) }
    val nav = rememberNavController()

    LaunchedEffect(state.loggedIn) {
        if (state.loggedIn) {
            state.refreshMeta()
            if (startLead != null) nav.navigate("lead/$startLead")
            Updater.checkDaily(context, state.api)
        }
    }
    LifecycleResumeEffect(state.loggedIn) {
        if (state.loggedIn) state.unread = state.unread // refreshed by screens on resume
        onPauseOrDispose {}
    }

    if (!state.loggedIn) {
        LoginScreen(state) { state.loggedIn = true }
        return
    }

    val backStack by nav.currentBackStackEntryAsState()
    val route = backStack?.destination?.route ?: "home"
    val showBar = route in setOf("home", "tasks", "notifications", "settings")

    Scaffold(bottomBar = { if (showBar) BottomBar(nav, route, state.unread) }) { padding ->
        NavHost(nav, startDestination = "home", modifier = Modifier.padding(padding)) {
            composable("home") { HomeScreen(state, nav) }
            composable("lead/{id}") { e -> LeadScreen(state, nav, e.arguments?.getString("id") ?: "") }
            composable("pitch/{id}") { e -> PitchScreen(state, nav, e.arguments?.getString("id") ?: "") }
            composable("notifications") { NotificationsScreen(state, nav) }
            composable("tasks") { TasksScreen(state, nav, null) }
            composable("tasks/{lead}") { e -> TasksScreen(state, nav, e.arguments?.getString("lead")) }
            composable("run") { RunScreen(state, nav) }
            composable("settings") { SettingsScreen(state, nav) }
            composable("web/{path}") { e -> WebScreen(state, nav, URLDecoder.decode(e.arguments?.getString("path") ?: "/", "UTF-8")) }
        }
    }
}

@Composable
private fun BottomBar(nav: NavHostController, route: String, unread: Int) {
    NavigationBar {
        NavigationBarItem(selected = route == "home", onClick = { nav.navigate("home") { popUpTo("home") { inclusive = true } } }, icon = { Icon(Icons.Default.Home, null) }, label = { Text("Leads") })
        NavigationBarItem(selected = route == "tasks", onClick = { nav.navigate("tasks") { popUpTo("home") } }, icon = { Icon(Icons.Default.List, null) }, label = { Text("Tasks") })
        NavigationBarItem(
            selected = route == "notifications",
            onClick = { nav.navigate("notifications") { popUpTo("home") } },
            icon = { BadgedBox(badge = { if (unread > 0) Badge { Text(if (unread > 99) "99+" else "$unread") } }) { Icon(Icons.Default.Notifications, null) } },
            label = { Text("Alerts") },
        )
        NavigationBarItem(selected = route == "settings", onClick = { nav.navigate("settings") { popUpTo("home") } }, icon = { Icon(Icons.Default.Settings, null) }, label = { Text("Settings") })
    }
}
