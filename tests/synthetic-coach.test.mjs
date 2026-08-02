import assert from "node:assert/strict";
import test from "node:test";

import { SYNTHETIC_DATASET } from "../src/aegis-synthetic-coach/fixtures.mjs";
import {
  assertSyntheticDataset,
  buildTimeline,
  createAuditLog,
  generateDailyBrief,
  searchTimeline
} from "../src/aegis-synthetic-coach/coach-engine.mjs";

test("rejects data that is not explicitly synthetic", () => {
  assert.throws(() => assertSyntheticDataset({ ...SYNTHETIC_DATASET, synthetic: false }), /synthetic=true/);
});

test("daily brief is deterministic for the same fixture", () => {
  const first = generateDailyBrief(SYNTHETIC_DATASET);
  const second = generateDailyBrief(SYNTHETIC_DATASET);
  assert.deepEqual(first, second);
});

test("urgent task is ranked as the best next action", () => {
  const brief = generateDailyBrief(SYNTHETIC_DATASET);
  assert.equal(brief.bestNextAction.domain, "tasks");
  assert.equal(brief.bestNextAction.priority, "critical");
  assert.match(brief.bestNextAction.summary, /Prepare demo agenda/);
});

test("permission controls remove a disabled domain", () => {
  const brief = generateDailyBrief(SYNTHETIC_DATASET, {
    calendar: true,
    tasks: true,
    finance: false,
    wellness: true
  });
  assert.equal(brief.recommendations.some((item) => item.domain === "finance"), false);
  assert.equal(brief.sourceSummary.some((item) => item.domain === "finance"), false);
});

test("every recommendation exposes evidence, inference, confidence, and unknowns", () => {
  const brief = generateDailyBrief(SYNTHETIC_DATASET);
  assert.ok(brief.recommendations.length >= 4);
  for (const item of brief.recommendations) {
    assert.ok(item.evidence.length > 0);
    assert.ok(item.evidence.every((entry) => entry.sourceLabel.startsWith("Synthetic")));
    assert.equal(typeof item.inference, "string");
    assert.ok(item.inference.length > 10);
    assert.ok(Array.isArray(item.unknowns) && item.unknowns.length > 0);
    assert.ok(item.confidence >= 0 && item.confidence <= 1);
    assert.equal(item.actionPolicy, "advisory-only");
  }
});

test("timeline honors permission state and supports search", () => {
  const timeline = buildTimeline(SYNTHETIC_DATASET, { calendar: true, tasks: false, finance: true, wellness: false });
  assert.ok(timeline.every((row) => row.domain === "calendar" || row.domain === "finance"));
  const results = searchTimeline(SYNTHETIC_DATASET, "Orion");
  assert.equal(results.length, 1);
  assert.equal(results[0].id, "event-001");
});

test("audit log minimizes stored fields and can be cleared", () => {
  const audit = createAuditLog(() => "2026-08-02T12:00:00.000Z");
  audit.record("Reviewed recommendation evidence", {
    domain: "finance",
    targetId: "finance-buffer-7d",
    result: "ok",
    rawPayload: "must not be retained"
  });
  const [entry] = audit.list();
  assert.deepEqual(Object.keys(entry).sort(), ["at", "domain", "event", "id", "result", "targetId"]);
  assert.equal(JSON.stringify(entry).includes("rawPayload"), false);
  assert.equal(JSON.stringify(entry).includes("must not be retained"), false);
  audit.clear();
  assert.deepEqual(audit.list(), []);
});
