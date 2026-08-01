import SwiftUI

struct AppleConnectionsView: View {
    @EnvironmentObject private var appleAccess: AppleAccessStore
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    header
                    permissionCard(
                        title: "Apple Calendar",
                        status: appleAccess.calendarStatus,
                        icon: "calendar",
                        actionTitle: "Request calendar access"
                    ) {
                        Task { _ = await appleAccess.requestCalendar() }
                    }
                    permissionCard(
                        title: "Apple Reminders",
                        status: appleAccess.remindersStatus,
                        icon: "checklist",
                        actionTitle: "Request reminders access"
                    ) {
                        Task { _ = await appleAccess.requestReminders() }
                    }
                    agendaSection
                    boundaryCard
                }
                .padding(18)
            }
            .background(Color(red: 0.025, green: 0.045, blue: 0.085))
            .navigationTitle("Apple Connections")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
        .preferredColorScheme(.dark)
        .onAppear { appleAccess.refreshStatuses() }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("AEGIS iOS Bridge")
                .font(.system(size: 26, weight: .bold, design: .rounded))
            Text("Version 0.5.0 approval build · data stays on this iPhone")
                .foregroundStyle(.secondary)
            Text("Apple does not offer read-only Calendar or Reminders permission. iOS calls it Full Access; this bridge intentionally contains no create, edit, or delete commands.")
                .font(.callout)
                .padding(12)
                .background(.orange.opacity(0.14), in: RoundedRectangle(cornerRadius: 14))
        }
    }

    private func permissionCard(
        title: String,
        status: String,
        icon: String,
        actionTitle: String,
        action: @escaping () -> Void
    ) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label(title, systemImage: icon)
                    .font(.headline)
                Spacer()
                Text(status)
                    .font(.caption.weight(.semibold))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(.cyan.opacity(0.12), in: Capsule())
            }
            Text("Purpose: local schedule awareness and daily briefings. No automatic changes are permitted.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Button(actionTitle, action: action)
                .buttonStyle(.borderedProminent)
                .tint(.cyan)
                .frame(minHeight: 44)
        }
        .padding(16)
        .background(.white.opacity(0.055), in: RoundedRectangle(cornerRadius: 20))
        .overlay(RoundedRectangle(cornerRadius: 20).stroke(.white.opacity(0.09)))
    }

    private var agendaSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Read-only preview")
                    .font(.headline)
                Spacer()
                Button("Refresh") {
                    Task { await appleAccess.loadAgenda() }
                }
            }
            if appleAccess.agenda.isEmpty {
                Text("After permission is granted, AEGIS can display upcoming events and reminders here without modifying them.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(appleAccess.agenda.prefix(8)) { item in
                    HStack(alignment: .top, spacing: 10) {
                        Image(systemName: item.kind == .event ? "calendar" : "checkmark.circle")
                            .foregroundStyle(.cyan)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(item.title).font(.subheadline.weight(.semibold))
                            Text(item.source).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
        .padding(16)
        .background(.white.opacity(0.055), in: RoundedRectangle(cornerRadius: 20))
        .overlay(RoundedRectangle(cornerRadius: 20).stroke(.white.opacity(0.09)))
    }

    private var boundaryCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Approval boundary", systemImage: "lock.shield")
                .font(.headline)
            Text("Included: native shell, Calendar/Reminders reads, local status, and local audit entries. Excluded: calendar writes, reminder writes, cloud synchronization, remote AI transmission, HealthKit, HomeKit, and Siri actions.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(16)
        .background(.purple.opacity(0.10), in: RoundedRectangle(cornerRadius: 20))
    }
}
