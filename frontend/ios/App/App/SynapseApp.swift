import SwiftUI

@main
struct SynapseApp: App {
    @StateObject private var store = NewsStore()
    @StateObject private var saved = SavedStore()

    init() {
        let appearance = UINavigationBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor(Theme.paper)
        appearance.shadowColor = .clear
        UINavigationBar.appearance().standardAppearance = appearance
        UINavigationBar.appearance().scrollEdgeAppearance = appearance
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(store)
                .environmentObject(saved)
                .preferredColorScheme(.light)
                .tint(Theme.ink)
                .task { await store.loadAll() }
        }
    }
}
