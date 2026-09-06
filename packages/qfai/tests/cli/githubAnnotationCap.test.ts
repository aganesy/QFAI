/**
 * `--format github` caps annotations at GitHub's own limit, and the summary says so.
 *
 * The cap was one number for the whole run — 100 — and GitHub's is **ten per level per step**,
 * counted separately for `error`, `warning` and `notice`. So a run with forty errors printed
 * `annotations=40/40`, which reads as "every finding was emitted", while the runner displayed ten
 * and dropped thirty in silence. The summary is the only thing an operator sees, and it said the
 * opposite of what happened. Measured on the `test (cli)` lane, all three levels sat at exactly
 * ten — the truncation was the steady state, not an edge case (#1164).
 *
 * ## What the rows below are about, and why the partition one is the important one
 *
 * The cap is applied on the level the ANNOTATION carries, and `severity` is a different partition:
 * a **suppressed error annotates as `notice`**. Capping by severity would spend a suppressed
 * error's budget on `error` while the runner spent it on `notice`, so the summary would claim a
 * level was complete while the runner truncated it — the exact failure the whole change exists to
 * end, reintroduced one layer down.
 *
 * A fixture of plain errors cannot tell those two implementations apart: with nothing suppressed,
 * severity and level agree everywhere. So the fixture is built to disagree.
 *
 * ## Why the last row runs the real command
 *
 * The rows above it check the partition. They cannot check that the number in the summary is the
 * number of lines that left the process — that is a claim about two pieces of code agreeing, and
 * the way it breaks is one of them changing. The last row reads both off one real run.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  GITHUB_ANNOTATION_LIMIT_PER_LEVEL as CAP,
  capPerLevel,
  gitHubLevel,
  runValidate,
} from "../../src/cli/commands/validate.js";
import type { Issue } from "../../src/core/types.js";

/** A code the reviewer gate ingests without demanding a justification, so a finding reaches `Issue`. */
const INGESTED_CODE = "R-WORKFLOW-HYGIENE-DRIFT";

/**
 * An `Issue` carrying only the fields the level derivation reads, plus the required ones.
 *
 * Spread LAST over the defaults, and typed rather than asserted: a bare `as Issue` here would let
 * a future field become required without this file noticing, which is how a fixture starts
 * describing a shape the product no longer has.
 */
function issue(over: Partial<Issue> & Pick<Issue, "severity">): Issue {
  return { code: "X-TEST-001", message: "m", category: "canonical", ...over };
}

describe("the cap is GitHub's number", () => {
  it("is ten, written as a literal", () => {
    // Every other row in this file is expressed RELATIVE to the constant — `CAP + 7`,
    // `CAP - 2`, `CAP * 3` — which is right for those rows and leaves the constant itself
    // unguarded: set it back to 100 and the expectations move with it, so the whole file stays
    // green while the summary starts lying again in exactly the way #1164 reports. That is not
    // hypothetical; it was measured here by planting it, and only this row caught it.
    //
    // Ten is a fact about GitHub, not a tuning parameter: `error`, `warning` and `notice` are
    // counted separately and each is capped at ten per step. A run that wants a different number
    // wants a different claim, and should have to change this line to say so.
    expect(CAP).toBe(10);
  });
});

