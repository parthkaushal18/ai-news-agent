import SwiftUI

struct ArticleRow: View {
    let article: Article
    let isSaved: Bool
    let onToggleSave: () -> Void
    @State private var showSafari = false

    var body: some View {
        Button { showSafari = true } label: {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 6) {
                    Circle().fill(Palette.source(article.source)).frame(width: 6, height: 6)
                    Text(article.source.uppercased())
                        .font(.mono(10, weight: .semibold))
                        .foregroundStyle(Theme.ink)
                        .lineLimit(1)
                    Text("/").font(.mono(10)).foregroundStyle(Theme.faint)
                    Text(article.category.uppercased())
                        .font(.mono(10, weight: .semibold))
                        .foregroundStyle(Palette.category(article.category))
                    Spacer(minLength: 0)
                    Text(article.timeAgo.uppercased())
                        .font(.mono(10))
                        .foregroundStyle(Theme.faint)
                }
                .kerned(1.2)

                Text(article.title)
                    .font(.heading(19, weight: .heavy))
                    .kerning(-0.4)
                    .foregroundStyle(Theme.ink)
                    .lineLimit(3)
                    .multilineTextAlignment(.leading)

                if let summary = article.summary, !summary.isEmpty {
                    Text(summary)
                        .font(.system(size: 13.5))
                        .lineSpacing(2)
                        .foregroundStyle(Theme.muted)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                }

                HStack(spacing: 10) {
                    HStack(spacing: 4) {
                        Text("READ")
                        Image(systemName: "arrow.up.right").font(.system(size: 10, weight: .bold))
                    }
                    .font(.mono(10, weight: .semibold))
                    .kerned(1.5)
                    .foregroundStyle(Theme.klein)
                    Rectangle().fill(Theme.bone).frame(height: 1)
                }
                .padding(.top, 2)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 18)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .tactile()
        .overlay(alignment: .topTrailing) {
            Button(action: onToggleSave) {
                Image(systemName: isSaved ? "bookmark.fill" : "bookmark")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(isSaved ? Theme.klein : Theme.faint)
                    .padding(14)
            }
            .tactile()
        }
        .background(Theme.paper)
        .overlay(Rectangle().fill(Theme.bone).frame(height: 1), alignment: .bottom)
        .sheet(isPresented: $showSafari) {
            if let url = URL(string: article.url) { SafariView(url: url) }
        }
    }
}

struct HeroStoryView: View {
    let article: Article
    @State private var showSafari = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 6) {
                Circle().fill(Theme.signal).frame(width: 7, height: 7)
                Text("TOP STORY")
                    .font(.mono(10, weight: .bold))
                    .kerning(2)
                    .foregroundStyle(Theme.signal)
                Text("·").foregroundStyle(Theme.faint)
                Text(article.source.uppercased())
                    .font(.mono(10, weight: .semibold))
                    .kerning(2)
                    .foregroundStyle(Theme.ink)
                Spacer()
                Text(article.timeAgo.uppercased())
                    .font(.mono(10))
                    .kerning(2)
                    .foregroundStyle(Theme.faint)
            }
            .padding(.horizontal, 20)
            .padding(.top, 14)

            Button { showSafari = true } label: {
                VStack(alignment: .leading, spacing: 12) {
                    Text(article.title)
                        .font(.heading(30, weight: .black))
                        .kerning(-0.6)
                        .lineSpacing(-2)
                        .foregroundStyle(Theme.ink)
                        .multilineTextAlignment(.leading)

                    if let summary = article.summary, !summary.isEmpty {
                        Text(summary)
                            .font(.system(size: 14))
                            .lineSpacing(3)
                            .foregroundStyle(Theme.muted)
                            .lineLimit(3)
                            .multilineTextAlignment(.leading)
                    }

                    HStack(spacing: 8) {
                        HStack(spacing: 4) {
                            Text("READ FULL")
                            Image(systemName: "arrow.up.right").font(.system(size: 10, weight: .bold))
                        }
                        .font(.mono(10, weight: .semibold))
                        .kerned(1.8)
                        .foregroundStyle(Theme.paper)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Theme.ink)

                        Circle().fill(Palette.category(article.category)).frame(width: 7, height: 7)
                        Text(article.category.uppercased())
                            .font(.mono(10))
                            .kerned(1.8)
                            .foregroundStyle(Theme.muted)
                        Spacer()
                    }
                    .padding(.top, 4)
                }
                .padding(.horizontal, 20)
                .padding(.top, 12)
                .padding(.bottom, 20)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .tactile()
        }
        .background(Theme.paper)
        .overlay(Rectangle().fill(Theme.ink).frame(height: 1), alignment: .bottom)
        .sheet(isPresented: $showSafari) {
            if let url = URL(string: article.url) { SafariView(url: url) }
        }
    }
}
