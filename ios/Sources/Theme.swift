import SwiftUI

// Composerdle palette + type. System serif stands in for Cormorant Garamond /
// Spectral in v1; swapping to bundled TTFs is a one-file change here.
enum CD {
    static let paper   = Color(hex: 0xf5eddb)
    static let paperHi = Color(hex: 0xfbf5e7)
    static let card    = Color(hex: 0xfdfaf1)
    static let ink     = Color(hex: 0x211c12)
    static let inkSoft = Color(hex: 0x5c5137)
    static let gold    = Color(hex: 0x9a7724)
    static let red     = Color(hex: 0x7c2323)
    static let rule    = Color(hex: 0xb6a276)
    static let faint   = Color(hex: 0xb3a37e)

    static func display(_ size: CGFloat, _ weight: Font.Weight = .semibold, italic: Bool = false) -> Font {
        let f = Font.system(size: size, weight: weight, design: .serif)
        return italic ? f.italic() : f
    }
    static func body(_ size: CGFloat, _ weight: Font.Weight = .regular, italic: Bool = false) -> Font {
        let f = Font.system(size: size, weight: weight, design: .serif)
        return italic ? f.italic() : f
    }
}

extension Color {
    init(hex: UInt32) {
        self.init(.sRGB,
                  red:   Double((hex >> 16) & 0xff) / 255,
                  green: Double((hex >> 8) & 0xff) / 255,
                  blue:  Double(hex & 0xff) / 255,
                  opacity: 1)
    }
}

extension Text {
    // uppercase tracked label used all over the design
    func tracked(_ spacing: CGFloat = 3) -> some View { self.tracking(spacing) }
}

// Parchment background: warm paper + faint staff lines + top glow.
struct ParchmentBackground: View {
    var body: some View {
        ZStack {
            CD.paper
            GeometryReader { geo in
                Path { p in
                    var y: CGFloat = 34
                    while y < geo.size.height {
                        p.move(to: CGPoint(x: 0, y: y))
                        p.addLine(to: CGPoint(x: geo.size.width, y: y))
                        y += 35
                    }
                }
                .stroke(CD.ink.opacity(0.045), lineWidth: 1)
            }
            RadialGradient(colors: [Color(hex: 0xfffcf0).opacity(0.85), .clear],
                           center: .top, startRadius: 0, endRadius: 420)
        }
        .ignoresSafeArea()
    }
}

// The engraved card frame (double border with offset outline) used for clues/scores.
struct EngravedCard<Content: View>: View {
    var fill: Color = CD.paperHi
    @ViewBuilder var content: () -> Content
    var body: some View {
        content()
            .background(fill)
            .overlay(Rectangle().stroke(CD.rule, lineWidth: 1))
            .padding(2)
            .overlay(Rectangle().stroke(CD.gold.opacity(0.45), lineWidth: 1).padding(0))
            .shadow(color: Color(hex: 0x463714).opacity(0.08), radius: 5, y: 2)
    }
}
