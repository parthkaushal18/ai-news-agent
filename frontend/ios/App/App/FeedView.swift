import SwiftUI

struct FeedView: View {
    @EnvironmentObject var store: NewsStore
    @EnvironmentObject var saved: SavedStore
    @Binding var activeCategory: String?
    @Binding var activeSource: String?

    private var filtered: [Article] {
        var items = store.articles
        if let c = activeCategory { items = items.filter { $0.category == c } }
        if let s = activeSource   { items = items.filter { $0.source   == s } }
        return items
    }

    var body: some View {
        let items = filtered
        let hero = items.first
        let rest = Array(items.dropFirst())

        ScrollView {
            LazyVStack(spacing: 0, pinnedViews: [.sectionHeaders]) {
                Section {
                    if let hero = hero { HeroStoryView(article: hero) }

                    HStack(alignment: .bottom) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("/ STREAM")
                                .font(.mono(10))
                                .kerning(1.8)
                                .foregroundStyle(Theme.faint)
                            Text("Latest dispatches")
                                .font(.heading(24, weight: .heavy))
                                .kerning(-0.4)
                                .foregroundStyle(Theme.ink)
                        }
                        Spacer()
                        Text("\(rest.count) ITEM\(rest.count == 1 ? "" : "S")")
                            .font(.mono(10))
                            .kerning(1.8)
                            .foregroundStyle(Theme.muted)
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 18)
                    .padding(.bottom, 8)

                    if rest.isEmpty {
                        VStack(spacing: 6) {
                            Text("/ EMPTY")
                                .font(.mono(11))
                                .kerning(1.8)
                                .foregroundStyle(Theme.faint)
                            Text("No stories in this filter")
                                .font(.heading(18, weight: .bold))
                                .foregroundStyle(Theme.ink)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 48)
                    } else {
                        ForEach(rest) { a in
                            ArticleRow(
                                article: a,
                                isSaved: saved.isSaved(a.id),
                                onToggleSave: { saved.toggle(a.id) }
                            )
                        }
                    }

                    Footer()
                        .padding(.bottom, 90)
                } header: {
                    CategoryChipRail(
                        categories: store.categories,
                        activeCategory: $activeCategory,
                        activeSource: $activeSource
                    )
                }
            }
        }
        .hiddenScrollIndicators()
        .background(Theme.paper)
        .refreshable { await store.refresh() }
    }
}

private struct CategoryChipRail: View {
    let categories: [NamedCount]
    @Binding var activeCategory: String?
    @Binding var activeSource: String?

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                Chip(label: "ALL", active: activeCategory == nil && activeSource == nil) {
                    activeCategory = nil; activeSource = nil
                }
                ForEach(categories) { c in
                    Chip(
                        label: "\(c.name.uppercased())",
                        count: c.count,
                        dot: Palette.category(c.name),
                        active: activeCategory == c.name
                    ) {
                        activeCategory = activeCategory == c.name ? nil : c.name
                        activeSource = nil
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
        }
        .background(Theme.paper)
        .overlay(Rectangle().fill(Theme.bone).frame(height: 1), alignment: .bottom)
    }
}

private struct Chip: View {
    let label: String
    var count: Int? = nil
    var dot: Color? = nil
    let active: Bool
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                if let dot { Circle().fill(dot).frame(width: 6, height: 6) }
                Text(label)
                    .font(.mono(11, weight: .regular))
                    .kerning(1.3)
                if let count {
                    Text("\(count)").font(.mono(9)).opacity(0.7)
                }
            }
            .foregroundStyle(active ? Theme.paper : Theme.ink)
            .padding(.horizontal, 14)
            .padding(.vertical, 6)
            .background(
                Capsule().fill(active ? Theme.ink : .clear)
            )
            .overlay(
                Capsule().stroke(Theme.ink.opacity(active ? 1 : 0.7), lineWidth: 1)
            )
        }
        .tactile()
    }
}

struct Footer: View {
    var body: some View {
        VStack(spacing: 4) {
            Text("SYNAPSE · AI NEWS TERMINAL")
            Text("FETCHED FROM 12 SOURCES · UPDATED EVERY 30 MIN")
        }
        .font(.mono(9))
        .kerned(2.2)
        .foregroundStyle(Theme.faint)
        .padding(.vertical, 28)
        .frame(maxWidth: .infinity)
        .overlay(Rectangle().fill(Theme.bone).frame(height: 1), alignment: .top)
    }
}
