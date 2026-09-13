/**
 * `QFAI-GRILL-001` — a spec stage whose mandatory grilling session left no trace.
 *
 * The failure it exists for leaves nothing else behind: a stage that ran its
 * session and one that skipped it produce the same spec pack, the same
 * coverage, the same work orders. The only difference is the record the stage
 * was told to write, so that record's absence is the finding.
 *
 * The quiet side is pinned as heavily as the loud one. A warning that fires
 * where nothing is owed is one people learn to scroll past, and then the one
 * that matters goes with it.
 */

import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  GRILLING_TRACE_CODE,
  TEMPLATE_PLACEHOLDERS,
  validateDiscussionGrillingTrace,
  validateGrillingTrace,
} from "../../../../src/core/validators/grillingTrace.js";
import { removeTempTree } from "../../../helpers/tempTree.js";

/** The spec stage's evidence template, as `qfai init` ships it. */
const SPEC_EVIDENCE_TEMPLATE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../assets/init/.qfai/assistant/skills/qfai-sdd/templates/evidence/sdd-spec.md",
);

/** The discussion stage's session row, which is what a run that grilled writes. */
const DISCUSSION_POPULATED = [
  "# Evidence",
  "",
  "## Grilling Session",
  "",
  "| Ended | Ended at | Authoring began | Frontier | Lookups | Decisions | Escalated |",
  "| ----- | -------- | --------------- | -------- | ------- | --------- | --------- |",
  "| confirmed | 2026-01-01T09:14:00Z | 2026-01-01T09:15:20Z | empty | none in flight | 12 | 0 |",
  "",
].join("\n");

/** The table `POPULATED` carries, without the heading above it. */
const PHASE_TABLE = [
  "| Phase | Session | Ended at | Wrote at | Frontier | Evidence |",
  "| ----- | ------- | -------- | -------- | -------- | -------- |",
  "| 0 | run | 2026-01-01T00:00:00Z | 2026-01-01T00:01:00Z | 4 settled, 0 escalated | #work-orders-summary |",
].join("\n");

/** A section with one phase row, which is what a run that grilled writes. */
const POPULATED = [
  "# Evidence",
  "",
  "## Pre-draft Grilling",
  "",
  "| Phase | Session | Ended at | Wrote at | Frontier | Evidence |",
  "| ----- | ------- | -------- | -------- | -------- | -------- |",
  "| 0 | run | 2026-01-01T00:00:00Z | 2026-01-01T00:01:00Z | 4 settled, 0 escalated | #work-orders-summary |",
  "",
].join("\n");

async function withRoot(body: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-grilling-trace-"));
  try {
    await body(root);
  } finally {
    await removeTempTree(root);
  }
}

/** `.qfai/evidence/<name>` with `body`. */
async function evidence(root: string, name: string, body: string): Promise<void> {
  const dir = path.join(root, ".qfai", "evidence");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), body, "utf-8");
}

