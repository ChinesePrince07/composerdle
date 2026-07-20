import SwiftUI

// "Ranks" tab — the leaderboard. Career / Today scopes, highlighted "you" row.
struct BoardView: View {
    @ObservedObject var store: GameStore

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                Text("Leaderboard")
                    .font(CD.display(24, .semibold)).tracking(3).textCase(.uppercase)
                    .foregroundStyle(CD.ink)
                    .frame(maxWidth: .infinity)

                scopeToggle.padding(.top, 10)

                let top = store.board?.top ?? []
                let me = store.board?.me
                if top.isEmpty && me == nil {
                    Text("An empty hall — be the first on stage.")
                        .font(CD.body(15, .regular, italic: true))
                        .foregroundStyle(CD.inkSoft)
                        .multilineTextAlignment(.center)
                        .padding(.top, 44)
                } else {
                    VStack(spacing: 0) {
                        ForEach(Array(top.enumerated()), id: \.offset) { _, r in
                            row(r, me: !store.name.isEmpty && r.name == store.name)
                        }
                        if let me {
                            Text("⋯")
                                .font(CD.display(20))
                                .foregroundStyle(CD.faint)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 4)
                            row(me, me: true)
                        }
                    }
                    .padding(.top, 8)
                }

                Text("every win scores — the daily also builds your streak")
                    .font(CD.body(12.5, .regular, italic: true))
                    .foregroundStyle(CD.inkSoft)
                    .multilineTextAlignment(.center)
                    .padding(.top, 16)
            }
            .padding(.top, 56)
            .padding(.horizontal, 16)
            .padding(.bottom, 14)
        }
        .task { store.loadBoard() }
    }

    // Career / Today segmented control.
    private var scopeToggle: some View {
        HStack(spacing: 0) {
            seg("Career", "career")
            seg("Today", "today")
        }
        .frame(width: 200)
        .clipShape(RoundedRectangle(cornerRadius: 9))
        .overlay(RoundedRectangle(cornerRadius: 9).stroke(CD.inkSoft, lineWidth: 1))
    }

    private func seg(_ title: String, _ scope: String) -> some View {
        let active = store.boardScope == scope
        return Text(title)
            .font(CD.body(10.5, .semibold)).tracking(1.5).textCase(.uppercase)
            .foregroundStyle(active ? CD.paperHi : CD.inkSoft)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 7)
            .background(active ? CD.ink : Color.clear)
            .contentShape(Rectangle())
            .onTapGesture { store.setScope(scope) }
    }

    // One leaderboard line: "rank. name  🔥streak" left, score right.
    private func row(_ r: BoardRow, me: Bool) -> some View {
        let weight: Font.Weight = me ? .semibold : .regular
        var left = Text(r.rank.map { "\($0)." } ?? "").foregroundStyle(CD.gold)
            + Text("  \(r.name)").foregroundStyle(CD.ink)
        if r.streak > 1 {
            left = left + Text("  🔥\(r.streak)").font(CD.body(11, weight)).foregroundStyle(CD.ink)
        }
        return HStack(alignment: .firstTextBaseline) {
            left.font(CD.body(16.5, weight))
            Spacer(minLength: 8)
            Text("\(r.score)")
                .font(CD.body(16.5, weight))
                .foregroundStyle(CD.ink)
                .monospacedDigit()
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 11)
        .background(me ? CD.gold.opacity(0.14) : Color.clear)
        .overlay(alignment: .bottom) { DottedRule() }
    }
}

// Faint dotted bottom rule under each row.
private struct DottedRule: View {
    var body: some View {
        Rectangle()
            .fill(.clear)
            .frame(height: 1)
            .overlay(
                GeometryReader { geo in
                    Path { p in
                        p.move(to: CGPoint(x: 0, y: 0.5))
                        p.addLine(to: CGPoint(x: geo.size.width, y: 0.5))
                    }
                    .stroke(CD.faint, style: StrokeStyle(lineWidth: 1, dash: [1.5, 2.5]))
                }
            )
    }
}
