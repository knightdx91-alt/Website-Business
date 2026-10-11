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
import android.content.Intent
import kotlinx.coroutines.launch
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.MutableState
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
import androidx.navigation.NavType
import androidx.navigation.navArgument
import com.knightdx91.websitebusiness.net.Api
import com.knightdx91.websitebusiness.net.Meta
import com.knightdx91.websitebusiness.ui.AddBusinessScreen
import com.knightdx91.websitebusiness.ui.EditScreen
import com.knightdx91.websitebusiness.ui.GbpScreen
import com.knightdx91.websitebusiness.ui.InboxScreen
import com.knightdx91.websitebusiness.ui.RouteScreen
import com.knightdx91.websitebusiness.ui.SalesScreen
import com.knightdx91.websitebusiness.ui.HomeScreen
import com.knightdx91.websitebusiness.ui.TrainingScreen
import com.knightdx91.websitebusiness.ui.UpdateDialog
import com.knightdx91.websitebusiness.ui.PreviewScreen
import com.knightdx91.websitebusiness.ui.LeadScreen
import com.knightdx91.websitebusiness.ui.LoginScreen
import com.knightdx91.websitebusiness.ui.NotificationsScreen
import com.knightdx91.websitebusiness.ui.PdfScreen
import com.knightdx91.websitebusiness.ui.PitchScreen
import com.knightdx91.websitebusiness.ui.SignupScreen
import com.knightdx91.websitebusiness.ui.PlaybookScreen
import com.knightdx91.websitebusiness.ui.ShowPlansScreen
import com.knightdx91.websitebusiness.ui.WalkinScreen
import com.knightdx91.websitebusiness.ui.RunScreen
import com.knightdx91.websitebusiness.ui.SettingsScreen
import com.knightdx91.websitebusiness.ui.TasksScreen
import com.knightdx91.websitebusiness.ui.WbTheme
import com.knightdx91.websitebusiness.ui.LocalWindowInfo
import com.knightdx91.websitebusiness.ui.rememberWindowInfo
import androidx.compose.runtime.CompositionLocalProvider
import com.knightdx91.websitebusiness.update.Updater
import com.knightdx91.websitebusiness.push.Push

/** Everything the app shows lives in one Compose activity; the Tap to Pay screen is the only other activity. */
class MainActivity : ComponentActivity() {
    private val askNotifications = registerForActivityResult(ActivityResultContracts.RequestPermission()) {}
    /** Set by the "Update available" notification (at launch or while the app is open): show the update pop-up now. */
    private val wantUpdate = mutableStateOf(false)

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (intent.getBooleanExtra("update", false)) wantUpdate.value = true
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val startLead = intent?.getStringExtra("lead")
        wantUpdate.value = intent?.getBooleanExtra("update", false) == true
        setContent { WbTheme { CompositionLocalProvider(LocalWindowInfo provides rememberWindowInfo()) { AppRoot(startLead, wantUpdate) } } }
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
    /** A newer build found at launch; the pop-up clears it. */
    var update by mutableStateOf<Updater.Check?>(null)

    suspend fun refreshMeta() {
        try {
            meta = api.meta()
            unread = runCatching { api.unreadCount() }.getOrDefault(unread)
        } catch (e: Api.Unauthorized) {
            signOut()
        } catch (e: kotlinx.coroutines.CancellationException) { throw e } catch (e: Exception) {
            // Offline: keep what we had.
        }
    }

    fun signOut() {
        runCatching { Push.unsubscribe(api.app) }
        api.prefs.signOut()
        meta = null
        unread = 0
        loggedIn = false
    }
}


