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

  // TC-0004-0016 (contract-kinds): the validator accepts every kind in the contract enum
  it("TC-0004-0016 (contract-kinds): accepts every kind listed in worklog-entry.schema.md without firing W-WORKLOG-SCHEMA", async () => {
    const root = await newRoot("worklog-contract-kinds");
    try {
      const contractKinds = [
        "milestone",
        "decision",
        "risk",
        "consultation-needed",
        "unexpected",
        "unscoped-discovery",
        "handoff",
        "blocker",
        "scope-up",
        "scope-down",
        "spike",
      ];
      for (let i = 0; i < contractKinds.length; i++) {
        const k = contractKinds[i];
        if (k === undefined) continue;
        // `handoff` has additional body requirements; satisfy them here so
        // the only finding we'd ever see for this case is a kind-enum
        // rejection, which is what we want to assert NEVER happens.
        const body =
          k === "handoff"
            ? [
                "## State of the task",
                "stub",
                "## Next single action",
                "stub",
                "## Constraints to preserve",
                "stub",
                "## Open questions",
                "stub",
                "## References to consult first",
                "stub",
              ].join("\n")
            : "# body";
        await seedWorklog(
          root,
          `entry-${k}-${i}.md`,
          ["---", `id: entry-${k}-${i}`, `kind: ${k}`, "status: active", "---", "", body].join(
            "\n",
          ),
        );
      }
      const issues = await validateWorklogSurface(root, await getConfig(root));
      const kindIssues = issues.filter(
        (i) => i.code === "W-WORKLOG-SCHEMA" && (i.rule ?? "").includes("kind"),
      );
      expect(kindIssues.length).toBe(0);
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
          "## State of the task",
          "",
          "we paused after step 3.",
          "",
          "## Next single action",
          "",
          "resume on step 4.",
        ].join("\n"),
      );
      const issues = await validateWorklogSurface(root, await getConfig(root));
      const handoffIssues = issues.filter((i) => i.code === "R-HANDOFF-INCOMPLETE");
      expect(handoffIssues.length).toBe(1);
      // Severity MUST be `error` (advisory-failing) per qfai-validate.md contract.
      expect(handoffIssues[0]?.severity).toBe("error");
      expect(handoffIssues[0]?.message).toContain("Constraints to preserve");
      expect(handoffIssues[0]?.message).toContain("Open questions");
      expect(handoffIssues[0]?.message).toContain("References to consult first");
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

  // TC-0004-0020 (kind-restriction): W-PENDING-PROMOTION only fires on kind: decision
  it("TC-0004-0020 (kind-restriction): kind: risk + promote-to does NOT fire W-PENDING-PROMOTION", async () => {
    const root = await newRoot("worklog-promo-non-decision");
    try {
      await seedWorklog(
        root,
        "entry-risk-001.md",
        [
          "---",
          "id: entry-risk-001",
          "kind: risk",
          "status: active",
          "links: []",
          "promote-to: 07_Decisions.md",
          "---",
          "",
          "# risk that is NOT a decision",
        ].join("\n"),
      );
      const issues = await validateWorklogSurface(root, await getConfig(root));
      const promo = issues.filter((i) => i.code === "W-PENDING-PROMOTION");
      expect(promo.length).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // TC-0004-0016 (required-fields): missing created/updated/scope/blocking/promote-to all fire
  it("TC-0004-0016 (required-fields): missing required worklog fields each fire dedicated W-WORKLOG-SCHEMA rules", async () => {
    const root = await newRoot("worklog-required-fields");
    try {
      await seedWorklog(
        root,
        "entry-bare.md",
        ["---", "id: entry-bare", "kind: decision", "status: active", "links: []", "---", ""].join(
          "\n",
        ),
      );
      const issues = await validateWorklogSurface(root, await getConfig(root));
      const rules = issues.filter((i) => i.code === "W-WORKLOG-SCHEMA").map((i) => i.rule);
      expect(rules).toContain("worklogSurface.schema.createdMissing");
      expect(rules).toContain("worklogSurface.schema.updatedMissing");
      expect(rules).toContain("worklogSurface.schema.scopeMissing");
      expect(rules).toContain("worklogSurface.schema.blocking");
      expect(rules).toContain("worklogSurface.schema.promoteToMissing");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // TC-0004-0016 (blocking-type): non-boolean blocking fires worklogSurface.schema.blocking
  it("TC-0004-0016 (blocking-type): non-boolean blocking fires worklogSurface.schema.blocking", async () => {
    const root = await newRoot("worklog-blocking-type");
    try {
      await seedWorklog(
        root,
        "entry-bool.md",
        [
          "---",
          "id: entry-bool",
          "kind: decision",
          "status: active",
          "created: 2026-05-23",
          "updated: 2026-05-23",
          "scope: global",
          'blocking: "false"',
          "promote-to: null",
          "links: []",
          "---",
          "",
        ].join("\n"),
      );
      const issues = await validateWorklogSurface(root, await getConfig(root));
      const blocking = issues.filter((i) => i.rule === "worklogSurface.schema.blocking");
      expect(blocking.length).toBe(1);
      expect(blocking[0]?.message).toContain("MUST be a boolean");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // TC-0004-0017 (date-style entry-id): date-prefixed entry id resolves against entryIds set
  it("TC-0004-0017 (date-style entry-id): date-prefixed link resolves to a date-style entry-id without firing W-WORKLOG-BROKEN-LINK", async () => {
    const root = await newRoot("worklog-date-entry");
    try {
      // Seed two entries: a target with date-style id, and a referrer
      // that links to it. The validator must NOT flag the link as
      // broken just because it lacks an `entry-` prefix.
      await seedWorklog(
        root,
        "2026-05-22-recut-design-call.md",
        [
          "---",
          "id: 2026-05-22-recut-design-call",
          "kind: decision",
          "status: active",
          "created: 2026-05-22",
          "updated: 2026-05-22",
          "scope: global",
          "blocking: false",
          "promote-to: null",
          "links: []",
          "---",
          "",
        ].join("\n"),
      );
      await seedWorklog(
        root,
        "2026-05-23-followup.md",
        [
          "---",
          "id: 2026-05-23-followup",
          "kind: decision",
          "status: active",
          "created: 2026-05-23",
          "updated: 2026-05-23",
          "scope: global",
          "blocking: false",
          "promote-to: null",
          "links:",
          "  - 2026-05-22-recut-design-call",
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

  // TC-0004-0016 (scope-format): scope must be "global" or "spec-NNNN"
  it("TC-0004-0016 (scope-format): non-conformant scope fires worklogSurface.schema.scopeFormat", async () => {
    const root = await newRoot("worklog-scope");
    try {
      await seedWorklog(
        root,
        "entry-scope.md",
        [
          "---",
          "id: entry-scope",
          "kind: decision",
          "status: active",
          "created: 2026-05-23",
          "updated: 2026-05-23",
          "scope: project-wide",
          "blocking: false",
          "promote-to: null",
          "links: []",
          "---",
          "",
        ].join("\n"),
      );
      const issues = await validateWorklogSurface(root, await getConfig(root));
      const scopeIssues = issues.filter((i) => i.rule === "worklogSurface.schema.scopeFormat");
      expect(scopeIssues.length).toBe(1);
      expect(scopeIssues[0]?.message).toContain("project-wide");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // TC-0004-0016 (links-required): missing links field fires W-WORKLOG-SCHEMA
  it("TC-0004-0016 (links-required): missing links field fires worklogSurface.schema.linksMissing", async () => {
    const root = await newRoot("worklog-links-missing");
    try {
      await seedWorklog(
        root,
        "entry-nolinks.md",
        ["---", "id: entry-nolinks", "kind: decision", "status: active", "---", ""].join("\n"),
      );
      const issues = await validateWorklogSurface(root, await getConfig(root));
      const missing = issues.filter((i) => i.rule === "worklogSurface.schema.linksMissing");
      expect(missing.length).toBe(1);
      expect(missing[0]?.message).toContain("links field is missing");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // TC-0004-0016 (links-type): non-array links field fires worklogSurface.schema.linksType
  it("TC-0004-0016 (links-type): non-array links field fires worklogSurface.schema.linksType", async () => {
    const root = await newRoot("worklog-links-type");
    try {
      await seedWorklog(
        root,
        "entry-strlinks.md",
        [
          "---",
          "id: entry-strlinks",
          "kind: decision",
          "status: active",
          "links: spec-0001",
          "---",
          "",
        ].join("\n"),
      );
      const issues = await validateWorklogSurface(root, await getConfig(root));
      const typeIssue = issues.filter((i) => i.rule === "worklogSurface.schema.linksType");
      expect(typeIssue.length).toBe(1);
      expect(typeIssue[0]?.message).toContain("MUST be an array");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // TC-0004-0016 (nested-path): nested entries emit .qfai/steering/<sub>/<file> paths (not steering/<sub>/<file>)
  it("TC-0004-0016 (nested-path): nested worklog entry surfaces a finding with .qfai/steering/<sub>/ prefix", async () => {
    const root = await newRoot("worklog-nested");
    try {
      const subDir = path.join(root, ".qfai", "steering", "2026-Q2");
      await mkdir(subDir, { recursive: true });
      // Seed an entry with an invalid kind so we get a deterministic finding
      // whose `file` field we can inspect.
      await writeFile(
        path.join(subDir, "entry-nested.md"),
        ["---", "id: entry-nested", "kind: unknown", "status: active", "---", ""].join("\n"),
        "utf-8",
      );
      const issues = await validateWorklogSurface(root, await getConfig(root));
      const schemaIssues = issues.filter((i) => i.code === "W-WORKLOG-SCHEMA");
      expect(schemaIssues.length).toBeGreaterThan(0);
      // Must NOT regress to "steering/2026-Q2/entry-nested.md" (no .qfai/ prefix)
      const filePath = schemaIssues[0]?.file ?? "";
      expect(filePath.startsWith(".qfai/steering/")).toBe(true);
      expect(filePath).toContain("2026-Q2");
      expect(filePath).toContain("entry-nested");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // TC-0004-0016 (CRLF): parses Windows-CRLF frontmatter without false W-WORKLOG-SCHEMA
  it("TC-0004-0016 (CRLF): parses CRLF-terminated frontmatter without firing schema-parse warning", async () => {
    const root = await newRoot("worklog-crlf");
    try {
      const crlfBody = [
        "---",
        "id: entry-300",
        "kind: decision",
        "status: active",
        "created: 2026-05-23",
        "updated: 2026-05-23",
        "scope: global",
        "blocking: false",
        "promote-to: null",
        "links: []",
        "---",
        "",
        "# CRLF body",
        "",
      ].join("\r\n");
      await seedWorklog(root, "entry-300.md", crlfBody);
      const issues = await validateWorklogSurface(root, await getConfig(root));
      const parseIssues = issues.filter((i) => i.rule === "worklogSurface.schema.parse");
      expect(parseIssues.length).toBe(0);
      // And the entry's frontmatter MUST have parsed correctly — so the
      // kind/status/id schema checks also do not fire.
      const schemaIssues = issues.filter((i) => i.code === "W-WORKLOG-SCHEMA");
      expect(schemaIssues.length).toBe(0);
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
