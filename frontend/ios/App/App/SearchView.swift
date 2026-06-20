import SwiftUI

struct SearchView: View {
    @EnvironmentObject var store: NewsStore
    @EnvironmentObject var saved: SavedStore
    @Environment(\.dismiss) private var dismiss
    @State private var query: String = ""
    @FocusState private var focused: Bool

    private var results: [Article] {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        guard !q.isEmpty else { return [] }
        return store.articles.filter { a in
            a.title.lowercased().contains(q) ||
            (a.summary?.lowercased().contains(q) ?? false) ||
            a.source.lowercased().contains(q) ||
            a.category.lowercased().contains(q)
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(Theme.ink)
                TextField("Search articles, sources…", text: $query)
                    .focused($focused)
                    .font(.heading(22, weight: .heavy))
                    .foregroundStyle(Theme.ink)
                    .submitLabel(.search)
                    .autocorrectionDisabled()
                Button { dismiss() } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(Theme.muted)
                        .padding(4)
                }
                .tactile()
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)
            .padding(.bottom, 10)
            .overlay(Rectangle().fill(Theme.bone).frame(height: 1), alignment: .bottom)

            HStack {
                Text("SEARCH")
                Spacer()
                Text(query.isEmpty
                     ? "TYPE TO BEGIN"
                     : "\(results.count) HIT\(results.count == 1 ? "" : "S")")
            }
            .font(.mono(10))
            .kerned(1.8)
            .foregroundStyle(Theme.paper)
            .padding(.horizontal, 20)
            .padding(.vertical, 6)
            .background(Theme.ink)

            if query.isEmpty {
                VStack(spacing: 10) {
                    Text("/ IDLE").font(.mono(11)).kerned(1.8).foregroundStyle(Theme.faint)
                    Text("Find any AI story.").font(.heading(20, weight: .bold)).foregroundStyle(Theme.ink)
                    Text("Try “GPT”, “DeepMind”, or “agent”.")
                        .font(.system(size: 14)).foregroundStyle(Theme.muted)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if results.isEmpty {
                VStack(spacing: 10) {
                    Text("/ NO RESULTS").font(.mono(11)).kerned(1.8).foregroundStyle(Theme.signal)
                    Text("Nothing matches “\(query)”").font(.heading(20, weight: .bold)).foregroundStyle(Theme.ink)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(results) { a in
                            ArticleRow(
                                article: a,
                                isSaved: saved.isSaved(a.id),
                                onToggleSave: { saved.toggle(a.id) }
                            )
                        }
                    }
                }
                .hiddenScrollIndicators()
            }
        }
        .background(Theme.paper)
        .onAppear { DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { focused = true } }
    }
}
