/**
 * The reviewer gate `/qfai-verify` holds completion behind.
 *
 * The verify stage is a skill, so the gate that refuses completion on a
 * `REVISE` is a clause an agent executes, not a code path. What a test can hold
 * is that the clauses stay: the reviewer answers only `PASS` or `REVISE`, and no
 * DONE or handoff is declared until every routed blocking reviewer returns
 * `PASS`. Each clause is read under the section that makes it binding, in the
 * copy `qfai init` ships and in the copy this repository runs.
 */
// QFAI:SPEC-0014:TC-0014-0009

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const REPO_ROOT = path.resolve(PACKAGE_ROOT, "..", "..");
const SKILL_REL = ".qfai/assistant/skills/qfai-verify/SKILL.md";

const COPIES = [
  ["shipped", path.join(PACKAGE_ROOT, "assets", "init", SKILL_REL)],
  ["installed", path.join(REPO_ROOT, SKILL_REL)],
] as const;

/** The body of the `### <heading>` section, up to the next heading of any level. */
function section(markdown: string, heading: string): string {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `### ${heading}`);
  if (start === -1) return "";
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^#{1,6} /.test(line));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n");
}

describe("TC-0014-0009: verify holds completion behind a reviewer PASS", () => {
  for (const [copy, file] of COPIES) {
    it(`${copy}: the reviewer answers only PASS or REVISE`, async () => {
      const roles = section(await readFile(file, "utf-8"), "Stage Minimum Roles (MUST)");
      expect(roles).toContain(
        "- Gate: Reviewer is delegated independently and returns only `PASS` or `REVISE`.",
      );
    });

    it(`${copy}: a REVISE from a routed blocking reviewer blocks DONE and handoff`, async () => {
      const gate = section(await readFile(file, "utf-8"), "Reviewer Gate (MUST)");
      expect(gate).toContain(
        "- Do not declare DONE or handoff until all routed blocking reviewers return `PASS`.",
      );
    });
  }
});
