/**
 * A declared slice must match test files. The runner does not distinguish an
 * absent project from one with an empty include glob by exit status, so this
 * test checks the workspace declaration and every include glob directly.
 * Cross-surface alignment is covered by the integration acceptance suite.
 */

import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { GLOB_SHAPE, declaredIncludeGlobs, testFileCount } from "../helpers/runnerProjects.js";
import { PACKAGE_ROOT, runnerProjects } from "../helpers/spec0017WorkflowSurfaces.js";

/**
 * The project name that stopped being declared, kept as a literal.
 *
 * A literal and not a derivation: the whole point of `TC-0017-0063` is that this
 * particular name stopped being declared, and a name read out of the file it was
 * removed from would make the assertion vacuous.
 */
const DELETED_PROJECT = "compatibility";

describe("TC-0017-0063 (TDD-0063): no declared slice can match zero test files", () => {
  // QFAI:EX-0002-0019-09
  it("has dropped the zero-file project and leaves no include glob without files", () => {
    // CLAIM 1 — the deleted name is gone from the declaration. This, and not the
    // runner's exit status, is what the deletion actually changed.
    expect
      .soft(runnerProjects(), `${DELETED_PROJECT} must not be declared in the runner workspace`)
      .not.toContain(DELETED_PROJECT);

    // CLAIM 2 — and the directory it included is gone too.
    //
    // The history, because a wrong version of this comment stood here first: that
    // directory DID exist and held four tests. `c47d3db5` removed all four when the
    // canonical contracts replaced the compatibility surfaces. The tests were not
    // lost by accident and should not be restored — the defect is that the project
    // DECLARATION outlived them by months, advertising a slice that could not fail.
    expect
      .soft(
        existsSync(path.join(PACKAGE_ROOT, "tests", DELETED_PROJECT)),
        `tests/${DELETED_PROJECT}/ was emptied deliberately — the declaration is what outlived it`,
      )
      .toBe(false);

    const declared = declaredIncludeGlobs();
    expect(declared.length, "the workspace must declare include globs").toBeGreaterThan(0);

    // CLAIM 3 — every glob has the shape CLAIM 4's counting method assumes.
    // Asserted before CLAIM 4 uses it, so a glob that cannot be counted is
    // reported as an unsupported shape rather than as an empty directory.
    const misshapen = declared.filter((d) => !GLOB_SHAPE.test(d.glob));
    expect
      .soft(
        misshapen.map((d) => `${d.project}: ${d.glob}`),
        "every include glob must be countable by walking its literal directory prefix",
      )
      .toEqual([]);

    // CLAIM 4 — and every glob has at least one test file behind it. Per glob and
    // not per project: `integration` declares five, and four populated globs would
    // have hidden the fifth.
    const empty = declared
      .filter((d) => GLOB_SHAPE.test(d.glob))
      .filter((d) => testFileCount(d.glob) === 0)
      .map((d) => `${d.project}: ${d.glob}`);
    expect
      .soft(empty, "an include glob with no test files advertises coverage that cannot exist")
      .toEqual([]);
  });
});
