/**
 * `QFAI-GRILL-001` — a stage whose mandatory grilling session left no trace.
 *
 * The failure it exists for leaves nothing else behind: a stage that ran its
 * session and one that skipped it produce the same pack, the same coverage, the
 * same work orders. The only difference is the record the stage was told to
 * write, so that record's absence is the finding.
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
  validateGrillingTrace,
} from "../../../../src/core/validators/grillingTrace.js";
import { removeTempTree } from "../../../helpers/tempTree.js";

// tests/unit/core/validators/<this file> -> ... -> packages/qfai
const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
);

/** The evidence template `qfai init` ships, which a spec stage copies. */
const SPEC_EVIDENCE_TEMPLATE = path.join(
  packageRoot,
  "assets/init/.qfai/assistant/skills/qfai-sdd/templates/evidence/sdd-spec.md",
);

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

/** The discussion stage's record, as its skill states the row. */
const POPULATED_DISCUSSION = [
  "# Evidence",
  "",
  "## Grilling Session",
  "",
  "| Ended | Ended at | Authoring began | Frontier | Lookups | Decisions | Escalated |",
  "| ----- | -------- | --------------- | -------- | ------- | --------- | --------- |",
  "| confirmed | 2026-01-01T09:14:00Z | 2026-01-01T09:15:20Z | empty | none in flight | 12 | 0 |",
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

  it("reports the shipped template, copied and filled in with nothing", async () => {
    // The template carries worked rows, so the state this check is for — the
    // section copied and nothing replaced — has three table rows under it. A
    // row test that counted any row would take the template for the record it
    // is a template for, which is the cheapest route to the second without the
    // first.
    await withRoot(async (root) => {
      await evidence(root, "sdd-spec-0007.md", await readFile(SPEC_EVIDENCE_TEMPLATE, "utf-8"));

      const issues = await validateGrillingTrace(root);

      expect(issues).toHaveLength(1);
      // The operator is told which of the two states they are in: a section
      // that is missing and one that is present and says nothing need
      // different edits.
      expect(issues[0]?.message).toContain("still holds the template's placeholders");
    });
  });

  it("accepts a populated section", async () => {
    await withRoot(async (root) => {
      await evidence(root, "sdd-spec-0007.md", POPULATED);

      expect(await validateGrillingTrace(root)).toEqual([]);
    });
  });

  it("reads the discussion stage's record too", async () => {
    // The discussion run opens its evidence under its own stamp before it
    // writes anything else, and writes the row at every ending it admits. So
    // an evidence file with no section is a stage that wrote no record.
    await withRoot(async (root) => {
      await evidence(root, "discussion-20260418170937652.md", POPULATED_DISCUSSION);
      await evidence(root, "discussion-20260418170937653.md", "# Evidence\n");

      const issues = await validateGrillingTrace(root);

      expect(issues).toHaveLength(1);
      expect(issues[0]?.file).toBe(".qfai/evidence/discussion-20260418170937653.md");
      expect(issues[0]?.message).toContain("## Grilling Session");
      expect(issues[0]?.message).toContain("at least one session row");
    });
  });

  it("reads only the most recent discussion run", async () => {
    // Every run opens its evidence under its own stamp and never returns to an
    // earlier one. A finding on a run that is over could not be cleared by any
    // later run, so it would stand for the life of the project — and a list
    // nobody can empty is the list people stop reading.
    await withRoot(async (root) => {
      for (const stamp of ["20260330153902875", "20260415161758193", "20260416023323603"]) {
        await evidence(root, `discussion-${stamp}.md`, "# Evidence\n");
      }

      const issues = await validateGrillingTrace(root);

      expect(issues).toHaveLength(1);
      expect(issues[0]?.file).toBe(".qfai/evidence/discussion-20260416023323603.md");
    });
  });

  it("says nothing when the most recent discussion run carries its record", async () => {
    await withRoot(async (root) => {
      await evidence(root, "discussion-20260330153902875.md", "# Evidence\n");
      await evidence(root, "discussion-20260416023323603.md", POPULATED_DISCUSSION);

      expect(await validateGrillingTrace(root)).toEqual([]);
    });
  });

  it("leaves a discussion run alone under a scoped run", async () => {
    // A discussion pack names no spec, so a `--spec` run cannot place it. The
    // spec rows already skip a sibling the run was told not to look at, and
    // this is the same operator in the same position.
    await withRoot(async (root) => {
      await evidence(root, "discussion-20260418170937652.md", "# Evidence\n");
      await evidence(root, "sdd-spec-0007.md", "# Evidence\n");

      const scoped = await validateGrillingTrace(root, { specScope: new Set(["0007"]) });

      expect(scoped).toHaveLength(1);
      expect(scoped[0]?.file).toBe(".qfai/evidence/sdd-spec-0007.md");
    });
  });

  it("does not take a deeper heading for the section", async () => {
    // `## Pre-draft Grilling` is a section of the evidence. A subsection of
    // something else that happens to end in those words is not it, and reading
    // the heading as a substring accepts one.
    await withRoot(async (root) => {
      await evidence(
        root,
        "sdd-spec-0007.md",
        POPULATED.replace("## Pre-draft Grilling", "### Pre-draft Grilling"),
      );

      expect(await validateGrillingTrace(root)).toHaveLength(1);
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

  it("ignores a directory named like the evidence file", async () => {
    // `readdir` returns both kinds, and reading a directory throws EISDIR
    // rather than reporting anything useful.
    await withRoot(async (root) => {
      await mkdir(path.join(root, ".qfai", "evidence", "sdd-spec-0007.md"), { recursive: true });

      expect(await validateGrillingTrace(root)).toEqual([]);
    });
  });
});
