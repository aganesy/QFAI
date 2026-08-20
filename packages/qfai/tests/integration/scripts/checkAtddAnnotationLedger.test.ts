/**
 * `scripts/check-atdd-annotation-ledger.mjs` — the guard that refuses an E2E annotation ledger
 * entry no test backs.
 *
 * The guard exists because `QFAI-ATDD-111` reads a hand-maintained markdown ledger rather than the
 * test files, so appending a line to it clears the gate whether or not a test exists. Round 1's
 * `qa-gatekeeper` measured that directly: with the ledger lines present and the E2E test file
 * DELETED, the scoped gate still reported the same `error=1` it reports with the test in place. The
 * gate cannot see the tests, so something else has to.
 *
 * The claim these tests make checkable is the process claim: "the annotation was appended after the
 * test existed". Round 1 found that claim uncheckable — it rested on a script that was not in the
 * repository, and history could not settle it either because the test and the ledger lines landed
 * in one atomic commit. The script is now here, and these are its tests.
 */
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import {
  checkLedger,
  collectTestSources,
} from "../../../../../scripts/check-atdd-annotation-ledger.mjs";

const temps: string[] = [];

async function temp(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-ledger-guard-"));
  temps.push(dir);
  return dir;
}

afterAll(async () => {
  for (const dir of temps) await rm(dir, { recursive: true, force: true });
});

describe("checkLedger", () => {
  it("accepts a claim a test carries the same annotation for", () => {
    const result = checkLedger(
      "- QFAI:SPEC-0017:US-0017-0001\n",
      new Map([["a.test.ts", "// QFAI:SPEC-0017:US-0017-0001\ndescribe('x', () => {});"]]),
    );
    expect(result.ok).toBe(true);
    expect(result.unbacked).toEqual([]);
    expect(result.checked).toBe(1);
  });

  it("rejects a claim no test carries — the false certification, in the direction that matters", () => {
    const result = checkLedger(
      "- QFAI:SPEC-0017:US-0017-0001\n- QFAI:SPEC-0017:US-0017-0002\n",
      new Map([["a.test.ts", "// QFAI:SPEC-0017:US-0017-0001\n"]]),
    );
    expect(result.ok).toBe(false);
    expect(result.unbacked).toEqual([{ annotation: "QFAI:SPEC-0017:US-0017-0002", spec: "0017" }]);
  });

  it("does NOT reject the reverse — a test annotated ahead of its ledger line is not a lie", () => {
    // A gate that has not been told yet reads the story as uncovered, which is safe. Requiring the
    // ledger to be complete would make this guard demand exactly the append it exists to police.
    const result = checkLedger(
      "- QFAI:SPEC-0017:US-0017-0001\n",
      new Map([["a.test.ts", "// QFAI:SPEC-0017:US-0017-0001\n// QFAI:SPEC-0017:US-0017-0009\n"]]),
    );
    expect(result.ok).toBe(true);
  });

  it("scopes to one spec, leaving a sibling's unbacked claims alone", () => {
    const ledger = "- QFAI:SPEC-0012:US-0012-0003\n- QFAI:SPEC-0017:US-0017-0001\n";
    const sources = new Map([["a.test.ts", "// QFAI:SPEC-0017:US-0017-0001\n"]]);
    expect(checkLedger(ledger, sources, { spec: "0017" }).ok).toBe(true);
    const wide = checkLedger(ledger, sources);
    expect(wide.ok).toBe(false);
    expect(wide.unbacked.map((entry) => entry.annotation)).toEqual(["QFAI:SPEC-0012:US-0012-0003"]);
  });

  it("finds the annotation wherever in the file it sits, and counts each claim once", () => {
    const result = checkLedger(
      "- QFAI:SPEC-0017:US-0017-0001\n- QFAI:SPEC-0017:US-0017-0001\n",
      new Map([["a.test.ts", "describe('x', () => {\n  // QFAI:SPEC-0017:US-0017-0001\n});"]]),
    );
    expect(result.ok).toBe(true);
    expect(result.checked).toBe(1);
  });

  it("treats an empty ledger and an empty source set as vacuously fine", () => {
    expect(checkLedger("", new Map()).ok).toBe(true);
    expect(checkLedger("# QFAI E2E Traceability\n", new Map()).checked).toBe(0);
  });

  it("refuses the three annotation forms that used to fail open", () => {
    // Round 2's `implementation-reviewer` measured these against the scanner's own
    // `US_TEST_ANNOTATION_RE`. All three failed OPEN before the regex was aligned.

    // A five-digit tail must not be truncated into the real claim it resembles.
    expect(
      checkLedger(
        "- QFAI:SPEC-0017:US-0017-0001\n",
        new Map([["a.test.ts", "// QFAI:SPEC-0017:US-0017-00017\n"]]),
      ).ok,
      "a typo'd annotation must not discharge the claim it does not name",
    ).toBe(false);

    // A glued prefix is not an annotation.
    expect(
      checkLedger(
        "- QFAI:SPEC-0017:US-0017-0001\n",
        new Map([["a.test.ts", "// XQFAI:SPEC-0017:US-0017-0001\n"]]),
      ).ok,
    ).toBe(false);

    // The short form the scanner accepts must be visible in both directions.
    const short = checkLedger(
      "- QFAI:SPEC-0017:US-0017\n",
      new Map([["a.test.ts", "// nothing here\n"]]),
    );
    expect(short.checked, "a short-form claim the scanner reads must be counted").toBe(1);
    expect(short.ok).toBe(false);
    expect(
      checkLedger(
        "- QFAI:SPEC-0017:US-0017\n",
        new Map([["a.test.ts", "// QFAI:SPEC-0017:US-0017\n"]]),
      ).ok,
      "and a short-form claim a test carries must count as backed",
    ).toBe(true);
  });

  it("ignores a near-miss token rather than counting it as a claim", () => {
    // `US-0017-0001` on its own is prose, not an annotation. The scanner requires the full
    // `QFAI:SPEC-NNNN:` prefix and so does this.
    const result = checkLedger("- US-0017-0001\n- see QFAI:SPEC-0017 for detail\n", new Map());
    expect(result.checked).toBe(0);
    expect(result.ok).toBe(true);
  });
});

