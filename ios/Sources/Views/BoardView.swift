import SwiftUI

// "Ranks" tab — the leaderboard. Career / Today scopes, highlighted "you" row.
struct BoardView: View {
    @ObservedObject var store: GameStore
    @State private var reported: String?

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                Text("Leaderboard")
                    .font(CD.display(24, .semibold)).tracking(3).textCase(.uppercase)
                    .foregroundStyle(CD.ink)
                    .frame(maxWidth: .infinity)

                scopeToggle.padding(.top, 10)

                let top = (store.board?.top ?? []).filter { !store.blocked.contains($0.name) }
                let me = store.board?.me
                if top.isEmpty && me == nil {
                    Text("An empty hall — be the first on stage.")
                        .font(CD.body(15, .regular, italic: true))
                        .foregroundStyle(CD.inkSoft)
                        .multilineTextAlignment(.center)
                        .padding(.top, 44)
                } else {
                    VStack(spacing: 0) {
                        ForEach(Array(top.enumerated()), id: \.offset) { i, r in
                            row(r, rank: i + 1, me: !store.name.isEmpty && r.name == store.name)
                        }
                        if let me {
                            Text("⋯")
                                .font(CD.display(20))
                                .foregroundStyle(CD.faint)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 4)
                            row(me, rank: me.rank ?? 0, me: true)
                        }
                    }
                    .padding(.top, 8)
                }

                Text("every win scores — the daily also builds your streak")
                    .font(CD.body(12.5, .regular, italic: true))
                    .foregroundStyle(CD.inkSoft)
                    .multilineTextAlignment(.center)
                    .padding(.top, 16)

                Text("press and hold a name to report or hide it")
                    .font(CD.body(11.5)).foregroundStyle(CD.faint)
                    .multilineTextAlignment(.center)
                    .padding(.top, 4)

                if !store.blocked.isEmpty {
                    Button {
                        store.unblockAll()
                    } label: {
                        Text("show \(store.blocked.count) hidden player\(store.blocked.count == 1 ? "" : "s")")
                            .font(CD.body(12)).foregroundStyle(CD.red).underline()
                    }
                    .buttonStyle(.plain)
                    .padding(.top, 8)
                }
            }
            .padding(.top, 56)
            .padding(.horizontal, 16)
            .padding(.bottom, 14)
        }
        .task { store.loadBoard() }
        .alert("Thank you", isPresented: Binding(get: { reported != nil }, set: { if !$0 { reported = nil } })) {
            Button("OK", role: .cancel) { reported = nil }
            Button("Also hide them") {
                if let n = reported { store.block(n) }
                reported = nil
            }
        } message: {
            Text("The name has been sent for review. We look at reports within 24 hours and withdraw anything objectionable.")
        }
    }

    // Career / Today segmented control.
    private var scopeToggle: some View {
        HStack(spacing: 0) {
            seg("Career", "career")
            seg("Today", "daily")   // server scope key is "daily", not "today"
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
    private func row(_ r: BoardRow, rank: Int, me: Bool) -> some View {
        let weight: Font.Weight = me ? .semibold : .regular
        var left = Text("\(rank).").foregroundStyle(CD.gold)
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
        .contentShape(Rectangle())
        // Long-press for moderation. A menu keeps the board clean while still giving every
        // row a report and a block, which guideline 1.2 requires for user-chosen names.
        .contextMenu {
            if !me && !r.name.isEmpty {
                Button {
                    store.report(r.name)
                    reported = r.name
                } label: { Label("Report this name", systemImage: "flag") }
                Button(role: .destructive) {
                    store.block(r.name)
                } label: { Label("Hide this player", systemImage: "eye.slash") }
            }
        }
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
