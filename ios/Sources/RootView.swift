import SwiftUI

struct RootView: View {
    @StateObject private var store = GameStore()
    @State private var loadedEar = false
    @State private var loadedBoard = false
    @State private var loadedProfile = false

    var body: some View {
        ZStack {
            ParchmentBackground()
            VStack(spacing: 0) {
                if store.tab == .facts || store.tab == .ear {
                    HeaderView(store: store)
                }
                Group {
                    switch store.tab {
                    case .facts:   FactsView(store: store)
                    case .ear:     EarView(store: store)
                    case .board:   BoardView(store: store)
                    case .profile: ProfileView(store: store)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                BottomBar(store: store)
            }
        }
        .preferredColorScheme(.light)
        .tint(CD.ink)
        .onAppear { if store.facts == nil { store.loadFacts() } }
        .onChange(of: store.tab) { _, tab in
            switch tab {
            case .ear where !loadedEar: loadedEar = true; store.loadEarDaily()
            case .board: loadedBoard = true; store.loadBoard()
            case .profile: loadedProfile = true; store.loadProfile()
            default: break
            }
        }
        .sheet(item: $store.sheet) { sheet in
            SheetHost(store: store, sheet: sheet)
                .presentationDetents(sheet == .result || sheet == .welcome ? [.large] : [.medium, .large])
                .presentationDragIndicator(.visible)
                .presentationCornerRadius(22)
                .presentationBackground(CD.paperHi)
        }
    }
}

// Top header for the two game tabs: wordmark, how-to, meta line, tier selector.
struct HeaderView: View {
    @ObservedObject var store: GameStore
    private let tiers = ["easy", "medium", "hard"]

    private var meta: String {
        let t = store.tier.uppercased()
        return store.tab == .ear ? "\(t) · TODAY'S PUZZLE" : "\(t) · PRACTICE"
    }

    var body: some View {
        VStack(spacing: 6) {
            ZStack {
                HStack(spacing: 7) {
                    Text("𝄞").font(.system(size: 19)).foregroundStyle(CD.gold)
                    (Text("Composer").foregroundStyle(CD.ink) + Text("dle").foregroundStyle(CD.red))
                        .font(CD.display(21, .bold)).tracking(2)
                        .textCase(.uppercase)
                }
                HStack {
                    Spacer()
                    Button { store.sheet = .howto } label: {
                        Text("?").font(CD.display(16, .semibold)).foregroundStyle(CD.inkSoft)
                            .frame(width: 28, height: 28)
                            .background(CD.paperHi.opacity(0.8))
                            .overlay(Circle().stroke(CD.rule, lineWidth: 1))
                            .clipShape(Circle())
                    }.buttonStyle(.plain)
                }
            }
            Text(meta).font(CD.body(10.5, .medium)).tracking(2.4)
                .foregroundStyle(CD.inkSoft)
            HStack(spacing: 0) {
                ForEach(tiers, id: \.self) { t in
                    let on = store.tier == t
                    Text(t.uppercased())
                        .font(CD.body(11, .semibold)).tracking(1.4)
                        .frame(maxWidth: .infinity).padding(.vertical, 7)
                        .background(on ? CD.ink : Color.clear)
                        .foregroundStyle(on ? CD.paperHi : CD.inkSoft)
                        .onTapGesture { store.setTier(t) }
                }
            }
            .frame(maxWidth: 280)
            .overlay(RoundedRectangle(cornerRadius: 9).stroke(CD.rule, lineWidth: 1))
            .clipShape(RoundedRectangle(cornerRadius: 9))
        }
        .padding(.top, 54).padding(.horizontal, 16).padding(.bottom, 8)
        .frame(maxWidth: .infinity)
        .background(CD.paper.opacity(0.6))
        .overlay(Rectangle().frame(height: 1).foregroundStyle(CD.rule.opacity(0.55)), alignment: .bottom)
    }
}

// Bottom tab bar.
struct BottomBar: View {
    @ObservedObject var store: GameStore
    private struct Item { let tab: GameStore.Tab; let icon: String; let label: String }
    private let items: [Item] = [
        .init(tab: .facts, icon: "line.3.horizontal", label: "By Facts"),
        .init(tab: .ear, icon: "headphones", label: "By Ear"),
        .init(tab: .board, icon: "chart.bar.fill", label: "Ranks"),
        .init(tab: .profile, icon: "person", label: "Profile"),
    ]
    var body: some View {
        HStack {
            ForEach(items, id: \.tab) { it in
                let on = store.tab == it.tab
                VStack(spacing: 3) {
                    Image(systemName: it.icon).font(.system(size: 19, weight: .regular))
                    Text(it.label.uppercased()).font(.system(size: 9.5, weight: .semibold)).tracking(1)
                }
                .foregroundStyle(on ? CD.ink : CD.faint)
                .frame(maxWidth: .infinity).padding(.vertical, 6)
                .contentShape(Rectangle())
                .onTapGesture { store.tab = it.tab }
            }
        }
        .padding(.horizontal, 8).padding(.top, 4).padding(.bottom, 22)
        .background(CD.paperHi.opacity(0.94))
        .overlay(Rectangle().frame(height: 1).foregroundStyle(CD.rule.opacity(0.6)), alignment: .top)
    }
}
