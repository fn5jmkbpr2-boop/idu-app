import WidgetKit
import SwiftUI

// Home screen + lock screen widget: the NEXT lesson (not the current one) and its room.
// The timetable is saved by the app every time you open Start, the widget works it out offline.

struct NextEntry: TimelineEntry {
    let date: Date
    let next: LessonOccurrence?
    let later: [LessonOccurrence]
    let hasData: Bool

    static func sample(_ date: Date) -> NextEntry {
        let start = date.addingTimeInterval(15 * 60)
        let lesson = PlanLesson(nr: 3, start: "10:05", end: "10:45", name: "Matematyka", room: "21", teacher: nil, color: "#1e88e5", subj: "matematyka")
        let after = PlanLesson(nr: 4, start: "10:55", end: "11:35", name: "Polski", room: "12", teacher: nil, color: "#e53950", subj: "polski")
        return NextEntry(date: date,
                         next: LessonOccurrence(lesson: lesson, start: start, end: start.addingTimeInterval(40 * 60), exam: nil),
                         later: [LessonOccurrence(lesson: after, start: start.addingTimeInterval(50 * 60), end: start.addingTimeInterval(90 * 60), exam: nil)],
                         hasData: true)
    }
}

struct NextProvider: TimelineProvider {
    func placeholder(in context: Context) -> NextEntry {
        NextEntry.sample(Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (NextEntry) -> Void) {
        let entry = entries(from: Date(), limit: 1).first
        if let entry = entry, entry.next != nil { completion(entry) } else { completion(NextEntry.sample(Date())) }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<NextEntry>) -> Void) {
        let now = Date()
        let list = entries(from: now, limit: 48)
        let last = list.last?.date ?? now
        let reload = min(last.addingTimeInterval(60), now.addingTimeInterval(8 * 3600))
        completion(Timeline(entries: list, policy: .after(max(reload, now.addingTimeInterval(15 * 60)))))
    }

    /// One entry now and one at the start of every lesson (then the widget moves on to the lesson after it).
    private func entries(from now: Date, limit: Int) -> [NextEntry] {
        guard let plan = IDUShared.loadPlan() else {
            return [NextEntry(date: now, next: nil, later: [], hasData: false)]
        }
        let all = IDUShared.occurrences(plan, from: now, days: 15)
        var moments: [Date] = [now]
        for o in all where o.start > now { moments.append(o.start) }
        return moments.prefix(limit).map { moment in
            let found = IDUShared.next(after: moment, in: all)
            return NextEntry(date: moment, next: found.next, later: found.later, hasData: true)
        }
    }
}

// MARK: - Helpers

extension Color {
    init(hex: String?, fallback: Color) {
        var text = (hex ?? "").trimmingCharacters(in: .whitespaces)
        if text.hasPrefix("#") { text.removeFirst() }
        guard text.count == 6, let value = UInt32(text, radix: 16) else { self = fallback; return }
        self.init(red: Double((value >> 16) & 0xFF) / 255, green: Double((value >> 8) & 0xFF) / 255, blue: Double(value & 0xFF) / 255)
    }
}

private let accentBlue = Color(red: 0.24, green: 0.61, blue: 0.91)

private func lessonTint(_ o: LessonOccurrence?) -> Color {
    Color(hex: o?.lesson.color, fallback: accentBlue)
}

private func roomFull(_ o: LessonOccurrence) -> String {
    (o.lesson.room ?? "").trimmingCharacters(in: .whitespaces)
}

/// "06 Piwnica Auerbacha" → "06", "gimnastyczna" stays, no room → "–"
private func roomText(_ o: LessonOccurrence) -> String {
    let r = roomFull(o)
    if r.isEmpty { return "–" }
    if let m = r.range(of: "^[0-9]+[A-Za-z]?(?=[ (]|$)", options: .regularExpression) { return String(r[m]) }
    return r
}

/// the rest of a long room name ("Piwnica Auerbacha"), if there is one
private func roomDetail(_ o: LessonOccurrence) -> String? {
    let full = roomFull(o), short = roomText(o)
    guard short != full, full.hasPrefix(short) else { return nil }
    let rest = String(full.dropFirst(short.count)).trimmingCharacters(in: CharacterSet(charactersIn: " ()"))
    return rest.isEmpty ? nil : rest
}

