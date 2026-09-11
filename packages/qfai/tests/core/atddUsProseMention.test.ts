/**
 * A user story is declared by its entry, not by a sentence that names its id.
 *
 * The declared set was the union of the entries and every loose `US-NNNN` in
 * `02_User-stories.md`, so any prose naming an id declared it. The shape that
 * costs is a retired id: a deleted story keeps its number reserved, the pack
 * writes that down so nobody reuses it, and the note made the story live again —
 * `QFAI-ATDD-111` then demanded an E2E reference for something with no entry, no
 * acceptance criteria and no behaviour.
 *
 * Every way out was worse than the note: an annotation with nothing behind it,
 * the note hidden in an HTML comment where the people it warns cannot read it,
 * or the id spelled so the scan misses it.
 *
 * Both directions are pinned here. A mention declares nothing, and each of the
 * two entry shapes still declares — the regression that matters, because a pack
 * whose stories live only in a catalog list would otherwise lose the obligation
 * entirely.
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { collectDeclaredUsIds } from "../../src/core/atddTraceability.js";
import { defaultConfig } from "../../src/core/config.js";
import { validateAtddCodeTraceability } from "../../src/core/validators/atddCodeTraceability.js";

function userStories(body: string): string {
  return `# 02 User Stories\n\n${body}`;
}

async function withProject<T>(us: string, fn: (root: string) => Promise<T>): Promise<T> {
  const root = path.join(
    os.tmpdir(),
    `qfai-us-prose-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const specDir = path.join(root, ".qfai", "specs", "spec-0001");
  await mkdir(specDir, { recursive: true });
  try {
    for (const [name, body] of [
      ["01_Spec.md", "# Spec\n"],
      ["02_User-stories.md", us],
      ["03_Acceptance-Criteria.md", "# AC\n"],
      ["06_Test-Cases.md", "# TC\n"],
    ] as const) {
      await writeFile(path.join(specDir, name), body, "utf-8");
    }
    return await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const RETIRED_NOTE = userStories(
  [
    "> US-0001-0002 is retired. It was deleted, and the number must not be reused.",
    "",
    "## US-0001-0001: the one story this pack has",
    "",
    "- Parent: CAP-0001",
    "- Goal: something observable",
    "",
  ].join("\n"),
);

describe("a user story is declared by its entry", () => {
  it("does not declare an id a retirement note names", () => {
    expect([...collectDeclaredUsIds(RETIRED_NOTE)]).toEqual(["US-0001-0001"]);
  });

  it("leaves the retired id out of the coverage obligation", async () => {
    await withProject(RETIRED_NOTE, async (root) => {
      const issues = await validateAtddCodeTraceability(root, defaultConfig);
      const missing = issues.find((entry) => entry.code === "QFAI-ATDD-111");
      // The live story is still demanded. The retired one is not, so the note
      // can stay where a reader will see it.
      expect(missing?.refs).toEqual(["SPEC-0001:US-0001-0001"]);
    });
  });

  it("declares a story from a heading at any depth", () => {
    const text = userStories(
      ["## US-0001-0001: two", "", "### US-0001-0003: deeper", ""].join("\n"),
    );

    expect([...collectDeclaredUsIds(text)].sort()).toEqual(["US-0001-0001", "US-0001-0003"]);
  });

  it("declares a story from a catalog list item", () => {
    const text = userStories(
      ["## US Catalog", "", "- US-0001-0001: first", "- US-0001-0002: second", ""].join("\n"),
    );

    expect([...collectDeclaredUsIds(text)].sort()).toEqual(["US-0001-0001", "US-0001-0002"]);
  });

  it("does not declare an id that only appears inside another story's prose", () => {
    const text = userStories(
      ["## US-0001-0001: first", "", "- Goal: as described in US-0001-0009, but narrower", ""].join(
        "\n",
      ),
    );

    expect([...collectDeclaredUsIds(text)]).toEqual(["US-0001-0001"]);
  });

  it("declares nothing from a fenced sample or an HTML comment", () => {
    const text = userStories(
      [
        "```md",
        "## US-0001-0007: an example of the shape",
        "```",
        "",
        "<!-- ## US-0001-0008: parked -->",
        "",
        "## US-0001-0001: the real one",
        "",
      ].join("\n"),
    );

    expect([...collectDeclaredUsIds(text)]).toEqual(["US-0001-0001"]);
  });
});
