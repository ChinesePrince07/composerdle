import SwiftUI

// "Programme" / Profile screen (design sc-if isProfile).
struct ProfileView: View {
    @ObservedObject var store: GameStore
    @State private var confirmDelete = false

    private let distKeys = ["1", "2", "3", "4", "5", "6", "x"]

    private var games: Int { store.profile?.games ?? 0 }
    private var wins: Int { store.profile?.wins ?? 0 }
    private var career: Int { store.profile?.career ?? 0 }
    private var winPct: Int { games > 0 ? Int((100.0 * Double(wins) / Double(games)).rounded()) : 0 }
    private var streakCur: Int { store.profile?.streak.cur ?? 0 }
    private var streakMax: Int { store.profile?.streak.max ?? 0 }
    private var dist: [String: Int] { store.profile?.dist ?? [:] }
    private var maxD: Int { max(1, distKeys.map { dist[$0] ?? 0 }.max() ?? 0) }

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                Text("Programme")
                    .font(CD.display(24, .semibold)).tracking(3).textCase(.uppercase)
                    .foregroundStyle(CD.ink)
                    .frame(maxWidth: .infinity)
                nameCard
                statsCard
                settingsCard
                credits
            }
            .padding(.horizontal, 16)
            .padding(.top, 56)
            .padding(.bottom, 14)
        }
    }

    // Card 1 — stage name
    private var nameCard: some View {
        EngravedCard {
            VStack(spacing: 0) {
                Text("on the programme as")
                    .font(CD.body(12, .regular, italic: true)).foregroundStyle(CD.inkSoft)
                Text(store.name.isEmpty ? "—" : store.name)
                    .font(CD.display(26, .semibold)).foregroundStyle(CD.ink)
                    .padding(.top, 2)
                OutlineButton(title: "Change stage name") {
                    store.nameDraft = store.name
                    store.sheet = .name
                }
                .frame(maxWidth: 210)
                .padding(.top, 8)
            }
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 16).padding(.vertical, 14)
        }
    }

    // Card 2 — career stats + distribution bars
    private var statsCard: some View {
        EngravedCard {
            VStack(spacing: 12) {
                VStack(spacing: 4) {
                    (Text("\(games) ").font(CD.body(15, .bold))
                        + Text("played · ").font(CD.body(15))
                        + Text("\(winPct)% ").font(CD.body(15, .bold))
                        + Text("won · ").font(CD.body(15))
                        + Text("\(career) ").font(CD.body(15, .bold))
                        + Text("career pts").font(CD.body(15)))
                        .foregroundStyle(CD.ink)
                    (Text("streak ").font(CD.body(15))
                        + Text("\(streakCur)").font(CD.body(15, .bold))
                        + Text(" · best ").font(CD.body(15))
                        + Text("\(streakMax)").font(CD.body(15, .bold)))
                        .foregroundStyle(CD.ink)
                }
                .multilineTextAlignment(.center)

                VStack(spacing: 4) {
                    ForEach(distKeys, id: \.self) { distRow($0) }
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 16).padding(.vertical, 14)
        }
    }

    private func distRow(_ k: String) -> some View {
        let v = dist[k] ?? 0
        let frac = 0.08 + 0.92 * Double(v) / Double(maxD)   // matches design: 8% + 92%·v/max
        return HStack(spacing: 8) {
            Text(k).font(CD.body(12)).foregroundStyle(CD.inkSoft)
                .frame(width: 14, alignment: .trailing)
            GeometryReader { geo in
                Text(v > 0 ? "\(v)" : "")
                    .font(CD.body(11)).foregroundStyle(CD.paperHi)
                    .padding(.horizontal, 6).padding(.vertical, 2)
                    .frame(width: max(geo.size.width * frac, 16), height: 16, alignment: .leading)
                    .background(CD.gold)
            }
            .frame(height: 16)
        }
    }

    // Card 3 — settings
    private var settingsCard: some View {
        EngravedCard {
            VStack(spacing: 0) {
                settingRow("Sound effects", on: store.sfxOn) { store.toggleSfx() }
                DottedRule()
                Button { store.sheet = .howto } label: {
                    HStack {
                        Text("How to play").font(CD.body(15)).foregroundStyle(CD.ink)
                        Spacer()
                        Text("›").font(CD.body(15)).foregroundStyle(CD.faint)
                    }
                    .padding(.horizontal, 16).padding(.vertical, 13)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                DottedRule()
                Button { confirmDelete = true } label: {
                    HStack {
                        Text("Delete my data").font(CD.body(15)).foregroundStyle(CD.red)
                        Spacer()
                        Text("›").font(CD.body(15)).foregroundStyle(CD.faint)
                    }
                    .padding(.horizontal, 16).padding(.vertical, 13)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        }
        .confirmationDialog("Delete your stage name, stats, and leaderboard entry? This can't be undone.",
                            isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("Delete my data", role: .destructive) { store.deleteData() }
            Button("Cancel", role: .cancel) {}
        }
    }

    private func settingRow(_ label: String, on: Bool, toggle: @escaping () -> Void) -> some View {
        HStack {
            Text(label).font(CD.body(15)).foregroundStyle(CD.ink)
            Spacer()
            PillToggle(on: on, action: toggle)
        }
        .padding(.horizontal, 16).padding(.vertical, 13)
    }

    private var credits: some View {
        (Text("a daily classical-music guessing game ")
            .font(CD.body(12, .regular, italic: true)).foregroundStyle(CD.inkSoft)
            + Text("·").font(CD.body(12)).foregroundStyle(CD.gold)
            + Text(" recordings & scores from the public domain")
            .font(CD.body(12, .regular, italic: true)).foregroundStyle(CD.inkSoft))
            .multilineTextAlignment(.center)
            .lineSpacing(4)
            .frame(maxWidth: .infinity)
            .padding(.top, 6)
    }
}

// Pill toggle: track gold when on, parchment knob (design lines 222–230).
private struct PillToggle: View {
    let on: Bool
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            ZStack(alignment: on ? .trailing : .leading) {
                Capsule().fill(on ? CD.gold : CD.inkSoft.opacity(0.3))
                    .frame(width: 48, height: 29)
                Circle().fill(CD.paperHi)
                    .frame(width: 25, height: 25)
                    .shadow(color: CD.ink.opacity(0.3), radius: 1.5, y: 1)
                    .padding(.horizontal, 2)
            }
            .animation(.easeInOut(duration: 0.2), value: on)
        }
        .buttonStyle(.plain)
    }
}

// Dotted 1px divider (#b3a37e = CD.faint) between settings rows.
private struct DottedRule: View {
    var body: some View {
        GeometryReader { g in
            Path { p in
                p.move(to: .zero)
                p.addLine(to: CGPoint(x: g.size.width, y: 0))
            }
            .stroke(style: StrokeStyle(lineWidth: 1, dash: [1.5, 3]))
            .foregroundStyle(CD.faint)
        }
        .frame(height: 1)
        .padding(.horizontal, 16)
    }
}
