import Foundation

@MainActor
final class NewsStore: ObservableObject {
    @Published private(set) var articles: [Article] = []
    @Published private(set) var sources: [NamedCount] = []
    @Published private(set) var categories: [NamedCount] = []
    @Published private(set) var health: HealthResponse?
    @Published private(set) var isLoading = true
    @Published private(set) var isRefreshing = false
    @Published var errorMessage: String?

    private let baseURL = "https://ai-news-agent-indol.vercel.app"

    private lazy var session: URLSession = {
        let cfg = URLSessionConfiguration.default
        cfg.requestCachePolicy = .reloadIgnoringLocalCacheData
        cfg.timeoutIntervalForRequest = 20
        return URLSession(configuration: cfg)
    }()

    func loadAll() async {
        do {
            async let news: NewsResponse = get("/api/news?limit=120")
            async let src: SourcesResponse = get("/api/sources")
            async let hp:  HealthResponse  = get("/api/health")
            let (n, s, h) = try await (news, src, hp)
            self.articles   = n.articles
            self.sources    = s.sources
            self.categories = s.categories
            self.health     = h
            self.errorMessage = nil
        } catch {
            self.errorMessage = error.localizedDescription
        }
        self.isLoading = false
    }

    func refresh() async {
        guard !isRefreshing else { return }
        isRefreshing = true
        defer { isRefreshing = false }
        do {
            guard let u = URL(string: baseURL + "/api/refresh") else { throw URLError(.badURL) }
            var req = URLRequest(url: u)
            req.httpMethod = "POST"
            _ = try await session.data(for: req)
            await loadAll()
        } catch {
            self.errorMessage = error.localizedDescription
        }
    }

    private func get<T: Decodable>(_ path: String) async throws -> T {
        guard let u = URL(string: baseURL + path) else { throw URLError(.badURL) }
        let (data, _) = try await session.data(from: u)
        return try JSONDecoder().decode(T.self, from: data)
    }
}

@MainActor
final class SavedStore: ObservableObject {
    @Published private(set) var ids: Set<String>

    private let key = "ai-news:saved"

    init() {
        if let raw = UserDefaults.standard.array(forKey: key) as? [String] {
            self.ids = Set(raw)
        } else {
            self.ids = []
        }
    }

    func isSaved(_ id: String) -> Bool { ids.contains(id) }

    func toggle(_ id: String) {
        if ids.contains(id) { ids.remove(id) } else { ids.insert(id) }
        UserDefaults.standard.set(Array(ids), forKey: key)
    }
}