@Composable
fun AppRoot(startLead: String?, wantUpdate: MutableState<Boolean>) {
    val context = LocalContext.current
    val state = remember { AppState(Api(context)) }
    val nav = rememberNavController()
    val scope = rememberCoroutineScope()

    LaunchedEffect(state.loggedIn) {
        if (state.loggedIn) {
            Updater.clearNotification(context)
            coroutineScope {
                launch { state.refreshMeta(); Push.configure(context, state.meta?.fcm) }
                launch { state.update = Updater.newerBuild(state.api) }
            }
            if (startLead != null) nav.navigate("lead/$startLead")
            // While the app stays open, keep looking: a new build shows up within 15 minutes without closing the app.
            while (true) {
                delay(Updater.IN_APP_CHECK_MS)
                if (state.update == null) state.update = Updater.newerBuild(state.api)
            }
        }
    }
    // A push arrived while the app is open: show the update pop-up at once, or refresh the alert badge.
    LaunchedEffect(state.loggedIn) {
        if (state.loggedIn) Push.events.collect { kind ->
            if (kind == "update" && state.update == null) state.update = Updater.newerBuild(state.api, ignoreSnooze = true)
            if (kind == "alerts") state.unread = runCatching { state.api.unreadCount() }.getOrDefault(state.unread)
        }
    }
    // The "Update available" notification was tapped (at launch, or while the app was already open).
    LaunchedEffect(wantUpdate.value, state.loggedIn) {
        if (wantUpdate.value && state.loggedIn) {
            state.update = Updater.newerBuild(state.api, ignoreSnooze = true)
            wantUpdate.value = false
        }
    }
    state.update?.let { u -> UpdateDialog(state.api, u) { state.update = null } }
    LifecycleResumeEffect(state.loggedIn) {
        if (state.loggedIn) {
            state.unread = state.unread // refreshed by screens on resume
            // Coming back to the app: re-check once (at most every 5 minutes) so an update found by the background
            // worker also pops up here, not only in the notification shade.
            if (System.currentTimeMillis() - state.api.prefs.lastUpdateCheck > 5 * 60_000L) scope.launch { if (state.update == null) state.update = Updater.newerBuild(state.api) }
        }
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
            composable("edit/{id}") { e -> EditScreen(state, nav, e.arguments?.getString("id") ?: "") }
            composable("playbook") { PlaybookScreen(state, nav) }
            composable("training") { TrainingScreen(state, nav) }
            composable("guide/{id}") { e -> GuideScreen(state, nav, e.arguments?.getString("id") ?: "tankboard") }
            composable("walkin") { WalkinScreen(state, nav, null) }
            composable("walkin/{lead}") { e -> WalkinScreen(state, nav, e.arguments?.getString("lead")) }
            composable("plans") { ShowPlansScreen(state, nav, null) }
            composable("plans/{lead}") { e -> ShowPlansScreen(state, nav, e.arguments?.getString("lead")) }
            composable("pdf?path={path}&title={title}", arguments = listOf(navArgument("path") { type = NavType.StringType; nullable = true; defaultValue = null }, navArgument("title") { type = NavType.StringType; nullable = true; defaultValue = null })) { e -> PdfScreen(state, nav, e.arguments?.getString("path") ?: "", e.arguments?.getString("title")) }
            composable("signup/{lead}?plan={plan}", arguments = listOf(navArgument("plan") { type = NavType.StringType; nullable = true; defaultValue = null })) { e -> SignupScreen(state, nav, e.arguments?.getString("lead") ?: "", e.arguments?.getString("plan")) }
            composable("inbox") { InboxScreen(state, nav) }
            composable("sales") { SalesScreen(state, nav) }
            composable("add") { AddBusinessScreen(state, nav) }
            composable("route") { RouteScreen(state, nav) }
            composable("gbp/{lead}") { e -> GbpScreen(state, nav, e.arguments?.getString("lead") ?: "") }
            composable("preview/{id}?path={path}", arguments = listOf(navArgument("path") { type = NavType.StringType; nullable = true; defaultValue = null })) { e -> PreviewScreen(state, nav, e.arguments?.getString("id") ?: "", e.arguments?.getString("path")) }
            composable("notifications") { NotificationsScreen(state, nav) }
            composable("tasks") { TasksScreen(state, nav, null) }
            composable("tasks/{lead}") { e -> TasksScreen(state, nav, e.arguments?.getString("lead")) }
            composable("run") { RunScreen(state, nav) }
            composable("settings") { SettingsScreen(state, nav) }
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
