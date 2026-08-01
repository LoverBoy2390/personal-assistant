import Combine
import Foundation

@MainActor
final class AppleAccessStore: ObservableObject {
    @Published private(set) var calendarStatus = "Checking…"
    @Published private(set) var remindersStatus = "Checking…"
    @Published private(set) var agenda: [AgendaItem] = []
    @Published private(set) var lastError: String?

    private let service = EventKitReadOnlyService()

    init() {
        refreshStatuses()
    }

    func refreshStatuses() {
        calendarStatus = service.calendarStatus()
        remindersStatus = service.remindersStatus()
    }

    func snapshot() -> NativeAccessSnapshot {
        NativeAccessSnapshot(
            calendar: calendarStatus,
            reminders: remindersStatus,
            behavior: "Read-only by code; iOS labels the permission Full Access",
            dataLocation: "On this iPhone",
            version: "0.5.0-approval"
        )
    }

    func requestCalendar() async -> Bool {
        let granted = await service.requestCalendarAccess()
        refreshStatuses()
        await NativeAuditLog.shared.append(
            action: "calendar_permission",
            outcome: granted ? "granted" : "denied",
            detail: "AEGIS requested calendar access for local read-only briefings"
        )
        return granted
    }

    func requestReminders() async -> Bool {
        let granted = await service.requestRemindersAccess()
        refreshStatuses()
        await NativeAuditLog.shared.append(
            action: "reminders_permission",
            outcome: granted ? "granted" : "denied",
            detail: "AEGIS requested reminders access for local read-only briefings"
        )
        return granted
    }

    func loadAgenda(days: Int = 7) async {
        do {
            agenda = try await service.fetchAgenda(days: days)
            lastError = nil
            await NativeAuditLog.shared.append(
                action: "agenda_read",
                outcome: "success",
                detail: "Read \(agenda.count) local calendar/reminder items; titles not written to audit log"
            )
        } catch {
            agenda = []
            lastError = "AEGIS could not read the local agenda."
            await NativeAuditLog.shared.append(
                action: "agenda_read",
                outcome: "failure",
                detail: "EventKit returned an error"
            )
        }
    }
}
