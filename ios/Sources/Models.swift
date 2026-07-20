import Foundation

// Wire types for the Composerdle backend (composerdle.andypandy.org/api).

struct DailyResponse: Codable, Sendable {
    let day: Int
    let today: Int
    let mode: String
    let tier: String
    let scored: Bool
    let key: String
    let gs: String
    let puzzle: Puzzle
    let state: GameState
}

struct Puzzle: Codable, Sendable {
    let clues: [String]?          // facts
    let audio: String?           // ear
    let pages: [String]?         // ear score page image URLs
    let crop: Double?            // fraction hidden off page-1 top
    let cropBottom: Double?      // fraction hidden off every page bottom
}

struct GameState: Codable, Sendable {
    let marks: [String]          // "win" | "wrong" | "skip"
    let hints: [String]
    let pieceFound: Bool
    let wrong: [String]
    let done: Bool
    let won: Bool
    let comp: Bool               // composer cracked, piece still open
    var composer: String?        // revealed composer name once comp/done
    var result: GameResult?
}

struct GameResult: Codable, Sendable {
    let composer: String
    let years: String?
    let title: String?
    let performer: String?
    let license: String?
    let scoreNote: String?
    let pts: Int
    let pieceFound: Bool?
    let ctries: Int?
    let challengeId: String?
}

struct GuessResponse: Codable, Sendable {
    let state: GameState
    let gs: String?
    let clues: [String]?
    let composer: String?
    let piece: String?           // "correct" | "genre" | "wrong"
    let genre: String?
    let strike: String?          // wrong guess matched a different composer
    let career: Int?
    let streak: Int?
}

struct Profile: Codable, Sendable {
    let name: String
    let career: Int
    let games: Int
    let wins: Int
    let dist: [String: Int]
    let streak: Streak
}
struct Streak: Codable, Sendable { let cur: Int; let max: Int }

struct Leaderboard: Codable, Sendable {
    let scope: String
    let day: Int
    let top: [BoardRow]
    let me: BoardRow?
}
struct BoardRow: Codable, Sendable {
    let name: String
    let score: Int
    let streak: Int
    let rank: Int?
}