describe("validateGrillingTrace", () => {
  it("reports spec evidence with no session section", async () => {
    await withRoot(async (root) => {
      await evidence(root, "sdd-spec-0007.md", "# Evidence\n\n## Work Orders Summary\n");

      const issues = await validateGrillingTrace(root);

      expect(issues).toHaveLength(1);
      expect(issues[0]?.code).toBe(GRILLING_TRACE_CODE);
      // The finding names the spec, not a generic message: an operator with
      // three of them needs to know which one.
      expect(issues[0]?.message).toContain("spec-0007");
      expect(issues[0]?.message).toContain("## Pre-draft Grilling");
    });
  });

  it("reports a section that carries no row", async () => {
    // A heading with nothing under it satisfies a presence check and tells a
    // reader nothing — which is the state an agent reaches by copying the
    // template and filling none of it in.
    await withRoot(async (root) => {
      await evidence(
        root,
        "sdd-spec-0007.md",
        "# Evidence\n\n## Pre-draft Grilling\n\n| Phase | Session |\n| ----- | ------- |\n",
      );

      const issues = await validateGrillingTrace(root);

      expect(issues).toHaveLength(1);
      expect(issues[0]?.message).toContain("at least one phase row");
    });
  });

  it("reports the template copied with nothing replaced", async () => {
    // The shipped template's worked rows are table rows, so a check that only
    // skipped the header and the separator counted a copy nobody filled in.
    await withRoot(async (root) => {
      const template = await readFile(SPEC_EVIDENCE_TEMPLATE, "utf-8");
      await evidence(root, "sdd-spec-0007.md", template);

      const issues = await validateGrillingTrace(root);

      expect(issues).toHaveLength(1);
      expect(issues[0]?.file).toBe(".qfai/evidence/sdd-spec-0007.md");
    });
  });

  it("accepts the template once one row is filled in", async () => {
    await withRoot(async (root) => {
      const template = await readFile(SPEC_EVIDENCE_TEMPLATE, "utf-8");
      const filled = template.replace(
        "| 0     | run       | <ISO8601> | <ISO8601> | <n> settled, 0 escalated   | #work-orders-summary |",
        "| 0     | run       | 2026-01-01T00:00:00Z | 2026-01-01T00:01:00Z | 4 settled, 0 escalated | #work-orders-summary |",
      );
      expect(filled, "the template's Phase 0 row changed shape").not.toBe(template);
      await evidence(root, "sdd-spec-0007.md", filled);

      expect(await validateGrillingTrace(root)).toEqual([]);
    });
  });

  it.each([
    ["a level-three heading", `# Evidence\n\n### Pre-draft Grilling\n\n${PHASE_TABLE}\n`],
    [
      "a mention in prose",
      `# Evidence\n\nRecorded under \`## Pre-draft Grilling\` below.\n\n${PHASE_TABLE}\n`,
    ],
    [
      "a fenced example",
      `# Evidence\n\n\`\`\`markdown\n## Pre-draft Grilling\n\n${PHASE_TABLE}\n\`\`\`\n`,
    ],
  ])("does not take %s for the section", async (_form, body) => {
    await withRoot(async (root) => {
      await evidence(root, "sdd-spec-0007.md", body);

      expect(await validateGrillingTrace(root)).toHaveLength(1);
    });
  });

  it("reads no row from a table header left without its separator", async () => {
    // Without the separator the lines are not a table, so the header is not a
    // phase row somebody wrote.
    await withRoot(async (root) => {
      const header = PHASE_TABLE.split("\n")[0] ?? "";
      await evidence(
        root,
        "sdd-spec-0007.md",
        `# Evidence\n\n## Pre-draft Grilling\n\n${header}\n`,
      );

      expect(await validateGrillingTrace(root)).toHaveLength(1);
    });
  });

  it("counts a filled row carrying angle-bracket Markdown", async () => {
    await withRoot(async (root) => {
      const row =
        "| 0 | run | 2026-01-01T00:00:00Z | 2026-01-01T00:01:00Z | 4 settled,<br>0 escalated | <https://example.com/review> |";
      const table = PHASE_TABLE.split("\n").slice(0, 2).concat(row).join("\n");
      await evidence(root, "sdd-spec-0007.md", `# Evidence\n\n## Pre-draft Grilling\n\n${table}\n`);

      expect(await validateGrillingTrace(root)).toEqual([]);
    });
  });

  it("knows every placeholder the shipped template leaves in its rows", async () => {
    // A placeholder the list does not name would let a copied row pass as one
    // somebody wrote.
    const template = await readFile(SPEC_EVIDENCE_TEMPLATE, "utf-8");
    const after = template.split("\n## Pre-draft Grilling\n")[1] ?? "";
    const rows = (after.split("\n## ")[0] ?? "")
      .split("\n")
      .filter((line) => /^\| [^-]/.test(line));
    const tokens = rows.flatMap((line) => line.match(/<[^<>|]+>/g) ?? []);

    expect(tokens.length, "the template's rows carry no placeholder").toBeGreaterThan(0);
    for (const token of tokens) {
      expect(TEMPLATE_PLACEHOLDERS).toContain(token);
    }
  });

  it("accepts a populated section", async () => {
    await withRoot(async (root) => {
      await evidence(root, "sdd-spec-0007.md", POPULATED);

      expect(await validateGrillingTrace(root)).toEqual([]);
    });
  });

  it("warns rather than failing", async () => {
    // It reads a record the agent wrote about its own run, so it establishes
    // that the record exists and not that a session happened. An error would
    // claim the second.
    await withRoot(async (root) => {
      await evidence(root, "sdd-spec-0007.md", "# Evidence\n");

      expect((await validateGrillingTrace(root))[0]?.severity).toBe("warning");
    });
  });

  it("respects a scoped run", async () => {
    // A `--spec` run is gating on its own spec. A finding about a sibling it
    // was told not to look at is one the operator cannot act on from there.
    await withRoot(async (root) => {
      await evidence(root, "sdd-spec-0007.md", "# Evidence\n");
      await evidence(root, "sdd-spec-0008.md", "# Evidence\n");

      const scoped = await validateGrillingTrace(root, { specScope: new Set(["0007"]) });

      expect(scoped).toHaveLength(1);
      expect(scoped[0]?.message).toContain("spec-0007");
      // Unscoped, both are reported.
      expect(await validateGrillingTrace(root)).toHaveLength(2);
    });
  });

  it("reports in a stable order", async () => {
    // `readdir` promises none, and a findings list that reshuffles between two
    // runs over one tree reads as churn in a diff.
    await withRoot(async (root) => {
      for (const id of ["0009", "0007", "0008"]) {
        await evidence(root, `sdd-spec-${id}.md`, "# Evidence\n");
      }

      const files = (await validateGrillingTrace(root)).map((finding) => finding.file);

      expect(files).toEqual([
        ".qfai/evidence/sdd-spec-0007.md",
        ".qfai/evidence/sdd-spec-0008.md",
        ".qfai/evidence/sdd-spec-0009.md",
      ]);
    });
  });

  it("says nothing about a project with no evidence tree", async () => {
    await withRoot(async (root) => {
      expect(await validateGrillingTrace(root)).toEqual([]);
    });
  });

  it("ignores evidence another stage wrote", async () => {
    // `implement-*` and `atdd-*` are not a spec stage's, and a finding on one
    // is a finding nobody can act on.
    await withRoot(async (root) => {
      await evidence(root, "implement-spec-0007.md", "# Evidence\n");
      await evidence(root, "atdd-spec-0007.md", "# Evidence\n");

      expect(await validateGrillingTrace(root)).toEqual([]);
    });
  });

  it("ignores a name that is not the canonical one", async () => {
    // The contract is on `sdd-spec-NNNN.md`. A file a project called
    // `sdd-notes.md` never entered it.
    await withRoot(async (root) => {
      await evidence(root, "sdd-notes.md", "# Notes\n");
      await evidence(root, "sdd-spec-7.md", "# Evidence\n");

      expect(await validateGrillingTrace(root)).toEqual([]);
    });
  });

  it("ignores discussion evidence, which the discussion check reads", async () => {
    await withRoot(async (root) => {
      await evidence(root, "discussion-20260101000000000.md", "# Evidence\n");

      expect(await validateGrillingTrace(root)).toEqual([]);
    });
  });

  it("ignores a directory named like the evidence file", async () => {
    // `readdir` returns both kinds, and reading a directory throws EISDIR
    // rather than reporting anything useful.
    await withRoot(async (root) => {
      await mkdir(path.join(root, ".qfai", "evidence", "sdd-spec-0007.md"), { recursive: true });

      expect(await validateGrillingTrace(root)).toEqual([]);
    });
  });
});