describe("collectTestSources", () => {
  it("reads test files from a tree and skips node_modules and dot directories", async () => {
    const dir = await temp();
    await writeFile(path.join(dir, "a.test.ts"), "// QFAI:SPEC-0017:US-0017-0001\n", "utf8");
    await mkdir(path.join(dir, "nested"), { recursive: true });
    await writeFile(path.join(dir, "nested", "b.test.ts"), "// b\n", "utf8");
    await mkdir(path.join(dir, "node_modules"), { recursive: true });
    await writeFile(path.join(dir, "node_modules", "c.test.ts"), "// c\n", "utf8");
    await mkdir(path.join(dir, ".cache"), { recursive: true });
    await writeFile(path.join(dir, ".cache", "d.test.ts"), "// d\n", "utf8");
    await writeFile(path.join(dir, "notes.md"), "// QFAI:SPEC-0017:US-0017-0002\n", "utf8");

    const sources = await collectTestSources(dir);
    const names = [...sources.keys()].map((file) => path.basename(file)).sort();
    expect(names).toEqual(["a.test.ts", "b.test.ts"]);
  });

  it("returns an empty map for a tree that does not exist, rather than throwing", async () => {
    const sources = await collectTestSources(path.join(await temp(), "absent"));
    expect(sources.size).toBe(0);
  });
});

