/**
 * The instruction files a coding agent loads by itself, and the QFAI-managed
 * section inside them that points at the `.agents/rules/` masters.
 *
 * `qfai init` copies the root templates create-only, so a project that already
 * had an `AGENTS.md` or a `CLAUDE.md` kept its own file untouched — and with it,
 * no reference to the rule masters the same run had just written. The rules the
 * generated instructions call the cross-AI single source of truth then reached
 * every fresh project and none of the ones that already had an agent set up,
 * which is precisely the population most likely to need them.
 *
 * So the section is delimited. It ships inside the templates, so a fresh init
 * already carries it, and the writer appends that same block — lifted from the
 * template, never re-typed here — to a file that predates QFAI. Everything
 * outside the two markers belongs to the project and is never read back or
 * rewritten.
 */

/**
 * Files an agent reads on its own: Codex loads `AGENTS.md`, Claude Code loads
 * `CLAUDE.md`. Copilot's instruction file is generated whole by
 * `syncIntegrationWrappers`, so it needs no managed section.
 */
export const AGENT_ENTRY_POINT_FILES = ["AGENTS.md", "CLAUDE.md"] as const;

export type AgentEntryPointFile = (typeof AGENT_ENTRY_POINT_FILES)[number];

export const QFAI_AGENT_RULES_BEGIN = "<!-- qfai:cross-ai-rules:start -->";
export const QFAI_AGENT_RULES_END = "<!-- qfai:cross-ai-rules:end -->";

/** Repo-relative `.agents/rules/*.md` paths cited by a piece of markdown. */
const RULE_MASTER_RE = /\.agents\/rules\/[A-Za-z0-9._-]+\.md/g;

export function citedRuleMasters(text: string): readonly string[] {
  return [...new Set(text.match(RULE_MASTER_RE) ?? [])];
}

/**
 * The managed section of `template`, both markers included, or `null` when the
 * template carries no complete pair.
 *
 * Returning `null` rather than guessing a region keeps a hand-edited template
 * from having an arbitrary slice of itself appended to a user's file.
 */
export function extractManagedRulesSection(template: string): string | null {
  const start = template.indexOf(QFAI_AGENT_RULES_BEGIN);
  if (start === -1) {
    return null;
  }
  const endAt = template.indexOf(QFAI_AGENT_RULES_END, start + QFAI_AGENT_RULES_BEGIN.length);
  if (endAt === -1) {
    return null;
  }
  return template.slice(start, endAt + QFAI_AGENT_RULES_END.length);
}

/**
 * Whether `existing` still has to gain `section`.
 *
 * Two ways to already be connected, and both are honoured:
 *
 * - the begin marker is present, so a previous run wrote the section and
 *   whatever the project did to it since is its own business — a second append
 *   would duplicate the heading and re-assert bullets the project may have
 *   deliberately trimmed;
 * - every master the section cites is already named somewhere in the file, so
 *   the project wired the rules in by hand and the agent reads them today.
 *
 * A section citing nothing is a broken template rather than a reason to append:
 * it would add a heading and connect no rule.
 */
export function needsManagedRulesSection(existing: string, section: string): boolean {
  if (existing.includes(QFAI_AGENT_RULES_BEGIN)) {
    return false;
  }
  const masters = citedRuleMasters(section);
  if (masters.length === 0) {
    return false;
  }
  return !masters.every((master) => existing.includes(master));
}
