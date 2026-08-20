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
    // 127 of 208 claims are backed by no annotation in any E2E test file. Recorded in
    // `CR-20260820-0011`; wiring this script into `ci:lint` repo-wide is that CR's work, not this
    // spec's. Pinned so the number cannot drift silently in either direction.
    const wide = checkLedger(ledger, sources);
    expect(wide.checked).toBeGreaterThanOrEqual(200);
    expect(wide.unbacked.length).toBeGreaterThan(100);
    expect(
      wide.unbacked.some((entry) => entry.spec === "0017"),
      "spec-0017 must not be among the unbacked claims",
    ).toBe(false);
  });
});
