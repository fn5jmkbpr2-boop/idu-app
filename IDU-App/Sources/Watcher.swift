import UIKit
import WebKit
import BackgroundTasks
import UserNotifications

// Checks IDU in the background for new grades, messages and announcements and shows a notification.
// It uses the cookies of the in-app browser (with "Zapamiętaj mnie" you stay logged in for weeks),
// never logs in by itself, never knows your password and never sends anything anywhere else.
enum Watcher {
    static let taskID = "pl.idu.personal.app.refresh"
    private static let home = URL(string: "https://s27.idu.edu.pl/")!

    // MARK: Settings (Ustawienia → Powiadomienia in the skin)

    static func saveSettings(_ dict: [String: Any]) {
        let d = UserDefaults.standard
        if let v = dict["grades"] as? NSNumber { d.set(v.boolValue, forKey: "wGrades") }
        if let v = dict["mail"] as? NSNumber { d.set(v.boolValue, forKey: "wMail") }
        if let v = dict["ann"] as? NSNumber { d.set(v.boolValue, forKey: "wAnn") }
        schedule()
    }
    private static func flag(_ key: String, _ fallback: Bool) -> Bool {
        UserDefaults.standard.object(forKey: key) == nil ? fallback : UserDefaults.standard.bool(forKey: key)
    }
    static var wantsGrades: Bool { flag("wGrades", true) }
    static var wantsMail: Bool { flag("wMail", true) }
    static var wantsAnn: Bool { flag("wAnn", false) }
    static var enabled: Bool { wantsGrades || wantsMail || wantsAnn }
    private static var english: Bool { UserDefaults.standard.string(forKey: "nLang") == "en" }
    private static func t(_ pl: String, _ en: String) -> String { english ? en : pl }

    // MARK: Background refresh (iOS decides when – usually a few times a day)

    static func register() {
        BGTaskScheduler.shared.register(forTaskWithIdentifier: taskID, using: nil) { task in
            guard let refresh = task as? BGAppRefreshTask else { task.setTaskCompleted(success: false); return }
            handle(refresh)
        }
    }

