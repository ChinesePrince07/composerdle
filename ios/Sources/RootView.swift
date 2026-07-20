import SwiftUI

struct RootView: View {
    @StateObject private var store = GameStore()

    var body: some View {
        // Native TabView — on iOS 26 the tab bar is Liquid Glass automatically and
        // far more compact than a hand-rolled bar. Each game tab carries its own header.
        TabView(selection: $store.tab) {
            gameTab(FactsView(store: store))
                .task { if store.facts == nil { store.loadFacts() } }
                .tabItem { Label("By Facts", systemImage: "list.bullet") }
                .tag(GameStore.Tab.facts)

            gameTab(EarView(store: store))
                .tabItem { Label("By Ear", systemImage: "headphones") }
                .tag(GameStore.Tab.ear)

            plainTab(BoardView(store: store))
                .tabItem { Label("Ranks", systemImage: "chart.bar.fill") }
                .tag(GameStore.Tab.board)

            plainTab(ProfileView(store: store))
                .task { store.loadProfile() }
                .tabItem { Label("Profile", systemImage: "person") }
                .tag(GameStore.Tab.profile)
        }
        .tint(CD.ink)
        .preferredColorScheme(.light)
        .sheet(item: $store.sheet) { sheet in
            SheetHost(store: store, sheet: sheet)
                .presentationDetents([.fraction(0.4), .large])
                .presentationDragIndicator(.visible)
                .presentationCornerRadius(22)
                .presentationBackground(CD.paperHi)
        }
    }

    // Game tabs: parchment + header + content.
    private func gameTab<V: View>(_ content: V) -> some View {
        ZStack {
            ParchmentBackground()
            VStack(spacing: 0) {
                HeaderView(store: store)
                content.frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
    }

    // Board / Profile: parchment + content (each supplies its own title).
    private func plainTab<V: View>(_ content: V) -> some View {
        ZStack { ParchmentBackground(); content }
    }
}

// Compact header for the two game tabs: wordmark, how-to, meta line, tier selector.
// Sits high (safe area already clears the status bar) to give the score room.
struct HeaderView: View {
    @ObservedObject var store: GameStore
    private let tiers = ["easy", "medium", "hard"]

    private var meta: String {
        let t = store.tier.uppercased()
        return store.tab == .ear ? "\(t) · TODAY'S PUZZLE" : "\(t) · PRACTICE"
    }

    var body: some View {
        VStack(spacing: 5) {
            ZStack {
                HStack(spacing: 7) {
                    Text("𝄞").font(.system(size: 18)).foregroundStyle(CD.gold)
                    (Text("Composer").foregroundStyle(CD.ink) + Text("dle").foregroundStyle(CD.red))
                        .font(CD.display(20, .bold)).tracking(2)
                        .textCase(.uppercase)
                }
                HStack {
                    Spacer()
                    Button { store.sheet = .howto } label: {
                        Text("?").font(CD.display(15, .semibold)).foregroundStyle(CD.inkSoft)
                            .frame(width: 26, height: 26)
                            .background(CD.paperHi.opacity(0.8))
                            .overlay(Circle().stroke(CD.rule, lineWidth: 1))
                            .clipShape(Circle())
                    }.buttonStyle(.plain)
                }
            }
            Text(meta).font(CD.body(10, .medium)).tracking(2.4)
                .foregroundStyle(CD.inkSoft)
            HStack(spacing: 0) {
                ForEach(tiers, id: \.self) { t in
                    let on = store.tier == t
                    Text(t.uppercased())
                        .font(CD.body(11, .semibold)).tracking(1.4)
                        .frame(maxWidth: .infinity).padding(.vertical, 6)
                        .background(on ? CD.ink : Color.clear)
                        .foregroundStyle(on ? CD.paperHi : CD.inkSoft)
                        .onTapGesture { store.setTier(t) }
                }
            }
            .frame(maxWidth: 280)
            .overlay(RoundedRectangle(cornerRadius: 9).stroke(CD.rule, lineWidth: 1))
            .clipShape(RoundedRectangle(cornerRadius: 9))
        }
        .padding(.top, 6).padding(.horizontal, 16).padding(.bottom, 6)
        .frame(maxWidth: .infinity)
        .overlay(Rectangle().frame(height: 1).foregroundStyle(CD.rule.opacity(0.55)), alignment: .bottom)
    }
}
