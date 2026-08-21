/**
 * The `[RE-OPEN]` decision record was a token in prose.
 *
 * The Delta Rejected Guard requires one before a candidate listed under a
 * delta's `## Rejected` may be re-adopted, four reviewer agents block on it and
 * four skill completion reports have to enumerate its IDs — but neither shipped
 * Decisions template had a status value for it, a field for the prior `DR-*` or
 * a field for the approval, and no validator could locate one. The gate could
 * not fail for the right reason: nothing distinguished a valid re-open from a
 * sentence typed into a PR description.
 *
 * These cases pin the shape: a re-open names a resolvable prior `DR-*`, carries
 * an explicit approval, and the rejection it lifts points back at it.
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { collectReOpenEntries } from "../../src/core/decisionRecords.js";
import { validateSpecPacks } from "../../src/core/validators/specPack.js";

const DELTA_BASE = [
  "# 09 Delta",
  "",
  "## Change Summary",
  "",
  "- Change ID: DELTA-0001",
  "",
  "## Rationale",
  "",
  "## Candidates Considered",
  "",
  "## Adopted",
  "",
  "## Rejected",
  "",
  "- Candidate: in-process cache",
  "- Reason: unbounded growth",
  "- DO NOT: reintroduce without a size bound",
  "- Temptation: it is the shortest diff",
].join("\n");

const APPROVED = ["- Approved by: ops-lead", "- Approved at: 2026-01-02T03:04:05Z"].join("\n");

function reOpen(fields: string[]): string {
  return [
    "# 07 Decisions",
    "",
    "## Decisions",
    "",
    "### DR-0001-0001: bound the cache",
    "",
    "- Status: rejected",
    "- Decision: do not cache in-process",
    "",
    "### DR-0001-0002: re-adopt the in-process cache",
    "",
    "- Status: re-open",
    "- Decision: the size bound landed, so the growth objection no longer holds",
    ...fields,
    "",
  ].join("\n");
}

async function withSpec<T>(
  files: { decisions?: string; delta?: string },
  fn: (root: string) => Promise<T>,
): Promise<T> {
  const root = path.join(
    os.tmpdir(),
    `qfai-reopen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const specDir = path.join(root, ".qfai", "specs", "spec-0001");
  await mkdir(specDir, { recursive: true });
  try {
    for (const [name, body] of [
      ["01_Spec.md", "# Spec\n\n- Status: active\n"],
      ["02_User-stories.md", "# US\n"],
      ["03_Acceptance-Criteria.md", "# AC\n"],
      ["04_Business-Rules.md", "# BR\n"],
      ["05_Examples.md", "# EX\n"],
      ["06_Test-Cases.md", "# TC\n"],
      ["07_Decisions.md", files.decisions ?? "# DR\n"],
      ["08_Open-questions.md", "# OQ\n"],
      ["09_delta.md", files.delta ?? DELTA_BASE],
    ] as const) {
      await writeFile(path.join(specDir, name), body, "utf-8");
    }
    return await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const codes = async (root: string): Promise<string[]> =>
  (await validateSpecPacks(root, defaultConfig)).map((found) => found.code);

describe("the re-open record has a parsed shape", () => {
  it("recognises `Status: re-open` and its three extra fields", () => {
    const entries = collectReOpenEntries(reOpen(["- Re-opens: DR-0001-0001", APPROVED]));
    expect(entries).toHaveLength(1);
    expect(entries[0]?.id).toBe("DR-0001-0002");
    expect(entries[0]?.reOpens).toBe("DR-0001-0001");
    expect(entries[0]?.approvedBy).toBe("ops-lead");
  });

  it("does not read the shipped template's enum line as a re-open", () => {
    const template = [
      "### DR-NNNN-MMMM: one-line title",
      "",
      "- Status: proposed | accepted | superseded | rejected | re-open",
      "- Re-opens: `-`",
    ].join("\n");
    expect(collectReOpenEntries(template)).toEqual([]);
  });
});

describe("QFAI-DECISION-001..003 gate the record itself", () => {
  it("reports a re-open with no prior DR", async () => {
    await withSpec({ decisions: reOpen([APPROVED]) }, async (root) => {
      expect(await codes(root)).toContain("QFAI-DECISION-001");
    });
  });

  it("reports a re-open that names itself", async () => {
    await withSpec({ decisions: reOpen(["- Re-opens: DR-0001-0002", APPROVED]) }, async (root) => {
      expect(await codes(root)).toContain("QFAI-DECISION-001");
    });
  });

  it("reports a prior DR that is declared nowhere", async () => {
    await withSpec({ decisions: reOpen(["- Re-opens: DR-0009-0009", APPROVED]) }, async (root) => {
      expect(await codes(root)).toContain("QFAI-DECISION-002");
    });
  });

  it("reports a re-open whose approval is still the template placeholder", async () => {
    const fields = ["- Re-opens: DR-0001-0001", "- Approved by: `-`", "- Approved at: `-`"];
    await withSpec({ decisions: reOpen(fields) }, async (root) => {
      expect(await codes(root)).toContain("QFAI-DECISION-003");
    });
  });

  it("accepts a re-open that names a declared prior DR and an approver", async () => {
    await withSpec({ decisions: reOpen(["- Re-opens: DR-0001-0001", APPROVED]) }, async (root) => {
      const found = await codes(root);
      expect(found.filter((code) => code.startsWith("QFAI-DECISION-"))).toEqual([]);
    });
  });
});

describe("QFAI-DECISION-004 gates the delta back-reference", () => {
  it("reports a `Re-opened by:` that resolves to no re-open record", async () => {
    const delta = `${DELTA_BASE}\n- Re-opened by: DR-0001-0007\n`;
    await withSpec(
      { decisions: reOpen(["- Re-opens: DR-0001-0001", APPROVED]), delta },
      async (root) => {
        expect(await codes(root)).toContain("QFAI-DECISION-004");
      },
    );
  });

  it("accepts a `Re-opened by:` that names the re-open record", async () => {
    const delta = `${DELTA_BASE}\n- Re-opened by: DR-0001-0002\n`;
    await withSpec(
      { decisions: reOpen(["- Re-opens: DR-0001-0001", APPROVED]), delta },
      async (root) => {
        expect(await codes(root)).not.toContain("QFAI-DECISION-004");
      },
    );
  });

  it("leaves the untouched template placeholder alone", async () => {
    const delta = `${DELTA_BASE}\n- Re-opened by: \`-\` <!-- stays \`-\` while the rejection holds -->\n`;
    await withSpec({ delta }, async (root) => {
      const found = await codes(root);
      expect(found.filter((code) => code.startsWith("QFAI-DECISION-"))).toEqual([]);
    });
  });
});
