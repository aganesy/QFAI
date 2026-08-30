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

/** The same two stories written as `###`, the depth real spec packs use. */
const TWO_H3_STORIES = userStories(
  [
    "### US-0001-0001: covered by this slice",
    "",
    "- Parent: CAP-0001",
    "- Goal: something observable",
    "",
    "### US-0001-0002: outside this slice",
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
  /** Extra files, keyed by path relative to the project root; written last. */
  files?: Record<string, string>;
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
    for (const [rel, body] of Object.entries({ ...project.tests, ...project.files })) {
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

  it("defers an `###` story, the depth real spec packs write", async () => {
    await withProject(
      {
        us: TWO_H3_STORIES.replace(
          "- Goal: something not yet built",
          `- Goal: not yet\n${PLANNED}`,
        ),
        tests: { "tests/e2e/slice.test.ts": "// QFAI:SPEC-0001:US-0001-0001\n" },
      },
      async (root) => {
        const issues = await validateAtddCodeTraceability(root, defaultConfig);
        // The declaring collector accepts an id at any heading depth, so the
        // marker has to as well — recognising only `##` left every `###` story
        // unable to defer.
        expect(issues.map((entry) => entry.code)).not.toContain("QFAI-ATDD-111");
        expect(issues.find((entry) => entry.code === "QFAI-ATDD-118")?.refs).toEqual([
          "SPEC-0001:US-0001-0002",
        ]);
      },
    );
  });

  it("attributes a marker under an `###` story to it, not to the `##` story above", async () => {
    await withProject(
      {
        us: userStories(
          [
            "## US-0001-0001: an H2 story",
            "",
            "- Goal: something observable",
            "",
            "### US-0001-0002: an H3 story",
            "",
            `- Goal: not yet\n${PLANNED}`,
            "",
          ].join("\n"),
        ),
        tests: { "tests/e2e/slice.test.ts": "// QFAI:SPEC-0001:US-0001-0001\n" },
      },
      async (root) => {
        const issues = await validateAtddCodeTraceability(root, defaultConfig);
        // In a mixed document the `###` line has to close the open `##` block,
        // or the H3 story's marker silently defers the H2 story above it.
        expect(issues.find((entry) => entry.code === "QFAI-ATDD-118")?.refs).toEqual([
          "SPEC-0001:US-0001-0002",
        ]);
        expect(issues.map((entry) => entry.code)).not.toContain("QFAI-ATDD-111");
      },
    );
  });

  it("does not report a deferral for a spec that owes no E2E reference", async () => {
    await withProject(
      {
        us: TWO_H3_STORIES.replace(
          "- Goal: something not yet built",
          `- Goal: not yet\n${PLANNED}`,
        ),
        tests: { "tests/e2e/slice.test.ts": "// QFAI:SPEC-0001:US-0001-0001\n" },
        files: {
          // spec-0001 is the only UI-bearing spec, so the project has opted into
          // surface typing and spec-0002 is outside `QFAI-ATDD-111` already.
          ".qfai/specs/spec-0001/01_Spec.md": "---\nsurface_type: ui-bearing\n---\n\n# Spec\n",
          ".qfai/specs/spec-0002/01_Spec.md": "# Spec\n",
          ".qfai/specs/spec-0002/02_User-stories.md": userStories(
            ["### US-0002-0001: not user-facing", "", `- Goal: not yet\n${PLANNED}`, ""].join("\n"),
          ),
          ".qfai/specs/spec-0002/03_Acceptance-Criteria.md": "# AC\n",
          ".qfai/specs/spec-0002/06_Test-Cases.md": "# TC\n",
        },
      },
      async (root) => {
        const issues = await validateAtddCodeTraceability(root, defaultConfig);
        // Nothing was suspended for spec-0002: its stories never owed an E2E
        // reference, and its remediation would ask for the annotation-only E2E
        // the surface-scope rule exists to prevent.
        expect(issues.find((entry) => entry.code === "QFAI-ATDD-118")?.refs).toEqual([
          "SPEC-0001:US-0001-0002",
        ]);
      },
    );
  });

  it("defers a story declared only in the catalog list", async () => {
    await withProject(
      {
        us: userStories(
          [
            "## US Catalog",
            "",
            "- US-0001-0001: covered by this slice",
            "- US-0001-0002: outside this slice",
            `  ${PLANNED}`,
            "",
          ].join("\n"),
        ),
        tests: { "tests/e2e/slice.test.ts": "// QFAI:SPEC-0001:US-0001-0001\n" },
      },
      async (root) => {
        const issues = await validateAtddCodeTraceability(root, defaultConfig);
        // These ids are declared and owed exactly like heading-form ones, so
        // without a catalog-form block the story had a hard error and no exit.
        expect(issues.map((entry) => entry.code)).not.toContain("QFAI-ATDD-111");
        expect(issues.find((entry) => entry.code === "QFAI-ATDD-118")?.refs).toEqual([
          "SPEC-0001:US-0001-0002",
        ]);
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

  it("reads the marker from inside a catalog list entry", () => {
    const text = userStories(
      ["## US Catalog", "", "- US-0001: a", `  ${PLANNED}`, "- US-0002: b", ""].join("\n"),
    );
    // A pack whose stories live only in the catalog list declares them all the
    // same — `collectShortIds` reads the ids from these lines — so the marker
    // has to reach them there too, nested under the entry it defers.
    expect(Array.from(collectPlannedUsIds(text))).toEqual(["US-0001"]);
  });

  it("closes a catalog entry at its Markdown item boundary", () => {
    const text = userStories(
      [
        "## US Catalog",
        "",
        "- US-0001: a",
        "",
        "Some prose about the catalog.",
        "",
        PLANNED,
        "",
      ].join("\n"),
    );
    // A blank line and a paragraph end the list item, so a document-level marker
    // written after it is not inside US-0001 and must not defer it — otherwise a
    // stray line silently erases a `QFAI-ATDD-111` error.
    expect(collectPlannedUsIds(text).size).toBe(0);
  });

  it("does not let a sibling catalog entry carry another entry's marker", () => {
    const text = userStories(["## US Catalog", "", "- US-0001: a", PLANNED, ""].join("\n"));
    // At the same column the marker is a sibling item, not content of US-0001.
    expect(collectPlannedUsIds(text).size).toBe(0);
  });

  it("requires the marker to reach the entry's content column, not its marker column", () => {
    const text = userStories(["## US Catalog", "", "- US-0001: a", ` ${PLANNED}`, ""].join("\n"));
    // One space clears the `-` at column 0 but falls short of the two columns a
    // child of the entry needs, so Markdown reads this as a separate list item.
    // Tracking the marker column instead of the content column let it pass as
    // content of US-0001 and silently drop the `QFAI-ATDD-111` error.
    expect(collectPlannedUsIds(text).size).toBe(0);
  });

  it("keeps a child indented to the content column inside the entry", () => {
    const text = userStories(
      ["## US Catalog", "", "-   US-0001: a", `    ${PLANNED}`, ""].join("\n"),
    );
    // The over-correction pin: the content column moves with the whitespace after
    // the marker, so a legitimately nested marker still defers.
    expect(Array.from(collectPlannedUsIds(text))).toEqual(["US-0001"]);
  });

  it("counts a tab to the next Markdown tab stop when locating the content column", () => {
    const text = userStories(["## US Catalog", "", "-\tUS-0001: a", `\t${PLANNED}`, ""].join("\n"));
    // A tab after the marker advances to column 4, which is exactly where a
    // tab-indented child sits — counting it as a flat four columns past the
    // marker would have put the content column out of any child's reach.
    expect(Array.from(collectPlannedUsIds(text))).toEqual(["US-0001"]);
  });

  it("opens a catalog entry written with a `+` bullet", () => {
    const text = userStories(
      ["## US Catalog", "", "+ US-0001: a", `  ${PLANNED}`, "+ US-0002: b", ""].join("\n"),
    );
    // `collectShortIds` declares the id from this line like any other, so a
    // catalog written with `+` owed `QFAI-ATDD-111` with no way to defer.
    expect(Array.from(collectPlannedUsIds(text))).toEqual(["US-0001"]);
  });

  it("opens a catalog entry written as an ordered list item", () => {
    for (const marker of ["1.", "1)"]) {
      const text = userStories(
        ["## US Catalog", "", `${marker} US-0001: a`, `   ${PLANNED}`, ""].join("\n"),
      );
      expect(Array.from(collectPlannedUsIds(text))).toEqual(["US-0001"]);
    }
  });

  it("accepts a `+` bullet on the marker line itself", () => {
    const text = userStories(
      ["## US Catalog", "", "+ US-0001: a", "  + x-qfai-status: planned", ""].join("\n"),
    );
    // A pack that writes its lists with `+` writes its meta lines that way too.
    expect(Array.from(collectPlannedUsIds(text))).toEqual(["US-0001"]);
  });

  it("does not accept an ordered marker on the marker line", () => {
    const text = userStories(["## US-0001: a", "", "1. x-qfai-status: planned", ""].join("\n"));
    // A numbered step is not a story attribute; every shipped template writes
    // the meta lines as bullets.
    expect(collectPlannedUsIds(text).size).toBe(0);
  });

  it("rejects a meta line that is not a list item", () => {
    const text = userStories(["## US-0001: a", "", "-x-qfai-status: planned", ""].join("\n"));
    // No space after the list marker: not a Markdown list item, so a typo cannot
    // pass as a deferral.
    expect(collectPlannedUsIds(text).size).toBe(0);
  });

  it("rejects an unterminated or mismatched quote around the value", () => {
    for (const line of [
      "- x-qfai-status: 'planned",
      "- x-qfai-status: \"planned'",
      "- 'x-qfai-status: planned",
      "- \"x-qfai-status': planned",
    ]) {
      const text = userStories(["## US-0001: a", "", line, ""].join("\n"));
      expect(collectPlannedUsIds(text).size).toBe(0);
    }
  });

  it("accepts a matched pair of quotes on either half", () => {
    for (const line of [
      "- 'x-qfai-status': 'planned'",
      '- "x-qfai-status": "planned"',
      "- x-qfai-status: 'planned'",
    ]) {
      const text = userStories(["## US-0001: a", "", line, ""].join("\n"));
      expect(Array.from(collectPlannedUsIds(text))).toEqual(["US-0001"]);
    }
  });

  it("does not treat a list item merely mentioning an id as a declaration", () => {
    const text = userStories(
      ["## US-0001: a", "", "- Goal: as described in US-0002", PLANNED, ""].join("\n"),
    );
    // The id has to open the item. Otherwise prose about a sibling story would
    // capture the next marker and defer the wrong id.
    expect(Array.from(collectPlannedUsIds(text))).toEqual(["US-0001"]);
  });

  it("lets a non-story heading close the block", () => {
    const text = userStories(
      ["### US-0001: a", "", "- Goal: x", "", "#### Notes", "", PLANNED, ""].join("\n"),
    );
    // A heading at any depth ends the story block, so a marker written under a
    // trailing subsection defers nothing.
    expect(collectPlannedUsIds(text).size).toBe(0);
  });

  it("does not treat any other status value as a deferral", () => {
    const text = userStories(["## US-0001: a", "", "- x-qfai-status: shipped", ""].join("\n"));
    expect(collectPlannedUsIds(text).size).toBe(0);
  });
});
