/**
 * Integration: stale-reference severity gating (TC-0015-0033,
 * AC-0015-0021).
 *
 * - During the deprecation window: the stale-reference surfaces as
 *   `warning`.
 * - At / past sunset: the same stale reference fails as `error`.
 */
// QFAI:SPEC-0015:TC-0015-0033

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  STALE_REFERENCE_SUNSET,
  staleReferenceSeverity,
  validateStaleReferences,
} from "../../src/core/validators/staleReferences.js";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-stale-window-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function seedStaleRef(): Promise<void> {
  const dir = path.join(
    root,
    ".qfai",
    "assistant",
    "skills",
    "qfai-prototyping",
    "references",
  );
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "handoff.md"),
    "# Handoff\n\nThis still mentions session-handoff.yaml (legacy).\n",
    "utf-8",
  );
}

describe("TC-0015-0033: stale-reference severity flips at sunset", () => {
  it("emits W-STALE-REFERENCE at warning during the deprecation window", async () => {
    await seedStaleRef();
    const beforeSunset = new Date("2026-06-01T00:00:00Z");
    const issues = await validateStaleReferences(root, { now: () => beforeSunset });
    const findings = issues.filter((i) => i.code === "W-STALE-REFERENCE");
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0]?.severity).toBe("warning");
    expect(findings[0]?.message).toMatch(/session-handoff\.yaml/);
  });

  it("escalates W-STALE-REFERENCE to error at/past sunset", async () => {
    await seedStaleRef();
    const atSunset = new Date(`${STALE_REFERENCE_SUNSET}T00:00:00Z`);
    const issues = await validateStaleReferences(root, { now: () => atSunset });
    const findings = issues.filter((i) => i.code === "W-STALE-REFERENCE");
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0]?.severity).toBe("error");
  });

  it("staleReferenceSeverity flips on the cutoff date", () => {
    expect(staleReferenceSeverity("2026-06-01")).toBe("warning");
    expect(staleReferenceSeverity(STALE_REFERENCE_SUNSET)).toBe("error");
    expect(staleReferenceSeverity("2027-01-01")).toBe("error");
  });
});
