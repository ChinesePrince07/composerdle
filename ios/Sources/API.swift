import Foundation

enum GuessValue {
    case name(String)                 // By Facts
    case ear(c: String?, p: String?)  // By Ear composer + optional piece
    case none                         // hint / bank / quit / clue
}

enum APIError: Error { case badURL, http(Int), transport }

enum API {
    static let base = "https://composerdle.andypandy.org"

    private static func decode<T: Decodable>(_ data: Data) throws -> T {
        try JSONDecoder().decode(T.self, from: data)
    }

    private static func get(_ path: String) async throws -> Data {
        guard let url = URL(string: base + path) else { throw APIError.badURL }
        let (data, resp) = try await URLSession.shared.data(from: url)
        guard let http = resp as? HTTPURLResponse else { throw APIError.transport }
        guard (200..<300).contains(http.statusCode) else { throw APIError.http(http.statusCode) }
        return data
    }

    private static func post(_ path: String, _ body: [String: Any]) async throws -> Data {
        guard let url = URL(string: base + path) else { throw APIError.badURL }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse else { throw APIError.transport }
        guard (200..<300).contains(http.statusCode) else { throw APIError.http(http.statusCode) }
        return data
    }

    private static func esc(_ s: String) -> String {
        s.addingPercentEncoding(withAllowedCharacters: .urlQueryValueAllowed) ?? s
    }

    // GET /api/daily — facts practice (nonce) / ear daily (tier) / ear practice (nonce)
    static func daily(token: String, mode: String, tier: String, nonce: String?) async throws -> DailyResponse {
        var q = "?token=\(esc(token))&mode=\(mode)&tier=\(tier)"
        if let nonce { q += "&nonce=\(esc(nonce))" }
        return try decode(await get("/api/daily" + q))
    }

    static func challenge(token: String, id: String) async throws -> DailyResponse {
        try decode(await get("/api/daily?token=\(esc(token))&mode=ear&challenge=\(esc(id))"))
    }

    static func guess(token: String, gs: String, action: String, value: GuessValue, name: String?) async throws -> GuessResponse {
        var body: [String: Any] = ["token": token, "gs": gs, "action": action]
        if let name, !name.isEmpty { body["name"] = name }
        switch value {
        case .name(let s): body["value"] = s
        case .ear(let c, let p):
            var v: [String: String] = [:]
            if let c { v["c"] = c }
            if let p { v["p"] = p }
            body["value"] = v
        case .none: break
        }
        return try decode(await post("/api/guess", body))
    }

    static func player(token: String) async throws -> Profile {
        try decode(await get("/api/player?token=\(esc(token))"))
    }

    static func setName(token: String, name: String) async throws {
        _ = try await post("/api/player", ["token": token, "name": name])
    }

    static func leaderboard(token: String, scope: String) async throws -> Leaderboard {
        try decode(await get("/api/leaderboard?token=\(esc(token))&scope=\(scope)"))
    }
}

extension CharacterSet {
    static let urlQueryValueAllowed: CharacterSet = {
        var cs = CharacterSet.urlQueryAllowed
        cs.remove(charactersIn: "&=?+")
        return cs
    }()
}
