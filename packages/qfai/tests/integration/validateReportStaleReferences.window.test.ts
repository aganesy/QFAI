/**
 * Integration: the severity a stale reference reports (TC-0015-0033,
 * AC-0015-0021).
 *
 * The finding is a `warning`, and it is a warning on every day. The rule
 * used to read the calendar and report `error` from a cutoff date, so the
 * same tree graded differently according to when it was validated: a green
 * leg could not be re-created, a red one had no commit to bisect to, and
 * the escalation would have arrived at every project at once.
 *
 * The clock is moved rather than injected, because the seam that let a
 * caller name the day is the thing that went away, and a test holding its
 * own seam would pass over a rule that still read the real one. `Date`
 * alone is faked: the scan is real file I/O, and faking the timers with it
 * would put this suite's own scheduling into the fixture.
 */
// QFAI:SPEC-0015:TC-0015-0033

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { validateStaleReferences } from "../../src/core/validators/staleReferences.js";

/** The date the rule used to escalate on. */
const FORMER_CUTOFF = "2026-12-01";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-stale-severity-"));
});

afterEach(async () => {
  vi.useRealTimers();
  await rm(root, { recursive: true, force: true });
});

async function seedStaleRef(): Promise<void> {
  const dir = path.join(root, ".qfai", "assistant", "skills", "qfai-prototyping", "references");
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "handoff.md"),
    "# Handoff\n\nThis still mentions session-handoff.yaml (legacy).\n",
    "utf-8",
  );
}

/** Severities of the stale-reference findings a scan reports on `dayIso`. */
async function severitiesOn(dayIso: string): Promise<string[]> {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${dayIso}T00:00:00Z`));
  try {
    const issues = await validateStaleReferences(root);
    return issues.filter((i) => i.code === "W-STALE-REFERENCE").map((i) => i.severity);
  } finally {
    vi.useRealTimers();
  }
}

describe("TC-0015-0033: the severity a stale reference reports", () => {
  it("emits W-STALE-REFERENCE at warning", async () => {
    await seedStaleRef();

    const issues = await validateStaleReferences(root);

    const findings = issues.filter((i) => i.code === "W-STALE-REFERENCE");
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0]?.severity).toBe("warning");
    expect(findings[0]?.message).toMatch(/session-handoff\.yaml/);
  });

  it("answers the same on either side of the date it used to escalate on", async () => {
    await seedStaleRef();

    const before = await severitiesOn("2026-06-01");
    const onCutoff = await severitiesOn(FORMER_CUTOFF);
    const wellPast = await severitiesOn("2031-03-14");

    // Read first, so a fixture that stopped producing a finding fails here
    // rather than passing three empty arrays against each other.
    expect(before, "the fixture must produce a finding at all").not.toEqual([]);
    expect(before.every((severity) => severity === "warning")).toBe(true);

    expect(onCutoff).toEqual(before);
    expect(wellPast).toEqual(before);
  });
});
