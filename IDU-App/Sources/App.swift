import UIKit
import WebKit
import WidgetKit
import UserNotifications
import QuickLook
import JavaScriptCore

// IDU – personal app: opens the official IDU site (s27.idu.edu.pl) directly,
// full screen, with the mobile skin. No other servers are involved.

private let homeURL = URL(string: "https://s27.idu.edu.pl/")!
private let iduHost = "s27.idu.edu.pl"
// The colour behind the page follows the style chosen in the skin (sent as "theme"), so light styles never flash black
private enum Theme {
    static var bg: UIColor { UIColor(hex: UserDefaults.standard.string(forKey: "themeBg") ?? "") ?? UIColor(red: 0.059, green: 0.067, blue: 0.082, alpha: 1) }
    static var light: Bool { UserDefaults.standard.bool(forKey: "themeLight") }
}

extension UIColor {
    convenience init?(hex: String) {
        var h = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if h.hasPrefix("#") { h.removeFirst() }
        guard h.count == 6, let v = UInt32(h, radix: 16) else { return nil }
        self.init(red: CGFloat((v >> 16) & 0xff) / 255, green: CGFloat((v >> 8) & 0xff) / 255, blue: CGFloat(v & 0xff) / 255, alpha: 1)
    }
}
// Newer skin versions are downloaded from GitHub in the background and used from the next launch on
// (falls back to the last download, then to the copy built into the app).
private let remoteSkinURL = URL(string: "https://raw.githubusercontent.com/fn5jmkbpr2-boop/idu-app/main/IDU-App/Resources/skin.js")

@main
final class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    var window: UIWindow?
    private var web: WebViewController? { window?.rootViewController as? WebViewController }

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        Watcher.register()                 // background check for new grades / messages (must be registered at launch)
        Watcher.schedule()
        var handled = false
        if let item = launchOptions?[.shortcutItem] as? UIApplicationShortcutItem, let path = AppDelegate.shortcutPath(item.type) {
            WebViewController.startPath = path; handled = true
        }
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.backgroundColor = Theme.bg
        window.overrideUserInterfaceStyle = Theme.light ? .light : .dark
        window.rootViewController = WebViewController()
        window.makeKeyAndVisible()
        self.window = window
        return !handled
    }

    // long press on the app icon: Plan / Szukaj / Ważne / Zdjęcie do lekcji
    static func shortcutPath(_ type: String) -> String? {
        ["plan": "/#plan", "search": "/#szukaj", "fav": "/#wazne", "photo": "/#dodaj"][type]
    }

    func application(_ application: UIApplication, performActionFor shortcutItem: UIApplicationShortcutItem,
                     completionHandler: @escaping (Bool) -> Void) {
        guard let path = AppDelegate.shortcutPath(shortcutItem.type) else { completionHandler(false); return }
        web?.open(path: path)
        completionHandler(true)
    }

    // idu://plan from the widget
    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        guard url.scheme == "idu" else { return false }
        let target = url.host ?? ""
        web?.open(path: target.isEmpty || target == "start" ? "/#start" : target == "plan" ? "/#plan" : "/")
        return true
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        Reminders.reschedule()            // keeps the next 8 days of reminders filled in
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        Watcher.schedule()
    }

    // reminders also show while the app is open
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .list, .sound])
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        if let path = response.notification.request.content.userInfo["path"] as? String {
            web?.open(path: path)
        }
        completionHandler()
    }
}

/// Vibrations requested by the skin: window.webkit.messageHandlers.haptic.postMessage("light")
final class HapticHandler: NSObject, WKScriptMessageHandler {
    private let light = UIImpactFeedbackGenerator(style: .light)
    private let medium = UIImpactFeedbackGenerator(style: .medium)
    private let soft = UIImpactFeedbackGenerator(style: .soft)
    private let rigid = UIImpactFeedbackGenerator(style: .rigid)
    private let selection = UISelectionFeedbackGenerator()
    private let notify = UINotificationFeedbackGenerator()

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        switch (message.body as? String) ?? "light" {
        case "selection": selection.selectionChanged()
        case "medium": medium.impactOccurred()
        case "soft": soft.impactOccurred()
        case "rigid": rigid.impactOccurred()
        case "success": notify.notificationOccurred(.success)
        case "warning": notify.notificationOccurred(.warning)
        case "error": notify.notificationOccurred(.error)
        default: light.impactOccurred()
        }
    }
}

