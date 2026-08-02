const PRIORITY_SCORE = Object.freeze({ critical: 400, high: 300, medium: 200, low: 100 });
const ALLOWED_DOMAINS = Object.freeze(["calendar", "tasks", "finance", "wellness"]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sourceById(dataset, sourceId) {
  return dataset.sources.find((source) => source.id === sourceId) || null;
}

function hoursBetween(earlier, later) {
  return (new Date(later).getTime() - new Date(earlier).getTime()) / 3_600_000;
}

function freshnessConfidence(dataset, sourceId) {
  const source = sourceById(dataset, sourceId);
  if (!source) return 0.55;
  const age = Math.max(0, hoursBetween(source.observedAt, dataset.asOf));
  if (age <= 1) return 0.94;
  if (age <= 24) return 0.86;
  if (age <= 72) return 0.72;
  return 0.58;
}

function confidenceLabel(score) {
  if (score >= 0.9) return "High";
  if (score >= 0.75) return "Moderate";
  return "Limited";
}

function evidence(dataset, domain, sourceId, recordId, fact, observedAt) {
  const source = sourceById(dataset, sourceId);
  return {
    domain,
    sourceId,
    sourceLabel: source?.label || "Unknown synthetic source",
    recordId,
    fact,
    observedAt: observedAt || source?.observedAt || dataset.asOf
  };
}

function makeRecommendation({ id, domain, priority, title, summary, whyNow, inference, unknowns, evidenceItems, confidence }) {
  const rounded = Math.round(confidence * 100) / 100;
  return {
    id,
    domain,
    priority,
    title,
    summary,
    whyNow,
    inference,
    unknowns: [...unknowns],
    evidence: evidenceItems.map(clone),
    confidence: rounded,
    confidenceLabel: confidenceLabel(rounded),
    actionPolicy: "advisory-only",
    suggestedAction: "Review and decide"
  };
}

export function assertSyntheticDataset(dataset) {
  if (!dataset || dataset.synthetic !== true) {
    throw new Error("AEGIS synthetic coach accepts only datasets explicitly marked synthetic=true");
  }
  if (!dataset.asOf || Number.isNaN(new Date(dataset.asOf).getTime())) {
    throw new Error("Synthetic dataset requires a valid asOf timestamp");
  }
  if (!Array.isArray(dataset.sources)) {
    throw new Error("Synthetic dataset requires a source registry");
  }
  return true;
}

export function normalizePermissions(dataset, permissions = dataset.permissions) {
  const normalized = {};
  for (const domain of ALLOWED_DOMAINS) {
    normalized[domain] = permissions?.[domain] === true;
  }
  return normalized;
}

function taskRecommendations(dataset, permissions) {
  if (!permissions.tasks) return [];
  const open = dataset.tasks.filter((task) => !task.completed);
  if (!open.length) return [];
  const ranked = [...open].sort((a, b) => {
    const aOverdue = new Date(a.dueAt) < new Date(dataset.asOf) ? 1 : 0;
    const bOverdue = new Date(b.dueAt) < new Date(dataset.asOf) ? 1 : 0;
    if (aOverdue !== bOverdue) return bOverdue - aOverdue;
    const priority = (PRIORITY_SCORE[b.priority] || 0) - (PRIORITY_SCORE[a.priority] || 0);
    if (priority !== 0) return priority;
    return new Date(a.dueAt) - new Date(b.dueAt);
  });
  const task = ranked[0];
  const overdue = new Date(task.dueAt) < new Date(dataset.asOf);
  return [makeRecommendation({
    id: `task-focus-${task.id}`,
    domain: "tasks",
    priority: overdue || task.priority === "high" ? "critical" : "high",
    title: overdue ? "Recover the most urgent task" : "Protect the next focus block",
    summary: `${task.title} is the strongest synthetic candidate for the next focused work block.`,
    whyNow: overdue ? "Its synthetic due time has passed." : "It is the highest-ranked open synthetic task.",
    inference: `A ${task.estimatedMinutes}-minute focus block should materially reduce near-term task pressure.`,
    unknowns: ["The demo does not know whether another person already completed this task.", "The estimated duration may be inaccurate."],
    evidenceItems: [evidence(dataset, "tasks", task.sourceId, task.id, `${task.title}; due ${task.dueAt}; priority ${task.priority}`, task.dueAt)],
    confidence: freshnessConfidence(dataset, task.sourceId)
  })];
}

function calendarRecommendations(dataset, permissions) {
  if (!permissions.calendar) return [];
  const upcoming = dataset.calendar
    .filter((event) => new Date(event.startsAt) >= new Date(dataset.asOf))
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
  if (!upcoming.length) return [];
  const event = upcoming[0];
  const until = hoursBetween(dataset.asOf, event.startsAt);
  if (until > 36) return [];
  return [makeRecommendation({
    id: `calendar-prep-${event.id}`,
    domain: "calendar",
    priority: until <= 8 ? "high" : "medium",
    title: "Prepare before the next commitment",
    summary: `${event.title} starts in about ${Math.max(1, Math.round(until))} hour${Math.round(until) === 1 ? "" : "s"}.`,
    whyNow: `The synthetic event includes a ${event.preparationMinutes}-minute preparation estimate.`,
    inference: "Preparing early may prevent the urgent task and the meeting from competing for the same attention window.",
    unknowns: ["Attendance status is not represented in the synthetic fixture.", "Travel time is not modeled."],
    evidenceItems: [evidence(dataset, "calendar", event.sourceId, event.id, `${event.title}; starts ${event.startsAt}; prep ${event.preparationMinutes} minutes`, event.startsAt)],
    confidence: freshnessConfidence(dataset, event.sourceId)
  })];
}

function financeRecommendations(dataset, permissions) {
  if (!permissions.finance) return [];
  const snapshot = dataset.finance;
  const projected = snapshot.checkingBalance + snapshot.expectedIncome7d - snapshot.committedOutflow7d;
  if (projected >= snapshot.reserveTarget) return [];
  const gap = snapshot.reserveTarget - projected;
  return [makeRecommendation({
    id: "finance-buffer-7d",
    domain: "finance",
    priority: projected < 0 ? "critical" : "high",
    title: "Review the seven-day cash buffer",
    summary: `The synthetic projection is $${projected.toFixed(0)}, which is $${gap.toFixed(0)} below the demo reserve target.`,
    whyNow: "Committed synthetic outflows exceed the combination of the starting balance and expected seven-day income by enough to compress the reserve.",
    inference: "A review of timing or optional demo outflows could improve the buffer; AEGIS is not authorized to move money or alter payments.",
    unknowns: ["Pending transactions are not modeled.", "The synthetic expected-income figure may change.", "No account action is available in this phase."],
    evidenceItems: [evidence(dataset, "finance", snapshot.sourceId, "finance-7d", `balance ${snapshot.checkingBalance}; income ${snapshot.expectedIncome7d}; outflow ${snapshot.committedOutflow7d}; reserve ${snapshot.reserveTarget}`, snapshot.snapshotAt)],
    confidence: freshnessConfidence(dataset, snapshot.sourceId)
  })];
}

function wellnessRecommendations(dataset, permissions) {
  if (!permissions.wellness) return [];
  const wellness = dataset.wellness;
  const signals = [];
  if (wellness.sleepHours < 6.5) signals.push(`${wellness.sleepHours} hours of synthetic sleep`);
  if (wellness.hydrationPercent < 70) signals.push(`${wellness.hydrationPercent}% synthetic hydration progress`);
  if (!signals.length) return [];
  return [makeRecommendation({
    id: "wellness-recovery",
    domain: "wellness",
    priority: wellness.sleepHours < 5 ? "high" : "medium",
    title: "Use a lower-friction recovery plan",
    summary: `The demo fixture reports ${signals.join(" and ")}.`,
    whyNow: "Both signals can affect concentration and tolerance for a dense schedule.",
    inference: "A brief hydration and movement reset may be a reasonable low-risk option before deeper work.",
    unknowns: ["This is not medical advice.", "The fixture does not include symptoms, diagnoses, medication, or clinician guidance."],
    evidenceItems: [evidence(dataset, "wellness", wellness.sourceId, "wellness-daily", `sleep ${wellness.sleepHours} hours; hydration ${wellness.hydrationPercent}%; movement ${wellness.movementMinutesYesterday} minutes`, wellness.observedAt)],
    confidence: freshnessConfidence(dataset, wellness.sourceId)
  })];
}

export function generateDailyBrief(dataset, requestedPermissions) {
  assertSyntheticDataset(dataset);
  const permissions = normalizePermissions(dataset, requestedPermissions);
  const recommendations = [
    ...taskRecommendations(dataset, permissions),
    ...calendarRecommendations(dataset, permissions),
    ...financeRecommendations(dataset, permissions),
    ...wellnessRecommendations(dataset, permissions)
  ].sort((a, b) => {
    const score = (PRIORITY_SCORE[b.priority] || 0) - (PRIORITY_SCORE[a.priority] || 0);
    return score || a.id.localeCompare(b.id);
  });

  const activeDomains = ALLOWED_DOMAINS.filter((domain) => permissions[domain]);
  return {
    mode: "synthetic-only",
    datasetId: dataset.datasetId,
    generatedFrom: dataset.asOf,
    permissions,
    activeDomains,
    headline: recommendations.length
      ? `${recommendations.length} synthetic signal${recommendations.length === 1 ? "" : "s"} deserve review.`
      : "No synthetic signals require attention.",
    bestNextAction: recommendations[0] || null,
    recommendations,
    sourceSummary: buildSourceSummary(dataset, permissions)
  };
}

export function buildSourceSummary(dataset, requestedPermissions) {
  assertSyntheticDataset(dataset);
  const permissions = normalizePermissions(dataset, requestedPermissions);
  return dataset.sources
    .filter((source) => permissions[source.domain])
    .map((source) => ({
      id: source.id,
      domain: source.domain,
      label: source.label,
      observedAt: source.observedAt,
      confidence: freshnessConfidence(dataset, source.id),
      confidenceLabel: confidenceLabel(freshnessConfidence(dataset, source.id))
    }));
}

export function buildTimeline(dataset, requestedPermissions) {
  assertSyntheticDataset(dataset);
  const permissions = normalizePermissions(dataset, requestedPermissions);
  const rows = [];
  if (permissions.calendar) {
    for (const event of dataset.calendar) rows.push({ id: event.id, domain: "calendar", at: event.startsAt, title: event.title, detail: event.location });
  }
  if (permissions.tasks) {
    for (const task of dataset.tasks) rows.push({ id: task.id, domain: "tasks", at: task.dueAt, title: task.title, detail: task.completed ? "Completed" : `${task.priority} priority` });
  }
  if (permissions.finance) {
    rows.push({ id: "finance-7d", domain: "finance", at: dataset.finance.snapshotAt, title: "Seven-day synthetic cash projection", detail: `${dataset.finance.currency} demo snapshot` });
  }
  if (permissions.wellness) {
    rows.push({ id: "wellness-daily", domain: "wellness", at: dataset.wellness.observedAt, title: "Synthetic daily wellness snapshot", detail: "Sleep, hydration, and movement demo" });
  }
  return rows.sort((a, b) => new Date(a.at) - new Date(b.at) || a.id.localeCompare(b.id));
}

export function searchTimeline(dataset, query, requestedPermissions) {
  const needle = String(query || "").trim().toLowerCase();
  const rows = buildTimeline(dataset, requestedPermissions);
  if (!needle) return rows;
  return rows.filter((row) => `${row.domain} ${row.title} ${row.detail}`.toLowerCase().includes(needle));
}

export function createAuditLog(clock = () => new Date().toISOString()) {
  const entries = [];
  return {
    record(event, { domain = "system", targetId = null, result = "ok" } = {}) {
      const safeEvent = String(event).slice(0, 80);
      const safeDomain = ALLOWED_DOMAINS.includes(domain) ? domain : "system";
      entries.unshift(Object.freeze({
        id: `audit-${entries.length + 1}`,
        at: clock(),
        event: safeEvent,
        domain: safeDomain,
        targetId: targetId ? String(targetId).slice(0, 80) : null,
        result: String(result).slice(0, 40)
      }));
      return entries[0];
    },
    list() {
      return entries.map(clone);
    },
    clear() {
      entries.length = 0;
    }
  };
}
