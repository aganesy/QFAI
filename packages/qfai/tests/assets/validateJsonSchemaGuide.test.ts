/**
 * The public `validate.json` guide documents `profileValidatorsRan`.
 *
 * Every run `validateProject` assembles carries the key, and `false` means the
 * profile's gates were not evaluated at all. A guide that leaves it out lets a
 * consumer read the absence of errors from a stopped run as a pass, so the
 * guide names the key in its top-level table and says what each of its three
 * states means, including the absent one.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";
import type { Issue, ValidationResult } from "../../src/core/types.js";
import { rowOf, sectionOf } from "../helpers/shippedAssistant.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");

const GUIDE = path.join("skill", "qfai-verify", "references", "validate-json-schema.md");

const ASSISTANT_ROOTS = [
  path.join(repoRoot, "packages", "qfai", "assets", "init", ".qfai", "assistant"),
  path.join(repoRoot, ".qfai", "assistant"),
];

function tableKeys(text: string): string[] {
  const start = text.indexOf("## Top level");
  const end = text.indexOf("\n## ", start + 1);
  return text
    .slice(start, end)
    .split("\n")
    .flatMap((line) => {
      const match = /^\|\s*`([A-Za-z]+)`\s*\|/.exec(line);
      return match?.[1] ? [match[1]] : [];
    });
}

describe.each(ASSISTANT_ROOTS)("validate.json guide under %s", (assistantRoot) => {
  it("lists profileValidatorsRan as a top-level key", async () => {
    const text = await readFile(path.join(assistantRoot, GUIDE), "utf8");

    expect(tableKeys(text)).toContain("profileValidatorsRan");
  });

  it("says what true, false and an absent value mean", async () => {
    const text = await readFile(path.join(assistantRoot, GUIDE), "utf8");

    expect(text).toMatch(/^- `true`: the profile's own validators ran/m);
    expect(text).toMatch(/^- `false`: they did not run\./m);
    expect(text).toContain("`QFAI-LAYOUT-001`");
    expect(text).toContain("`QFAI-LINK-001`");
    expect(text).toMatch(/^- absent: the file makes no claim either way\./m);
    expect(text).toMatch(/Read\s+absence\s+as\s+"not\s+known",\s+not\s+as\s+`true`\./);
  });

  // `validateProject` writes `waivers` on every run that reaches its checks,
  // and `timings` / `familyTimings` beside it, so a consumer needs each one's
  // empty or optional state to read the file correctly.
  it("lists waivers, timings and familyTimings with the empty waiver object", async () => {
    const text = await readFile(path.join(assistantRoot, GUIDE), "utf8");

    expect(tableKeys(text)).toEqual(
      expect.arrayContaining(["waivers", "timings", "familyTimings"]),
    );
    expect(text).toContain(
      '{ "active": [], "suppressed": { "total": 0, "byWaiver": {}, "byRule": {} } }',
    );
    expect(text).toContain("wall-clock milliseconds");
  });

  // A `--flow` run writes `flowIds` and `qfai report` refuses a file whose
  // recorded flows are not the ones it was asked for, so a consumer needs the
  // key and its absent state on a repository-wide run.
  it("lists flowIds and says a repository-wide run leaves it out", async () => {
    const text = await readFile(path.join(assistantRoot, GUIDE), "utf8");
    const flowIds = "flowIds" satisfies keyof ValidationResult;

    expect(tableKeys(text)).toContain(flowIds);
    expect(text).toMatch(/^`flowIds` is written only by a `--flow` run/m);
    expect(text).toContain("sorted, each named once");
    expect(text).toMatch(/A repository-wide run leaves it\s+out\./);
  });

  it("marks the original severity optional and shows an older error downgraded to a warning", async () => {
    const text = await readFile(path.join(assistantRoot, GUIDE), "utf8");
    const relaxedFrom = "relaxedFrom" satisfies keyof Issue;
    const issues = sectionOf(text, "## `issues[]`");
    const row = rowOf(issues, `\`${relaxedFrom}\``);
    expect(row).toMatch(
      /^\|\s*`relaxedFrom`\s*\|.*\|\s*optional severity before an older exploration-mode downgrade\s*\|\s*$/,
    );
    expect(issues).toMatch(
      /`relaxedFrom: "error"` and `severity: "warning"` was\s+lowered from error to warning by exploration mode/,
    );
  });

  // A waiver on an `error` finding is refused with `QFAI-WAIVER-002`, so the
  // example lists the codes a waiver can name.
  it("lists waivable findings in the waiver example", async () => {
    const text = await readFile(path.join(assistantRoot, GUIDE), "utf8");

    expect(text).toContain(`select(.severity != "error")`);
    expect(text).toContain("`QFAI-WAIVER-002`");
  });

  // `validate` never writes `report.md`; only `qfai report` does.
  it("names qfai report as the step that writes report.md", async () => {
    const text = await readFile(path.join(assistantRoot, GUIDE), "utf8");
    const related = text.slice(text.indexOf("## Related"));

    expect(related).toContain("`npx qfai report`");
    expect(related).toContain("`npx qfai report --run-validate`");
  });
});