/// Messages from the skin (timetable for the widget, reminder settings). Holds the controller weakly.
final class SkinMessageHandler: NSObject, WKScriptMessageHandler {
    weak var owner: WebViewController?
    init(owner: WebViewController) { self.owner = owner }
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        owner?.handleSkinMessage(message.body)
    }
}

final class WebViewController: UIViewController, WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate, QLPreviewControllerDataSource {
    static var startPath: String?          // set when the app is opened from a quick action
    private var webView: WKWebView!
    private var downloadURL: URL?
    private var previewURL: URL?

    // Runs before IDU paints anything: dark background + the last picture of the screen (instant start).
    // The skin removes both as soon as the real page is ready (6 s safety limit).
    private let earlyScript = """
    (function(){try{
      var bg=localStorage.getItem('skSnapBg')||'#0f1115';
      var s=document.createElement('style');s.id='sk-early';
      s.textContent='html{background:'+bg+'!important}body{visibility:hidden!important}';
      document.documentElement.appendChild(s);
      if(!document.querySelector('meta[name=viewport]')){var v=document.createElement('meta');v.name='viewport';
        v.content='width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';document.documentElement.appendChild(v);}
      var p=location.pathname.replace(/\\/+$/,'')||'/', key;
      if(p==='/'&&!location.hash){var st=null;try{st=sessionStorage.getItem('skStarted')}catch(e){}
        key=st?'/#start':(localStorage.getItem('skStartKey')||'/#start');}
      else key=p==='/'?'/'+location.hash:p;
      var map=JSON.parse(localStorage.getItem('skSnap')||'{}'), snap=map[key], css=localStorage.getItem('skSnapCss');
      if(snap&&css&&Date.now()-snap.t<3*864e5){
        var h=document.createElement('div');h.id='sk-snap';
        h.style.cssText='position:fixed;left:0;top:0;right:0;bottom:0;z-index:2147483646;pointer-events:none;overflow:hidden;';
        h.attachShadow({mode:'open'}).innerHTML='<style>'+css+'</style>'+snap.h;
        document.documentElement.appendChild(h);
      }
      setTimeout(function(){s.remove();var x=document.getElementById('sk-snap');if(x)x.remove();},6000);
    }catch(e){}})();
    """

    override func loadView() {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()          // keeps you logged in between launches
        config.allowsInlineMediaPlayback = true
        config.userContentController.add(HapticHandler(), name: "haptic")
        config.userContentController.add(SkinMessageHandler(owner: self), name: "idu")

        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = false     // the skin has its own smooth swipe-back
        webView.allowsLinkPreview = false                        // no long-press previews of IDU pages
        webView.scrollView.alwaysBounceHorizontal = false
        webView.scrollView.keyboardDismissMode = .interactive
        webView.underPageBackgroundColor = Theme.bg
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.isOpaque = false
        webView.backgroundColor = Theme.bg
        webView.scrollView.backgroundColor = Theme.bg
        // pull-to-refresh is done by the skin (smooth, without reloading the whole page)

        view = webView
    }

    private var loadedSkinVersion: Double = 0
    private var lastSkinCheck = Date.distantPast
    private var hiddenAt: Date?

