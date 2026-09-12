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

/**
 * Masters this run wrote into `.agents/rules/`, from the create-only copy's
 * report.
 *
 * A master the copy wrote did not exist in this project before the run, so no
 * section in it can ever have cited that master. That is what separates the two
 * reasons a citation can be absent — never shipped, or deliberately removed —
 * without recording anything: the second kind has its file on disk already, so
 * the copy skips it and it is not in this list.
 *
 * The separation holds while the master is on disk. A project that deleted the
 * bullet **and** the file gets both back, because the same run writes the file
 * again — the opt-out was never durable for the file either, and a rule present
 * in the tree and cited nowhere is the state this exists to end. Recording which
 * masters a run wrote is what would tell the two apart; no run records it yet.
 */
export function newlyWrittenRuleMasters(
  copiedPaths: readonly string[],
  destRoot: string,
): readonly string[] {
  const prefix = `${destRoot.replace(/[\\/]+$/, "")}/`;
  const cited = new Set<string>();
  for (const copied of copiedPaths) {
    const relative = copied.replace(/\\/g, "/").replace(prefix.replace(/\\/g, "/"), "");
    for (const master of citedRuleMasters(relative)) cited.add(master);
  }
  return [...cited].sort();
}

/** The heading the generated instruction file puts its rule list under. */
export const CROSS_AI_RULES_HEADING = "## Cross-AI rules (master)";

/**
 * `existing` with a bullet added for every master it does not already cite,
 * inserted after the last rule bullet in the file.
 *
 * For a file the run generates whole rather than delimits: Copilot's instruction
 * file is written once and skipped afterwards, so without this a newly shipped
 * rule reached Codex and Claude and not the third agent this repository says
 * loads it.
 *
 * With no rule bullet left, the heading is the insertion point. Returning
 * unchanged there would leave the rule uncited for good, because the wrapper
 * sync skips an existing file and nothing else writes one.
 */
export function addRuleCitationsToList(
  existing: string,
  section: string,
  masters: readonly string[],
): string {
  const newline = existing.includes("\r\n") ? "\r\n" : "\n";
  const bullets = pendingBullets(existing, section, masters);
  if (bullets.length === 0) return existing;

  const lines = existing.split(newline);
  let insertAfter = -1;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line !== undefined && line.startsWith("- ") && citedRuleMasters(line).length > 0) {
      insertAfter = index;
    }
  }
  if (insertAfter === -1) {
    // Every bullet deleted. The heading is the one place left that a reader
    // reads as the rule list, so the bullets go under it as their own block.
    const heading = lines.findIndex((line) => line.startsWith(CROSS_AI_RULES_HEADING));
    if (heading === -1) return existing;
    lines.splice(heading + 1, 0, "", ...bullets);
    return lines.join(newline);
  }

  lines.splice(insertAfter + 1, 0, ...bullets);
  return lines.join(newline);
}

/** The template's bullets for the masters `existing` does not already cite. */
function pendingBullets(existing: string, section: string, masters: readonly string[]): string[] {
  const bullets: string[] = [];
  for (const master of masters) {
    if (existing.includes(master)) continue;
    const bullet = bulletFor(section, master);
    if (bullet !== null) bullets.push(bullet);
  }
  return bullets;
}

/** The template's own bullet for `master`, or `null` when it has none. */
function bulletFor(section: string, master: string): string | null {
  for (const line of section.split("\n")) {
    if (line.startsWith("- ") && line.includes(master)) return line;
  }
  return null;
}

/**
 * `existing` with a bullet added for every master in `masters` the file does not
 * already cite.
 *
 * The bullet is lifted from `section` rather than composed here, for the reason
 * the whole section is: one wording, in the template, where it is reviewed.
 * Insertion goes after the last rule bullet inside the managed section, so the
 * prose that closes the section stays closed and anything the project wrote
 * around it is untouched.
 *
 * Returns `existing` unchanged when there is nothing to add, or when the file
 * has no complete marker pair to insert inside.
 */
export function addRuleCitations(
  existing: string,
  section: string,
  masters: readonly string[],
): string {
  const start = existing.indexOf(QFAI_AGENT_RULES_BEGIN);
  if (start === -1) return existing;
  const endAt = existing.indexOf(QFAI_AGENT_RULES_END, start + QFAI_AGENT_RULES_BEGIN.length);
  if (endAt === -1) return existing;

  const bullets = pendingBullets(existing, section, masters);
  if (bullets.length === 0) return existing;

  // A Windows checkout keeps CRLF, and a template bullet is LF. Splicing one
  // into the other leaves a file with mixed endings, which a formatter then
  // rewrites whole — a one-line change turning into a diff over the file.
  const newline = existing.includes("\r\n") ? "\r\n" : "\n";
  const managed = existing.slice(start, endAt);
  const lines = managed.split(newline);
  // After the last rule bullet, not the last line: the section closes with
  // prose, and a bullet after it would read as part of that paragraph.
  let insertAfter = -1;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line !== undefined && line.startsWith("- ") && citedRuleMasters(line).length > 0) {
      insertAfter = index;
    }
  }
  if (insertAfter === -1) {
    // A section with no rule bullet left — every one deleted, or the citations
    // rewritten as something else. Discarding the bullets here would leave a
    // rule the run shipped uncited for good, so they go at the end of the
    // section as their own block, separated from whatever precedes them.
    const trailing = lines.at(-1) === "" ? 1 : 0;
    lines.splice(lines.length - trailing, 0, "", ...bullets, "");
    return `${existing.slice(0, start)}${lines.join(newline)}${existing.slice(endAt)}`;
  }

  lines.splice(insertAfter + 1, 0, ...bullets);
  return `${existing.slice(0, start)}${lines.join(newline)}${existing.slice(endAt)}`;
}
