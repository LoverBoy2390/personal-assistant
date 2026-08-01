import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var appleAccess: AppleAccessStore
    @State private var showsAppleConnections = false

    var body: some View {
        ZStack(alignment: .topTrailing) {
            AEGISWebView(appleAccess: appleAccess)
                .ignoresSafeArea()

            Button {
                showsAppleConnections = true
            } label: {
                Label("Apple", systemImage: "apple.logo")
                    .font(.caption.weight(.bold))
                    .padding(.horizontal, 12)
                    .frame(minHeight: 44)
                    .background(.ultraThinMaterial, in: Capsule())
                    .overlay(Capsule().stroke(.white.opacity(0.16)))
            }
            .buttonStyle(.plain)
            .padding(.top, 8)
            .padding(.trailing, 12)
            .accessibilityLabel("Open Apple Connections")
        }
        .sheet(isPresented: $showsAppleConnections) {
            AppleConnectionsView()
                .environmentObject(appleAccess)
        }
    }
}
