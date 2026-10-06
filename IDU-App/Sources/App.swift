import UIKit
import WebKit

// IDU – personal app: opens the official IDU site (s27.idu.edu.pl) directly,
// full screen, with the mobile skin. No other servers involved.

private let homeURL = URL(string: "https://s27.idu.edu.pl/")!
private let iduHost = "s27.idu.edu.pl"
private let bgColor = UIColor(red: 0.059, green: 0.067, blue: 0.082, alpha: 1)   // always dark

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.backgroundColor = bgColor
        window.overrideUserInterfaceStyle = .dark
        window.rootViewController = WebViewController()
        window.makeKeyAndVisible()
        self.window = window
        return true
    }
}

final class WebViewController: UIViewController, WKNavigationDelegate, WKUIDelegate {
    private var webView: WKWebView!

    override func loadView() {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()          // keeps you logged in between launches
        config.allowsInlineMediaPlayback = true

        // Inject the skin into every IDU page
        if let url = Bundle.main.url(forResource: "skin", withExtension: "js"),
           let source = try? String(contentsOf: url, encoding: .utf8) {
            let script = WKUserScript(source: source, injectionTime: .atDocumentEnd, forMainFrameOnly: true)
            config.userContentController.addUserScript(script)
        }

        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = true      // swipe from the edge to go back
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.isOpaque = false
        webView.backgroundColor = bgColor
        webView.scrollView.backgroundColor = bgColor

        let refresh = UIRefreshControl()                          // pull down to refresh
        refresh.addTarget(self, action: #selector(pullToRefresh(_:)), for: .valueChanged)
        webView.scrollView.refreshControl = refresh

        view = webView
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        webView.load(URLRequest(url: homeURL))
    }

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }

    @objc private func pullToRefresh(_ sender: UIRefreshControl) {
        if webView.url == nil { webView.load(URLRequest(url: homeURL)) } else { webView.reload() }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { sender.endRefreshing() }
    }

    // MARK: Links – IDU stays in the app, everything else opens in Safari

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { decisionHandler(.allow); return }
        let scheme = (url.scheme ?? "").lowercased()

        if ["about", "blob", "data", "javascript"].contains(scheme) { decisionHandler(.allow); return }
        if ["mailto", "tel", "sms"].contains(scheme) { UIApplication.shared.open(url); decisionHandler(.cancel); return }
        // Frames inside the page (e.g. the robot check) load normally
        if let frame = navigationAction.targetFrame, !frame.isMainFrame { decisionHandler(.allow); return }
        if url.host == iduHost { decisionHandler(.allow); return }

        if navigationAction.navigationType == .linkActivated || navigationAction.targetFrame == nil {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }

    // target="_blank" links
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url {
            if url.host == iduHost { webView.load(navigationAction.request) } else { UIApplication.shared.open(url) }
        }
        return nil
    }

    // MARK: Popups from the page ("Jesteś pewien?" etc.)

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
        present(alert, animated: true)
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Anuluj", style: .cancel) { _ in completionHandler(false) })
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
        present(alert, animated: true)
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        let alert = UIAlertController(title: nil, message: prompt, preferredStyle: .alert)
        alert.addTextField { $0.text = defaultText }
        alert.addAction(UIAlertAction(title: "Anuluj", style: .cancel) { _ in completionHandler(nil) })
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(alert.textFields?.first?.text) })
        present(alert, animated: true)
    }

    // MARK: No internet

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        let code = (error as NSError).code
        if code == NSURLErrorCancelled { return }
        let html = """
        <html><head><meta name="viewport" content="width=device-width,initial-scale=1">
        <style>body{font:17px -apple-system,sans-serif;display:flex;height:100vh;margin:0;align-items:center;justify-content:center;
        text-align:center;background:#0f1115;color:#f2f4f8}
        a{display:inline-block;margin-top:16px;background:#1e88e5;color:#fff;padding:12px 22px;border-radius:12px;text-decoration:none;font-weight:700}</style>
        </head><body><div><div style="font-size:44px">📡</div><p>Brak połączenia z IDU</p>
        <a href="\(homeURL.absoluteString)">Spróbuj ponownie</a></div></body></html>
        """
        webView.loadHTMLString(html, baseURL: nil)
    }
}