/// "NASTĘPNA", "JUTRO", "PONIEDZIAŁEK"
private func dayLabel(_ start: Date, now: Date) -> String {
    let cal = IDUShared.calendar
    if cal.isDate(start, inSameDayAs: now) { return "Następna" }
    if let tomorrow = cal.date(byAdding: .day, value: 1, to: now), cal.isDate(start, inSameDayAs: tomorrow) { return "Jutro" }
    let f = DateFormatter()
    f.locale = Locale(identifier: "pl_PL")
    f.dateFormat = "EEEE"
    return f.string(from: start)
}

/// "10:05 · za 15 min" today, "10:05–10:45" on another day
private func whenText(_ o: LessonOccurrence, now: Date) -> Text {
    if IDUShared.calendar.isDate(o.start, inSameDayAs: now) {
        return Text("\(o.lesson.start) · za ") + Text(o.start, style: .relative)
    }
    return Text("\(o.lesson.start)–\(o.lesson.end)")
}

private struct Background: View {
    let tint: Color
    var body: some View {
        ZStack {
            Color(red: 0.06, green: 0.067, blue: 0.086)
            LinearGradient(colors: [tint.opacity(0.62), tint.opacity(0.12)], startPoint: .topLeading, endPoint: .bottomTrailing)
        }
    }
}

extension View {
    @ViewBuilder
    func iduBackground(_ tint: Color) -> some View {
        if #available(iOS 17.0, *) {
            self.containerBackground(for: .widget) { Background(tint: tint) }
        } else {
            self.padding(14).frame(maxWidth: .infinity, maxHeight: .infinity).background(Background(tint: tint))
        }
    }

    @ViewBuilder
    func accessoryBackground() -> some View {
        if #available(iOS 17.0, *) {
            self.containerBackground(for: .widget) { Color.clear }
        } else {
            self
        }
    }
}

// MARK: - Home screen

private struct EmptyState: View {
    let hasData: Bool
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: hasData ? "sun.max.fill" : "graduationcap.fill")
                .font(.system(size: 26, weight: .semibold))
                .foregroundColor(hasData ? .yellow : .white)
            Spacer(minLength: 0)
            Text(hasData ? "Brak lekcji" : "Otwórz IDU")
                .font(.system(size: 17, weight: .bold)).foregroundColor(.white)
            Text(hasData ? "w najbliższych dniach" : "Wejdź na Start, a widget pobierze plan.")
                .font(.system(size: 12)).foregroundColor(.white.opacity(0.75)).lineLimit(3)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

private struct NextBlock: View {
    let entry: NextEntry
    let o: LessonOccurrence
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 5) {
                Circle().fill(Color.white).frame(width: 6, height: 6)
                Text(dayLabel(o.start, now: entry.date).uppercased())
                    .font(.system(size: 11, weight: .heavy)).lineLimit(1)
                Spacer(minLength: 0)
                if o.exam != nil {
                    Image(systemName: "exclamationmark.triangle.fill").font(.system(size: 11, weight: .bold)).foregroundColor(.yellow)
                }
            }
            .foregroundColor(.white.opacity(0.8))
            Spacer(minLength: 4)
            Text(roomDetail(o) ?? "sala").font(.system(size: 12, weight: .semibold)).foregroundColor(.white.opacity(0.7)).lineLimit(1)
            Text(roomText(o))
                .font(.system(size: 40, weight: .bold, design: .rounded))
                .foregroundColor(.white).lineLimit(1).minimumScaleFactor(0.35)
            Text(o.lesson.name)
                .font(.system(size: 15, weight: .semibold)).foregroundColor(.white)
                .lineLimit(2).minimumScaleFactor(0.75)
            Spacer(minLength: 4)
            whenText(o, now: entry.date)
                .font(.system(size: 12, weight: .medium)).foregroundColor(.white.opacity(0.8)).lineLimit(1)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

private struct SmallView: View {
    let entry: NextEntry
    var body: some View {
        Group {
            if let o = entry.next { NextBlock(entry: entry, o: o) } else { EmptyState(hasData: entry.hasData) }
        }
        .iduBackground(lessonTint(entry.next))
    }
}

