import SwiftUI

// "By Facts" screen (design sc-if isFacts): scrolling clue cards over a fixed
// action bar with guess field, clue button and try dots.
struct FactsView: View {
    @ObservedObject var store: GameStore

    var body: some View {
        Group {
            if let g = store.facts {
                VStack(spacing: 0) {
                    clueScroll(g)
                    bottomBar(g)
                }
            } else {
                Text("Setting the programme…")
                    .font(CD.body(15, .regular, italic: true))
                    .foregroundStyle(CD.inkSoft)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .task { if store.facts == nil { store.loadFacts() } }
    }

    // Scrolling list of engraved clue cards.
    private func clueScroll(_ g: FactsGame) -> some View {
        ScrollView {
            VStack(spacing: 8) {
                ForEach(Array(g.clues.enumerated()), id: \.offset) { i, clue in
                    clueCard(index: i, text: clue)
                }
                if g.state.done {
                    Text("The round is over — see the reveal below.")
                        .font(CD.body(14, .regular, italic: true))
                        .foregroundStyle(CD.inkSoft)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: .infinity)
                        .padding(.top, 6)
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 10)
            .padding(.bottom, 12)
        }
    }

    private func clueCard(index: Int, text: String) -> some View {
        EngravedCard {
            VStack(alignment: .leading, spacing: 5) {
                HStack(spacing: 10) {
                    Text("Clue \(index + 1)")
                        .font(CD.body(11, .semibold)).tracking(3).textCase(.uppercase)
                        .foregroundStyle(CD.red)
                    DottedRule()
                }
                Text(text)
                    .font(CD.body(15.5))
                    .foregroundStyle(CD.ink)
                    .lineSpacing(4)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(.horizontal, 13).padding(.top, 9).padding(.bottom, 10)
        }
    }

    // Fixed bottom action bar.
    private func bottomBar(_ g: FactsGame) -> some View {
        VStack(spacing: 6) {
            if g.state.done {
                HStack(spacing: 8) {
                    PrimaryButton(title: "See result ♪", bg: CD.gold, action: store.openResult)
                    PrimaryButton(title: "Next composer ▸", action: store.loadFacts)
                }
            } else {
                let sugs = Composers.suggest(store.factsGuess)
                if !sugs.isEmpty {
                    SuggestChips(items: sugs) { store.factsGuess = $0 }
                }
                HStack(spacing: 8) {
                    CDField(placeholder: "Full name or surname…",
                            text: $store.factsGuess,
                            onSubmit: store.guessFacts)
                    PrimaryButton(title: "Guess", action: store.guessFacts)
                        .frame(width: 92)
                }
                if !store.factsMsg.isEmpty {
                    Text(store.factsMsg)
                        .font(CD.body(13, .regular, italic: true))
                        .foregroundStyle(CD.red)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: .infinity)
                }
                OutlineButton(title: "I need another clue  ♪", action: store.clueFacts)
            }

            TryDots(marks: g.state.marks).frame(maxWidth: .infinity)

            if !g.state.wrong.isEmpty {
                WrongList(names: g.state.wrong).frame(maxWidth: .infinity).padding(.bottom, 4)
            }
        }
        .padding(.horizontal, 14).padding(.top, 8).padding(.bottom, 6)
        .background(CD.paperHi.opacity(0.94))
        .overlay(alignment: .top) {
            Rectangle().fill(CD.rule.opacity(0.55)).frame(height: 1)
        }
    }
}

// Dotted horizontal rule following the clue label (design's border-bottom dotted).
private struct DottedRule: View {
    var body: some View {
        Line().stroke(CD.faint, style: StrokeStyle(lineWidth: 1, dash: [1, 3]))
            .frame(height: 1)
            .frame(maxWidth: .infinity)
    }
    private struct Line: Shape {
        func path(in rect: CGRect) -> Path {
            var p = Path()
            p.move(to: CGPoint(x: 0, y: rect.midY))
            p.addLine(to: CGPoint(x: rect.width, y: rect.midY))
            return p
        }
    }
}
