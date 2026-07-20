import SwiftUI

let MAX_TRIES = 6

// Row of ♪ tries, coloured by outcome.
struct TryDots: View {
    let marks: [String]
    var body: some View {
        HStack(spacing: 12) {
            ForEach(0..<MAX_TRIES, id: \.self) { i in
                Text("♪").font(.system(size: 19)).foregroundStyle(color(i))
            }
        }
    }
    private func color(_ i: Int) -> Color {
        guard i < marks.count else { return CD.rule.opacity(0.45) }
        switch marks[i] {
        case "win": return CD.gold
        case "wrong": return CD.red
        default: return CD.faint
        }
    }
}

// Horizontal suggestion chips.
struct SuggestChips: View {
    let items: [String]
    let pick: (String) -> Void
    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(items, id: \.self) { s in
                    Text(s)
                        .font(CD.body(13))
                        .foregroundStyle(CD.ink)
                        .padding(.horizontal, 12).padding(.vertical, 6)
                        .background(CD.paperHi)
                        .overlay(Capsule().stroke(CD.inkSoft, lineWidth: 1))
                        .clipShape(Capsule())
                        .onTapGesture { pick(s) }
                }
            }
        }
    }
}

// Struck-through list of wrong guesses.
struct WrongList: View {
    let names: [String]
    var body: some View {
        FlowText(names)
    }
    struct FlowText: View {
        let names: [String]
        init(_ n: [String]) { names = n }
        var body: some View {
            Text(names.map { $0 }.joined(separator: "   "))
                .font(CD.body(14, .regular, italic: true))
                .strikethrough(true, color: CD.red)
                .foregroundStyle(CD.red)
                .multilineTextAlignment(.center)
        }
    }
}

// Solid ink call-to-action.
struct PrimaryButton: View {
    let title: String
    var bg: Color = CD.ink
    var fg: Color = CD.paperHi
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Text(title).font(CD.body(12, .semibold)).tracking(2).textCase(.uppercase)
                .frame(maxWidth: .infinity).padding(.vertical, 12)
                .foregroundStyle(fg).background(bg)
                .clipShape(RoundedRectangle(cornerRadius: 10))
        }
        .buttonStyle(.plain)
    }
}

// Outlined secondary action.
struct OutlineButton: View {
    let title: String
    var op: Double = 1
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Text(title).font(CD.body(11, .semibold)).tracking(1.6).textCase(.uppercase)
                .frame(maxWidth: .infinity).padding(.vertical, 9)
                .foregroundStyle(CD.ink)
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(CD.ink, lineWidth: 1.5))
        }
        .buttonStyle(.plain).opacity(op)
    }
}

// Parchment text field matching the design inputs.
struct CDField: View {
    let placeholder: String
    @Binding var text: String
    var disabled = false
    var onSubmit: () -> Void = {}
    var body: some View {
        TextField(placeholder, text: $text)
            .font(CD.body(16, .medium))
            .foregroundStyle(CD.ink)
            .textInputAutocapitalization(.words)
            .autocorrectionDisabled()
            .submitLabel(.go)
            .onSubmit(onSubmit)
            .disabled(disabled)
            .padding(.horizontal, 12).padding(.vertical, 10)
            .background(CD.paperHi)
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(CD.inkSoft, lineWidth: 1.5))
            .opacity(disabled ? 0.55 : 1)
    }
}
