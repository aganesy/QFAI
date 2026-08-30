/**
 * Review finding [26]: a record holding only retired names read as a successful comparison.
 *
 * `comparedCount` is the `ok` arm's second conjunct — `doctor.ts` prints "installed shipped
 * workflow(s) match the packaged copy" when the count is positive and `modified` is empty. The
 * declined split incremented that count and moved on BEFORE asking whether the running package still
 * ships the name at all, so an entry for a workflow that has since been retired, whose installed file
 * is also gone, produced a positive count over a run in which no packaged file was ever opened.
 *
 * The two directions are one property: a name the package no longer ships is out of scope, and a name
 * it does ship is in scope whether or not its installed file is still there.
 */
// QFAI:SPEC-0006:TC-0006-0035

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { diffInstalledShippedWorkflows } from "../../src/core/doctor/workflowsIntegrity.js";
import {
  deleteShippedWorkflow,
  useAdopterTreePool,
} from "../helpers/workflowsIntegrityFixtures.js";

const pool = useAdopterTreePool();

const RECORD_REL = path.join(".qfai", "install-provenance.json");

/**
 * Rewrites the record so it holds ONE entry, for a name the running package does not ship.
 *
 * The digest and version are copied off a real entry rather than invented: a malformed entry is
 * dropped by the reader, and the row would then pass because the record was empty — which is not the
 * state being tested.
 */
async function recordOnlyRetiredEntry(dir: string, retiredName: string): Promise<void> {
  const recordPath = path.join(dir, RECORD_REL);
  const parsed: unknown = JSON.parse(await readFile(recordPath, "utf-8"));
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("the seeded tree has no readable provenance record");
  }
  const workflows: unknown = (parsed as { workflows?: unknown }).workflows;
  if (typeof workflows !== "object" || workflows === null) {
    throw new Error("the seeded record carries no workflows map");
  }
  const [donor] = Object.values(workflows as Record<string, unknown>);
  if (donor === undefined) {
    throw new Error("the seeded record carries no entry to copy a shape from");
  }
  await writeFile(
    recordPath,
    `${JSON.stringify({ ...parsed, workflows: { [retiredName]: donor } }, null, 2)}\n`,
    "utf-8",
  );
}

describe("a record holding only retired names compares nothing", { timeout: 60000 }, () => {
  it("reports a zero count rather than a successful comparison", async () => {
    const dir = await pool.seedAdopterTree();
    const retiredName = "qfai-retired-in-an-older-release.yml";
    await recordOnlyRetiredEntry(dir, retiredName);

    const diff = await diffInstalledShippedWorkflows(dir);

    // The premise, asserted rather than assumed: the entry survived the reader. Without this the
    // count below would be zero because the record was empty, which every implementation satisfies.
    const record: unknown = JSON.parse(await readFile(path.join(dir, RECORD_REL), "utf-8"));
    expect(
      Object.keys((record as { workflows: Record<string, unknown> }).workflows),
      "the fixture must leave exactly one entry, for a name the package does not ship",
    ).toEqual([retiredName]);

    expect(
      diff.comparedCount,
      "nothing packaged was opened, so nothing was compared — a positive count here makes " +
        "`doctor` print that the installed workflows match a copy it never read",
    ).toBe(0);
    expect(
      diff.declined,
      "a name the package no longer ships is out of scope, not deliberately removed",
    ).toEqual([]);
  });

  it("still counts and declines a shipped name whose installed file was removed", async () => {
    // The other direction, so the exclusion is scoped to retirement and has not swallowed the
    // declined state itself.
    const dir = await pool.seedAdopterTree();
    await deleteShippedWorkflow(dir, "qfai-validate.yml");

    const diff = await diffInstalledShippedWorkflows(dir);
    expect(diff.declined).toContain(".github/workflows/qfai-validate.yml");
    expect(
      diff.comparedCount,
      "a shipped name is in scope whether or not its installed file is still there",
    ).toBeGreaterThan(0);
  });
});
