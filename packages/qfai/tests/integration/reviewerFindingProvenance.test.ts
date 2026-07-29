/**
 * Reviewer-finding provenance contract, as shipped by `qfai init`.
 *
 * The rules live only in prose, so these cases pin the three properties a
 * reviewer's behaviour actually hinges on:
 *   - a demonstrable defect stays blocking without an `AC-*`;
 *   - an advisory that changes an approved obligation does not get a free
 *     pass to `done`;
 *   - the reviewer never writes upstream SSOT itself.
 * Plus: every cross-document anchor these rules use resolves to a real
 * heading (asserted by slug, not by prose).
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getInitAssetsDir } from "../../src/shared/assets.js";

const assistantDir = path.join(getInitAssetsDir(), ".qfai", "assistant");
const DRIFT_PROTOCOL = path.join(assistantDir, "constitution", "drift-protocol.md");
const DELEGATION_BASELINE = path.join(
  assistantDir,
  "constitution",
  "shared-skill-delegation-baseline.md",
);
const IMPLEMENT_SKILL = path.join(assistantDir, "skills", "qfai-implement", "SKILL.md");
const REVIEWER_AGENTS = [
  path.join(assistantDir, "agents", "completion-reviewer.md"),
  path.join(assistantDir, "agents", "implementation-reviewer.md"),
];

const DEFECT_CLASSES = ["defect:correctness", "defect:security", "defect:code-quality"] as const;

/** GitHub heading slug: lowercase, drop punctuation, spaces to hyphens. */
function slugify(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function headingSlugs(markdown: string): Set<string> {
  return new Set(
    Array.from(markdown.matchAll(/^#{1,6}\s+(.+?)\s*$/gm), (m) => slugify(m[1] ?? "")),
  );
}

describe("reviewer finding provenance", () => {
  it("keeps a demonstrable defect blocking without requiring an upstream ID", async () => {
    // Without a defect class, an implementation-reviewer that finds an
    // unhandled rejection or a missing input validation has no ID to cite,
    // the finding degrades to advisory, and the defect can ship as `done`.
    const [drift, baseline] = await Promise.all([
      readFile(DRIFT_PROTOCOL, "utf-8"),
      readFile(DELEGATION_BASELINE, "utf-8"),
    ]);
    for (const cls of DEFECT_CLASSES) {
      expect(drift).toContain(cls);
      expect(baseline).toContain(cls);
    }
    expect(drift).toMatch(/demonstrable from the changed artifacts/i);
  });

  it("does not let an advisory that changes an approved obligation reach done", async () => {
    const drift = await readFile(DRIFT_PROTOCOL, "utf-8");
    // The free-to-continue clause must be conditional, not unconditional.
    expect(drift).toMatch(
      /changes an already-approved obligation[\s\S]{0,400}when-drift-is-detected/,
    );
    expect(drift).toMatch(
      /no `done` for items that\s*\n?\s*depend on the obligation under dispute/,
    );
  });

  it("routes the Open-questions write to the owner phase, not the reviewer", async () => {
    const [drift, skill] = await Promise.all([
      readFile(DRIFT_PROTOCOL, "utf-8"),
      readFile(IMPLEMENT_SKILL, "utf-8"),
    ]);
    // `08_Open-questions.md` is upstream SSOT; a downstream skill with
    // Write/Edit must be told not to touch it.
    expect(drift).toMatch(/does \*\*not\*\* write it into\s*\n?\s*`08_Open-questions\.md`/);
    expect(skill).toMatch(/Do \*\*not\*\* edit `08_Open-questions\.md`/);
    expect(skill).toMatch(/owner phase \(`\/qfai-sdd`\) records and adjudicates/);
  });

  it("keeps the reviewer agent cards aligned with the defect exemption", async () => {
    for (const file of REVIEWER_AGENTS) {
      const card = await readFile(file, "utf-8");
      expect(card).toMatch(/it stays blocking and traces to its `defect:\*` class/);
    }
  });

  it("links only to anchors that exist in the target document", async () => {
    const [drift, baseline, skill] = await Promise.all([
      readFile(DRIFT_PROTOCOL, "utf-8"),
      readFile(DELEGATION_BASELINE, "utf-8"),
      readFile(IMPLEMENT_SKILL, "utf-8"),
    ]);
    const slugsByDoc = new Map<string, Set<string>>([
      ["drift-protocol.md", headingSlugs(drift)],
      ["shared-skill-delegation-baseline.md", headingSlugs(baseline)],
    ]);
    const sources = [
      drift,
      baseline,
      skill,
      ...(await Promise.all(REVIEWER_AGENTS.map((f) => readFile(f, "utf-8")))),
    ];
    const broken: string[] = [];
    let checked = 0;
    for (const source of sources) {
      for (const match of source.matchAll(
        /(drift-protocol\.md|shared-skill-delegation-baseline\.md)#([\w-]+)/g,
      )) {
        const slugs = slugsByDoc.get(match[1] ?? "");
        const anchor = match[2] ?? "";
        if (!slugs) continue;
        checked += 1;
        if (!slugs.has(anchor)) broken.push(`${match[1]}#${anchor}`);
      }
      // Same-document `#anchor` references inside drift-protocol.
      if (source === drift) {
        for (const match of source.matchAll(/[^\w-]#([a-z][\w-]*)`/g)) {
          const anchor = match[1] ?? "";
          checked += 1;
          if (!headingSlugs(drift).has(anchor)) broken.push(`drift-protocol.md#${anchor}`);
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
    expect(broken).toEqual([]);
  });
});
