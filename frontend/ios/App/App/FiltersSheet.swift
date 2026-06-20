import SwiftUI

struct FiltersSheet: View {
    @EnvironmentObject var store: NewsStore
    @Environment(\.dismiss) private var dismiss
    @Binding var activeSource: String?

    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("/ FILTER BY")
                        .font(.mono(10))
                        .kerning(1.8)
                        .foregroundStyle(Theme.faint)
                    Text("Source")
                        .font(.heading(24, weight: .heavy))
                        .kerning(-0.4)
                        .foregroundStyle(Theme.ink)
                }
                Spacer()
                Button { dismiss() } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(Theme.muted)
                        .padding(8)
                }
                .tactile()
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)
            .padding(.bottom, 12)
            .overlay(Rectangle().fill(Theme.bone).frame(height: 1), alignment: .bottom)

            ScrollView {
                LazyVStack(spacing: 0) {
                    SourceRow(
                        name: "All sources",
                        count: store.sources.reduce(0) { $0 + $1.count },
                        dot: nil,
                        active: activeSource == nil
                    ) {
                        activeSource = nil
                        dismiss()
                    }

                    ForEach(store.sources) { s in
                        SourceRow(
                            name: s.name,
                            count: s.count,
                            dot: Palette.source(s.name),
                            active: activeSource == s.name
                        ) {
                            activeSource = s.name
                            dismiss()
                        }
                    }
                }
            }
            .hiddenScrollIndicators()
        }
        .background(Theme.paper)
    }
}

private struct SourceRow: View {
    let name: String
    let count: Int
    let dot: Color?
    let active: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                if let dot {
                    Circle().fill(dot).frame(width: 8, height: 8)
                }
                Text(name)
                    .font(.heading(15, weight: .semibold))
                    .foregroundStyle(active ? Theme.paper : Theme.ink)
                    .frame(maxWidth: .infinity, alignment: .leading)
                Text("\(count)")
                    .font(.mono(12))
                    .foregroundStyle(active ? Theme.paper.opacity(0.8) : Theme.faint)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 14)
            .background(active ? Theme.ink : Theme.paper)
            .overlay(Rectangle().fill(Theme.bone).frame(height: 1), alignment: .bottom)
        }
        .tactile()
    }
}
