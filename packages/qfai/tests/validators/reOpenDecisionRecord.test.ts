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
import {
  collectDeclaredDrHeadingIds,
  collectReOpenEntries,
} from "../../src/core/decisionRecords.js";
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

/** `DELTA_BASE` plus the `## Rejected` back-references the records need. */
function deltaFor(...ids: string[]): string {
  return [DELTA_BASE, ...ids.map((id) => `- Re-opened by: ${id}`), ""].join("\n");
}

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

describe("QFAI-DECISION-001..003, 005 gate the record itself", () => {
  const delta = deltaFor(RE_OPEN_ID);

  it("reports a re-open with no prior DR", async () => {
    await withSpec({ decisions: reOpen([APPROVED]), delta }, async (root) => {
      expect(await codes(root)).toContain("QFAI-DECISION-001");
    });
  });

  it("reports a re-open that names itself", async () => {
    await withSpec(
      { decisions: reOpen([`- Re-opens: ${RE_OPEN_ID}`, APPROVED]), delta },
      async (root) => {
        expect(await codes(root)).toContain("QFAI-DECISION-001");
      },
    );
  });

  it("reports a re-open whose own id is off the DR-* scheme", async () => {
    await withSpec(
      {
        decisions: reOpen(["- Re-opens: DR-0001-0001", APPROVED], { id: "DR-fake" }),
        delta: deltaFor("DR-fake"),
      },
      async (root) => {
        // Everything else about the record is well-formed, so without the id
        // check it would pass every gate under an id no scheme allows.
        expect(await codes(root)).toContain("QFAI-DECISION-001");
      },
    );
  });

  it("reports two re-opens that only cite each other", async () => {
    const decisions = [
      "# 07 Decisions",
      "",
      "## Decisions",
      "",
      "### DR-0001-0002: re-adopt the cache",
      "",
      "- Status: re-open",
      "- Decision: the size bound landed",
      "- Re-opens: DR-0001-0003",
      APPROVED,
      "",
      "### DR-0001-0003: re-adopt the cache again",
      "",
      "- Status: re-open",
      "- Decision: the bound is still there",
      "- Re-opens: DR-0001-0002",
      APPROVED,
      "",
    ].join("\n");
    await withSpec({ decisions, delta: deltaFor("DR-0001-0002", "DR-0001-0003") }, async (root) => {
      // Both ids are declared and neither is self-referential, but the loop
      // contains no decision made before them.
      expect(await codes(root)).toContain("QFAI-DECISION-001");
    });
  });

  it("reports a prior DR that is declared nowhere", async () => {
    await withSpec(
      { decisions: reOpen(["- Re-opens: DR-0009-0009", APPROVED]), delta },
      async (root) => {
        expect(await codes(root)).toContain("QFAI-DECISION-002");
      },
    );
  });

  it("reports a re-open whose approval is still the template placeholder", async () => {
    const fields = ["- Re-opens: DR-0001-0001", "- Approved by: `-`", "- Approved at: `-`"];
    await withSpec({ decisions: reOpen(fields), delta }, async (root) => {
      expect(await codes(root)).toContain("QFAI-DECISION-003");
    });
  });

  it("reports an `Approved at:` that is not an auditable instant", async () => {
    const fields = ["- Re-opens: DR-0001-0001", "- Approved by: ops-lead", "- Approved at: 昨日"];
    await withSpec({ decisions: reOpen(fields), delta }, async (root) => {
      expect(await codes(root)).toContain("QFAI-DECISION-003");
    });
  });

  it("reports an `Approved at:` that names no real calendar day", async () => {
    const fields = [
      "- Re-opens: DR-0001-0001",
      "- Approved by: ops-lead",
      "- Approved at: 2026-02-31T00:00:00Z",
    ];
    await withSpec({ decisions: reOpen(fields), delta }, async (root) => {
      expect(await codes(root)).toContain("QFAI-DECISION-003");
    });
  });

  it("reports a re-open that never says what changed", async () => {
    await withSpec(
      {
        decisions: reOpen(["- Re-opens: DR-0001-0001", APPROVED], { decision: null }),
        delta,
      },
      async (root) => {
        expect(await codes(root)).toContain("QFAI-DECISION-005");
      },
    );
  });

  it("accepts a re-open that names a declared prior DR and an approver", async () => {
    await withSpec(
      { decisions: reOpen(["- Re-opens: DR-0001-0001", APPROVED]), delta },
      async (root) => {
        const found = await codes(root);
        expect(found.filter((code) => code.startsWith("QFAI-DECISION-"))).toEqual([]);
      },
    );
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

  it("reports a re-open record the delta never points back at", async () => {
    // The record claims the rejection was lifted while `## Rejected` still
    // reads `DO NOT` with no `Re-opened by:` — the state the guard exists to
    // make unreachable, and the direction the first pass did not check.
    await withSpec(
      { decisions: reOpen(["- Re-opens: DR-0001-0001", APPROVED]), delta: DELTA_BASE },
      async (root) => {
        expect(await codes(root)).toContain("QFAI-DECISION-004");
      },
    );
  });

  it("accepts a `Re-opened by:` that names the re-open record", async () => {
    await withSpec(
      { decisions: reOpen(["- Re-opens: DR-0001-0001", APPROVED]), delta: deltaFor(RE_OPEN_ID) },
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

describe("QFAI-DECISION-006 matches the two candidate lists", () => {
  /** `DELTA_BASE` with `name` re-adopted under `## Adopted`. */
  function readopting(name: string, ...backRefs: string[]): string {
    return DELTA_BASE.replace(
      "## Adopted\n",
      `## Adopted\n\n- Adopted: ${name}\n- Why: the size bound landed\n`,
    ).concat(backRefs.map((id) => `\n- Re-opened by: ${id}`).join(""), "\n");
  }

  it("reports a rejected candidate re-adopted with no record at all", async () => {
    // The case the `Re-opened by:` checks cannot see: the delta writes nothing
    // for them to read, so without this the whole family stays silent.
    await withSpec({ delta: readopting("in-process cache") }, async (root) => {
      expect(await codes(root)).toContain("QFAI-DECISION-006");
    });
  });

  it("matches the names through case, backticks and trailing punctuation", async () => {
    await withSpec({ delta: readopting("`In-Process Cache`.") }, async (root) => {
      expect(await codes(root)).toContain("QFAI-DECISION-006");
    });
  });

  it("accepts the re-adoption once the candidate carries a resolvable back-reference", async () => {
    await withSpec(
      {
        decisions: reOpen(["- Re-opens: DR-0001-0001", APPROVED]),
        delta: readopting("in-process cache", RE_OPEN_ID),
      },
      async (root) => {
        const found = await codes(root);
        expect(found.filter((code) => code.startsWith("QFAI-DECISION-"))).toEqual([]);
      },
    );
  });

  it("leaves an adopted candidate that was never rejected alone", async () => {
    await withSpec({ delta: readopting("a bounded LRU") }, async (root) => {
      expect(await codes(root)).not.toContain("QFAI-DECISION-006");
    });
  });

  it("does not read the template's own `<candidate name>` placeholders as a match", async () => {
    const delta = DELTA_BASE.replace(
      "- Candidate: in-process cache",
      "- Candidate: <candidate name>",
    ).replace("## Adopted\n", "## Adopted\n\n- Adopted: <candidate name>\n");
    await withSpec({ delta }, async (root) => {
      const found = await codes(root);
      expect(found.filter((code) => code.startsWith("QFAI-DECISION-"))).toEqual([]);
    });
  });
});

describe("non-spec regions are not the delta and not the record", () => {
  it("ignores a `Re-opened by:` retired into a multi-line HTML comment", async () => {
    const delta = [DELTA_BASE, "", "<!--", `- Re-opened by: ${RE_OPEN_ID}`, "-->", ""].join("\n");
    await withSpec(
      { decisions: reOpen(["- Re-opens: DR-0001-0001", APPROVED]), delta },
      async (root) => {
        // The commented line must not stand in for the record's back-reference.
        expect(await codes(root)).toContain("QFAI-DECISION-004");
      },
    );
  });

  it("ignores a `Re-opened by:` parked in a fenced example", async () => {
    const delta = [DELTA_BASE, "", "```markdown", `- Re-opened by: ${RE_OPEN_ID}`, "```", ""].join(
      "\n",
    );
    await withSpec(
      { decisions: reOpen(["- Re-opens: DR-0001-0001", APPROVED]), delta },
      async (root) => {
        expect(await codes(root)).toContain("QFAI-DECISION-004");
      },
    );
  });

  it("ignores a Decision Record commented out as a block", () => {
    const text = [
      "## Decisions",
      "",
      "<!--",
      "### DR-0001-0002: disabled re-open",
      "",
      "- Status: re-open",
      "- Re-opens: DR-0001-0001",
      "- Approved by: ops-lead",
      "-->",
      "",
    ].join("\n");
    // A block someone disabled by wrapping it is not an approval.
    expect(collectReOpenEntries(text)).toEqual([]);
  });
});

describe("QFAI-DECISION-007 rejects a duplicated Decision Record id", () => {
  it("reports the same `DR-*` declared twice", async () => {
    const decisions = [
      reOpen(["- Re-opens: DR-0001-0001", APPROVED]),
      `### ${RE_OPEN_ID}: a second block with the same id`,
      "",
      "- Status: re-open",
      "- Decision: a different reason entirely",
      "- Re-opens: DR-0001-0001",
      APPROVED,
      "",
    ].join("\n");
    await withSpec({ decisions, delta: deltaFor(RE_OPEN_ID) }, async (root) => {
      // One back-reference would otherwise satisfy both records.
      expect(await codes(root)).toContain("QFAI-DECISION-007");
    });
  });

  it("does not report a file whose ids are unique", async () => {
    await withSpec(
      { decisions: reOpen(["- Re-opens: DR-0001-0001", APPROVED]), delta: deltaFor(RE_OPEN_ID) },
      async (root) => {
        expect(await codes(root)).not.toContain("QFAI-DECISION-007");
      },
    );
  });
});
