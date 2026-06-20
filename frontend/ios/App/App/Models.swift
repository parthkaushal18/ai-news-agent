import Foundation

struct Article: Identifiable, Decodable, Hashable {
    let id: String
    let title: String
    let summary: String?
    let url: String
    let source: String
    let category: String
    let published: String?

    var publishedDate: Date? {
        guard let s = published else { return nil }
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = iso.date(from: s) { return d }
        iso.formatOptions = [.withInternetDateTime]
        return iso.date(from: s)
    }

    var timeAgo: String {
        guard let d = publishedDate else { return "" }
        let diff = Date().timeIntervalSince(d)
        if diff < 60 { return "just now" }
        if diff < 3600 { return "\(Int(diff / 60))m" }
        if diff < 86400 { return "\(Int(diff / 3600))h" }
        if diff < 604800 { return "\(Int(diff / 86400))d" }
        let fmt = DateFormatter()
        fmt.dateFormat = "MMM d"
        return fmt.string(from: d)
    }
}

struct NewsResponse: Decodable {
    let articles: [Article]
}

struct NamedCount: Decodable, Hashable, Identifiable {
    let name: String
    let count: Int
    var id: String { name }
}

struct SourcesResponse: Decodable {
    let sources: [NamedCount]
    let categories: [NamedCount]
}

struct HealthResponse: Decodable {
    let articles: Int
    let sources: Int
    let next_fetch_in: Int?
}
