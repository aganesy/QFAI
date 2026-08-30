/**
 * The CLI must not pay for a DOM it is not using.
 *
 * `CR-20260823-0001`, approved 2026-08-23, **option 3 — measure the graph before splitting anything**.
 * The measurement is what decided the shape of the repair, and it decided against the other options:
 *
 * ```text
 * node baseline                          88 ms
 * require('jsdom')                      910 ms      <- 86% of the whole cost
 * require('fast-glob')                   58 ms
 * require('@cucumber/gherkin')           48 ms
 * require('yaml')                        47 ms
 * require('dist/index.cjs')            1056 ms
 * require('dist/cli/index.cjs')       ~1000 ms
 * ```
 *
 * Options 1 and 2 would have split the bundle per command. That could not have worked: the 1.04 MB
 * library entry, which carries no command implementations at all, measured the same ~1000 ms as the
 * 1.44 MB CLI entry. The cost was never breadth — it was one dependency, reached through one function.
 *
 * After moving that function behind an `import()`: **157 / 166 / 167 / 190 ms** across the four
 * entries, an 81–85% reduction.
 *
 * ## Why this test reads bytes rather than timing the load
 *
 * A timing assertion on a shared runner is a flake generator, and a threshold loose enough not to
 * flake is loose enough to miss the regression. The regression has an exact textual signature instead:
 * a static `from "jsdom"` in a shipped bundle means the dependency is loaded at module scope again.
 *
 * ## Why this lives in the integration slice
 *
 * It reads `dist/`, and only the `e2e` and `integration` matrix legs build before running. Placed in
 * `tests/scripts/` first, it failed on CI for exactly the reason its own floor exists to state: no
 * bundle on disk, so nothing was asserted. The floor did its job; the placement was wrong.
 *
 * That signature is not hypothetical. The first repair put the `import()` only at the call site, and
 * the CJS output went lazy while the **ESM output kept its static import** — esbuild is free to inline
 * an awaited import of a module it also bundles. Half the cost came back, silently, and the comment
 * saying it had not was still sitting there. The `import()` now lives inside the module that needs
 * `jsdom`, which is external in both outputs, and this test is what says so.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const PACKAGE_ROOT = path.resolve(__dirname, "../..");

/** Every shipped entry, both formats. A regression in one output only is the failure mode seen. */
const ENTRIES = [
  "dist/index.mjs",
  "dist/index.cjs",
  "dist/cli/index.mjs",
  "dist/cli/index.cjs",
] as const;

/** Loaded at module scope, in the form each output uses. */
const STATIC_JSDOM = [/\bfrom\s*["']jsdom["']/, /\brequire\(\s*["']jsdom["']\s*\)/];

describe("no shipped entry loads jsdom at module scope", () => {
  it("carries jsdom only behind a dynamic import, in every entry and both formats", async () => {
    const offenders: string[] = [];
    let mentions = 0;

    for (const entry of ENTRIES) {
      let text: string;
      try {
        text = await readFile(path.join(PACKAGE_ROOT, entry), "utf8");
      } catch {
        // A build that has not run yet is not this test's failure to report. The floor below turns
        // "no bundles on disk" into a red instead of a silent pass.
        continue;
      }
      // Non-vacuity, per entry: the dependency must still be REACHABLE from the bundle, or this test
      // would keep passing after someone deleted the feature and nothing would say the cover was lost.
      if (!text.includes("jsdom")) {
        offenders.push(
          `${entry}: does not mention jsdom at all — is the HTML-mock validator gone?`,
        );
        continue;
      }
      mentions += 1;
      for (const pattern of STATIC_JSDOM) {
        if (pattern.test(text)) {
          offenders.push(`${entry}: loads jsdom at module scope (${String(pattern)})`);
        }
      }
    }

    expect(
      mentions,
      "no shipped bundle was readable — run `pnpm -C packages/qfai build` before this suite, or this " +
        "test asserts nothing at all",
    ).toBeGreaterThan(0);

    expect(
      offenders,
      "requiring jsdom costs 910 ms measured, and every qfai command pays it when the import is " +
        "static. It must stay behind the `import()` in `core/uiux/htmlMockDom.ts`",
    ).toEqual([]);
  });
});
