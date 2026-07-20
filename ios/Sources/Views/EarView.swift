import SwiftUI
import UIKit

// "By Ear" screen (design sc-if isEar): an engraved score card whose pages turn
// with the recording, over a guess form for composer + optional piece.
struct EarView: View {
    @ObservedObject var store: GameStore

    var body: some View {
        Group {
            if let g = store.ear {
                content(g)
            } else {
                Text("Cueing the recording…")
                    .font(CD.body(15, .regular, italic: true))
                    .foregroundStyle(CD.inkSoft)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .task { if store.ear == nil { store.loadEarDaily() } }
    }

    private func content(_ g: EarGame) -> some View {
        let pages = g.puzzle.pages ?? []
        return ScrollView {
            VStack(spacing: 7) {
                ScoreCard(store: store, audio: store.audio, game: g, pages: pages)

                if g.state.done {
                    HStack(spacing: 8) {
                        PrimaryButton(title: "See reveal ♪", bg: CD.gold, action: store.openResult)
                        PrimaryButton(title: "Next piece ▸", action: store.loadEarPractice)
                    }
                } else {
                    guessForm(g)
                }

                TryDots(marks: g.state.marks).frame(maxWidth: .infinity).padding(.top, 2)

                if !g.state.wrong.isEmpty {
                    WrongList(names: g.state.wrong).frame(maxWidth: .infinity)
                }
            }
            .padding(.horizontal, 16).padding(.top, 10).padding(.bottom, 14)
        }
    }

    // MARK: guess form (not done)

    @ViewBuilder
    private func guessForm(_ g: EarGame) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("The composer")
                .font(CD.body(12, .semibold)).tracking(2.5).textCase(.uppercase)
                .foregroundStyle(CD.ink)

            let sugs = g.state.comp ? [] : Composers.suggest(store.earGuessC)
            if !sugs.isEmpty {
                SuggestChips(items: sugs) { store.earGuessC = $0 }
            }
            CDField(placeholder: "Full name or surname — e.g. Dvořák",
                    text: $store.earGuessC,
                    disabled: g.state.comp,
                    onSubmit: store.guessEar)

            // Uppercase baked into the label literal so the gold paren keeps its case.
            (Text("THE PIECE ").font(CD.body(12, .semibold)).tracking(2.5).foregroundStyle(CD.ink)
             + Text("(optional — name it right and your points double)")
                .font(CD.body(12, .regular, italic: true)).foregroundStyle(CD.gold))

            CDField(placeholder: "e.g. Symphony No. 5",
                    text: $store.earGuessP,
                    disabled: g.state.pieceFound,
                    onSubmit: store.guessEar)

            PrimaryButton(title: "Submit guess ♪", action: store.guessEar)

            if !store.earMsg.isEmpty {
                Text(store.earMsg)
                    .font(CD.body(14, .regular, italic: true))
                    .foregroundStyle(store.earMsgRight ? CD.gold : CD.red)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)
            }

            HStack(spacing: 10) {
                OutlineButton(title: "Hint ♪ — costs a try", action: store.hintEar)
                OutlineButton(title: g.state.comp ? "Take the points ▸" : "Give up",
                              action: store.bankEar)
            }

            if !g.state.hints.isEmpty {
                VStack(alignment: .leading, spacing: 7) {
                    ForEach(g.state.hints, id: \.self) { h in
                        Text(h)
                            .font(CD.body(15, .regular, italic: true))
                            .foregroundStyle(CD.inkSoft)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.leading, 11)
                            .overlay(alignment: .leading) {
                                Rectangle().fill(CD.gold).frame(width: 3)
                            }
                    }
                }
                .padding(.top, 2)
            }
        }
    }
}

// MARK: - Score card

private struct ScoreCard: View {
    @ObservedObject var store: GameStore
    @ObservedObject var audio: AudioPlayer   // observed here so ticks re-render the bar + turn pages
    let game: EarGame
    let pages: [String]

    private var done: Bool { game.state.done }

    var body: some View {
        EngravedCard(fill: CD.card) {
            VStack(spacing: 7) {
                header
                scoreBox
                pageNav
                audioBar
            }
            .padding(.horizontal, 11).padding(.top, 10).padding(.bottom, 8)
        }
        // Auto page-turn: advance forward only, in step with the recording.
        .onChange(of: audio.time) { _, t in
            let n = pages.count
            guard n > 1, audio.duration > 0 else { return }
            let target = min(Int((t / (audio.duration / Double(n))).rounded(.down)), n - 1)
            if target > store.earPage { store.earPage = target }
        }
    }

    private var header: some View {
        VStack(spacing: 7) {
            HStack {
                Text("The score")
                    .font(CD.body(10, .semibold)).tracking(2.2).textCase(.uppercase)
                    .foregroundStyle(CD.inkSoft)
                Spacer()
                HStack(spacing: 5) {
                    Text("by").font(CD.body(10)).tracking(1)
                        .foregroundStyle(CD.inkSoft)
                    if done, let name = game.state.result?.composer {
                        Text(name)
                            .font(CD.body(11, .semibold)).tracking(1)
                            .foregroundStyle(CD.red)
                    } else {
                        // Redaction bar — a certain somebody.
                        RoundedRectangle(cornerRadius: 1)
                            .fill(Color(hex: 0x141210))
                            .frame(width: 100, height: 12)
                            .rotationEffect(.degrees(-0.6))
                    }
                }
            }
            .padding(.horizontal, 2)
            DottedLine()
        }
    }

