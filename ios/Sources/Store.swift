import SwiftUI

struct FactsGame { var gs: String; var clues: [String]; var state: GameState }
struct EarGame   { var gs: String; var puzzle: Puzzle; var state: GameState }

@MainActor
final class GameStore: ObservableObject {
    enum Tab: Hashable { case facts, ear, board, profile }
    enum Sheet: Int, Identifiable { case welcome, name, howto, result; var id: Int { rawValue } }

    // navigation / prefs
    @Published var tab: Tab = .facts
    @Published var tier = "medium"
    @Published var sheet: Sheet?
    @Published var boardScope = "career"
    @Published var name = ""
    @Published var nameDraft = ""
    @Published var nameError = ""
    @Published var sfxOn = true

    // By Facts
    @Published var facts: FactsGame?
    @Published var factsGuess = ""
    @Published var factsMsg = ""
    @Published var factsBusy = false

    // By Ear
    @Published var ear: EarGame?
    @Published var earGuessC = ""
    @Published var earGuessP = ""
    @Published var earMsg = ""
    @Published var earMsgRight = false
    @Published var earBusy = false
    @Published var earPage = 0

    @Published var profile: Profile?
    @Published var board: Leaderboard?
    @Published var resultMode: Tab = .facts

    let audio = AudioPlayer()
    let token: String
    private var seenPieces: Set<String> = []   // By Ear piece ids already served, to avoid repeats

    private let d = UserDefaults.standard
    private func ls(_ k: String) -> String? { d.string(forKey: "cdle-\(k)") }
    private func lsSet(_ k: String, _ v: String) { d.set(v, forKey: "cdle-\(k)") }

    init() {
        // Server cleanToken requires ^[a-z0-9-]{8,40}$ — Swift's UUID().uuidString is UPPERCASE,
        // which the server rejects as "bad token", so always lowercase (incl. any stored value).
        if let t = d.string(forKey: "cdle-token") { token = t.lowercased() }
        else { let t = UUID().uuidString.lowercased(); d.set(t, forKey: "cdle-token"); token = t }
        seenPieces = Set((ls("seen") ?? "").split(separator: ",").map(String.init))
        name = ls("name") ?? ""
        tier = ["easy", "medium", "hard"].contains(ls("tier") ?? "") ? ls("tier")! : "medium"
        sfxOn = ls("sfx") != "0"
        if name.isEmpty && ls("skip") != "1" { sheet = .welcome }
    }

    private static func nonce() -> String {
        String(UUID().uuidString.lowercased().filter { $0.isLetter || $0.isNumber }.prefix(16))
    }

    // MARK: By Facts
    func loadFacts() {
        factsBusy = true; factsMsg = ""; factsGuess = ""
        Task {
            defer { factsBusy = false }
            do {
                let r = try await API.daily(token: token, mode: "facts", tier: tier, nonce: Self.nonce())
                facts = FactsGame(gs: r.gs, clues: r.puzzle.clues ?? [], state: r.state)
            } catch { factsMsg = "The hall did not answer — pull to retry." }
        }
    }

    func guessFacts() {
        guard let g = facts, !g.state.done else { return }
        let v = factsGuess.trimmingCharacters(in: .whitespaces)
        guard !v.isEmpty else { return }
        factsGuess = ""; factsBusy = true
        Task {
            defer { factsBusy = false }
            do {
                let r = try await API.guess(token: token, gs: g.gs, action: "guess", value: .name(v), name: name.isEmpty ? nil : name)
                apply(factsResponse: r)
            } catch { factsMsg = "The hall did not answer — try again." }
        }
    }

    func clueFacts() {
        guard let g = facts, !g.state.done else { return }
        factsBusy = true
        Task {
            defer { factsBusy = false }
            do {
                let r = try await API.guess(token: token, gs: g.gs, action: "clue", value: .none, name: nil)
                apply(factsResponse: r)
            } catch { factsMsg = "The hall did not answer — try again." }
        }
    }

    private func apply(factsResponse r: GuessResponse) {
        guard var g = facts else { return }
        g.state = r.state
        if let gs = r.gs { g.gs = gs }
        if let clues = r.clues { g.clues = clues }
        facts = g
        if r.state.done {
            factsMsg = ""; openResult()   // auto verdict → reveal
        } else if let strike = r.strike {
            factsMsg = "That is \(strike) — but not today's composer."
        } else if r.state.marks.last == "wrong" {
            factsMsg = "Not quite — try another, or take a clue."
        } else {
            factsMsg = ""
        }
    }

    // MARK: By Ear
    func loadEarDaily() {
        loadEar(nonce: nil)
    }
    func loadEarPractice() {
        loadEar(nonce: Self.nonce())
    }
    private func loadEar(nonce: String?, attempt: Int = 0) {
        if attempt == 0 { earBusy = true; earMsg = ""; earGuessC = ""; earGuessP = ""; earPage = 0 }
        Task {
            do {
                let r = try await API.daily(token: token, mode: "ear", tier: tier, nonce: nonce)
                let id = Self.pieceId(r.puzzle.pages?.first)
                // Practice (nonce): if this piece was already served, reroll a fresh nonce
                // (best effort) so the player keeps meeting new music.
                if nonce != nil, let id, seenPieces.contains(id), attempt < 8 {
                    loadEar(nonce: Self.nonce(), attempt: attempt + 1); return
                }
                if let id { markSeen(id) }
                ear = EarGame(gs: r.gs, puzzle: r.puzzle, state: r.state)
                if let a = r.puzzle.audio { audio.load(a) }
                if r.state.comp, let c = r.state.composer { earGuessC = c }
                earBusy = false
            } catch { earMsg = "The hall did not answer — pull to retry."; earBusy = false }
        }
    }

