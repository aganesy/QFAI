/**
 * Line ceiling for a shipped assistant asset.
 *
 * One number for every file, defined once. It was previously four literals in
 * three files (240 / 350 / 360 / 400 / 400 / 310, depending on which test you
 * read), which disagreed with each other about the same file and had to be
 * raised one at a time as skills grew.
 *
 * The ceiling is a backstop, not the design rule. The design rule is that a
 * `SKILL.md` stays thin: it states the contract and points at the topic file
 * that carries the detail, under the skill's own `references/`, `templates/` or
 * `examples/` directory. Those files are split by topic too — a single
 * oversized reference is the same problem moved one directory down. A file
 * approaching this number is a signal to move a section out, not to raise it.
 */
export const SKILL_MD_MAX_LINES = 500;

/**
 * Shipped asset files exempt from {@link SKILL_MD_MAX_LINES}, with the reason.
 *
 * Paths are relative to `packages/qfai/assets/init/.qfai/`. Keep this list
 * short: an exemption claims no split is possible, and "this file is long" is
 * not that claim. Every entry needs a reason a reader can check.
 */
export const LINE_BUDGET_EXEMPT: ReadonlyMap<string, string> = new Map([
  [
    "assistant/manifest/agent-catalog.yml",
    "Generated, not authored: it is derived from `assistant/agents/<id>.md`, one " +
      "entry per agent, and `tests/codex/agents.test.ts` asserts it matches those " +
      "sources. Splitting it would mean splitting the agent roster it mirrors.",
  ],
]);

/**
 * Counts lines the way every budget assertion does.
 *
 * `split(/\r?\n/)` — not a blank-line-skipping counter. A markdown file is
 * substantially blank lines by volume, and undercounting them lets a file sit
 * ~20% over the ceiling while reporting as compliant.
 */
export function countLines(content: string): number {
  return content.split(/\r?\n/).length;
}