    private var scoreBox: some View {
        // Top crop hides the withheld title on page 0; bottom crop trims every
        // page while the puzzle is unsolved (mirrors listen.html).
        let top: CGFloat = (store.earPage == 0 && !done) ? CGFloat(game.puzzle.crop ?? 0) : 0
        let bottom: CGFloat = !done ? CGFloat(game.puzzle.cropBottom ?? 0) : 0
        let url = pages.indices.contains(store.earPage) ? pages[store.earPage] : nil
        return ScorePage(url: url, top: top, bottom: bottom)
            .padding(.horizontal, 8).padding(.top, 8).padding(.bottom, 8)
            .background(Color.white)
            .overlay(Rectangle().stroke(CD.rule, lineWidth: 1))
    }

    private var pageNav: some View {
        HStack(spacing: 12) {
            navArrow("‹", enabled: store.earPage > 0) {
                if store.earPage > 0 { store.earPage -= 1 }
            }
            Text("page \(store.earPage + 1) of \(max(pages.count, 1))")
                .font(CD.body(10.5, .medium)).tracking(2).textCase(.uppercase)
                .foregroundStyle(CD.inkSoft)
            navArrow("›", enabled: store.earPage < pages.count - 1) {
                if store.earPage < pages.count - 1 { store.earPage += 1 }
            }
        }
    }

    private func navArrow(_ glyph: String, enabled: Bool, _ tap: @escaping () -> Void) -> some View {
        Text(glyph)
            .font(.system(size: 14)).foregroundStyle(CD.ink)
            .padding(.horizontal, 13).padding(.vertical, 3)
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(CD.ink, lineWidth: 1.5))
            .opacity(enabled ? 1 : 0.35)
            .contentShape(Rectangle())
            .onTapGesture { if enabled { tap() } }
    }

    private var audioBar: some View {
        let dur = audio.duration
        let frac: CGFloat = dur > 0 ? CGFloat(min(max(audio.time / dur, 0), 1)) : 0
        return HStack(spacing: 9) {
            Button { audio.toggle() } label: {
                Image(systemName: audio.playing ? "pause.fill" : "play.fill")
                    .font(.system(size: 11)).foregroundStyle(CD.paperHi)
                    .frame(width: 30, height: 30)
                    .background(CD.ink).clipShape(Circle())
            }
            .buttonStyle(.plain)

            Text(fmt(audio.time))
                .font(CD.body(11)).monospacedDigit().foregroundStyle(CD.inkSoft)

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(CD.rule.opacity(0.5))
                    Capsule().fill(CD.gold).frame(width: geo.size.width * frac)
                }
            }
            .frame(height: 4)

            Text(fmt(dur))
                .font(CD.body(11)).monospacedDigit().foregroundStyle(CD.inkSoft)
        }
        .padding(.horizontal, 8).padding(.vertical, 5)
        .background(CD.paper)
        .overlay(Capsule().stroke(CD.rule.opacity(0.6), lineWidth: 1))
        .clipShape(Capsule())
    }

    private func fmt(_ s: Double) -> String {
        guard s.isFinite, s >= 0 else { return "0:00" }
        let t = Int(s)
        return "\(t / 60):" + String(format: "%02d", t % 60)
    }
}

// MARK: - Cropped score page

// Loads the page image directly (so we know its real pixel size), then shows the
// VISIBLE window — full page minus the hidden top/bottom fractions — at full box
// width. Sizing itself from the image aspect is reliable, unlike measuring an
// AsyncImage via preferences (which collapsed the score to a tiny fallback height).
private struct ScorePage: View {
    let url: String?
    let top: CGFloat
    let bottom: CGFloat
    @State private var img: UIImage?

    var body: some View {
        Group {
            if let img, img.size.width > 0 {
                let visH = max(img.size.height * (1 - top - bottom), 1)
                Color.clear
                    .aspectRatio(img.size.width / visH, contentMode: .fit)
                    .overlay(
                        GeometryReader { g in
                            let w = g.size.width
                            let fullH = w * img.size.height / img.size.width
                            Image(uiImage: img).resizable()
                                .frame(width: w, height: fullH)
                                .offset(y: -top * fullH)
                        }
                    )
                    .clipped()
            } else {
                Rectangle().fill(Color.white)
                    .aspectRatio(0.75, contentMode: .fit)
                    .overlay(ProgressView().tint(CD.faint))
            }
        }
        .task(id: url) { await load() }
    }

    private func load() async {
        img = nil
        guard let u = url.flatMap(URL.init(string:)) else { return }
        if let (data, _) = try? await URLSession.shared.data(from: u), let ui = UIImage(data: data) {
            img = ui
        }
    }
}

// Hairline dotted rule (design's dotted header underline).
private struct DottedLine: View {
    var body: some View {
        GeometryReader { g in
            Path { p in
                p.move(to: CGPoint(x: 0, y: 0.5))
                p.addLine(to: CGPoint(x: g.size.width, y: 0.5))
            }
            .stroke(CD.faint, style: StrokeStyle(lineWidth: 1, dash: [1, 3]))
        }
        .frame(height: 1)
    }
}