private struct MediumView: View {
    let entry: NextEntry
    var body: some View {
        Group {
            if let o = entry.next {
                HStack(alignment: .top, spacing: 14) {
                    NextBlock(entry: entry, o: o)
                    VStack(alignment: .leading, spacing: 7) {
                        Text("POTEM").font(.system(size: 11, weight: .heavy)).foregroundColor(.white.opacity(0.7))
                        if entry.later.isEmpty {
                            Text("To ostatnia lekcja tego dnia").font(.system(size: 13)).foregroundColor(.white.opacity(0.8))
                        }
                        ForEach(entry.later, id: \.self) { l in
                            HStack(spacing: 8) {
                                RoundedRectangle(cornerRadius: 2).fill(Color(hex: l.lesson.color, fallback: accentBlue)).frame(width: 4, height: 30)
                                VStack(alignment: .leading, spacing: 1) {
                                    Text(l.lesson.name).font(.system(size: 13, weight: .semibold)).foregroundColor(.white).lineLimit(1)
                                    Text("\(l.lesson.start) · sala \(roomText(l))").font(.system(size: 11)).foregroundColor(.white.opacity(0.75)).lineLimit(1)
                                }
                            }
                        }
                        Spacer(minLength: 0)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                }
            } else {
                EmptyState(hasData: entry.hasData)
            }
        }
        .iduBackground(lessonTint(entry.next))
    }
}

// MARK: - Lock screen (iOS 16+)

@available(iOS 16.0, *)
private struct LockScreenView: View {
    @Environment(\.widgetFamily) var family
    let entry: NextEntry

    var body: some View {
        switch family {
        case .accessoryInline:
            if let o = entry.next {
                Text("\(o.lesson.start) \(o.lesson.name) · s. \(roomText(o))").accessoryBackground()
            } else {
                Text(entry.hasData ? "Brak lekcji" : "Otwórz IDU").accessoryBackground()
            }
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                if let o = entry.next {
                    VStack(spacing: -1) {
                        Text("sala").font(.system(size: 9, weight: .semibold))
                        Text(roomText(o)).font(.system(size: 20, weight: .bold, design: .rounded)).lineLimit(1).minimumScaleFactor(0.4)
                        Text(o.lesson.start).font(.system(size: 9, weight: .medium))
                    }
                    .padding(3)
                } else {
                    Image(systemName: entry.hasData ? "sun.max.fill" : "graduationcap.fill").font(.system(size: 18))
                }
            }
            .widgetAccentable()
            .accessoryBackground()
        default:
            VStack(alignment: .leading, spacing: 1) {
                if let o = entry.next {
                    HStack(spacing: 4) {
                        Image(systemName: "mappin.circle.fill")
                        Text(roomText(o) == "–" ? o.lesson.name : "Sala \(roomText(o))").font(.headline).lineLimit(1)
                        if o.exam != nil { Image(systemName: "exclamationmark.triangle.fill") }
                    }
                    .widgetAccentable()
                    Text(o.lesson.name).font(.system(size: 14, weight: .semibold)).lineLimit(1)
                    whenText(o, now: entry.date).font(.system(size: 13)).foregroundColor(.secondary).lineLimit(1)
                } else {
                    Text(entry.hasData ? "Brak lekcji" : "Otwórz IDU").font(.headline)
                    Text(entry.hasData ? "w najbliższych dniach" : "aby wczytać plan").font(.system(size: 13)).foregroundColor(.secondary)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessoryBackground()
        }
    }
}

struct IDUWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: NextEntry

    var body: some View {
        content.widgetURL(URL(string: "idu://plan"))
    }

    private var isHomeScreen: Bool {
        family == .systemSmall || family == .systemLarge || family == .systemExtraLarge
    }

    @ViewBuilder
    private var content: some View {
        if family == .systemMedium {
            MediumView(entry: entry)
        } else if isHomeScreen {
            SmallView(entry: entry)
        } else {
            lockScreen
        }
    }

    @ViewBuilder
    private var lockScreen: some View {
        if #available(iOS 16.0, *) {
            LockScreenView(entry: entry)
        } else {
            SmallView(entry: entry)
        }
    }
}

struct NextLessonWidget: Widget {
    private var families: [WidgetFamily] {
        if #available(iOS 16.0, *) {
            return [.systemSmall, .systemMedium, .accessoryRectangular, .accessoryCircular, .accessoryInline]
        }
        return [.systemSmall, .systemMedium]
    }

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: IDUShared.widgetKind, provider: NextProvider()) { entry in
            IDUWidgetView(entry: entry)
        }
        .configurationDisplayName("Następna lekcja")
        .description("Sala i godzina Twojej następnej lekcji.")
        .supportedFamilies(families)
    }
}

@main
struct IDUWidgets: WidgetBundle {
    var body: some Widget {
        NextLessonWidget()
    }
}