describe("validateDiscussionGrillingTrace", () => {
  it("reports the latest discussion run with no session section", async () => {
    // The stage opens its evidence before writing anything else and records the
    // session at every ending it admits, so no section is a run that wrote no
    // record.
    await withRoot(async (root) => {
      await evidence(
        root,
        "discussion-20260101000000000.md",
        "# Evidence\n\n## Research Summary\n",
      );

      const issues = await validateDiscussionGrillingTrace(root);

      expect(issues).toHaveLength(1);
      expect(issues[0]?.code).toBe(GRILLING_TRACE_CODE);
      expect(issues[0]?.severity).toBe("warning");
      expect(issues[0]?.file).toBe(".qfai/evidence/discussion-20260101000000000.md");
      expect(issues[0]?.message).toContain("## Grilling Session");
    });
  });

  it("accepts a populated session row", async () => {
    await withRoot(async (root) => {
      await evidence(root, "discussion-20260101000000000.md", DISCUSSION_POPULATED);

      expect(await validateDiscussionGrillingTrace(root)).toEqual([]);
    });
  });

  it("reads the latest run only", async () => {
    // An earlier run is history, and a record written for it now would be a
    // claim rather than a record.
    await withRoot(async (root) => {
      await evidence(root, "discussion-20250101000000000.md", "# Evidence\n");
      await evidence(root, "discussion-20260101000000000.md", DISCUSSION_POPULATED);

      expect(await validateDiscussionGrillingTrace(root)).toEqual([]);

      await evidence(root, "discussion-20270101000000000.md", "# Evidence\n");

      const issues = await validateDiscussionGrillingTrace(root);
      expect(issues.map((finding) => finding.file)).toEqual([
        ".qfai/evidence/discussion-20270101000000000.md",
      ]);
    });
  });

  it("does not take a level-three heading for the section", async () => {
    await withRoot(async (root) => {
      await evidence(
        root,
        "discussion-20260101000000000.md",
        DISCUSSION_POPULATED.replace("## Grilling Session", "### Grilling Session"),
      );

      expect(await validateDiscussionGrillingTrace(root)).toHaveLength(1);
    });
  });

  it("says nothing in a scoped run", async () => {
    // Discussion evidence belongs to no spec, so a `--spec` run could not act on
    // the finding.
    await withRoot(async (root) => {
      await evidence(root, "discussion-20260101000000000.md", "# Evidence\n");

      expect(await validateDiscussionGrillingTrace(root, { specScope: new Set(["0007"]) })).toEqual(
        [],
      );
    });
  });

  it("says nothing without discussion evidence", async () => {
    await withRoot(async (root) => {
      await evidence(root, "sdd-spec-0007.md", "# Evidence\n");
      await evidence(root, "discussion-notes.md", "# Notes\n");

      expect(await validateDiscussionGrillingTrace(root)).toEqual([]);
    });
  });
});