describe("the CLI entry point", () => {
  // `main()` had zero coverage: not the root resolution, not the argument parsing, not the
  // missing-ledger branch, not any exit code. Round 2 found the root was taken from `process.cwd()`
  // — the only script in `scripts/` that did — so from `packages/qfai/` the guard printed
  // "nothing to check" and exited 0. These tests spawn it, because an exit code is the whole
  // interface a `ci:lint` member has.
  const SCRIPT = path.resolve(__dirname, "../../../../../scripts/check-atdd-annotation-ledger.mjs");

  function run(args: string[], cwd: string): { status: number | null; out: string; err: string } {
    const child = spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: "utf-8" });
    if (child.error !== undefined) throw child.error;
    return { status: child.status, out: child.stdout ?? "", err: child.stderr ?? "" };
  }

  it("passes for spec-0017 from the repository root", () => {
    const root = path.resolve(__dirname, "../../../../..");
    const result = run(["--spec", "0017"], root);
    expect(result.status).toBe(0);
    expect(result.out).toMatch(/8 claim\(s\) backed by a test annotation \(spec-0017\)/);
  });

  it("gives the same answer from a subdirectory, because the root is module-relative", async () => {
    const root = path.resolve(__dirname, "../../../../..");
    const fromRoot = run(["--spec", "0017"], root);
    const fromPackage = run(["--spec", "0017"], path.join(root, "packages", "qfai"));
    expect(fromPackage.status, "the cwd must not decide whether the guard runs").toBe(
      fromRoot.status,
    );
    expect(fromPackage.out).toBe(fromRoot.out);
    expect(fromPackage.out, "and it must not be the reassuring no-ledger sentence").not.toMatch(
      /nothing to check/,
    );

    // The same from an unrelated directory entirely.
    const elsewhere = await temp();
    expect(run(["--spec", "0017"], elsewhere).status).toBe(0);
  });

  it("exits 1 repo-wide, naming unbacked claims on stderr", () => {
    const root = path.resolve(__dirname, "../../../../..");
    const result = run([], root);
    expect(result.status).toBe(1);
    expect(result.err).toMatch(/claims coverage no test carries an annotation for/);
    expect(result.err).toMatch(/QFAI:SPEC-\d{4}:US-\d{4}-\d{4}/);
    expect(result.err).toMatch(/Write the test first/);
  });

  it("rejects a malformed --spec with exit 2 rather than widening to every spec", () => {
    const root = path.resolve(__dirname, "../../../../..");
    for (const args of [["--spec"], ["--spec", "17"], ["--spec", "abcd"]]) {
      const result = run(args, root);
      expect(result.status, `--spec ${args[1] ?? "(missing)"} must not be tolerated`).toBe(2);
      expect(result.err).toMatch(/--spec needs a four-digit spec number/);
    }
  });

  it("exits 0 with an explicit message when a tree genuinely has no ledger", async () => {
    // The one legitimate exit-0-without-checking path. Distinguishable from the wrong-cwd case
    // only because the root no longer comes from the cwd: this needs a copy of the script in a
    // tree of its own.
    const dir = await temp();
    const scriptDir = path.join(dir, "scripts");
    await mkdir(scriptDir, { recursive: true });
    const { copyFile } = await import("node:fs/promises");
    await copyFile(SCRIPT, path.join(scriptDir, "guard.mjs"));
    const child = spawnSync(process.execPath, [path.join(scriptDir, "guard.mjs")], {
      cwd: dir,
      encoding: "utf-8",
    });
    expect(child.status).toBe(0);
    expect(child.stdout ?? "").toMatch(/no ledger at tests\/e2e — nothing to check/);
  });
});

describe("the guard against this repository's own ledger", () => {
  it("passes for spec-0017, whose annotations were appended after the test existed", async () => {
    const root = path.resolve(__dirname, "../../../../..");
    const { readFile } = await import("node:fs/promises");
    const ledger = await readFile(path.join(root, "tests", "e2e", "qfai-traceability.md"), "utf8");
    const sources = new Map<string, string>();
    for (const dir of [
      path.join(root, "tests", "e2e"),
      path.join(root, "packages", "qfai", "tests", "e2e"),
    ]) {
      for (const [file, text] of await collectTestSources(dir)) sources.set(file, text);
    }

    const scoped = checkLedger(ledger, sources, { spec: "0017" });
    expect(scoped.unbacked, "every spec-0017 ledger claim must name a test that exists").toEqual(
      [],
    );
    expect(scoped.checked, "spec-0017 claims eight stories after US-0017-0007 was withdrawn").toBe(
      8,
    );

    // Repo-wide the guard does NOT pass, and that is the finding rather than a defect in the guard:
    // 127 of 208 claims are backed by no annotation in any E2E test file. `CR-20260820-0011`.
    //
    // This is a RATCHET, and the shape matters. The first version asserted
    // `unbacked.length > 100`, which round 2's `qa-gatekeeper` broke from both sides: appending 60
    // more unbacked claims (127 -> 187) reddened NOTHING, while backfilling 27 of the 127 with real
    // annotations — exactly what `CR-20260820-0011` Option 1 prescribes — made it FAIL. A test that
    // is blind to unlimited regression and fires on the 27th story fixed is a test that punishes its
    // own fix, which is the shape this spec rejected in writing twice, in this very file's header.
    //
    // `toBeLessThanOrEqual` fires on a NEW unbacked claim and stays green all the way down to zero.
    // The exact figure lives in the CR, which is the governance record for it; this pins only the
    // direction nobody should be allowed to travel silently.
    const wide = checkLedger(ledger, sources);
    expect(wide.checked, "the ledger's claim count, for context on the ratchet below").toBe(208);
    expect(
      wide.unbacked.length,
      "a NEW unbacked ledger claim is a regression; fixing existing ones must stay green — " +
        "CR-20260820-0011 holds the exact figure",
    ).toBeLessThanOrEqual(127);
    expect(
      wide.unbacked.some((entry) => entry.spec === "0017"),
      "spec-0017 must not be among the unbacked claims",
    ).toBe(false);
  });
});
