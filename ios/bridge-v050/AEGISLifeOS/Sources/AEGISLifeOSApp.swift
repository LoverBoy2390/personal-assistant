import SwiftUI

@main
struct AEGISLifeOSApp: App {
    @StateObject private var appleAccess = AppleAccessStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appleAccess)
                .preferredColorScheme(.dark)
        }
    }
}
