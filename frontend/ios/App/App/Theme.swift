import SwiftUI

enum Theme {
    static let ink     = Color(red: 0.039, green: 0.039, blue: 0.039) // #0A0A0A
    static let paper   = Color(red: 0.957, green: 0.957, blue: 0.941) // #F4F4F0
    static let bone    = Color(red: 0.898, green: 0.898, blue: 0.878) // #E5E5E0
    static let muted   = Color(red: 0.322, green: 0.322, blue: 0.322) // #525252
    static let faint   = Color(red: 0.549, green: 0.549, blue: 0.549) // #8C8C8C
    static let klein   = Color(red: 0.0,   green: 0.0,   blue: 1.0)   // #0000FF
    static let signal  = Color(red: 1.0,   green: 0.231, blue: 0.188) // #FF3B30
    static let amber   = Color(red: 1.0,   green: 0.8,   blue: 0.0)   // #FFCC00
}

extension Font {
    static func mono(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight, design: .monospaced)
    }
    static func heading(_ size: CGFloat, weight: Font.Weight = .black) -> Font {
        .system(size: size, weight: weight, design: .default)
    }
}

extension View {
    func tactile() -> some View {
        self.buttonStyle(TactileButtonStyle())
    }
}

struct TactileButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(.easeOut(duration: 0.08), value: configuration.isPressed)
    }
}

extension View {
    @ViewBuilder
    func kerned(_ value: CGFloat) -> some View {
        if #available(iOS 16.0, *) {
            self.kerning(value)
        } else {
            self
        }
    }

    @ViewBuilder
    func hiddenScrollIndicators() -> some View {
        if #available(iOS 16.0, *) {
            self.scrollIndicators(.hidden)
        } else {
            self
        }
    }
}

enum Palette {
    static let source: [String: Color] = [
        "VentureBeat AI":   Color(red: 0,    green: 0,    blue: 1),
        "TechCrunch AI":    Color(red: 0,    green: 0.53, blue: 0.35),
        "The Decoder":      Color(red: 0.36, green: 0.13, blue: 0.71),
        "AI News":          Color(red: 0.92, green: 0.35, blue: 0.05),
        "HuggingFace Blog": Color(red: 0.79, green: 0.54, blue: 0.02),
        "Google DeepMind":  Color(red: 0.03, green: 0.57, blue: 0.71),
        "MIT Tech Review":  Color(red: 0.86, green: 0.15, blue: 0.15),
        "Ars Technica":     Color(red: 0.71, green: 0.33, blue: 0.04),
        "The Gradient":     Color(red: 0.75, green: 0.10, blue: 0.36),
        "Import AI":        Color(red: 0.06, green: 0.46, blue: 0.43),
        "Hacker News":      Color(red: 0.98, green: 0.57, blue: 0.24),
        "arXiv":            Color(red: 0.12, green: 0.16, blue: 0.22),
    ]
    static let category: [String: Color] = [
        "Industry":       Color(red: 0,    green: 0,    blue: 1),
        "Research":       Color(red: 0.36, green: 0.13, blue: 0.71),
        "Research Paper": Color(red: 0.12, green: 0.16, blue: 0.22),
        "Community":      Color(red: 0.98, green: 0.57, blue: 0.24),
        "Newsletter":     Color(red: 0.06, green: 0.46, blue: 0.43),
    ]
    static func source(_ name: String) -> Color { source[name] ?? Theme.muted }
    static func category(_ name: String) -> Color { category[name] ?? Theme.muted }
}
