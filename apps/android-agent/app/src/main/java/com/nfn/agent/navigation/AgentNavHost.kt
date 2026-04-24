package com.nfn.agent.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavType
import androidx.navigation.navArgument
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.nfn.agent.feature.auth.LoginScreen
import com.nfn.agent.feature.exception.ExceptionScreen
import com.nfn.agent.feature.lot.NewLotScreen
import com.nfn.agent.feature.lot.QrCodeScreen
import com.nfn.agent.feature.source.NewFieldSourceScreen
import com.nfn.agent.feature.sync.SyncQueueScreen
import com.nfn.agent.feature.tour.TourScreen

@Composable
fun AgentNavHost() {
    val navController = rememberNavController()

    NavHost(navController = navController, startDestination = AgentDestination.Login.route) {
        composable(AgentDestination.Login.route) {
            LoginScreen(
                onLoggedIn = {
                    navController.navigate(AgentDestination.Tour.route) {
                        popUpTo(AgentDestination.Login.route) { inclusive = true }
                    }
                },
            )
        }
        composable(AgentDestination.Tour.route) {
            TourScreen(
                onNewLot = { navController.navigate(AgentDestination.NewLot.route) },
                onException = { navController.navigate(AgentDestination.Exception.route) },
                onNewSource = { navController.navigate(AgentDestination.FieldSource.route) },
                onSyncQueue = { navController.navigate(AgentDestination.SyncQueue.route) },
            )
        }
        composable(AgentDestination.NewLot.route) {
            NewLotScreen(
                onOpenQr = { lotId ->
                    navController.navigate("qr/$lotId")
                },
            )
        }
        composable(
            route = AgentDestination.Qr.route,
            arguments = listOf(navArgument("lotId") { type = NavType.StringType }),
        ) { backStackEntry ->
            QrCodeScreen(
                lotId = backStackEntry.arguments?.getString("lotId").orEmpty(),
                onDone = { navController.popBackStack(AgentDestination.Tour.route, false) },
            )
        }
        composable(AgentDestination.Exception.route) { ExceptionScreen() }
        composable(AgentDestination.FieldSource.route) { NewFieldSourceScreen() }
        composable(AgentDestination.SyncQueue.route) { SyncQueueScreen() }
    }
}
