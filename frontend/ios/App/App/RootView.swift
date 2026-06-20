import SwiftUI

enum Tab: String, CaseIterable, Identifiable {
    case feed, trending, search, saved
    var id: String { rawValue }
    var label: String {
        switch self {
        case .feed: return "Feed"
        case .trending: return "Trending"
        case .search: return "Search"
        case .saved: return "Saved"
        }
    }
    var systemImage: String {
        switch self {
        case .feed: return "newspaper"
        case .trending: return "chart.line.uptrend.xyaxis"
        case .search: return "magnifyingglass"
        case .saved: return "bookmark"
        }
    }
}

struct RootView: View {
    @EnvironmentObject var store: NewsStore
    @State private var tab: Tab = .feed
    @State private var searchOpen = false
    @State private var filtersOpen = false
    @State private var activeCategory: String?
    @State private var activeSource: String?

    var body: some View {
        ZStack(alignment: .bottom) {
            Theme.paper.ignoresSafeArea()

            VStack(spacing: 0) {
                TopBar(
                    onFilters: { filtersOpen = true },
                    onRefresh: { Task { await store.refresh() } },
                    activeSource: activeSource
                )

                StatsStrip()

                ZStack {
                    contentForTab
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }

            BottomTabBar(tab: $tab, searchOpen: $searchOpen, onSelect: { selected in
                if selected == .search { searchOpen = true } else { tab = selected }
            })
        }
        .sheet(isPresented: $searchOpen) {
            if #available(iOS 16.0, *) {
                SearchView().presentationDragIndicator(.visible)
            } else {
                SearchView()
            }
        }
        .sheet(isPresented: $filtersOpen) {
            if #available(iOS 16.0, *) {
                FiltersSheet(activeSource: $activeSource)
                    .presentationDetents([.medium, .large])
                    .presentationDragIndicator(.visible)
            } else {
                FiltersSheet(activeSource: $activeSource)
            }
        }
    }

    @ViewBuilder
    private var contentForTab: some View {
        if store.isLoading {
            LoadingView()
        } else if let err = store.errorMessage, store.articles.isEmpty {
            ErrorView(message: err) { Task { await store.loadAll() } }
        } else {
            switch tab {
            case .feed:
                FeedView(activeCategory: $activeCategory, activeSource: $activeSource)
            case .trending:
                TrendingView()
            case .saved:
                SavedView()
            case .search:
                EmptyView()
            }
        }
    }
}

private struct TopBar: View {
    var onFilters: () -> Void
    var onRefresh: () -> Void
    var activeSource: String?
    @EnvironmentObject var store: NewsStore

    var body: some View {
        HStack(spacing: 10) {
            ZStack {
                Theme.ink.frame(width: 28, height: 28)
                Image(systemName: "bolt.fill")
                    .font(.system(size: 12, weight: .black))
                    .foregroundStyle(Theme.klein)
                Circle()
                    .fill(Theme.signal)
                    .frame(width: 6, height: 6)
                    .offset(x: 12, y: -12)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text("SYNAPSE")
                    .font(.heading(18, weight: .black))
                    .kerning(-0.4)
                    .foregroundStyle(Theme.ink)
                Text("AI NEWS TERMINAL")
                    .font(.mono(8.5, weight: .regular))
                    .kerning(2)
                    .foregroundStyle(Theme.muted)
            }
            Spacer()
            Button(action: onFilters) {
                ZStack(alignment: .topTrailing) {
                    Image(systemName: activeSource != nil ? "line.3.horizontal.decrease.circle.fill" : "line.3.horizontal.decrease")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(Theme.ink)
                        .padding(8)
                    if activeSource != nil {
                        Circle().fill(Theme.klein).frame(width: 6, height: 6).offset(x: -4, y: 4)
                    }
                }
            }
            .tactile()

            Button(action: onRefresh) {
                Image(systemName: "arrow.clockwise")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(Theme.ink)
                    .padding(8)
                    .rotationEffect(.degrees(store.isRefreshing ? 360 : 0))
                    .animation(store.isRefreshing ? .linear(duration: 1).repeatForever(autoreverses: false) : .default, value: store.isRefreshing)
            }
            .tactile()
            .disabled(store.isRefreshing)
        }
        .padding(.horizontal, 20)
        .padding(.top, 8)
        .padding(.bottom, 10)
        .background(Theme.paper)
        .overlay(Rectangle().fill(Theme.ink).frame(height: 1), alignment: .bottom)
    }
}