    /// the early script + the skin, injected into every IDU page
    private func installScripts(_ source: String?) {
        let controller = webView.configuration.userContentController
        controller.removeAllUserScripts()
        controller.addUserScript(WKUserScript(source: earlyScript, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        if let source = source {
            controller.addUserScript(WKUserScript(source: source, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
            loadedSkinVersion = version(of: source)
        }
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        installScripts(localSkin())
        let start = WebViewController.startPath.flatMap { URL(string: $0, relativeTo: homeURL)?.absoluteURL } ?? homeURL
        WebViewController.startPath = nil
        webView.load(URLRequest(url: start))
        updateSkinInBackground()
        let nc = NotificationCenter.default
        nc.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) { [weak self] _ in self?.hiddenAt = Date() }
        nc.addObserver(forName: UIApplication.willEnterForegroundNotification, object: nil, queue: .main) { [weak self] _ in self?.cameBack() }
    }

    /// back from the background: look for a newer skin now and then; if one arrived while you were away for a while, use it right away
    private func cameBack() {
        let away = hiddenAt.map { Date().timeIntervalSince($0) } ?? 0
        hiddenAt = nil
        if Date().timeIntervalSince(lastSkinCheck) > 10 * 60 { updateSkinInBackground() }
        if away > 5 * 60, let source = localSkin(), version(of: source) > loadedSkinVersion {
            installScripts(source)
            webView.reload()
        }
    }

    override var preferredStatusBarStyle: UIStatusBarStyle { Theme.light ? .darkContent : .lightContent }

    /// Opens a page of IDU – "/#plan" only switches the tab when the start page is already open.
    func open(path: String) {
        guard isViewLoaded, let webView = webView else { return }
        if path.hasPrefix("/#"), webView.url?.host == iduHost, !webView.isLoading {
            let hash = String(path.dropFirst(2)).filter { $0.isLetter }
            webView.evaluateJavaScript("if(location.pathname==='/'){location.hash='\(hash)'}else{location.href='/#\(hash)'}", completionHandler: nil)
        } else if let url = URL(string: path, relativeTo: homeURL)?.absoluteURL {
            webView.load(URLRequest(url: url))
        }
    }

    // MARK: Messages from the skin

    func handleSkinMessage(_ body: Any) {
        guard let dict = body as? [String: Any], let type = dict["type"] as? String else { return }
        switch type {
        case "plan":
            guard JSONSerialization.isValidJSONObject(dict),
                  let data = try? JSONSerialization.data(withJSONObject: dict, options: []),
                  (try? JSONDecoder().decode(PlanData.self, from: data)) != nil else { return }
            IDUShared.savePlan(data)
            WidgetCenter.shared.reloadAllTimelines()
            Reminders.reschedule()
        case "notify":
            Reminders.saveSettings(dict)
            Watcher.saveSettings(dict)
            Reminders.reschedule()
        case "applySkin":
            // the skin said "switch now" (you weren't in the middle of anything, or you tapped the button)
            if let source = localSkin(), version(of: source) > loadedSkinVersion {
                installScripts(source)
                webView.reload()
            }
        case "checkNow":
            // "Sprawdź teraz" in the notification settings: check IDU right away and answer with a short status
            UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { [weak self] _, _ in
                Watcher.check(manual: true) { report in
                    let json = (try? JSONSerialization.data(withJSONObject: ["text": report.text])).flatMap { String(data: $0, encoding: .utf8) } ?? "{}"
                    DispatchQueue.main.async {
                        self?.webView.evaluateJavaScript("window.__skNative && window.__skNative('watch', \(json))", completionHandler: nil)
                    }
                }
            }
        case "theme":
            // background + status bar follow the style (Zeszyt is light: dark clock and battery)
            guard let hex = dict["bg"] as? String, let color = UIColor(hex: hex) else { return }
            let light = (dict["light"] as? NSNumber)?.boolValue ?? false
            UserDefaults.standard.set(hex, forKey: "themeBg")
            UserDefaults.standard.set(light, forKey: "themeLight")
            webView.backgroundColor = color
            webView.scrollView.backgroundColor = color
            webView.underPageBackgroundColor = color
            view.window?.backgroundColor = color
            view.window?.overrideUserInterfaceStyle = light ? .light : .dark
            setNeedsStatusBarAppearanceUpdate()
        case "badge":
            if Watcher.wantsMail { Watcher.setBadge((dict["n"] as? NSNumber)?.intValue ?? 0) }
        case "askNotify":
            UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { [weak self] granted, _ in
                DispatchQueue.main.async {
                    self?.webView.evaluateJavaScript("window.__skNative && window.__skNative('notify', \(granted ? "true" : "false"))", completionHandler: nil)
                }
                if granted { Reminders.reschedule() }
            }
        case "remind":
            // a reminder for something saved in "Ważne"
            guard let id = dict["id"] as? String, let at = (dict["at"] as? NSNumber)?.doubleValue else { return }
            let date = Date(timeIntervalSince1970: at)
            guard date > Date() else { return }
            let c = UNMutableNotificationContent()
            c.title = (dict["title"] as? String) ?? "IDU"
            c.body = (dict["body"] as? String) ?? ""
            c.sound = .default
            if let path = dict["path"] as? String { c.userInfo = ["path": path] }
            let comps = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: date)
            let center = UNUserNotificationCenter.current()
            center.removePendingNotificationRequests(withIdentifiers: [id])
            center.add(UNNotificationRequest(identifier: id, content: c, trigger: UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)), withCompletionHandler: nil)
        case "unremind":
            if let id = dict["id"] as? String { UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [id]) }
        case "saveFile":
            // backup of notes: save via the share sheet ("Zapisz w Plikach")
            guard let name = dict["name"] as? String, let text = dict["text"] as? String else { return }
            let safe = name.replacingOccurrences(of: "/", with: "-")
            let url = FileManager.default.temporaryDirectory.appendingPathComponent(safe)
            do { try text.write(to: url, atomically: true, encoding: .utf8) } catch { return }
            let share = UIActivityViewController(activityItems: [url], applicationActivities: nil)
            share.popoverPresentationController?.sourceView = view
            present(share, animated: true)
        default:
            break
        }
    }

