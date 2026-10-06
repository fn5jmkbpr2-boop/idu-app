import Foundation

// Timetable that the app saves (from the skin) and the widget / reminders read.
// The app and the widget share it through an App Group container.

struct PlanLesson: Codable, Hashable {
    var nr: Int
    var start: String          // "8:30"
    var end: String            // "9:10"
    var name: String           // "Matematyka"
    var room: String?
    var teacher: String?
    var color: String?         // "#1e88e5"
    var subj: String?          // normalised subject name, used to match tests
}

struct PlanExam: Codable, Hashable {
    var date: String           // "2026-10-07"
    var subj: String?
    var name: String?
    var title: String?
}

struct PlanFree: Codable, Hashable {
    var from: String           // "2026-12-22"
    var to: String             // "2027-01-01" (inclusive)
    var title: String?
}

struct PlanHomework: Codable, Hashable {
    var title: String
    var subject: String?
    var due: String            // "2026-10-08T23:59"
}

struct PlanData: Codable {
    var days: [String: [PlanLesson]]     // "1" = Monday … "5" = Friday (JavaScript getDay numbers)
    var exams: [PlanExam]?
    var free: [PlanFree]?
    var hw: [PlanHomework]?
    var me: String?
    var lang: String?          // "pl" or "en" – language chosen in the app
    var updated: Double?
}

struct LessonOccurrence: Hashable {
    let lesson: PlanLesson
    let start: Date
    let end: Date
    let exam: PlanExam?
}

enum IDUShared {
    static let fallbackGroup = "group.pl.idu.personal.app"
    static let widgetKind = "IDUNextLesson"

    /// The App Group written into the signing profile (sideloading tools sometimes rename it).
    static let groupID: String = {
        guard let url = Bundle.main.url(forResource: "embedded", withExtension: "mobileprovision"),
              let data = try? Data(contentsOf: url),
              let text = String(data: data, encoding: .isoLatin1),
              let start = text.range(of: "<?xml"),
              let end = text.range(of: "</plist>", range: start.upperBound..<text.endIndex),
              let xml = String(text[start.lowerBound..<end.upperBound]).data(using: .isoLatin1),
              let plist = (try? PropertyListSerialization.propertyList(from: xml, options: [], format: nil)) as? [String: Any],
              let entitlements = plist["Entitlements"] as? [String: Any],
              let groups = entitlements["com.apple.security.application-groups"] as? [String],
              let group = groups.first(where: { !$0.contains("*") })
        else { return fallbackGroup }
        return group
    }()

    static var sharedPlanURL: URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupID)?.appendingPathComponent("plan.json")
    }

    static var localPlanURL: URL? {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first?.appendingPathComponent("plan.json")
    }

    static func savePlan(_ data: Data) {
        for url in [sharedPlanURL, localPlanURL].compactMap({ $0 }) {
            try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
            try? data.write(to: url, options: .atomic)
        }
    }

    static func loadPlan() -> PlanData? {
        for url in [sharedPlanURL, localPlanURL].compactMap({ $0 }) {
            if let data = try? Data(contentsOf: url), let plan = try? JSONDecoder().decode(PlanData.self, from: data) {
                return plan
            }
        }
        return nil
    }

    // MARK: Dates

    static var calendar: Calendar {
        var c = Calendar(identifier: .gregorian)
        c.locale = Locale(identifier: "pl_PL")
        c.timeZone = TimeZone.current
        c.firstWeekday = 2
        return c
    }

    private static let dayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.calendar = Calendar(identifier: .gregorian)
        f.timeZone = TimeZone.current
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    private static let dateTimeFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.calendar = Calendar(identifier: .gregorian)
        f.timeZone = TimeZone.current
        f.dateFormat = "yyyy-MM-dd'T'HH:mm"
        return f
    }()

    static func dayKey(_ date: Date) -> String {
        dayFormatter.timeZone = TimeZone.current
        return dayFormatter.string(from: date)
    }

    static func day(from key: String) -> Date? {
        dayFormatter.timeZone = TimeZone.current
        return dayFormatter.date(from: String(key.prefix(10)))
    }

    static func dateTime(from text: String) -> Date? {
        dateTimeFormatter.timeZone = TimeZone.current
        return dateTimeFormatter.date(from: String(text.prefix(16)))
    }

    /// "8:30" on a given day
    static func time(_ text: String, on day: Date) -> Date? {
        let parts = text.split(separator: ":")
        guard parts.count == 2, let h = Int(parts[0]), let m = Int(parts[1]) else { return nil }
        return calendar.date(bySettingHour: h, minute: m, second: 0, of: day)
    }

    static func isFree(_ plan: PlanData, key: String) -> Bool {
        (plan.free ?? []).contains { $0.from <= key && key <= $0.to }
    }

    /// Every lesson from the start of `from`'s day for `days` days (days off from the calendar are skipped).
    static func occurrences(_ plan: PlanData, from: Date, days: Int) -> [LessonOccurrence] {
        let cal = calendar
        let first = cal.startOfDay(for: from)
        var out: [LessonOccurrence] = []
        for offset in 0..<days {
            guard let day = cal.date(byAdding: .day, value: offset, to: first) else { continue }
            let key = dayKey(day)
            if isFree(plan, key: key) { continue }
            let jsDay = cal.component(.weekday, from: day) - 1          // 0 = Sunday … 6 = Saturday
            let lessons = (plan.days[String(jsDay)] ?? []).sorted { $0.nr < $1.nr }
            for lesson in lessons {
                guard let s = time(lesson.start, on: day), let e = time(lesson.end, on: day) else { continue }
                let subj = lesson.subj ?? ""
                let exam = (plan.exams ?? []).first { $0.date == key && !subj.isEmpty && ($0.subj ?? "") == subj }
                out.append(LessonOccurrence(lesson: lesson, start: s, end: e, exam: exam))
            }
        }
        return out
    }

    /// The next lesson after `date` – a double lesson in the same room counts as one.
    static func next(after date: Date, in all: [LessonOccurrence]) -> (next: LessonOccurrence?, later: [LessonOccurrence]) {
        var upcoming = all.filter { $0.start > date }
        if var current = all.last(where: { $0.start <= date && date < $0.end }) {
            while let first = upcoming.first,
                  first.lesson.name == current.lesson.name,
                  (first.lesson.room ?? "") == (current.lesson.room ?? ""),
                  first.start.timeIntervalSince(current.end) <= 15 * 60 {
                current = first
                upcoming.removeFirst()
            }
        }
        guard let next = upcoming.first else { return (nil, []) }
        let cal = calendar
        let later = Array(upcoming.dropFirst().filter { cal.isDate($0.start, inSameDayAs: next.start) }.prefix(3))
        return (next, later)
    }
}
