import SwiftUI

struct TrendingView: View {
    @EnvironmentObject var store: NewsStore
    @EnvironmentObject var saved: SavedStore

    private var items: [Article] {
        Array(store.articles
            .filter { $0.source == "Hacker News" || $0.category == "Community" }
            .prefix(20))
    }

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("/ TRENDING NOW")
                        .font(.mono(10))
                        .kerning(1.8)
                        .foregroundStyle(Theme.signal)
                    Text("Community pulse.")
                        .font(.heading(30, weight: .black))
                        .kerning(-0.6)
                        .foregroundStyle(Theme.ink)
                    Text("What the Hacker News crowd is voting up right now.")
                        .font(.system(size: 14))
                        .foregroundStyle(Theme.muted)
                        .padding(.top, 4)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 20)
                .padding(.top, 20)
                .padding(.bottom, 12)
                .overlay(Rectangle().fill(Theme.bone).frame(height: 1), alignment: .bottom)

                if items.isEmpty {
                    VStack(spacing: 6) {
                        Text("/ QUIET").font(.mono(11)).kerning(1.8).foregroundStyle(Theme.faint)
                        Text("No trending stories yet").font(.heading(18, weight: .bold)).foregroundStyle(Theme.ink)
                    }
                    .frame(maxWidth: .infinity).padding(.vertical, 48)
                } else {
                    ForEach(items) { a in
                        ArticleRow(
                            article: a,
                            isSaved: saved.isSaved(a.id),
                            onToggleSave: { saved.toggle(a.id) }
                        )
                    }
                }

                Footer().padding(.bottom, 90)
            }
        }
        .hiddenScrollIndicators()
        .background(Theme.paper)
        .refreshable { await store.refresh() }
    }
}