    private func markSeen(_ id: String) {
        seenPieces.insert(id)
        lsSet("seen", seenPieces.joined(separator: ","))
    }
    // Extract the opaque piece id ("p14") from a score-page URL (.../s/p14/1.webp).
    static func pieceId(_ url: String?) -> String? {
        guard let url, let r = url.range(of: #"/s/p\d+/"#, options: .regularExpression) else { return nil }
        return String(url[r].dropFirst(3).dropLast())
    }

    func guessEar() {
        guard let g = ear, !g.state.done else { return }
        let piece = earGuessP.trimmingCharacters(in: .whitespaces)
        let value: GuessValue
        if g.state.comp {
            guard !piece.isEmpty else { return }
            value = .ear(c: nil, p: piece)
        } else {
            let comp = earGuessC.trimmingCharacters(in: .whitespaces)
            guard !comp.isEmpty else { return }
            value = .ear(c: comp, p: piece.isEmpty ? nil : piece)
        }
        earBusy = true
        Task {
            defer { earBusy = false }
            do {
                let r = try await API.guess(token: token, gs: g.gs, action: "guess", value: value, name: name.isEmpty ? nil : name)
                apply(earResponse: r)
            } catch { earMsg = "The hall did not answer — try again." }
        }
    }

    func hintEar() {
        guard let g = ear, !g.state.done else { return }
        earBusy = true
        Task {
            defer { earBusy = false }
            do {
                let r = try await API.guess(token: token, gs: g.gs, action: "hint", value: .none, name: nil)
                apply(earResponse: r)
            } catch { earMsg = "The hall did not answer — try again." }
        }
    }

    func bankEar() {
        guard let g = ear, !g.state.done else { return }
        let action = g.state.comp ? "bank" : "quit"
        earBusy = true
        Task {
            defer { earBusy = false }
            do {
                let r = try await API.guess(token: token, gs: g.gs, action: action, value: .none, name: nil)
                apply(earResponse: r)
            } catch { earMsg = "The hall did not answer — try again." }
        }
    }

    private func apply(earResponse r: GuessResponse) {
        guard var g = ear else { return }
        g.state = r.state
        if let gs = r.gs { g.gs = gs }
        ear = g
        earMsgRight = false
        if let c = r.composer, !r.state.done { earGuessC = c }   // composer earned, keep it visible
        if r.state.done {
            earMsg = ""; openResult()   // auto verdict → reveal
        } else if r.piece == "genre" {
            earMsg = "The right family\(r.genre.map { " (\($0))" } ?? "") — but not the piece."
        } else if let c = r.composer {
            earMsgRight = true
            earMsg = "\(c) — now name the piece for double, or take your points."
        } else if let strike = r.strike {
            earMsg = "That is \(strike) — not our composer."
        } else if r.state.marks.last == "wrong" {
            earMsg = "Not the composer — listen again."
        } else {
            earMsg = ""
        }
    }

    // MARK: tier / tabs
    func setTier(_ t: String) {
        guard tier != t else { return }
        tier = t; lsSet("tier", t)
        if tab == .facts { loadFacts() } else if tab == .ear { loadEarDaily() }
    }

    // MARK: profile / board
    func loadProfile() {
        Task { profile = try? await API.player(token: token) }
    }
    func loadBoard() {
        Task { board = try? await API.leaderboard(token: token, scope: boardScope) }
    }
    func setScope(_ s: String) { boardScope = s; loadBoard() }

    func saveName(_ v: String) {
        let n = v.trimmingCharacters(in: .whitespaces)
        guard !n.isEmpty else { return }
        nameError = ""
        Task {
            do {
                try await API.setName(token: token, name: n)   // 409 if taken
                name = n; lsSet("name", n); sheet = nil
            } catch APIError.http(409) {
                nameError = "That stage name is taken — try another."
            } catch {
                name = n; lsSet("name", n); sheet = nil   // network error: keep it locally
            }
        }
    }
    func skipName() { lsSet("skip", "1"); sheet = nil }

    // Erase the player's server profile + local identity (App Store Guideline 5.1.1(v)).
    func deleteData() {
        Task {
            try? await API.deleteProfile(token: token)
            name = ""; nameDraft = ""; profile = nil; board = nil
            seenPieces = []
            for k in ["name", "seen", "skip"] { d.removeObject(forKey: "cdle-\(k)") }
        }
    }

    func toggleSfx() { sfxOn.toggle(); lsSet("sfx", sfxOn ? "1" : "0") }

    // MARK: result helpers
    var currentResult: GameResult? {
        resultMode == .ear ? ear?.state.result : facts?.state.result
    }
    var currentMarks: [String] {
        resultMode == .ear ? (ear?.state.marks ?? []) : (facts?.state.marks ?? [])
    }
    var shareText: String {
        guard let r = currentResult else { return "" }
        let grid = currentMarks.map { $0 == "win" ? "🟩" : $0 == "skip" ? "⬜️" : "🟥" }.joined()
        let head = resultMode == .ear ? "🎼 By Ear" : "🎹 By Facts"
        return "\(head): \(r.composer) — \(r.pts) pts\n\(grid)\nhttps://composerdle.andypandy.org"
    }
    func openResult() { resultMode = tab; sheet = .result }
}
