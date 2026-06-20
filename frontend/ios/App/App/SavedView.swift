import SwiftUI

struct SavedView: View {
    @EnvironmentObject var store: NewsStore
    @EnvironmentObject var saved: SavedStore

    private var items: [Article] {
        store.articles.filter { saved.isSaved($0.id) }
    }

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("/ ARCHIVE")
                        .font(.mono(10))
                        .kerning(1.8)
                        .foregroundStyle(Theme.klein)
                    Text("Saved for later.")
                        .font(.heading(30, weight: .black))
                        .kerning(-0.6)
                        .foregroundStyle(Theme.ink)
                    Text("\(items.count) article\(items.count == 1 ? "" : "s") pinned to your device.")
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
                    VStack(spacing: 10) {
                        Image(systemName: "bookmark")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundStyle(Theme.ink)
                            .padding(14)
                            .overlay(Rectangle().stroke(Theme.ink, lineWidth: 2))
                        Text("/ EMPTY STACK").font(.mono(11)).kerning(1.8).foregroundStyle(Theme.faint)
                        Text("Nothing saved yet").font(.heading(18, weight: .bold)).foregroundStyle(Theme.ink)
                        Text("Tap the bookmark on any article to pin it here.")
                            .font(.system(size: 14)).foregroundStyle(Theme.muted)
                    }
                    .frame(maxWidth: .infinity).padding(.vertical, 48)
                } else {
                    ForEach(items) { a in
                        ArticleRow(
                            article: a,
                            isSaved: true,
                            onToggleSave: { saved.toggle(a.id) }
                        )
                    }
                }

                Footer().padding(.bottom, 90)
            }
        }
        .hiddenScrollIndicators()
        .background(Theme.paper)
    }
}