    // MARK: Skin (built-in copy, newer one from GitHub when available)

    private var cachedSkinFile: URL? {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first?.appendingPathComponent("skin.js")
    }

    private func version(of source: String?) -> Double {
        guard let s = source, let r = s.range(of: #"@version\s+([0-9.]+)"#, options: .regularExpression) else { return 0 }
        let v = s[r].split(separator: " ").last.map(String.init) ?? "0"
        let parts = v.split(separator: ".").compactMap { Double($0) }
        return parts.enumerated().reduce(0) { $0 + $1.element / pow(100, Double($1.offset)) }
    }

    /// true when the downloaded skin is valid JavaScript (checked with the phone's own engine, without running it)
    static func compiles(_ source: String) -> Bool {
        guard let ctx = JSContext() else { return true }
        ctx.setObject(source, forKeyedSubscript: "src" as NSString)
        return ctx.evaluateScript("(function(){ try { new Function(src); return true; } catch (e) { return false; } })()")?.toBool() ?? false
    }

    private func localSkin() -> String? {
        let bundled = Bundle.main.url(forResource: "skin", withExtension: "js").flatMap { try? String(contentsOf: $0, encoding: .utf8) }
        let cached = cachedSkinFile.flatMap { try? String(contentsOf: $0, encoding: .utf8) }
        // use whichever is newer – a fresh app build always wins over an older download
        return version(of: cached) > version(of: bundled) ? cached : (bundled ?? cached)
    }

    private func updateSkinInBackground() {
        lastSkinCheck = Date()
        guard let remote = remoteSkinURL, let file = cachedSkinFile else { return }
        let request = URLRequest(url: remote, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 15)
        URLSession.shared.dataTask(with: request) { data, response, _ in
            guard let data = data, (response as? HTTPURLResponse)?.statusCode == 200,
                  let text = String(data: data, encoding: .utf8), text.contains("@name        IDU Skin"),
                  WebViewController.compiles(text) else { return }   // a broken update is never used
            try? FileManager.default.createDirectory(at: file.deletingLastPathComponent(), withIntermediateDirectories: true)
            try? text.write(to: file, atomically: true, encoding: .utf8)
            // newer than what's running: tell the page – it switches right away if you're not busy, otherwise shows a button
            DispatchQueue.main.async { [weak self] in
                guard let self = self, self.version(of: text) > self.loadedSkinVersion else { return }
                self.webView.evaluateJavaScript("window.__skNative && window.__skNative('skinReady', 1)", completionHandler: nil)
            }
        }.resume()
    }

    // MARK: Links – IDU stays in the app, everything else opens in Safari

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { decisionHandler(.allow); return }
        let scheme = (url.scheme ?? "").lowercased()

        if ["about", "blob", "data", "javascript"].contains(scheme) { decisionHandler(.allow); return }
        if ["mailto", "tel", "sms"].contains(scheme) { UIApplication.shared.open(url); decisionHandler(.cancel); return }
        // Frames inside the page load normally
        if let frame = navigationAction.targetFrame, !frame.isMainFrame { decisionHandler(.allow); return }
        if url.host == iduHost { decisionHandler(.allow); return }

        if navigationAction.navigationType == .linkActivated || navigationAction.targetFrame == nil {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }

    // Files from IDU (PDF, Word, …) open in a preview with a share button instead of replacing the app
    func webView(_ webView: WKWebView, decidePolicyFor navigationResponse: WKNavigationResponse,
                 decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        if let http = navigationResponse.response as? HTTPURLResponse,
           let disposition = http.value(forHTTPHeaderField: "Content-Disposition"),
           disposition.lowercased().contains("attachment") {
            decisionHandler(.download)
            return
        }
        decisionHandler(navigationResponse.canShowMIMEType ? .allow : .download)
    }

    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) {
        download.delegate = self
    }

    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) {
        download.delegate = self
    }

    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String,
                  completionHandler: @escaping (URL?) -> Void) {
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent("IDU-pliki", isDirectory: true)
        try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        let name = suggestedFilename.isEmpty ? "plik" : suggestedFilename
        let destination = folder.appendingPathComponent(name)
        try? FileManager.default.removeItem(at: destination)
        downloadURL = destination
        completionHandler(destination)
    }

    func downloadDidFinish(_ download: WKDownload) {
        DispatchQueue.main.async {
            guard let url = self.downloadURL else { return }
            self.previewURL = url
            let preview = QLPreviewController()
            preview.dataSource = self
            self.present(preview, animated: true)
        }
    }

    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
        DispatchQueue.main.async {
            let alert = UIAlertController(title: nil, message: "Nie udało się pobrać pliku.", preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default))
            self.present(alert, animated: true)
        }
    }

    func numberOfPreviewItems(in controller: QLPreviewController) -> Int {
        previewURL == nil ? 0 : 1
    }

    func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> QLPreviewItem {
        (previewURL ?? FileManager.default.temporaryDirectory) as NSURL
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

    // MARK: No internet → the last saved screens (Start, Plan, Oceny…) with a "try again" bar

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        let nsError = error as NSError
        if nsError.code == NSURLErrorCancelled { return }
        // a link that turned into a download is not an error
        if nsError.domain == "WebKitErrorDomain" && (nsError.code == 102 || nsError.code == 204) { return }
        // same origin as IDU, so the page can read the screens the skin saved on this phone
        webView.loadHTMLString(WebViewController.offlineHTML, baseURL: URL(string: "https://\(iduHost)/offline"))
    }

    static let offlineHTML = #"""
    <!doctype html><html><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
    <style>
    html,body{margin:0;background:#0f1115;color:#f2f4f8;font:16px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;-webkit-text-size-adjust:100%}
    #snap{pointer-events:none}
    #bar{position:fixed;left:10px;right:10px;bottom:calc(10px + env(safe-area-inset-bottom));z-index:2147483000;padding:10px;border-radius:22px;
      background:rgba(24,26,32,.92);-webkit-backdrop-filter:blur(20px) saturate(1.6);backdrop-filter:blur(20px) saturate(1.6);
      box-shadow:0 12px 30px rgba(0,0,0,.45),inset 0 0 0 .5px rgba(255,255,255,.12)}
    #msg{font-size:13px;color:#ffcc66;text-align:center;margin:0 4px 8px;font-weight:600}
    #tabs{display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
    #tabs::-webkit-scrollbar{display:none}
    #tabs button{flex:none;border:0;border-radius:13px;padding:9px 13px;background:#262b35;color:#f2f4f8;font:600 14px -apple-system,sans-serif}
    #tabs button.on{background:#f2f4f8;color:#111}
    #tabs button.retry{background:#3d9be9;color:#fff}
    </style></head><body>
    <div id="snap"></div>
    <div id="bar"><div id="msg">Brak internetu</div><div id="tabs"></div></div>
    <script>
    (function(){
      var early=document.getElementById('sk-early'); if(early) early.remove();
      var x=document.getElementById('sk-snap'); if(x) x.remove();
      var map={}, css='';
      try{ map=JSON.parse(localStorage.getItem('skSnap')||'{}'); css=localStorage.getItem('skSnapCss')||''; var bg=localStorage.getItem('skSnapBg'); if(bg) document.body.style.background=bg; }catch(e){}
      var names={'/#start':'Start','/#plan':'Plan lekcji','/#przedmioty':'Przedmioty','/#wazne':'Ważne','/#notatki':'Notatki','/#szukaj':'Szukaj','/internal_messages':'Wiadomości'};
      function label(k){ if(names[k]) return names[k]; if(/grades$/.test(k)) return 'Oceny'; if(/presences$/.test(k)) return 'Frekwencja';
        if(/homeworks$/.test(k)) return 'Zadania'; if(/watek$/.test(k)) return 'Wiadomość'; if(/^\/subjects\/\d+$/.test(k)) return 'Przedmiot'; return 'Ekran'; }
      var keys=Object.keys(map).filter(function(k){return map[k]&&map[k].h;}).sort(function(a,b){
        var o=['/#start','/#plan']; var ia=o.indexOf(a), ib=o.indexOf(b); if(ia>=0||ib>=0) return (ia<0?9:ia)-(ib<0?9:ib); return map[b].t-map[a].t; });
      var snap=document.getElementById('snap'), tabs=document.getElementById('tabs'), msg=document.getElementById('msg'), root=snap.attachShadow({mode:'open'});
      function when(t){ var d=new Date(t), now=new Date(), same=d.toDateString()===now.toDateString();
        return (same?'dziś ':d.toLocaleDateString('pl-PL',{weekday:'short',day:'numeric',month:'short'})+' ')+d.toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'}); }
      function show(k){ var s=map[k]; if(!s) return; root.innerHTML='<style>'+css+'</style><style>.nav,.fab,.ptr,.dtop{display:none!important}</style>'+s.h; window.scrollTo(0,0);
        msg.textContent='Brak internetu · '+label(k)+' z '+when(s.t);
        [].forEach.call(tabs.querySelectorAll('button[data-k]'),function(b){ b.classList.toggle('on', b.getAttribute('data-k')===k); }); }
      function retry(){ location.href='https://s27.idu.edu.pl/'; }
      var r=document.createElement('button'); r.className='retry'; r.textContent='Spróbuj ponownie'; r.onclick=retry; tabs.appendChild(r);
      var seen={};
      keys.forEach(function(k){ var l=label(k); if(seen[l]) return; seen[l]=1; var b=document.createElement('button'); b.textContent=l; b.setAttribute('data-k',k); b.onclick=function(){show(k);}; tabs.appendChild(b); });
      if(keys.length) show(keys[0]);
      else { root.innerHTML='<div style="display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:0 30px;color:#9097a8">Brak połączenia z IDU. Ekrany, które otworzysz z internetem, będą tu potem dostępne bez sieci.</div>'; msg.textContent='Brak internetu'; }
      window.addEventListener('online', retry);
    })();
    </script></body></html>
    """#
}

// MARK: - Reminders (local notifications computed from the timetable – no server needed)

enum Reminders {
    struct Settings {
        var lessons: Int     // minutes before a lesson, 0 = off
        var exams: Bool
        var homework: Bool
        var hour: Int        // time of the "day before" reminders
        var english: Bool
    }

    static func settings() -> Settings {
        let d = UserDefaults.standard
        let hour = d.object(forKey: "nHour") == nil ? 18 : d.integer(forKey: "nHour")
        return Settings(lessons: d.integer(forKey: "nLessons"), exams: d.bool(forKey: "nExams"),
                        homework: d.bool(forKey: "nHw"), hour: min(max(hour, 6), 22), english: d.string(forKey: "nLang") == "en")
    }

    static func saveSettings(_ dict: [String: Any]) {
        let d = UserDefaults.standard
        d.set((dict["lessons"] as? NSNumber)?.intValue ?? 0, forKey: "nLessons")
        d.set((dict["exams"] as? NSNumber)?.boolValue ?? false, forKey: "nExams")
        d.set((dict["hw"] as? NSNumber)?.boolValue ?? false, forKey: "nHw")
        d.set((dict["hour"] as? NSNumber)?.intValue ?? 18, forKey: "nHour")
        d.set((dict["lang"] as? String) == "en" ? "en" : "pl", forKey: "nLang")
    }

    private static func content(_ title: String, _ body: String, path: String, thread: String) -> UNMutableNotificationContent {
        let c = UNMutableNotificationContent()
        c.title = title
        c.body = body
        c.sound = .default
        c.threadIdentifier = thread
        c.userInfo = ["path": path]
        return c
    }

    static func reschedule() {
        let center = UNUserNotificationCenter.current()
        center.getNotificationSettings { status in
            let allowed = status.authorizationStatus == .authorized || status.authorizationStatus == .provisional
            guard allowed else { return }
            // keep the reminders set from "Ważne" (ids "fav…"), refresh everything else
            let sem = DispatchSemaphore(value: 0); var old: [String] = []
            center.getPendingNotificationRequests { r in old = r.map { $0.identifier }.filter { !$0.hasPrefix("fav") }; sem.signal() }
            sem.wait()
            center.removePendingNotificationRequests(withIdentifiers: old)
            let s = Reminders.settings()
            guard s.lessons > 0 || s.exams || s.homework, let plan = IDUShared.loadPlan() else { return }
            let cal = IDUShared.calendar
            let now = Date()
            let en = s.english
            func t(_ pl: String, _ english: String) -> String { en ? english : pl }
            var items: [(date: Date, id: String, content: UNMutableNotificationContent)] = []

            if s.lessons > 0 {
                for o in IDUShared.occurrences(plan, from: now, days: 8) {
                    let fire = o.start.addingTimeInterval(TimeInterval(-60 * s.lessons))
                    guard fire > now else { continue }
                    let room = o.lesson.room ?? ""
                    var parts: [String] = []
                    if !room.isEmpty { parts.append(t("Sala", "Room") + " \(room)") }
                    parts.append("\(o.lesson.start)–\(o.lesson.end)")
                    if o.exam != nil { parts.append(t("Sprawdzian!", "Test!")) }
                    items.append((fire, "lesson-\(Int(o.start.timeIntervalSince1970))",
                                  Reminders.content(t("Za", "In") + " \(s.lessons) min: \(o.lesson.name)", parts.joined(separator: " · "), path: "/#plan", thread: "lessons")))
                }
            }

            if s.exams {
                for e in plan.exams ?? [] {
                    guard let day = IDUShared.day(from: e.date),
                          let before = cal.date(byAdding: .day, value: -1, to: day),
                          let fire = cal.date(bySettingHour: s.hour, minute: 0, second: 0, of: before),
                          fire > now else { continue }
                    let name = (e.name ?? "").isEmpty ? t("sprawdzian", "test") : e.name!
                    items.append((fire, "exam-\(e.date)-\(name)",
                                  Reminders.content(t("Jutro sprawdzian: ", "Test tomorrow: ") + name, e.title ?? t("Powodzenia!", "Good luck!"), path: "/#start", thread: "exams")))
                }
            }

            if s.homework {
                for h in plan.hw ?? [] {
                    guard let due = IDUShared.dateTime(from: h.due), due > now else { continue }
                    let dueDay = cal.startOfDay(for: due)
                    let hhmm = String(format: "%d:%02d", cal.component(.hour, from: due), cal.component(.minute, from: due))
                    let subject = (h.subject ?? "").isEmpty ? "" : " · \(h.subject!)"
                    if let before = cal.date(byAdding: .day, value: -1, to: dueDay),
                       let fire = cal.date(bySettingHour: s.hour, minute: 0, second: 0, of: before), fire > now {
                        items.append((fire, "hw-\(h.due)-\(h.title.prefix(20))",
                                      Reminders.content(t("Jutro mija termin zadania", "Homework due tomorrow"), "\(h.title)\(subject) · " + t("do", "by") + " \(hhmm)", path: "/#start", thread: "homework")))
                    } else if let today = cal.date(bySettingHour: s.hour, minute: 0, second: 0, of: dueDay), today > now, today < due {
                        items.append((today, "hw-\(h.due)-\(h.title.prefix(20))",
                                      Reminders.content(t("Dziś mija termin zadania", "Homework due today"), "\(h.title)\(subject) · " + t("do", "by") + " \(hhmm)", path: "/#start", thread: "homework")))
                    }
                }
            }

            items.sort { $0.date < $1.date }
            for item in items.prefix(60) {
                let parts = cal.dateComponents([.year, .month, .day, .hour, .minute], from: item.date)
                let trigger = UNCalendarNotificationTrigger(dateMatching: parts, repeats: false)
                center.add(UNNotificationRequest(identifier: item.id, content: item.content, trigger: trigger), withCompletionHandler: nil)
            }
        }
    }
}
