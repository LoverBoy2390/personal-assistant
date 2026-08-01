import SwiftUI
import UIKit
import WebKit

struct AEGISWebView: UIViewRepresentable {
    @ObservedObject var appleAccess: AppleAccessStore

    func makeCoordinator() -> Coordinator {
        Coordinator(appleAccess: appleAccess)
    }

    func makeUIView(context: Context) -> WKWebView {
        let controller = WKUserContentController()
        controller.add(context.coordinator, name: "aegisNative")
        controller.addUserScript(WKUserScript(
            source: Self.bridgeBootstrap,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        ))

        let configuration = WKWebViewConfiguration()
        configuration.userContentController = controller
        configuration.websiteDataStore = .default()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        context.coordinator.webView = webView

        guard let indexURL = Bundle.main.url(
            forResource: "index",
            withExtension: "html",
            subdirectory: "WebApp"
        ) else {
            webView.loadHTMLString("<h1>AEGIS web assets are missing.</h1>", baseURL: nil)
            return webView
        }

        webView.loadFileURL(indexURL, allowingReadAccessTo: indexURL.deletingLastPathComponent())
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    static let bridgeBootstrap = #"""
    (() => {
      const send = (command, payload = {}) => {
        if (!window.webkit?.messageHandlers?.aegisNative) {
          return false;
        }
        window.webkit.messageHandlers.aegisNative.postMessage({ command, payload });
        return true;
      };
      Object.defineProperty(window, 'AEGISNative', {
        value: Object.freeze({
          available: true,
          getStatus: () => send('getStatus'),
          requestCalendar: () => send('requestCalendar'),
          requestReminders: () => send('requestReminders'),
          getAgenda: (days = 7) => send('getAgenda', { days: String(days) })
        }),
        configurable: false,
        writable: false
      });
      window.dispatchEvent(new CustomEvent('aegis-native-ready'));
    })();
    """#

    @MainActor
    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        weak var webView: WKWebView?
        private let appleAccess: AppleAccessStore
        private let encoder: JSONEncoder = {
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            return encoder
        }()

        init(appleAccess: AppleAccessStore) {
            self.appleAccess = appleAccess
        }

        func userContentController(
            _ userContentController: WKUserContentController,
            didReceive message: WKScriptMessage
        ) {
            guard message.name == "aegisNative",
                  let body = message.body as? [String: Any],
                  let command = body["command"] as? String else {
                return
            }

            let payload = body["payload"] as? [String: String]
            Task { await handle(command: command, payload: payload) }
        }

        private func handle(command: String, payload: [String: String]?) async {
            switch command {
            case "getStatus":
                send(command: command, payload: appleAccess.snapshot())
            case "requestCalendar":
                let granted = await appleAccess.requestCalendar()
                send(command: command, payload: ["granted": granted])
            case "requestReminders":
                let granted = await appleAccess.requestReminders()
                send(command: command, payload: ["granted": granted])
            case "getAgenda":
                let days = Int(payload?["days"] ?? "7") ?? 7
                await appleAccess.loadAgenda(days: days)
                send(command: command, payload: appleAccess.agenda)
            default:
                send(command: command, error: "Unsupported read-only bridge command")
            }
        }

        private func send<T: Encodable>(command: String, payload: T) {
            let response = NativeBridgeResponse(
                command: command,
                ok: true,
                payload: EncodablePayload(payload),
                error: nil
            )
            deliver(response)
        }

        private func send(command: String, error: String) {
            let response = NativeBridgeResponse(
                command: command,
                ok: false,
                payload: nil,
                error: error
            )
            deliver(response)
        }

        private func deliver(_ response: NativeBridgeResponse) {
            guard let data = try? encoder.encode(response),
                  let json = String(data: data, encoding: .utf8) else {
                return
            }
            let script = "window.dispatchEvent(new CustomEvent('aegis-native-response',{detail:\(json)}));"
            webView?.evaluateJavaScript(script)
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.cancel)
                return
            }

            if url.isFileURL || url.scheme == "about" {
                decisionHandler(.allow)
                return
            }

            decisionHandler(.cancel)
            UIApplication.shared.open(url)
        }
    }
}
