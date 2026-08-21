/**
 * `US-*` had no per-story deferral, while both contract kinds did.
 *
 * `CON-API-*` (`QFAI-ATDD-114`) and `CON-DB-*` (`QFAI-ATDD-116`) each defer a
 * single obligation outside the current slice with `x-qfai-status: planned`,
 * reported at `info`. A `US-*` whose acceptance cannot be observed at E2E in
 * this slice had none of that: its only exits were leaving the story uncovered
 * (a hard `QFAI-ATDD-111` error), writing a test that asserts nothing, or
 * declaring the whole spec non-user-facing — which erases the obligation for
 * every other story in it rather than deferring this one.
 *
 * These tests pin the missing symmetry: the marker on a story block defers that
 * story and only that story, stays visible as `QFAI-ATDD-118` (`info`), and does
 * not un-declare the id.
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { collectPlannedUsIds } from "../../src/core/atddTraceability.js";
import { validateAtddCodeTraceability } from "../../src/core/validators/atddCodeTraceability.js";

const PLANNED = "- x-qfai-status: planned";

function userStories(body: string): string {
  return `# 02 User Stories\n\n${body}`;
}

const TWO_STORIES = userStories(
  [
    "## US-0001-0001: covered by this slice",
    "",
    "- Parent: CAP-0001",
    "- Goal: something observable",
    "",
    "## US-0001-0002: outside this slice",
    "",
    "- Parent: CAP-0001",
    "- Goal: something not yet built",
    "",
  ].join("\n"),
);

type Project = {
  /** Body of `02_User-stories.md`. */
  us: string;
  /** Test files, keyed by path relative to the project root. */
  tests?: Record<string, string>;
};

async function withProject<T>(project: Project, fn: (root: string) => Promise<T>): Promise<T> {
  const root = path.join(
    os.tmpdir(),
    `qfai-us-planned-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const specDir = path.join(root, ".qfai", "specs", "spec-0001");
  await mkdir(specDir, { recursive: true });
  try {
    for (const [name, body] of [
      ["01_Spec.md", "# Spec\n"],
      ["02_User-stories.md", project.us],
      ["03_Acceptance-Criteria.md", "# AC\n"],
      ["06_Test-Cases.md", "# TC\n"],
    ] as const) {
      await writeFile(path.join(specDir, name), body, "utf-8");
    }
    for (const [rel, body] of Object.entries(project.tests ?? {})) {
      const file = path.join(root, rel);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, body, "utf-8");
    }
    return await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("QFAI-ATDD-118 — US deferral by `- x-qfai-status: planned`", () => {
  it("errors on an unreferenced US when no marker is present", async () => {
    await withProject({ us: TWO_STORIES }, async (root) => {
      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      const missing = issues.find((entry) => entry.code === "QFAI-ATDD-111");
      expect(missing?.severity).toBe("error");
      expect(missing?.refs).toEqual(["SPEC-0001:US-0001-0001", "SPEC-0001:US-0001-0002"]);
      expect(issues.map((entry) => entry.code)).not.toContain("QFAI-ATDD-118");
    });
  });

  it("defers only the marked story, and reports it at info", async () => {
    await withProject(
      {
        us: TWO_STORIES.replace("- Goal: something not yet built", `- Goal: not yet\n${PLANNED}`),
        tests: { "tests/e2e/slice.test.ts": "// QFAI:SPEC-0001:US-0001-0001\n" },
      },
      async (root) => {
        const issues = await validateAtddCodeTraceability(root, defaultConfig);
        // The covered story discharges its obligation, the deferred one is out
        // of the gate: nothing is left for `QFAI-ATDD-111` to report.
        expect(issues.map((entry) => entry.code)).not.toContain("QFAI-ATDD-111");
        const deferred = issues.find((entry) => entry.code === "QFAI-ATDD-118");
        expect(deferred?.severity).toBe("info");
        expect(deferred?.refs).toEqual(["SPEC-0001:US-0001-0002"]);
      },
    );
  });

  it("keeps the unmarked sibling inside the obligation", async () => {
    await withProject(
      { us: TWO_STORIES.replace("- Goal: something not yet built", `- Goal: not yet\n${PLANNED}`) },
      async (root) => {
        const issues = await validateAtddCodeTraceability(root, defaultConfig);
        const missing = issues.find((entry) => entry.code === "QFAI-ATDD-111");
        // The marker is per story. Deferring the whole file from one line is the
        // nesting mistake the contract-side marker is document-root-only to avoid.
        expect(missing?.refs).toEqual(["SPEC-0001:US-0001-0001"]);
      },
    );
  });

  it("does not un-declare the deferred id", async () => {
    await withProject(
      {
        us: TWO_STORIES.replace("- Goal: something not yet built", `- Goal: not yet\n${PLANNED}`),
        tests: {
          "tests/e2e/slice.test.ts":
            "// QFAI:SPEC-0001:US-0001-0001\n// QFAI:SPEC-0001:US-0001-0002\n",
        },
      },
      async (root) => {
        const codes = (await validateAtddCodeTraceability(root, defaultConfig)).map(
          (entry) => entry.code,
        );
        // Writing the E2E test ahead of the slice is allowed: the deferral
        // suspends the obligation, it does not make the story unknown.
        expect(codes).not.toContain("QFAI-ATDD-101");
        expect(codes).not.toContain("QFAI-ATDD-111");
      },
    );
  });

  it("ignores a marker written outside a story block", async () => {
    await withProject(
      { us: userStories(`${PLANNED}\n\n${TWO_STORIES.split("\n\n").slice(1).join("\n\n")}`) },
      async (root) => {
        const issues = await validateAtddCodeTraceability(root, defaultConfig);
        expect(issues.map((entry) => entry.code)).not.toContain("QFAI-ATDD-118");
        expect(issues.find((entry) => entry.code === "QFAI-ATDD-111")?.refs).toEqual([
          "SPEC-0001:US-0001-0001",
          "SPEC-0001:US-0001-0002",
        ]);
      },
    );
  });
});

describe("collectPlannedUsIds", () => {
  it("reads the marker from the story block it sits in", () => {
    const text = userStories(
      ["## US-0001: a", "", PLANNED, "", "## US-0002: b", "", "- Goal: x", ""].join("\n"),
    );
    expect(Array.from(collectPlannedUsIds(text))).toEqual(["US-0001"]);
  });

  it("does not read an illustrative marker out of a fenced block", () => {
    const text = userStories(
      ["## US-0001: a", "", "```markdown", PLANNED, "```", "", "- Goal: x", ""].join("\n"),
    );
    // Fenced samples and HTML comments are not the spec — the same masking every
    // other spec-pack collector applies.
    expect(collectPlannedUsIds(text).size).toBe(0);
  });

  it("does not treat any other status value as a deferral", () => {
    const text = userStories(["## US-0001: a", "", "- x-qfai-status: shipped", ""].join("\n"));
    expect(collectPlannedUsIds(text).size).toBe(0);
  });
});
