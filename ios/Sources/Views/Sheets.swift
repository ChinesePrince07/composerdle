import SwiftUI

// Bottom-sheet contents (presentation background is already CD.paperHi).
struct SheetHost: View {
    @ObservedObject var store: GameStore
    let sheet: GameStore.Sheet

    var body: some View {
        switch sheet {
        case .welcome: WelcomeSheet(store: store)
        case .name:    NameSheet(store: store)
        case .howto:   HowtoSheet(store: store)
        case .result:  ResultSheet(store: store)
        }
    }
}

// MARK: - shared bits

private struct SheetTitle: View {
    let text: String
    var body: some View {
        Text(text)
            .font(CD.display(22, .semibold)).tracking(2).textCase(.uppercase)
            .foregroundStyle(CD.ink)
            .frame(maxWidth: .infinity).multilineTextAlignment(.center)
    }
}

// Bullet with markdown-bold segments (Text(.init:) parses **bold**).
private struct Bullet: View {
    let md: String
    var body: some View {
        Text(.init(md)).font(CD.body(14)).foregroundStyle(CD.ink)
            .multilineTextAlignment(.center)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity)
    }
}

private extension View {
    func sheetScroll() -> some View {
        ScrollView { self.padding(.horizontal, 22).padding(.top, 14).padding(.bottom, 34) }
    }
}

// MARK: - Welcome

private struct WelcomeSheet: View {
    @ObservedObject var store: GameStore
    var body: some View {
        VStack(alignment: .center, spacing: 12) {
            Text("𝄞").font(.system(size: 26)).foregroundStyle(CD.gold)
                .frame(maxWidth: .infinity)
            SheetTitle(text: "Welcome to Composerdle")
            VStack(alignment: .center, spacing: 7) {
                Bullet(md: "**Six tries** to name the mystery composer — surname is enough. Hints and extra clues each cost a try.")
                Bullet(md: "**By Facts** is endless practice: six fun-fact clues, cryptic first, obvious last.")
                Bullet(md: "**By Ear** — a real recording and its engraved score, name inked out. Naming the **piece** too is optional — right = points **doubled**.")
                Bullet(md: "**Scoring:** fewer tries = more points, Medium ×2, Hard ×3. **Every win** counts toward your career; the daily puzzle also builds your streak.")
            }
            .padding(.top, 2)
            Text("Every performer needs a stage name — it is how your scores appear on the leaderboard.")
                .font(CD.body(14)).foregroundStyle(CD.ink)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity)
            CDField(placeholder: "e.g. Maestro Fortissimo", text: $store.nameDraft) {
                store.saveName(store.nameDraft)
            }
            PrimaryButton(title: "Take the stage") {
                store.saveName(store.nameDraft)
            }
            if !store.nameError.isEmpty {
                Text(store.nameError).font(CD.body(13)).foregroundStyle(CD.red)
                    .multilineTextAlignment(.center).frame(maxWidth: .infinity)
            }
            Button { store.skipName() } label: {
                Text("just browsing today")
                    .font(CD.body(13)).foregroundStyle(CD.red).underline()
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.plain)
        }
        .sheetScroll()
    }
}

// MARK: - Name

private struct NameSheet: View {
    @ObservedObject var store: GameStore
    var body: some View {
        VStack(alignment: .center, spacing: 12) {
            SheetTitle(text: "Stage name")
            Text("how your scores appear on the leaderboard")
                .font(CD.body(14, .regular, italic: true)).foregroundStyle(CD.inkSoft)
                .frame(maxWidth: .infinity).multilineTextAlignment(.center)
            CDField(placeholder: "e.g. Maestro Fortissimo", text: $store.nameDraft) {
                store.saveName(store.nameDraft)
            }
            PrimaryButton(title: "Enter the hall") {
                store.saveName(store.nameDraft)
            }
            if !store.nameError.isEmpty {
                Text(store.nameError).font(CD.body(13)).foregroundStyle(CD.red)
                    .multilineTextAlignment(.center).frame(maxWidth: .infinity)
            }
        }
        .sheetScroll()
    }
}

