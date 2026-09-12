/**
 * `QFAI-GRILL-001` — a stage whose mandatory grilling session left no trace.
 *
 * The failure it exists for leaves nothing else behind: a stage that ran its
 * session and one that skipped it produce the same spec pack and the same
 * discussion pack. The only difference is the record the stage was told to
 * write, so that record's absence is the finding.
 */

import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../../../src/core/config.js";
import {
  GRILLING_TRACE_CODE,
  validateGrillingTrace,
} from "../../../../src/core/validators/grillingTrace.js";
import { removeTempTree } from "../../../helpers/tempTree.js";

const config = defaultConfig;

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

/** A discussion pack directory with the file that marks it authored. */
async function pack(root: string, name: string): Promise<void> {
  const dir = path.join(root, ".qfai", "discussion", name);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "01_Context.md"), "# 01 Context\n", "utf-8");
}

describe("validateGrillingTrace", () => {
  it("reports spec evidence with no session section", async () => {
    await withRoot(async (root) => {
      await evidence(root, "sdd-spec-0007.md", "# Evidence\n\n## Work Orders Summary\n");

      const issues = await validateGrillingTrace(root, { config });

      expect(issues).toHaveLength(1);
      expect(issues[0]?.code).toBe(GRILLING_TRACE_CODE);
      // The finding names the stage's own subject, not a generic message: an
      // operator with three specs needs to know which one.
      expect(issues[0]?.message).toContain("spec-0007");
      expect(issues[0]?.message).toContain("## Pre-draft Grilling");
    });
  });

  it("accepts spec evidence that carries the section", async () => {
    await withRoot(async (root) => {
      await evidence(
        root,
        "sdd-spec-0007.md",
        "# Evidence\n\n## Pre-draft Grilling\n\n| Phase | Session |\n",
      );

      expect(await validateGrillingTrace(root, { config })).toEqual([]);
    });
  });

  it("reports a discussion pack whose evidence has no session row", async () => {
    await withRoot(async (root) => {
      await pack(root, "discussion-20260101000000000");

      const issues = await validateGrillingTrace(root, { config });

      expect(issues).toHaveLength(1);
      expect(issues[0]?.message).toContain("## Grilling Session");
      // Reported against the pack, which is what an operator opens.
      expect(issues[0]?.file).toContain("discussion-20260101000000000");
    });
  });

  it("accepts a discussion pack whose evidence carries the row", async () => {
    await withRoot(async (root) => {
      await pack(root, "discussion-20260101000000000");
      await evidence(root, "discussion-20260101000000000.md", "## Grilling Session\n\n| Ended |\n");

      expect(await validateGrillingTrace(root, { config })).toEqual([]);
    });
  });

  it("warns rather than failing", async () => {
    // It reads a record the agent wrote about its own run, so it establishes
    // that the record exists and not that a session happened. An error would
    // claim the second.
    await withRoot(async (root) => {
      await evidence(root, "sdd-spec-0007.md", "# Evidence\n");

      const issues = await validateGrillingTrace(root, { config });

      expect(issues[0]?.severity).toBe("warning");
    });
  });

  it("says nothing about a project that has run neither stage", async () => {
    // A project that has never run a grilling session gets a warn only where a
    // stage wrote evidence without one — not for the absence of the trees.
    await withRoot(async (root) => {
      expect(await validateGrillingTrace(root, { config })).toEqual([]);
    });
  });

  it("ignores an evidence file another stage wrote", async () => {
    // `implement-*` and `atdd-*` evidence is not a spec stage's, and reporting
    // a missing section on one would be a finding nobody can act on.
    await withRoot(async (root) => {
      await evidence(root, "implement-spec-0007.md", "# Evidence\n");
      await evidence(root, "atdd-spec-0007.md", "# Evidence\n");

      expect(await validateGrillingTrace(root, { config })).toEqual([]);
    });
  });

  it("ignores a discussion directory that holds no authored pack", async () => {
    // An empty directory is a run that has not reached authoring, and a
    // finding there would fire before the obligation exists.
    await withRoot(async (root) => {
      await mkdir(path.join(root, ".qfai", "discussion", "discussion-20260101000000000"), {
        recursive: true,
      });

      expect(await validateGrillingTrace(root, { config })).toEqual([]);
    });
  });

  it("reads nothing without a config", async () => {
    // Guessing the default paths would scan a tree the project may have moved,
    // and report a missing record for evidence that is somewhere else.
    await withRoot(async (root) => {
      await evidence(root, "sdd-spec-0007.md", "# Evidence\n");

      expect(await validateGrillingTrace(root)).toEqual([]);
    });
  });
});
