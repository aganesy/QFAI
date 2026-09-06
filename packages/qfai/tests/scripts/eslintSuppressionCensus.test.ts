/**
 * The ESLint suppressions the source tree carries, pinned as a set.
 *
 * `.instruction/00_universal/quality.md`, which `AGENTS.md` names as a universal rule, forbids
 * adding an `eslint-disable*` directive without the user's explicit permission. Review finding
 * [133] found this change had done exactly that: a `no-control-regex` suppression in
 * `reviewerJustification.ts`, added so a control-character pattern would lint. It is gone — the
 * check reads code points instead, which needs no suppression — and this census is what makes the
 * next one visible instead of quiet.
 *
 * A SET rather than a count. A count lets an addition and a removal cancel out, and this
 * repository has already been bitten by that once, in the pinned-bytes comparison.
 *
 * Twenty-four of these predate this change and are not endorsed by being listed. The list says
 * what is there, so that adding to it is an edit a reviewer approves; removing one needs no
 * permission at all and only makes this row happier.
 *
 * This change adds none. It once carried two, for the `config.ts` compat shims that keep the
 * deprecated `testStrategy` knobs parsed until the next major: `normalizeValidation` read those
 * knobs back off `defaultConfig`, and reading a property this same change marks `@deprecated` is
 * what `@typescript-eslint/no-deprecated` fires on. Both are gone. The fallback was never a
 * behavioural choice — `base` in that function IS `defaultConfig.validation`, so the value read
 * back was always the one literal `false` written a few lines up — so naming that constant once
 * (`DEPRECATED_TEST_STRATEGY_FLAG_DEFAULT`) lets the loader state the fallback instead of
 * re-entering the deprecated property, and removes the need for permission rather than seeking it.
 * The remaining `config.ts` entry is the older `promptsDir` shim, which predates this change.
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
 * word — this file's own docblock, or the comment in `reviewerJustification.ts` explaining why the
 * suppression was removed — is not a directive and must not be counted as one, or the census
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

/** The census, as measured on the commit that removed review finding [133]'s suppression. */
const PINNED: readonly string[] = [
  // `paths.promptsDir`, which predates this change. The two
  // `validation.testStrategy` compat shims no longer need one.
  "packages/qfai/src/core/config.ts :: @typescript-eslint/no-deprecated",
  "packages/qfai/src/core/critique/adapter.ts :: no-console",
  "packages/qfai/src/core/critique/adapter.ts :: no-console",
  "packages/qfai/src/core/critique/genericCommandProvider.ts :: no-control-regex",
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
  "packages/qfai/src/core/doctor.ts :: @typescript-eslint/no-deprecated",
  "packages/qfai/src/core/handoff/reader.ts :: no-console",
  "packages/qfai/src/core/handoff/reader.ts :: no-console",
  "packages/qfai/src/core/handoff/reader.ts :: no-console",
  "packages/qfai/src/core/handoff/reader.ts :: no-console",
  "packages/qfai/src/core/observability/writer.ts :: no-console",
  "packages/qfai/src/core/prototyping/playwrightCliLauncher.ts :: @typescript-eslint/no-deprecated",
  "packages/qfai/src/core/report.ts :: @typescript-eslint/no-unnecessary-condition",
  "packages/qfai/src/core/uiux/renderEvidence.ts :: @typescript-eslint/no-unnecessary-condition",
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

  it("carries no suppression in `reviewerJustification.ts`, which is where [133] found one", () => {
    // Named separately from the census because it is the case the finding was about: a control
    // character check written as a regular expression needed `no-control-regex`, and reading code
    // points needs nothing.
    const source = readFileSync(
      path.join(REPO_ROOT, "packages/qfai/src/core/validators/reviewerJustification.ts"),
      "utf-8",
    );
    const directives = source
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^\/[/*]+\s*eslint-disable/.test(line));
    expect(directives, "the control-character check must need no suppression").toEqual([]);
    expect(source, "and it must still refuse a control character, by scanning code points").toMatch(
      /codePointAt/,
    );
  });
});
