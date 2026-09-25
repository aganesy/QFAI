/**
 * Validator: worklogSurface (.qfai/steering/).
 *
 * Covers W-WORKLOG-SCHEMA / W-WORKLOG-BROKEN-LINK /
 * R-HANDOFF-INCOMPLETE / W-PENDING-PROMOTION / W-WORKLOG-STALE.
 */
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

async function seedDecisions(root: string, rows: string[]): Promise<void> {
  const dir = path.join(root, ".qfai", "spec");
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "decisions.md"),
    [
      "# Decisions",
      "",
      "## Decisions",
      "",
      "| ID | Content | Approach | Status |",
      "| --- | --- | --- | --- |",
      ...rows,
      "",
    ].join("\n"),
    "utf-8",
  );
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

  // the validator accepts every kind in the contract enum
  it("accepts every kind listed in worklog-entry.schema.md without firing W-WORKLOG-SCHEMA", async () => {
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

  // W-WORKLOG-SCHEMA on invalid kind
  it("emits W-WORKLOG-SCHEMA for entry with invalid kind", async () => {
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

  // W-WORKLOG-BROKEN-LINK
  it("emits W-WORKLOG-BROKEN-LINK once per unresolved link", async () => {
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
          "  - BF-9999",
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

  it("resolves BF and DEC links from the story tree and reports missing IDs", async () => {
    const root = await newRoot("worklog-story-links");
    try {
      await mkdir(path.join(root, ".qfai", "spec", "02_business-flow", "business-flow-0001"), {
        recursive: true,
      });
      await seedDecisions(root, ["| DEC-0001 | Selected option | Use it | DONE |"]);
      await seedWorklog(
        root,
        "entry-links.md",
        [
          "---",
          "id: entry-links",
          "kind: risk",
          "status: active",
          "links:",
          "  - BF-0001",
          "  - DEC-0001",
          "  - BF-9999",
          "  - DEC-9999",
          "---",
          "",
        ].join("\n"),
      );
      const issues = await validateWorklogSurface(root, await getConfig(root));
      const broken = issues.filter((item) => item.code === "W-WORKLOG-BROKEN-LINK");
      expect(broken).toHaveLength(2);
      expect(broken.map((item) => item.message).join(" ")).toContain("BF-9999");
      expect(broken.map((item) => item.message).join(" ")).toContain("DEC-9999");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // R-HANDOFF-INCOMPLETE
  it("emits R-HANDOFF-INCOMPLETE naming the missing sections", async () => {
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

  // W-PENDING-PROMOTION
  it("emits W-PENDING-PROMOTION when promote-to has no decision row", async () => {
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
          "promote-to: decisions.md",
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

  // inter-entry broken-link integrity
  it("emits W-WORKLOG-BROKEN-LINK for entry-* link pointing at non-existent entry", async () => {
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

  it("does NOT fire when entry-* link resolves to an existing entry", async () => {
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

  it("requires a whole-token entry reference in the decision row", async () => {
    const root = await newRoot("worklog-promo-exact");
    try {
      await seedDecisions(root, ["| DEC-0001 | Linked via entry-010 | Keep this choice | DONE |"]);
      await seedWorklog(
        root,
        "entry-01.md",
        [
          "---",
          "id: entry-01",
          "kind: decision",
          "status: archived",
          "promote-to: decisions.md",
          "promoted-to: DEC-0001",
          "---",
          "",
        ].join("\n"),
      );
      const issues = await validateWorklogSurface(root, await getConfig(root));
      expect(issues.some((item) => item.code === "W-PENDING-PROMOTION")).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("accepts promotion only when the archived entry points to the citing DEC row", async () => {
    const root = await newRoot("worklog-promo-ok");
    try {
      await seedDecisions(root, [
        "| DEC-0001 | Decision from entry-002 | Use the selected option | DONE |",
        "| DEC-0002 | Different decision | Keep the other option | DONE |",
      ]);
      await seedWorklog(
        root,
        "entry-002.md",
        [
          "---",
          "id: entry-002",
          "kind: decision",
          "status: archived",
          "promote-to: decisions.md",
          "promoted-to: DEC-0001",
          "---",
          "",
        ].join("\n"),
      );
      const valid = await validateWorklogSurface(root, await getConfig(root));
      expect(valid.some((item) => item.code === "W-PENDING-PROMOTION")).toBe(false);

      await seedWorklog(
        root,
        "entry-002.md",
        [
          "---",
          "id: entry-002",
          "kind: decision",
          "status: archived",
          "promote-to: decisions.md",
          "promoted-to: DEC-0002",
          "---",
          "",
        ].join("\n"),
      );
      const mismatch = await validateWorklogSurface(root, await getConfig(root));
      expect(mismatch.some((item) => item.code === "W-PENDING-PROMOTION")).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("keeps an active entry pending even when the decision row and back reference agree", async () => {
    const root = await newRoot("worklog-promo-active");
    try {
      await seedDecisions(root, [
        "| DEC-0001 | Decision from entry-active | Use the selected option | DONE |",
      ]);
      await seedWorklog(
        root,
        "entry-active.md",
        [
          "---",
          "id: entry-active",
          "kind: decision",
          "status: active",
          "promote-to: decisions.md",
          "promoted-to: DEC-0001",
          "---",
          "",
        ].join("\n"),
      );
      const issues = await validateWorklogSurface(root, await getConfig(root));
      const pending = issues.find((item) => item.code === "W-PENDING-PROMOTION");
      expect(pending?.message).toContain("archived");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  // empty/whitespace links element fires linksElementEmpty
  it("empty or whitespace-only links element fires worklogSurface.schema.linksElementEmpty", async () => {
    const root = await newRoot("worklog-link-empty");
    try {
      await seedWorklog(
        root,
        "entry-EMPTY.md",
        [
          "---",
          "id: entry-EMPTY",
          "kind: decision",
          "status: active",
          "created: 2026-05-23",
          "updated: 2026-05-23",
          "scope: global",
          "blocking: false",
          "promote-to: null",
          "links:",
          '  - ""',
          '  - "   "',
          "---",
          "",
        ].join("\n"),
      );
      const issues = await validateWorklogSurface(root, await getConfig(root));
      const empty = issues.filter((i) => i.rule === "worklogSurface.schema.linksElementEmpty");
      expect(empty.length).toBe(2);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // non-canonical promote-to format fires schema warning
  it("rejects a legacy spec-pack promotion target", async () => {
    const root = await newRoot("worklog-promo-format");
    try {
      await seedWorklog(
        root,
        "entry-FMT.md",
        [
          "---",
          "id: entry-FMT",
          "kind: decision",
          "status: active",
          "created: 2026-05-23",
          "updated: 2026-05-23",
          "scope: global",
          "blocking: false",
          "promote-to: spec-0099/07_Decisions.md",
          "links: []",
          "---",
          "",
        ].join("\n"),
      );
      const issues = await validateWorklogSurface(root, await getConfig(root));
      const fmt = issues.filter((i) => i.rule === "worklogSurface.schema.promoteToFormat");
      expect(fmt.length).toBe(1);
      expect(fmt[0]?.message).toContain("decisions.md");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // row + archived but missing promoted-to → still pending
  it("archived entry + row WITHOUT promoted-to back-ref still fires", async () => {
    const root = await newRoot("worklog-promo-backref");
    try {
      await seedDecisions(root, ["| DEC-0003 | Decision C from entry-ABC | Keep it | DONE |"]);
      await seedWorklog(
        root,
        "entry-ABC.md",
        [
          "---",
          "id: entry-ABC",
          "kind: decision",
          "status: archived",
          "promote-to: decisions.md",
          // promoted-to: MISSING — the back-ref enforcement fires.
          "---",
          "",
        ].join("\n"),
      );
      const issues = await validateWorklogSurface(root, await getConfig(root));
      const promo = issues.filter((i) => i.code === "W-PENDING-PROMOTION");
      expect(promo.length).toBe(1);
      expect(promo[0]?.message).toContain("promoted-to");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // W-PENDING-PROMOTION only fires on kind: decision
  it("kind: risk + promote-to does NOT fire W-PENDING-PROMOTION", async () => {
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
          "promote-to: decisions.md",
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

  // missing created/updated/scope/blocking/promote-to all fire
  it("missing required worklog fields each fire dedicated W-WORKLOG-SCHEMA rules", async () => {
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

  // non-boolean blocking fires worklogSurface.schema.blocking
  it("non-boolean blocking fires worklogSurface.schema.blocking", async () => {
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

  // non-ISO `created` / `updated` fires per-field format rule
  it("non-ISO created/updated fires worklogSurface.schema.{created,updated}Format", async () => {
    const root = await newRoot("worklog-date-format");
    try {
      await seedWorklog(
        root,
        "entry-baddate.md",
        [
          "---",
          "id: entry-baddate",
          "kind: decision",
          "status: active",
          "created: 2026/05/23",
          "updated: May 23 2026",
          "scope: global",
          "blocking: false",
          "promote-to: null",
          "links: []",
          "---",
          "",
        ].join("\n"),
      );
      const issues = await validateWorklogSurface(root, await getConfig(root));
      const rules = issues.map((i) => i.rule);
      expect(rules).toContain("worklogSurface.schema.createdFormat");
      expect(rules).toContain("worklogSurface.schema.updatedFormat");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // syntactically valid but non-existent dates fire createdFormat
  it("non-existent calendar date (2026-02-30) fires createdFormat", async () => {
    const root = await newRoot("worklog-rollover");
    try {
      await seedWorklog(
        root,
        "entry-rollover.md",
        [
          "---",
          "id: entry-rollover",
          "kind: decision",
          "status: active",
          "created: 2026-02-30",
          "updated: 2026-05-23",
          "scope: global",
          "blocking: false",
          "promote-to: null",
          "links: []",
          "---",
          "",
        ].join("\n"),
      );
      const issues = await validateWorklogSurface(root, await getConfig(root));
      const fmt = issues.filter((i) => i.rule === "worklogSurface.schema.createdFormat");
      expect(fmt.length).toBe(1);
      expect(fmt[0]?.message).toContain("2026-02-30");
      expect(fmt[0]?.message).toContain("calendar date");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // updated earlier than created fires updatedOrder
  it("updated < created fires worklogSurface.schema.updatedOrder", async () => {
    const root = await newRoot("worklog-date-order");
    try {
      await seedWorklog(
        root,
        "entry-order.md",
        [
          "---",
          "id: entry-order",
          "kind: decision",
          "status: active",
          "created: 2026-05-23",
          "updated: 2026-05-22",
          "scope: global",
          "blocking: false",
          "promote-to: null",
          "links: []",
          "---",
          "",
        ].join("\n"),
      );
      const issues = await validateWorklogSurface(root, await getConfig(root));
      const order = issues.filter((i) => i.rule === "worklogSurface.schema.updatedOrder");
      expect(order.length).toBe(1);
      expect(order[0]?.message).toContain("earlier than");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // non-string links element fires linksElementType
  it("non-string links elements fire worklogSurface.schema.linksElementType", async () => {
    const root = await newRoot("worklog-links-elem-type");
    try {
      // YAML allows mixed types in a list. Seed numeric + boolean entries.
      await seedWorklog(
        root,
        "entry-mixedlinks.md",
        [
          "---",
          "id: entry-mixedlinks",
          "kind: decision",
          "status: active",
          "created: 2026-05-23",
          "updated: 2026-05-23",
          "scope: global",
          "blocking: false",
          "promote-to: null",
          "links:",
          "  - 123",
          "  - true",
          "---",
          "",
        ].join("\n"),
      );
      const issues = await validateWorklogSurface(root, await getConfig(root));
      const elem = issues.filter((i) => i.rule === "worklogSurface.schema.linksElementType");
      expect(elem.length).toBe(2);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // non-kebab-case id fires worklogSurface.schema.idFormat
  it("non-kebab-case ASCII id fires worklogSurface.schema.idFormat (isolated from idFilenameMismatch)", async () => {
    const root = await newRoot("worklog-id-format");
    try {
      // Filename stem matches the (non-kebab) id exactly so the
      // idFilenameMismatch rule does NOT also fire — this isolates
      // idFormat as the sole assertion target.
      await seedWorklog(
        root,
        "Foo_Bar.md",
        [
          "---",
          "id: Foo_Bar",
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
        ].join("\n"),
      );
      const issues = await validateWorklogSurface(root, await getConfig(root));
      const idFmt = issues.filter((i) => i.rule === "worklogSurface.schema.idFormat");
      expect(idFmt.length).toBe(1);
      expect(idFmt[0]?.message).toContain("Foo_Bar");
      expect(idFmt[0]?.message).toContain("kebab-case");
      // Make sure idFilenameMismatch is NOT firing (isolation).
      const mismatch = issues.filter((i) => i.rule === "worklogSurface.schema.idFilenameMismatch");
      expect(mismatch.length).toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // date-prefixed entry id resolves against entryIds set
  it("date-prefixed link resolves to a date-style entry-id without firing W-WORKLOG-BROKEN-LINK", async () => {
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

  // Scope must be "global" or "BF-NNNN".
  it("non-conformant scope fires worklogSurface.schema.scopeFormat", async () => {
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

  // missing links field fires W-WORKLOG-SCHEMA
  it("missing links field fires worklogSurface.schema.linksMissing", async () => {
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

  // non-array links field fires worklogSurface.schema.linksType
  it("non-array links field fires worklogSurface.schema.linksType", async () => {
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
          "links: BF-0001",
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

  // nested entries emit .qfai/steering/<sub>/<file> paths (not steering/<sub>/<file>)
  it("nested worklog entry surfaces a finding with .qfai/steering/<sub>/ prefix", async () => {
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

  // parses Windows-CRLF frontmatter without false W-WORKLOG-SCHEMA
  it("parses CRLF-terminated frontmatter without firing schema-parse warning", async () => {
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

  // W-WORKLOG-STALE
  it("emits W-WORKLOG-STALE when status=active and updated > 90d ago", async () => {
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