// MARK: - Howto

private struct HowtoSheet: View {
    @ObservedObject var store: GameStore
    var body: some View {
        VStack(alignment: .center, spacing: 12) {
            SheetTitle(text: "How to play")
            VStack(alignment: .center, spacing: 7) {
                Bullet(md: "One composer hides behind six fun-fact clues, cryptic first, obvious last.")
                Bullet(md: "You have **six tries**: guess (surname is enough) or ask for the next clue — either spends a try.")
                Bullet(md: "Wrong guesses are struck off the list.")
                Bullet(md: "**By Ear** brings a real recording and its engraved score, name inked out. A **hint** (year, era, genre) costs a try.")
                Bullet(md: "Cracked the composer but not the piece? Keep hunting with your remaining tries — or **take the points** and move on.")
                Bullet(md: "Pick a level: **Easy** serves common-knowledge clues, **Hard** only the niche, obscure ones. Fewer tries = more points; Medium ×2, Hard ×3.")
            }
            .padding(.top, 2)
            Text("An idea by TwoSet Violin, brought to iOS.")
                .font(CD.body(12, .regular, italic: true)).foregroundStyle(CD.inkSoft)
                .frame(maxWidth: .infinity).multilineTextAlignment(.center)
            PrimaryButton(title: "To the stage") { store.sheet = nil }
                .frame(width: 200).frame(maxWidth: .infinity)
        }
        .sheetScroll()
    }
}

// MARK: - Result

private struct ResultSheet: View {
    @ObservedObject var store: GameStore
    var body: some View {
        VStack(spacing: 0) {
            if let r = store.currentResult {
                let won = (store.resultMode == .ear ? store.ear?.state.won : store.facts?.state.won) ?? false
                let grid = store.currentMarks
                    .map { $0 == "win" ? "🟩" : $0 == "skip" ? "⬜️" : "🟥" }.joined()

                Text(won ? "Correct!" : "Not this time")
                    .font(CD.display(28, .bold)).foregroundStyle(won ? CD.gold : CD.red)
                    .multilineTextAlignment(.center)
                Text("+\(r.pts) pts")
                    .font(CD.body(16, .semibold)).foregroundStyle(CD.ink)
                    .padding(.top, 2)

                Text(r.composer)
                    .font(CD.display(36, .semibold)).foregroundStyle(CD.ink)
                    .multilineTextAlignment(.center)
                    .padding(.top, 8)

                if let years = r.years {
                    Text(years).font(CD.body(13)).tracking(3).foregroundStyle(CD.inkSoft)
                        .padding(.top, 4)
                }

                if store.resultMode == .ear, let title = r.title, !title.isEmpty {
                    Text(.init(title))
                        .font(CD.body(14.5, .regular, italic: true)).foregroundStyle(CD.ink)
                        .multilineTextAlignment(.center)
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(.top, 10)
                }

                Text(grid).font(.system(size: 18)).tracking(4)
                    .padding(.top, 14)

                HStack(spacing: 8) {
                    ShareLink(item: store.shareText) {
                        Text("Share")
                            .font(CD.body(11, .semibold)).tracking(2).textCase(.uppercase)
                            .padding(.horizontal, 18).padding(.vertical, 11)
                            .foregroundStyle(CD.paperHi).background(CD.gold)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                    .buttonStyle(.plain)

                    Button {
                        if store.resultMode == .ear { store.loadEarPractice() } else { store.loadFacts() }
                        store.sheet = nil
                    } label: {
                        Text("Next ▸")
                            .font(CD.body(11, .semibold)).tracking(2).textCase(.uppercase)
                            .padding(.horizontal, 18).padding(.vertical, 11)
                            .foregroundStyle(CD.paperHi).background(CD.ink)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                    .buttonStyle(.plain)
                }
                .padding(.top, 18)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)   // center the verdict vertically
        .padding(.horizontal, 22).padding(.vertical, 16)
    }
}