private struct StatsStrip: View {
    @EnvironmentObject var store: NewsStore
    @State private var countdown: Int = 0
    private let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        HStack(spacing: 14) {
            HStack(spacing: 4) {
                Text("\(store.articles.count)").bold().foregroundStyle(Theme.amber)
                Text("stories")
            }
            Text("·").foregroundStyle(Theme.bone.opacity(0.5))
            HStack(spacing: 4) {
                Text("\(store.health?.sources ?? 0)").bold().foregroundStyle(Theme.amber)
                Text("sources")
            }
            Text("·").foregroundStyle(Theme.bone.opacity(0.5))
            HStack(spacing: 4) {
                Text("NEXT")
                Text(formatCountdown(countdown)).bold().foregroundStyle(Theme.amber)
            }
            Spacer()
            HStack(spacing: 5) {
                Circle().fill(Theme.signal).frame(width: 6, height: 6)
                Text("LIVE")
            }
        }
        .font(.mono(10, weight: .regular))
        .kerned(1.4)
        .textCase(.uppercase)
        .foregroundStyle(Theme.paper)
        .padding(.horizontal, 20)
        .padding(.vertical, 6)
        .background(Theme.ink)
        .onReceive(timer) { _ in
            countdown = max(0, countdown - 1)
        }
        .onChange(of: store.health?.next_fetch_in ?? 0) { new in
            countdown = new
        }
        .onAppear { countdown = store.health?.next_fetch_in ?? 0 }
    }

    private func formatCountdown(_ secs: Int) -> String {
        String(format: "%02d:%02d", secs / 60, secs % 60)
    }
}

private struct BottomTabBar: View {
    @Binding var tab: Tab
    @Binding var searchOpen: Bool
    var onSelect: (Tab) -> Void

    var body: some View {
        HStack(spacing: 0) {
            ForEach(Tab.allCases) { t in
                let isActive = (tab == t) || (t == .search && searchOpen)
                Button {
                    onSelect(t)
                } label: {
                    VStack(spacing: 4) {
                        Image(systemName: isActive ? t.systemImage + ".fill" : t.systemImage)
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundStyle(isActive ? Theme.ink : Theme.muted)
                        Text(t.label.uppercased())
                            .font(.mono(9, weight: isActive ? .bold : .regular))
                            .kerning(1.6)
                            .foregroundStyle(isActive ? Theme.ink : Theme.muted)
                        Circle()
                            .fill(isActive ? Theme.klein : .clear)
                            .frame(width: 4, height: 4)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 10)
                    .padding(.bottom, 6)
                }
                .tactile()
            }
        }
        .background(Theme.paper)
        .overlay(Rectangle().fill(Theme.ink).frame(height: 1), alignment: .top)
    }
}

struct LoadingView: View {
    var body: some View {
        VStack(spacing: 16) {
            Text("// FETCHING FEEDS")
                .font(.mono(11, weight: .regular))
                .kerning(2)
                .foregroundStyle(Theme.muted)
            ProgressView().tint(Theme.ink)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Theme.paper)
    }
}

struct ErrorView: View {
    let message: String
    let onRetry: () -> Void
    var body: some View {
        VStack(spacing: 14) {
            Text("// CONNECTION LOST")
                .font(.mono(11, weight: .regular))
                .kerning(2.4)
                .foregroundStyle(Theme.signal)
            Text("Agent unreachable")
                .font(.heading(28, weight: .black))
                .kerning(-0.4)
                .foregroundStyle(Theme.ink)
            Text(message)
                .font(.system(size: 13))
                .foregroundStyle(Theme.muted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 30)
            Button(action: onRetry) {
                Text("RETRY CONNECTION")
                    .font(.mono(11, weight: .semibold))
                    .kerning(1.8)
                    .foregroundStyle(Theme.paper)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 12)
                    .background(Theme.ink)
            }
            .tactile()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Theme.paper)
    }
}
