/**
 * Validator: worklogSurface (.qfai/steering/).
 *
 * Covers TC-0004-0016..0021: W-WORKLOG-SCHEMA / W-WORKLOG-BROKEN-LINK /
 * R-HANDOFF-INCOMPLETE / W-PENDING-PROMOTION / W-WORKLOG-STALE.
 */
// QFAI:SPEC-0004:TC-0004-0016
// QFAI:SPEC-0004:TC-0004-0017
// QFAI:SPEC-0004:TC-0004-0019
// QFAI:SPEC-0004:TC-0004-0020
// QFAI:SPEC-0004:TC-0004-0021
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { validateWorklogSurface } from "../../src/core/validators/worklogSurface.js";
import { loadConfig } from "../../src/core/config.js";

async function newRoot(prefix: string): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), `qfai-${prefix}-`));
}

async function seedWorklog(root: string, name: string, body: string): Promise<void> {
  const dir = path.join(root, ".qfai", "steering");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), body, "utf-8");
}

async function getConfig(root: string) {
  const result = await loadConfig(root);
  return result.config;
}

describe("worklogSurface validator", () => {
  it("returns no issues when .qfai/steering/ is absent", async () => {
    const root = await newRoot("worklog-absent");
    try {
      const issues = await validateWorklogSurface(root, await getConfig(root));
      expect(issues).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // TC-0004-0016: W-WORKLOG-SCHEMA on invalid kind
  it("TC-0004-0016: emits W-WORKLOG-SCHEMA for entry with invalid kind", async () => {
    const root = await newRoot("worklog-schema");
    try {
      await seedWorklog(
        root,
        "entry-001.md",
        [
          "---",
          "id: entry-001",
          "kind: unknown-kind",
          "status: active",
          "---",
          "",
          "# entry body",
        ].join("\n"),
      );
      const issues = await validateWorklogSurface(root, await getConfig(root));
      const schemaIssues = issues.filter((i) => i.code === "W-WORKLOG-SCHEMA");
      expect(schemaIssues.length).toBeGreaterThan(0);
      expect(schemaIssues[0]?.message).toContain("unknown-kind");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // TC-0004-0017: W-WORKLOG-BROKEN-LINK
  it("TC-0004-0017: emits W-WORKLOG-BROKEN-LINK once per unresolved link", async () => {
    const root = await newRoot("worklog-links");
    try {
      await seedWorklog(
        root,
        "entry-002.md",
        [
          "---",
          "id: entry-002",
          "kind: decision",
          "status: active",
          "links:",
          "  - spec-9999",
          "  - discussion-99991231235959999",
          "---",
          "",
        ].join("\n"),
      );
      const issues = await validateWorklogSurface(root, await getConfig(root));
      const brokenLinks = issues.filter((i) => i.code === "W-WORKLOG-BROKEN-LINK");
      expect(brokenLinks.length).toBe(2);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // TC-0004-0019: R-HANDOFF-INCOMPLETE
  it("TC-0004-0019: emits R-HANDOFF-INCOMPLETE naming the missing sections", async () => {
    const root = await newRoot("worklog-handoff");
    try {
      await seedWorklog(
        root,
        "handoff-001.md",
        [
          "---",
          "id: handoff-001",
          "kind: handoff",
          "status: active",
          "---",
          "",
          "# Handoff",
          "",
          "## State",
          "",
          "we paused after step 3.",
          "",
          "## Next action",
          "",
          "resume on step 4.",
        ].join("\n"),
      );
      const issues = await validateWorklogSurface(root, await getConfig(root));
      const handoffIssues = issues.filter((i) => i.code === "R-HANDOFF-INCOMPLETE");
      expect(handoffIssues.length).toBe(1);
      expect(handoffIssues[0]?.message).toContain("Constraints");
      expect(handoffIssues[0]?.message).toContain("Open Questions");
      expect(handoffIssues[0]?.message).toContain("References");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // TC-0004-0020: W-PENDING-PROMOTION
  it("TC-0004-0020: emits W-PENDING-PROMOTION when promote-to has no decision row", async () => {
    const root = await newRoot("worklog-promo");
    try {
      await seedWorklog(
        root,
        "entry-003.md",
        [
          "---",
          "id: entry-003",
          "kind: decision",
          "status: active",
          "promote-to: 07_Decisions.md",
          "---",
          "",
          "# choose Y over Z",
        ].join("\n"),
      );
      const issues = await validateWorklogSurface(root, await getConfig(root));
      const promoIssues = issues.filter((i) => i.code === "W-PENDING-PROMOTION");
      expect(promoIssues.length).toBe(1);
      expect(promoIssues[0]?.message).toContain("entry-003");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // TC-0004-0017 (entry-* link): inter-entry broken-link integrity
  it("TC-0004-0017 (entry-*): emits W-WORKLOG-BROKEN-LINK for entry-* link pointing at non-existent entry", async () => {
    const root = await newRoot("worklog-entry-link");
    try {
      await seedWorklog(
        root,
        "entry-100.md",
        [
          "---",
          "id: entry-100",
          "kind: decision",
          "status: active",
          "links:",
          "  - entry-999",
          "---",
          "",
        ].join("\n"),
      );
      const issues = await validateWorklogSurface(root, await getConfig(root));
      const broken = issues.filter((i) => i.code === "W-WORKLOG-BROKEN-LINK");
      expect(broken.length).toBe(1);
      expect(broken[0]?.message).toContain("entry-999");
      expect(broken[0]?.message).toContain("worklog entry");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("TC-0004-0017 (entry-*): does NOT fire when entry-* link resolves to an existing entry", async () => {
    const root = await newRoot("worklog-entry-link-ok");
    try {
      await seedWorklog(
        root,
        "entry-200.md",
        ["---", "id: entry-200", "kind: decision", "status: active", "---", ""].join("\n"),
      );
      await seedWorklog(
        root,
        "entry-201.md",
        [
          "---",
          "id: entry-201",
          "kind: decision",
          "status: active",
          "links:",
          "  - entry-200",
          "---",
          "",
        ].join("\n"),
      );
      const issues = await validateWorklogSurface(root, await getConfig(root));
      const broken = issues.filter((i) => i.code === "W-WORKLOG-BROKEN-LINK");
      expect(broken.length).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // TC-0004-0020 (exact-match): promotion satisfied only by an exact entry-id reference
  it("TC-0004-0020 (exact-match): row containing entry-010 does NOT satisfy promotion for entry-01", async () => {
    const root = await newRoot("worklog-promo-exact");
    try {
      // Pre-seed a Decisions row that mentions entry-010 (the longer id).
      const specDir = path.join(root, ".qfai", "specs", "spec-0099");
      await mkdir(specDir, { recursive: true });
      await writeFile(
        path.join(specDir, "07_Decisions.md"),
        "| DR-1 | Decision A | linked via entry-010 |\n",
        "utf-8",
      );
      // Entry-01 (shorter id) has promote-to: but no decisions row mentions it.
      await seedWorklog(
        root,
        "entry-01.md",
        [
          "---",
          "id: entry-01",
          "kind: decision",
          "status: active",
          "promote-to: 07_Decisions.md",
          "---",
          "",
        ].join("\n"),
      );
      const issues = await validateWorklogSurface(root, await getConfig(root));
      const promo = issues.filter((i) => i.code === "W-PENDING-PROMOTION");
      expect(promo.length).toBe(1);
      expect(promo[0]?.message).toContain("entry-01");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("TC-0004-0020 (exact-match): row containing exact entry-002 DOES satisfy promotion", async () => {
    const root = await newRoot("worklog-promo-ok");
    try {
      const specDir = path.join(root, ".qfai", "specs", "spec-0099");
      await mkdir(specDir, { recursive: true });
      await writeFile(
        path.join(specDir, "07_Decisions.md"),
        "| DR-2 | Decision B | from entry-002 |\n",
        "utf-8",
      );
      await seedWorklog(
        root,
        "entry-002.md",
        [
          "---",
          "id: entry-002",
          "kind: decision",
          "status: active",
          "promote-to: 07_Decisions.md",
          "---",
          "",
        ].join("\n"),
      );
      const issues = await validateWorklogSurface(root, await getConfig(root));
      const promo = issues.filter((i) => i.code === "W-PENDING-PROMOTION");
      expect(promo.length).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // TC-0004-0021: W-WORKLOG-STALE
  it("TC-0004-0021: emits W-WORKLOG-STALE when status=active and updated > 90d ago", async () => {
    const root = await newRoot("worklog-stale");
    try {
      await seedWorklog(
        root,
        "entry-004.md",
        [
          "---",
          "id: entry-004",
          "kind: risk",
          "status: active",
          "updated: 2025-01-01T00:00:00Z",
          "---",
          "",
          "# old risk",
        ].join("\n"),
      );
      const now = new Date("2026-05-23T00:00:00Z");
      const issues = await validateWorklogSurface(root, await getConfig(root), now);
      const staleIssues = issues.filter((i) => i.code === "W-WORKLOG-STALE");
      expect(staleIssues.length).toBe(1);
      expect(staleIssues[0]?.message).toMatch(/\d+d ago/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