describe("the annotation cap is applied per level, on the level the annotation carries", () => {
  it("puts a suppressed error on the notice budget, not the error one", () => {
    // The one input that distinguishes "cap by level" from "cap by severity". Everything here is
    // an `error` by severity; only the suppression moves it.
    const issues = [
      ...Array.from({ length: 3 }, () => issue({ severity: "error" })),
      ...Array.from({ length: 4 }, () => issue({ severity: "error", suppressed: true })),
    ];

    expect(
      issues.map(gitHubLevel),
      "the derivation under test: suppression decides the level, whatever the severity says",
    ).toEqual(["error", "error", "error", "notice", "notice", "notice", "notice"]);

    const { levels } = capPerLevel(issues);
    expect(
      levels,
      "a severity-based cap would report `error 7` here and no notices at all, which is what the " +
        "runner would then contradict",
    ).toEqual([
      { level: "error", total: 3, emitted: 3 },
      { level: "notice", total: 4, emitted: 4 },
    ]);
  });

  it("keeps at most the cap from each level, and the first ones", () => {
    const many = (severity: Issue["severity"], n: number, tag: string): Issue[] =>
      Array.from({ length: n }, (_, index) =>
        issue({ severity, message: `${tag}-${String(index)}` }),
      );

    const { emitted, levels } = capPerLevel([
      ...many("error", CAP + 7, "e"),
      ...many("warning", CAP - 2, "w"),
      ...many("info", CAP + 1, "i"),
    ]);

    expect(levels).toEqual([
      { level: "error", total: CAP + 7, emitted: CAP },
      { level: "warning", total: CAP - 2, emitted: CAP - 2 },
      { level: "notice", total: CAP + 1, emitted: CAP },
    ]);
    expect(emitted).toHaveLength(CAP + (CAP - 2) + CAP);

    // The FIRST of each level, not an arbitrary subset: the ten a reader sees should be the ten
    // they would have seen before the cap existed.
    expect(
      emitted.filter((candidate) => gitHubLevel(candidate) === "error").map((e) => e.message),
      "order within a level is preserved",
    ).toEqual(Array.from({ length: CAP }, (_, index) => `e-${String(index)}`));
  });

  it("reports a level only when it has issues, so an absent level is not reported as complete", () => {
    const { levels } = capPerLevel([issue({ severity: "warning" })]);
    expect(
      levels,
      "a run with only warnings must not print `error 0/0` — a level with nothing in it was not " +
        "truncated and was not complete either; it did not happen",
    ).toEqual([{ level: "warning", total: 1, emitted: 1 }]);
  });

  it("says nothing about levels when there is nothing to say", () => {
    expect(capPerLevel([])).toEqual({ emitted: [], levels: [] });
  });
});

describe("the summary counts what left the process", () => {
  it("matches `annotations=` to the emitted commands and names the truncated level", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-gh-cap-"));
    const chunks: string[] = [];
    const writeSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation((chunk: string | Uint8Array) => {
        chunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf-8"));
        return true;
      });
    try {
      // Comfortably past the cap, so the truncation is real rather than borderline.
      const findings = Array.from({ length: CAP * 3 }, (_, index) => ({
        code: INGESTED_CODE,
        message: `planted finding ${String(index)}`,
        file: `docs/planted-${String(index)}.md`,
      }));
      const reviewDir = path.join(root, ".qfai", "review", "review-20260825000000000");
      await mkdir(reviewDir, { recursive: true });
      await writeFile(
        path.join(reviewDir, "reviewer-completion.json"),
        JSON.stringify({ findings }, null, 2),
        "utf-8",
      );

      await runValidate({ root, strict: false, format: "github", failOn: "error" });
      const lines = chunks.join("").split(/\r?\n/);

      const commands = lines.filter((line) => line.startsWith("::"));
      const summary = lines.find((line) => line.startsWith("qfai validate summary:"));
      expect(summary, "the run must print a summary for this row to read").toBeDefined();

      const declared = /annotations=(\d+)\/(\d+)/.exec(summary ?? "");
      expect(declared, "the summary must carry an `annotations=` field").not.toBeNull();
      expect(
        Number(declared?.[1] ?? -1),
        "`annotations=` must be the number of workflow commands this process actually wrote — " +
          "the old value was `min(total, 100)`, which counted findings rather than annotations",
      ).toBe(commands.length);

      // Non-vacuity: a run that emitted nothing would satisfy the equality above.
      expect(commands.length, "the run must have emitted annotations").toBeGreaterThan(0);

      // And it must not have emitted everything, or the row proves nothing about the cap.
      expect(
        Number(declared?.[2] ?? -1),
        "the fixture must produce more findings than the cap allows",
      ).toBeGreaterThan(commands.length);

      for (const level of ["error", "warning", "notice"]) {
        expect(
          commands.filter((line) => line.startsWith(`::${level}`)).length,
          `no level may exceed GitHub's cap of ${String(CAP)}`,
        ).toBeLessThanOrEqual(CAP);
      }

      const note = lines.find((line) => line.includes("上限省略="));
      expect(
        note,
        "a truncated run must say which level was truncated and by how much: one number cannot " +
          "express a per-level cap, and silence is what made `annotations=` misleading",
      ).toBeDefined();
      expect(note ?? "").toMatch(/上限省略=\w+ \d+\/\d+/);
      expect(
        lines.some((line) => line.includes("level ごと 10 件/step")),
        "and it must state the rule, so a reader can tell a cap from a bug",
      ).toBe(true);
    } finally {
      writeSpy.mockRestore();
      await rm(root, { recursive: true, force: true });
    }
  });
});
