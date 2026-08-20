/**
 * The counts `atdd-spec-0017.md` states about its own artifacts, checked against the artifacts.
 *
 * This exists because one finding class recurred in every one of five review rounds: a number typed
 * into the record that the tree did not hold. Rounds 2 and 3 each found four; round 4 found four more,
 * including a **recorded command output** ("Tests 9 passed (9)" for a file that ran eleven) and a
 * `## Work performed` line that said eight describes where there were nine. Every one was a figure
 * restated without re-derivation, and every one was caught by a reviewer counting by hand.
 *
 * Correcting them one at a time has not worked. What follows is the same move that fixed the Coverage
 * Depth Matrix's totals: derive the number from the artifact, so the record cannot disagree with the
 * repository without something failing.
 *
 * Deliberately narrow. It checks counts that are mechanically derivable — test cases per file,
 * annotated describes, ledger annotation lines — and nothing that needs judgement. A suite total like
 * "1418 passed" is not derivable without running the suite and is left to the P7 block, which is why
 * that block carries its own statement about when it was measured.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../../..");
/**
 * Count `it(` / `test(` callsites in a test file.
 *
 * Counts the callsite, not the run: a `for` loop inside one `it` is still one case, which is what a
 * "N tests" claim in prose means and what vitest reports.
 */
function countCases(source: string): number {
  return [...source.matchAll(/(?:^|[^.\w])(?:it|test)(?:\.\w+)*\s*\(/g)].length;
}

async function source(relative: string): Promise<string> {
  return readFile(path.join(ROOT, relative), "utf8");
}

describe("the stage evidence's counts are derived, not typed", () => {
  it("states the number of tests each new test file actually holds", async () => {
    const evidence = await source(".qfai/evidence/atdd-spec-0017.md");

    // Each entry: the file, and the phrase in the record that states its count. The phrase is matched
    // with the number as a capture, so a drift in either direction fails here rather than in a review.
    const CLAIMS: ReadonlyArray<{ file: string; pattern: RegExp; label: string }> = [
      {
        file: "packages/qfai/tests/integration/scripts/checkAtddAnnotationLedger.test.ts",
        pattern: /`scripts\/check-atdd-annotation-ledger\.mjs` with (\d+) tests/,
        label: "the ledger guard's test count, in Decision 4",
      },
      {
        file: "packages/qfai/tests/integration/scripts/checkAtddAnnotationLedger.test.ts",
        pattern: /checkAtddAnnotationLedger\.test\.ts` — (\d+) tests/,
        label: "the ledger guard's test count, in Work performed",
      },
      {
        file: "packages/qfai/tests/unit/buildCommand.test.ts",
        pattern: /buildCommand\.test\.ts` — (\d+) tests/,
        label: "the build classifier's test count, in Work performed",
      },
      {
        file: "packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts",
        pattern: /spec0017LayeredCiScaffoldE2E\.test\.ts` — (\d+) tests across/,
        label: "the E2E file's test count, in Work performed",
      },
    ];

    const wrong: string[] = [];
    for (const claim of CLAIMS) {
      const match = claim.pattern.exec(evidence);
      if (match === null) {
        wrong.push(`${claim.label}: the record no longer states it in the pinned form`);
        continue;
      }
      const actual = countCases(await source(claim.file));
      if (Number(match[1]) !== actual) {
        wrong.push(`${claim.label}: record says ${match[1] ?? "?"}, file holds ${String(actual)}`);
      }
    }
    expect(wrong, "a count in the record that the tree does not hold").toEqual([]);
  });

  it("states the number of annotated describes the E2E file actually carries", async () => {
    const evidence = await source(".qfai/evidence/atdd-spec-0017.md");
    const e2e = await source("packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts");

    const annotations = [...e2e.matchAll(/^\/\/ QFAI:SPEC-0017:US-0017-\d{4}$/gm)].length;
    const stated = /(\d+)\s*annotated\s+describes/.exec(evidence.replace(/\s+/g, " "));
    expect(
      stated,
      "Work performed must state the describe count in the pinned form",
    ).not.toBeNull();
    expect(
      Number(stated?.[1]),
      "the annotated-describe count: round 4 found this saying eight when there were nine",
    ).toBe(annotations);
  });

  it("states the number of ledger claims this spec makes, and it matches the ledger", async () => {
    const evidence = await source(".qfai/evidence/atdd-spec-0017.md");
    const ledger = await source("tests/e2e/qfai-traceability.md");

    const claims = [...ledger.matchAll(/\bQFAI:SPEC-0017:US-0017-\d{4}\b/g)].length;
    const stated = /(\d+) claim\(s\) backed by a test annotation/.exec(evidence);
    expect(stated, "the guard's recorded output must be present in the pinned form").not.toBeNull();
    expect(Number(stated?.[1]), "the recorded guard output must match the ledger it read").toBe(
      claims,
    );
  });

  it("names as many review packs as the review directory holds, each with a seal", async () => {
    const evidence = await source(".qfai/evidence/atdd-spec-0017.md");
    const { readdir } = await import("node:fs/promises");

    // Only packs this stage opened: the review directory also holds earlier stages' packs.
    const packs = (await readdir(path.join(ROOT, ".qfai/review")))
      .filter((name) => /^review-2026082[01]\d+$/.test(name))
      .filter((name) => name >= "review-20260820200000000");

    const named = [...evidence.matchAll(/Review pack:\s+`?\.qfai\/review\/(review-\d+)\/?`?/g)].map(
      (match) => match[1] ?? "",
    );
    expect(
      named.sort(),
      "every pack this stage opened must be named in Final status — round 4 found the record saying " +
        '"Three packs" against four directories',
    ).toEqual(packs.sort());

    const seals = [...evidence.matchAll(/Review pack seal:\s+`?([0-9a-f]{64})`?/g)].length;
    expect(seals, "one recorded seal per named pack").toBe(named.length);
  });
});
