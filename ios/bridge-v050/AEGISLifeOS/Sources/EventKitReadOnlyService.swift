import EventKit
import Foundation

final class EventKitReadOnlyService {
    private let store = EKEventStore()

    func calendarStatus() -> String {
        Self.statusLabel(EKEventStore.authorizationStatus(for: .event))
    }

    func remindersStatus() -> String {
        Self.statusLabel(EKEventStore.authorizationStatus(for: .reminder))
    }

    func requestCalendarAccess() async -> Bool {
        do {
            return try await store.requestFullAccessToEvents()
        } catch {
            return false
        }
    }

    func requestRemindersAccess() async -> Bool {
        do {
            return try await store.requestFullAccessToReminders()
        } catch {
            return false
        }
    }

    func fetchAgenda(days: Int = 7, limit: Int = 30) async throws -> [AgendaItem] {
        let safeDays = min(max(days, 1), 31)
        let safeLimit = min(max(limit, 1), 100)
        let start = Date()
        let end = Calendar.current.date(byAdding: .day, value: safeDays, to: start) ?? start
        var items: [AgendaItem] = []

        if Self.hasReadableAccess(EKEventStore.authorizationStatus(for: .event)) {
            let predicate = store.predicateForEvents(withStart: start, end: end, calendars: nil)
            let events = store.events(matching: predicate)
                .sorted { $0.startDate < $1.startDate }
                .prefix(safeLimit)

            items.append(contentsOf: events.map { event in
                AgendaItem(
                    id: event.eventIdentifier ?? UUID().uuidString,
                    kind: .event,
                    title: event.title ?? "Untitled event",
                    start: event.startDate,
                    end: event.endDate,
                    isAllDay: event.isAllDay,
                    source: event.calendar.title
                )
            })
        }

        if Self.hasReadableAccess(EKEventStore.authorizationStatus(for: .reminder)) {
            let predicate = store.predicateForIncompleteReminders(
                withDueDateStarting: start,
                ending: end,
                calendars: nil
            )
            let reminders: [EKReminder] = await withCheckedContinuation { continuation in
                store.fetchReminders(matching: predicate) { result in
                    continuation.resume(returning: result ?? [])
                }
            }

            items.append(contentsOf: reminders.prefix(safeLimit).map { reminder in
                AgendaItem(
                    id: reminder.calendarItemIdentifier,
                    kind: .reminder,
                    title: reminder.title ?? "Untitled reminder",
                    start: reminder.dueDateComponents.flatMap { Calendar.current.date(from: $0) },
                    end: nil,
                    isAllDay: reminder.dueDateComponents?.hour == nil,
                    source: reminder.calendar.title
                )
            })
        }

        return Array(items.sorted {
            ($0.start ?? .distantFuture) < ($1.start ?? .distantFuture)
        }.prefix(safeLimit))
    }

    private static func hasReadableAccess(_ status: EKAuthorizationStatus) -> Bool {
        switch status {
        case .fullAccess, .authorized:
            return true
        default:
            return false
        }
    }

    private static func statusLabel(_ status: EKAuthorizationStatus) -> String {
        switch status {
        case .notDetermined: return "Not requested"
        case .restricted: return "Restricted"
        case .denied: return "Denied"
        case .authorized, .fullAccess: return "Connected"
        case .writeOnly: return "Write-only—not used"
        @unknown default: return "Unknown"
        }
    }
}
