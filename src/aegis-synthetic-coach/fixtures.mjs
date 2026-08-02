export const SYNTHETIC_DATASET = Object.freeze({
  schemaVersion: 1,
  synthetic: true,
  datasetId: "aegis-demo-2026-08-02",
  asOf: "2026-08-02T08:00:00-04:00",
  timezone: "America/New_York",
  profile: {
    displayName: "Demo User",
    mode: "Synthetic sandbox"
  },
  permissions: {
    calendar: true,
    tasks: true,
    finance: true,
    wellness: true
  },
  sources: [
    { id: "calendar-demo", domain: "calendar", label: "Synthetic Calendar", observedAt: "2026-08-02T07:58:00-04:00" },
    { id: "tasks-demo", domain: "tasks", label: "Synthetic Tasks", observedAt: "2026-08-02T07:57:00-04:00" },
    { id: "finance-demo", domain: "finance", label: "Synthetic Financial Snapshot", observedAt: "2026-08-02T07:55:00-04:00" },
    { id: "wellness-demo", domain: "wellness", label: "Synthetic Wellness", observedAt: "2026-08-02T07:50:00-04:00" }
  ],
  calendar: [
    {
      id: "event-001",
      sourceId: "calendar-demo",
      title: "Project Orion planning",
      startsAt: "2026-08-02T13:30:00-04:00",
      endsAt: "2026-08-02T14:15:00-04:00",
      preparationMinutes: 20,
      location: "Demo conference room"
    },
    {
      id: "event-002",
      sourceId: "calendar-demo",
      title: "Weekly reset",
      startsAt: "2026-08-03T09:00:00-04:00",
      endsAt: "2026-08-03T09:30:00-04:00",
      preparationMinutes: 10,
      location: "Synthetic home workspace"
    }
  ],
  tasks: [
    {
      id: "task-001",
      sourceId: "tasks-demo",
      title: "Prepare demo agenda",
      dueAt: "2026-08-02T10:00:00-04:00",
      priority: "high",
      estimatedMinutes: 25,
      completed: false
    },
    {
      id: "task-002",
      sourceId: "tasks-demo",
      title: "Review synthetic budget categories",
      dueAt: "2026-08-03T18:00:00-04:00",
      priority: "medium",
      estimatedMinutes: 20,
      completed: false
    },
    {
      id: "task-003",
      sourceId: "tasks-demo",
      title: "Archive completed demo notes",
      dueAt: "2026-08-01T17:00:00-04:00",
      priority: "low",
      estimatedMinutes: 10,
      completed: true
    }
  ],
  finance: {
    sourceId: "finance-demo",
    currency: "USD",
    checkingBalance: 820,
    expectedIncome7d: 450,
    committedOutflow7d: 1035,
    reserveTarget: 500,
    snapshotAt: "2026-08-02T07:55:00-04:00"
  },
  wellness: {
    sourceId: "wellness-demo",
    sleepHours: 5.9,
    hydrationPercent: 62,
    movementMinutesYesterday: 18,
    observedAt: "2026-08-02T07:50:00-04:00"
  }
});
