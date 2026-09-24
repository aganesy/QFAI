/** Parser coverage for historical decision records consumed by migration. */

import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  collectDeclaredDrHeadingIds,
  collectReOpenEntries,
  isPlaceholderValue,
} from "../../src/core/decisionRecords.js";

const APPROVED = ["- Approved by: ops-lead", "- Approved at: 2026-01-02T03:04:05Z"].join("\n");

const RE_OPEN_ID = "DR-0001-0002";

function reOpen(fields: string[], options: { id?: string; decision?: string | null } = {}): string {
  const id = options.id ?? RE_OPEN_ID;
  const decision =
    options.decision === null
      ? []
      : [
          `- Decision: ${
            options.decision ?? "the size bound landed, so the growth objection no longer holds"
          }`,
        ];
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
    `### ${id}: re-adopt the in-process cache`,
    "",
    "- Status: re-open",
    ...decision,
    ...fields,
    "",
  ].join("\n");
}

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

  it("ends the record at the next non-DR heading", () => {
    const text = [
      reOpen(["- Re-opens: DR-0001-0001", APPROVED]),
      "## Re-open records",
      "",
      "- Re-opens: the prior DR-* this re-adopts",
      "- Approved by: whoever signed it off",
      "",
    ].join("\n");
    const entries = collectReOpenEntries(text);
    expect(entries).toHaveLength(1);
    // The prose below the records describes the same field names; without the
    // heading ending the block it would overwrite what the record declared.
    expect(entries[0]?.reOpens).toBe("DR-0001-0001");
    expect(entries[0]?.approvedBy).toBe("ops-lead");
  });

  it("keeps a ``` sample nested in a ```` fence out of the records", () => {
    const text = [
      "````markdown",
      "```",
      "### DR-9999-9999: quoted sample",
      "",
      "- Status: re-open",
      "```",
      "````",
      "",
      "### DR-0001-0002: the real record",
      "",
      "- Status: re-open",
    ].join("\n");
    expect(collectReOpenEntries(text).map((entry) => entry.id)).toEqual(["DR-0001-0002"]);
  });

  it("reads a CommonMark-indented `### DR-*` heading as a record", () => {
    const text = [
      "## Decisions",
      "",
      "   ### DR-0001-0002: the indented record",
      "",
      "- Status: re-open",
      "- Re-opens: DR-0001-0001",
    ].join("\n");
    // Three leading spaces are a heading, not code: without this the heading
    // closed the previous record and opened none, so a delta with a correct
    // back-reference reported `QFAI-DECISION-004` against a dropped record.
    expect(collectReOpenEntries(text).map((entry) => entry.id)).toEqual(["DR-0001-0002"]);
  });

  it("does not read an indented code sample's approval as the record's own", () => {
    const text = [
      "### DR-0001-0002: the real record",
      "",
      "- Status: re-open",
      "- Re-opens: DR-0001-0001",
      "",
      "        - Approved by: ops-lead",
      "        - Approved at: 2026-01-02T03:04:05Z",
    ].join("\n");
    const entries = collectReOpenEntries(text);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.approvedBy).toBeNull();
    expect(entries[0]?.approvedAt).toBeNull();
  });

  it("does not read the template's own `Decision:` prompt as a written decision", () => {
    const entries = collectReOpenEntries(
      reOpen(["- Re-opens: DR-0001-0001", APPROVED], {
        decision: "what was decided, in the imperative",
      }),
    );
    expect(isPlaceholderValue(entries[0]?.decision)).toBe(true);
  });

  it("resolves declarations against the layout's own Decisions file", async () => {
    const root = path.join(
      os.tmpdir(),
      `qfai-reopen-layout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    const specsRoot = path.join(root, ".qfai", "specs");
    const specDir = path.join(specsRoot, "spec-0001");
    await mkdir(specDir, { recursive: true });
    try {
      // `spec-pack` numbers the Decisions file 14, not 07.
      const decisionsPath = path.join(specDir, "14_Decisions.md");
      await writeFile(
        decisionsPath,
        "### DR-0001-0001: bound the cache\n\n- Status: rejected\n",
        "utf-8",
      );
      const declared = await collectDeclaredDrHeadingIds(specDir, specsRoot, decisionsPath);
      expect([...declared]).toContain("DR-0001-0001");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