    static func schedule() {
        guard enabled else { BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: taskID); return }
        let request = BGAppRefreshTaskRequest(identifier: taskID)
        request.earliestBeginDate = Date(timeIntervalSinceNow: 20 * 60)
        try? BGTaskScheduler.shared.submit(request)
    }

    private static func handle(_ task: BGAppRefreshTask) {
        schedule()                                   // ask for the next round right away
        let lock = NSLock()
        var finished = false
        let finish: (Bool) -> Void = { ok in
            lock.lock(); defer { lock.unlock() }
            guard !finished else { return }
            finished = true
            task.setTaskCompleted(success: ok)
        }
        task.expirationHandler = { finish(false) }
        check(manual: false) { report in finish(report.ok) }
    }

    // MARK: The check

    struct Report { var ok: Bool; var text: String }

    /// manual = the "Sprawdź teraz" button: always answers with a short status and sends a test notification.
    static func check(manual: Bool, completion: @escaping (Report) -> Void) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            let allowed = settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional
            if !manual && (!allowed || !enabled) { completion(Report(ok: true, text: "")); return }
            DispatchQueue.main.async {
                WKWebsiteDataStore.default().httpCookieStore.getAllCookies { all in
                    let host = home.host ?? ""
                    let cookies = all.filter { c in
                        let d = c.domain.hasPrefix(".") ? String(c.domain.dropFirst()) : c.domain
                        return host == d || host.hasSuffix("." + d)
                    }
                    fetch(cookies: cookies, allowed: allowed, manual: manual, completion: completion)
                }
            }
        }
    }

    private static func fetch(cookies: [HTTPCookie], allowed: Bool, manual: Bool, completion: @escaping (Report) -> Void) {
        guard !cookies.isEmpty else {
            completion(Report(ok: true, text: t("Nie jesteś zalogowany w apce. Zaloguj się (zaznacz „Zapamiętaj mnie”).", "You're not logged in in the app.")))
            return
        }
        var request = URLRequest(url: home, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 25)
        HTTPCookie.requestHeaderFields(with: cookies).forEach { request.setValue($0.value, forHTTPHeaderField: $0.key) }
        let config = URLSessionConfiguration.ephemeral
        config.httpShouldSetCookies = false          // the app's own cookies are passed by hand
        let session = URLSession(configuration: config)
        session.dataTask(with: request) { data, response, error in
            defer { session.finishTasksAndInvalidate() }
            guard let http = response as? HTTPURLResponse, let data = data, error == nil, http.statusCode < 500 else {
                completion(Report(ok: false, text: t("Brak połączenia z IDU – spróbuj za chwilę.", "Can't reach IDU right now.")))
                return
            }
            keepCookies(from: http)
            let html = String(decoding: data, as: UTF8.self)
            let loggedOut = (http.url?.path ?? "").contains("sign_in") || html.contains("type=\"password\"") || !html.contains("id=\"account\"")
            completion(compare(html: html, loggedOut: loggedOut, allowed: allowed, manual: manual))
        }.resume()
    }

    // IDU may hand out a fresh session cookie – keep it in the app's browser, like a normal visit would
    private static func keepCookies(from http: HTTPURLResponse) {
        guard let url = http.url else { return }
        var headers: [String: String] = [:]
        for (k, v) in http.allHeaderFields { if let k = k as? String, let v = v as? String { headers[k] = v } }
        let fresh = HTTPCookie.cookies(withResponseHeaderFields: headers, for: url)
        guard !fresh.isEmpty else { return }
        DispatchQueue.main.async { fresh.forEach { WKWebsiteDataStore.default().httpCookieStore.setCookie($0) } }
    }

    private struct Item { let id: String; let title: String; let body: String; let path: String }

    private static func compare(html: String, loggedOut: Bool, allowed: Bool, manual: Bool) -> Report {
        let d = UserDefaults.standard
        if loggedOut {
            if !manual && allowed && enabled && !d.bool(forKey: "wLoggedOutTold") {
                d.set(true, forKey: "wLoggedOutTold")
                post(t("IDU Cię wylogowało", "IDU logged you out"),
                     t("Otwórz apkę i zaloguj się z „Zapamiętaj mnie”, żeby dalej dostawać powiadomienia.", "Open the app and log in with “Remember me” to keep getting notifications."),
                     path: "/", thread: "idu", id: "w-loggedout")
            }
            return Report(ok: true, text: t("IDU Cię wylogowało. Zaloguj się w apce i zaznacz „Zapamiętaj mnie” – wtedy sprawdzanie w tle działa tygodniami.", "IDU logged you out. Log in with “Remember me”."))
        }
        d.set(false, forKey: "wLoggedOutTold")

        let student = first(#"href="(/students/\d+)/grades""#, in: html) ?? ""
        let gradesPath = student.isEmpty ? "/" : student + "/grades"
        let annPath = student.isEmpty ? "/" : student + "/subject_announcements"

        // grades: "profile-event mark unseen" on the start page
        let grades: [Item] = groups(#"<div class="profile-event mark unseen"[^>]*>(.*?)</div>"#, in: html).compactMap { g in
            let inner = g[1]
            let subject = pretty(clean(first(#"<span class="subject">(.*?)</span>"#, in: inner) ?? ""))
            let value = clean(first(#"<span class="name">(.*?)</span>"#, in: inner) ?? "")
            let desc = clean(first(#"<span class="description">(.*?)</span>"#, in: inner) ?? "").trimmingCharacters(in: CharacterSet(charactersIn: "() "))
            let date = clean(first(#"<span class="date">(.*?)</span>"#, in: inner) ?? "")
            guard !value.isEmpty || !subject.isEmpty else { return nil }
            let short = value.count <= 8          // "4", "5+", "88%" – long descriptive grades go into the text
            return Item(id: [subject, value, desc, date].joined(separator: "|"),
                        title: t("Nowa ocena: ", "New grade: ") + (short ? value : subject),
                        body: (short ? [subject, desc] : [value, desc]).filter { !$0.isEmpty }.joined(separator: " · "), path: gradesPath)
        }
        // unread messages: the "last messages" list in IDU's header
        var mail: [Item] = []
        if let start = html.range(of: "top-message-table") {
            let table = String(html[start.lowerBound...].prefix(60000))
            let end = table.range(of: "</table>").map { String(table[..<$0.lowerBound]) } ?? table
            for row in end.components(separatedBy: "<tr").dropFirst() where row.contains("class=\"unread\"") {
                guard let link = groups(#"<td class="unread">\s*<a href="([^"]+)"[^>]*>(.*?)</a>"#, in: row).first else { continue }
                let sender = clean(first(#"<div class="name">\s*<a[^>]*>(.*?)</a>"#, in: row) ?? "")
                mail.append(Item(id: link[1], title: sender.isEmpty ? t("Nowa wiadomość", "New message") : sender, body: clean(link[2]), path: link[1]))
            }
        }
        let unread = Int(first(#"id="messages".*?<strong>\s*(\d+)\s*</strong>"#, in: html) ?? "") ?? mail.count
        // announcements that aren't read yet
        let anns: [Item] = groups(#"<div class="(profile-event announcement[^"]*)"[^>]*>(.*?)</div>"#, in: html).compactMap { g in
            guard !g[1].contains(" read") else { return nil }
            guard let link = groups(#"<span class="name">\s*<a href="([^"]+)"[^>]*>(.*?)</a>"#, in: g[2]).first else { return nil }
            let subject = pretty(clean(first(#"<span class="subject">(.*?)</span>"#, in: g[2]) ?? ""))
            return Item(id: link[1], title: t("Nowe ogłoszenie", "New announcement") + (subject.isEmpty ? "" : ": " + subject), body: clean(link[2]), path: annPath)
        }

        let firstRun = !d.bool(forKey: "wBaseline")
        let newGrades = grades.filter { !Set(d.stringArray(forKey: "wSeenGrades") ?? []).contains($0.id) }
        let newMail = mail.filter { !Set(d.stringArray(forKey: "wSeenMail") ?? []).contains($0.id) }
        let newAnn = anns.filter { !Set(d.stringArray(forKey: "wSeenAnn") ?? []).contains($0.id) }
        d.set(grades.map { $0.id }, forKey: "wSeenGrades")
        d.set(mail.map { $0.id }, forKey: "wSeenMail")
        d.set(anns.map { $0.id }, forKey: "wSeenAnn")
        d.set(true, forKey: "wBaseline")
        d.set(Date().timeIntervalSince1970, forKey: "wLastCheck")
        if wantsMail { setBadge(unread) }

        var sent = 0
        if !firstRun && allowed {
            if wantsGrades { sent += send(newGrades, summary: t("Nowe oceny", "New grades"), thread: "grades") }
            if wantsMail { sent += send(newMail, summary: t("Nowe wiadomości", "New messages"), thread: "mail") }
            if wantsAnn { sent += send(newAnn, summary: t("Nowe ogłoszenia", "New announcements"), thread: "ann") }
        }

        guard manual else { return Report(ok: true, text: "") }
        let time = DateFormatter.localizedString(from: Date(), dateStyle: .none, timeStyle: .short)
        if !allowed {
            return Report(ok: true, text: t("Sprawdzono o \(time), ale iPhone blokuje powiadomienia. Włącz je: Ustawienia → Powiadomienia → IDU.", "Checked at \(time), but notifications are blocked in iOS Settings."))
        }
        if sent == 0 {
            post(t("Powiadomienia działają", "Notifications work"),
                 firstRun ? t("Od teraz dam znać o nowych ocenach i wiadomościach.", "From now on you'll hear about new grades and messages.")
                          : t("Sprawdziłem IDU – nic nowego.", "Checked IDU – nothing new."),
                 path: "/", thread: "idu", id: "w-test-\(Int(Date().timeIntervalSince1970))")
        }
        return Report(ok: true, text: t("Sprawdzono o \(time) · nieprzeczytane wiadomości: \(unread) · nowe oceny w IDU: \(grades.count)", "Checked at \(time) · unread messages: \(unread) · new grades: \(grades.count)")
                      + (firstRun ? t(". Od teraz powiadomię o kolejnych.", ". You'll be notified about the next ones.") : ""))
    }

    /// up to 3 separate notifications, more than that → one summary
    private static func send(_ items: [Item], summary: String, thread: String) -> Int {
        guard !items.isEmpty else { return 0 }
        if items.count > 3 {
            let list = items.prefix(6).map { $0.body.isEmpty ? $0.title : $0.title + " – " + $0.body }.joined(separator: "\n")
            post("\(summary) (\(items.count))", list, path: items[0].path, thread: thread, id: "w-\(thread)-\(Int(Date().timeIntervalSince1970))")
            return 1
        }
        for (i, item) in items.enumerated() {
            post(item.title, item.body, path: item.path, thread: thread, id: "w-\(thread)-\(Int(Date().timeIntervalSince1970))-\(i)")
        }
        return items.count
    }

    private static func post(_ title: String, _ body: String, path: String, thread: String, id: String) {
        let c = UNMutableNotificationContent()
        c.title = title
        c.body = body
        c.sound = .default
        c.threadIdentifier = thread
        c.userInfo = ["path": path]
        UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: id, content: c, trigger: nil), withCompletionHandler: nil)
    }

    /// red number on the app icon = unread messages
    static func setBadge(_ n: Int) {
        if #available(iOS 16.0, *) {
            UNUserNotificationCenter.current().setBadgeCount(max(0, n), withCompletionHandler: nil)
        } else {
            DispatchQueue.main.async { UIApplication.shared.applicationIconBadgeNumber = max(0, n) }
        }
    }

    // MARK: Tiny HTML helpers

    private static func groups(_ pattern: String, in text: String) -> [[String]] {
        guard let re = try? NSRegularExpression(pattern: pattern, options: [.dotMatchesLineSeparators, .caseInsensitive]) else { return [] }
        let ns = text as NSString
        return re.matches(in: text, range: NSRange(location: 0, length: ns.length)).map { m in
            (0..<m.numberOfRanges).map { i in
                let r = m.range(at: i)
                return r.location == NSNotFound ? "" : ns.substring(with: r)
            }
        }
    }
    private static func first(_ pattern: String, in text: String) -> String? {
        guard let g = groups(pattern, in: text).first, g.count > 1 else { return nil }
        return g[1]
    }
    private static func clean(_ s: String) -> String {
        var t = s.replacingOccurrences(of: "<[^>]+>", with: " ", options: .regularExpression)
        for (a, b) in ["&nbsp;": " ", "&amp;": "&", "&quot;": "\"", "&#39;": "'", "&lt;": "<", "&gt;": ">"] { t = t.replacingOccurrences(of: a, with: b) }
        return t.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression).trimmingCharacters(in: .whitespacesAndNewlines)
    }
    /// "historia 1" → "Historia", "polski 1(P)" → "Polski"
    private static func pretty(_ s: String) -> String {
        let t = s.replacingOccurrences(of: #"\s*\d+\s*(\([^)]*\))?\s*$"#, with: "", options: .regularExpression)
        return t.prefix(1).uppercased() + t.dropFirst()
    }
}
