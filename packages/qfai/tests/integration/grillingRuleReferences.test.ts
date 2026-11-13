/**
 * The grilling rule keeps a procedure that applies in one case in a `qfai-grilling` reference, so
 * the rule has room for new clauses and an agent reads each procedure only when its case arises.
 */
// QFAI:AC-0001-0303-01
// QFAI:AC-0001-0303-02

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/integration/<this file> -> tests -> packages/qfai -> packages -> repo root
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const MASTER = "packages/qfai/assets/init/root/.agents/rules/grilling.md";
const SKILL_DIR = "packages/qfai/assets/init/.qfai/assistant/skill/qfai-grilling";

/** Each section the master keeps, and the reference it points to for the procedure. */
const SPLITS = [
  ["### Explicit delegation for a discussion", "discussion-delegation.md"],
  ["## Terms against the glossary", "glossary-check.md"],
  ["## It is working when", "session-check.md"],
] as const;

/** Collapse soft wraps so a clause is pinned by its wording, not its wrap column. */
const unwrap = (text: string): string => text.replace(/\s*\n\s*/g, " ");

const read = async (rel: string): Promise<string> =>
  unwrap(await readFile(path.join(ROOT, rel), "utf-8"));

/** The body of the section under `heading`, up to the next heading of level two or three. */
const section = async (heading: string): Promise<string> =>
  (await readFile(path.join(ROOT, MASTER), "utf-8")).split(heading)[1]?.split(/^#{2,3} /m)[0] ?? "";

// QFAI:EX-0001-0303-01
describe.each(SPLITS)("%s in the shipped grilling rule", (heading, file) => {
  it(`points to ${file} and says when it is not needed`, async () => {
    const body = unwrap(await section(heading));
    expect(body).toContain(`Read \`.qfai/assistant/skill/qfai-grilling/references/${file}\``);
    expect(body).toContain("Not needed ");
  });

  it(`ships ${file} as the procedure the section names`, async () => {
    expect(await read(`${SKILL_DIR}/references/${file}`)).toContain("`.agents/rules/grilling.md`");
  });
});

// QFAI:EX-0001-0303-02
describe("the shipped qfai-grilling skill", () => {
  it.each(SPLITS)("cites the reference behind %s", async (_heading, file) => {
    expect(await read(`${SKILL_DIR}/SKILL.md`)).toContain(`\`references/${file}\``);
  });
});
