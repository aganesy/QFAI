/**
 * The ESLint suppressions the source tree carries, pinned as a set.
 *
 * `.instruction/00_universal/quality.md`, which `AGENTS.md` names as a universal rule, forbids
 * adding an `eslint-disable*` directive without the user's explicit permission. This census makes
 * a new one visible instead of quiet.
 *
 * A SET rather than a count. A count lets an addition and a removal cancel out, and this
 * repository has already been bitten by that once, in the pinned-bytes comparison.
 *
 * Twenty-four of these predate the census and are not endorsed by being listed. The list says
 * what is there, so that adding to it is an edit a reviewer approves; removing one needs no
 * permission at all and only makes this row happier.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
);

/** The trees a suppression would have to live in to reach shipped or gating code. */
const SCANNED_ROOTS = ["packages/qfai/src", "scripts"];

/** Directory names never walked. */
const SKIP_DIRS = new Set(["node_modules", "dist", ".git"]);

/**
 * Every suppression directive, as `<path> :: <rule>`.
 *
 * A directive is a comment whose FIRST token is `eslint-disable…`. Prose that merely mentions the
 * word — this file's own docblock, for one — is not a directive and must not be counted as one, or the census
 * becomes impossible to write about.
 */
function suppressions(): string[] {
  const found: string[] = [];
  const walk = (dir: string): void => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(full);
        continue;
      }
      if (!/\.(ts|mjs|js)$/.test(entry.name)) continue;
      const rel = path.relative(REPO_ROOT, full).replace(/\\/g, "/");
      for (const raw of readFileSync(full, "utf-8").split(/\r?\n/)) {
        const line = raw.trim();
        if (!line.startsWith("//") && !line.startsWith("/*")) continue;
        const body = line.replace(/^\/[/*]+/, "").trim();
        if (!body.startsWith("eslint-disable")) continue;
        const rule = body
          .replace(/^eslint-disable[a-z-]*/, "")
          .split("--")[0]
          ?.trim();
        found.push(`${rel} :: ${rule === undefined || rule === "" ? "(whole file)" : rule}`);
      }
    }
  };
  for (const root of SCANNED_ROOTS) walk(path.join(REPO_ROOT, root));
  return found.sort();
}

/** The current census. */
const PINNED: readonly string[] = [
  "packages/qfai/src/core/design/designMd.ts :: @typescript-eslint/no-unnecessary-condition */",
  "packages/qfai/src/core/design/designMd.ts :: @typescript-eslint/no-unnecessary-condition */",
  "packages/qfai/src/core/design/designMd.ts :: @typescript-eslint/no-unnecessary-condition */",
  "packages/qfai/src/core/design/designMd.ts :: @typescript-eslint/no-unnecessary-condition */",
  "packages/qfai/src/core/design/designMd.ts :: @typescript-eslint/no-unnecessary-condition */",
  "packages/qfai/src/core/design/designMd.ts :: @typescript-eslint/no-unnecessary-condition */",
  "packages/qfai/src/core/design/designMd.ts :: @typescript-eslint/no-unnecessary-condition */",
  "packages/qfai/src/core/design/designMd.ts :: @typescript-eslint/no-unnecessary-condition */",
  "packages/qfai/src/core/design/designMd.ts :: @typescript-eslint/no-unnecessary-condition */",
  "packages/qfai/src/core/design/designMd.ts :: @typescript-eslint/no-unnecessary-condition */",
  "packages/qfai/src/core/validators/layoutAntiPatterns.ts :: @typescript-eslint/no-non-null-assertion",
];

describe("the source tree adds no ESLint suppression nobody approved", () => {
  it("carries exactly the suppressions this census pins", () => {
    expect(
      suppressions(),
      "`.instruction/00_universal/quality.md` forbids adding an `eslint-disable*` without the " +
        "user's explicit permission. An addition here is that permission being sought, in the " +
        "diff; a removal only makes this list shorter and needs no permission at all.",
    ).toEqual([...PINNED]);
  });
});
