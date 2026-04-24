package com.nfn.agent.navigation

enum class AgentDestination(val route: String) {
    Login("login"),
    Tour("tour"),
    NewLot("new_lot"),
    Qr("qr/{lotId}"),
    Exception("exception"),
    FieldSource("field_source"),
    SyncQueue("sync_queue"),
}
