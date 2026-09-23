import SwiftUI

struct DemoRootView: View {
    let onExit: () -> Void
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        TabView {
            NavigationStack {
                DemoFeedView()
                    .toolbar {
                        ToolbarItem(placement: .topBarLeading) {
                            Menu {
                                Button("Вернуться ко входу", systemImage: "rectangle.portrait.and.arrow.right", action: onExit)
                            } label: {
                                HStack(spacing: 6) {
                                    Image("KazakhstanEmblem").resizable().scaledToFit().frame(width: 24, height: 24)
                                    Text("АКИМ").font(.caption.weight(.bold))
                                }
                            }
                            .accessibilityLabel("Меню АКИМ")
                        }
                    }
            }
            .tabItem { Label("События", systemImage: "newspaper") }

            NavigationStack { DemoMapView() }
                .tabItem { Label("Карта", systemImage: "map") }

            NavigationStack { DemoChatsView() }
                .tabItem { Label("Чаты", systemImage: "bubble.left.and.bubble.right") }
                .badge(3)

            NavigationStack { DemoAssistantView() }
                .tabItem { Label("Помощник", systemImage: "sparkles") }
        }
        .tint(colorScheme == .dark ? Color(red: 166 / 255, green: 211 / 255, blue: 237 / 255) : Color(red: 12 / 255, green: 73 / 255, blue: 100 / 255))
    }
}
