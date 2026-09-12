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
  if (managedSection(existing).begin !== -1) {
    return false;
  }
  const masters = citedRuleMasters(section);
  if (masters.length === 0) {
    return false;
  }
  const cited = new Set(citedRuleMastersOutsideCode(existing));
  return !masters.every((master) => cited.has(master));
}

/**
 * Whether `existing` opens a managed section and never closes it.
 *
 * The pair is what marks the region as qfai's. With the begin marker alone the
 * file reads as connected, so nothing appends the section, and there is no
 * region to insert a citation into either — the file falls between the two
 * paths and is skipped in silence. A run that says so is what lets the project
 * restore the marker; a run that does not leaves the rule uncited, and the next
 * run has no reason to look at the file again.
 */
export function hasUnclosedRulesSection(existing: string): boolean {
  const { begin, end } = managedSection(existing);
  return begin !== -1 && end === -1;
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
  const bullets = pendingBullets(existing, section, masters);
  if (bullets.length === 0) return existing;

  // Split on the separator alone, so a file whose endings are mixed keeps every
  // one of them: a CR left on the line is part of that line, and joining on the
  // same separator restores the document exactly.
  const lines = existing.split("\n");
  const open = outsideFences(lines);
  let insertAfter = -1;
  for (let index = 0; index < lines.length; index += 1) {
    if (isRuleBullet(lines, open, index)) insertAfter = index;
  }
  if (insertAfter === -1) {
    // Every bullet deleted. The heading is the one place left that a reader
    // reads as the rule list, so the bullets go under it as their own block.
    const heading = lines.findIndex(
      (line, index) => open[index] === true && plainLine(line).startsWith(CROSS_AI_RULES_HEADING),
    );
    if (heading === -1) return existing;
    const end = terminatorOf(lines[heading]);
    lines.splice(heading + 1, 0, end, ...bullets.map((bullet) => `${bullet}${end}`));
    return lines.join("\n");
  }

  const at = endOfListItem(lines, open, insertAfter);
  const end = terminatorOf(lines[insertAfter]);
  lines.splice(at, 0, ...bullets.map((bullet) => `${bullet}${end}`));
  return lines.join("\n");
}

/**
 * The masters a document cites where a reader would follow the citation.
 *
 * A path inside a fenced block is an example of a citation rather than one, and
 * a file whose only mentions are examples cites nothing — it is a file the
 * managed section still has to reach.
 */
export function citedRuleMastersOutsideCode(text: string): readonly string[] {
  // A trailing CR is left on the line: neither the fence test nor the citation
  // pattern is anchored at the end, so splitting on the separator alone is
  // enough and keeps one spelling of it here.
  const lines = text.split("\n");
  const open = outsideFences(lines);
  const cited = new Set<string>();
  for (const [index, line] of lines.entries()) {
    if (open[index] !== true) continue;
    for (const master of citedRuleMasters(line)) cited.add(master);
  }
  return [...cited];
}

/**
 * A line with its Markdown container prefix and line terminator removed.
 *
 * A fence inside a block quote opens with `> ~~~`, and a scan anchored at the
 * start of the line never sees it — so an example inside one reads as live
 * content. A trailing CR is stripped for the same reason: what follows is a
 * test of the line's own text, not of how it happened to end.
 */
function plainLine(line: string | undefined): string {
  return (line ?? "").replace(/\r$/, "").replace(/^[ \t]{0,3}(?:> ?)+/, "");
}

/**
 * A line as a fence scanner reads it: containers removed, marker and all.
 *
 * A fence can open as a list item's content — `- ```markdown` — and a scan that
 * leaves the marker in place never sees it, so the example inside reads as
 * live. The bullet scan cannot share this: it needs the marker it strips here.
 */
function fenceLine(line: string | undefined): string {
  return plainLine(line).replace(/^[ \t]*(?:[-*+]|\d+[.)])[ \t]+/, "");
}

/**
 * What a line sits inside, as far as a fence is concerned.
 *
 * The block quote alone. A fence opened inside one ends where the quote does —
 * held open past that, the scan reads the rest of the document as part of an
 * example. A list marker is deliberately not in here: a line beginning `- `
 * inside a fence is content, and reading it as a container would close the
 * block on its first bullet.
 */
function containerOf(line: string | undefined): string {
  return /^[ \t]{0,3}(?:> ?)*/.exec((line ?? "").replace(/\r$/, ""))?.[0]?.trim() ?? "";
}

/** The terminator `line` carried, so an inserted line keeps its neighbour's. */
function terminatorOf(line: string | undefined): string {
  return (line ?? "").endsWith("\r") ? "\r" : "";
}

/**
 * Which lines of a document are outside every fenced block.
 *
 * A rule path inside a fence is an example of a citation, not one. Spliced into
 * the fence, the bullets stay examples while the run reports having cited them;
 * counted as a rule list, they send a hand-wired file down a path that has
 * nowhere real to write.
 *
 * A fence belongs to the container it opened in. An unclosed one inside a block
 * quote ends where the quote does, and a scanner holding it open past that
 * reads the rest of the document as an example — including a real managed
 * section, which is then appended a second time.
 */
function outsideFences(lines: readonly string[]): boolean[] {
  let open: { character: string; length: number; container: string } | null = null;
  return lines.map((raw) => {
    const container = containerOf(raw);
    if (open !== null && container !== open.container) {
      // The container the fence opened in has ended, and so has the fence.
      open = null;
    }
    const line = fenceLine(raw);
    const fence = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (fence === null) return open === null;
    const run = fence[1] ?? "";
    const rest = fence[2] ?? "";
    if (open === null) {
      // A backtick fence may not carry a backtick in its info string. Such a
      // line opens nothing, so it is ordinary content.
      if (run.startsWith("`") && rest.includes("`")) return true;
      open = { character: run[0] ?? "`", length: run.length, container };
      return false;
    }
    // A block closes on its own character, on a run at least as long as the
    // one that opened it, with nothing after it but spaces. A line carrying an
    // info string is an opener, and an opener inside a block is content — so
    // treating it as a closer resumes the scan in the middle of an example.
    if (run[0] === open.character && run.length >= open.length && rest.trim() === "") {
      open = null;
    }
    return false;
  });
}

/**
 * One past the last line of the list item that starts at `index`.
 *
 * A bullet is not one line: its continuation is indented under it. Inserting
 * between the two moves the project's own explanation under the new bullet,
 * where it describes a rule it was never about.
 */
function endOfListItem(lines: readonly string[], open: readonly boolean[], index: number): number {
  let end = index + 1;
  while (end < lines.length) {
    const line = plainLine(lines[end]);
    // A blank line inside a list item is followed by more of it; two in a row,
    // or an unindented line, end it.
    const continued =
      /^\s+\S/.test(line) || (line.trim() === "" && /^\s+\S/.test(plainLine(lines[end + 1])));
    if (!continued || open[end] !== true) break;
    end += 1;
  }
  return end;
}

/** Whether the line at `index` is a rule bullet a citation can be added after. */
function isRuleBullet(lines: readonly string[], open: readonly boolean[], index: number): boolean {
  if (open[index] !== true) return false;
  const line = plainLine(lines[index]);
  return line.startsWith("- ") && citedRuleMasters(line).length > 0;
}

/**
 * Where the managed section's markers sit, ignoring any inside a fenced block.
 *
 * A document showing what the section looks like carries a marker pair in an
 * example. Found by scanning the text, that example is the managed section: the
 * file reads as connected, and a bullet meant for the rule list is written into
 * the example instead, where it instructs nobody.
 */
function managedSection(existing: string): {
  lines: string[];
  open: boolean[];
  begin: number;
  end: number;
} {
  // Split on the separator alone. Choosing one terminator for the document put
  // an LF-delimited section into a single element of a CRLF split, so the begin
  // and end markers shared one line and the section read as never closed.
  const lines = existing.split("\n");
  const open = outsideFences(lines);
  const begin = lines.findIndex(
    (line, index) => open[index] === true && line.includes(QFAI_AGENT_RULES_BEGIN),
  );
  const end =
    begin === -1
      ? -1
      : lines.findIndex(
          (line, index) =>
            index > begin && open[index] === true && line.includes(QFAI_AGENT_RULES_END),
        );
  return { lines, open, begin, end };
}
/** The template's bullets for the masters `existing` does not already cite. */
function pendingBullets(existing: string, section: string, masters: readonly string[]): string[] {
  const cited = new Set(citedRuleMastersOutsideCode(existing));
  const bullets: string[] = [];
  for (const master of masters) {
    if (cited.has(master)) continue;
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
  const { lines, open, begin, end } = managedSection(existing);
  if (begin === -1 || end === -1) return existing;

  const bullets = pendingBullets(existing, section, masters);
  if (bullets.length === 0) return existing;

  // After the last rule bullet, not the last line: the section closes with
  // prose, and a bullet after it would read as part of that paragraph.
  let insertAfter = -1;
  for (let index = begin + 1; index < end; index += 1) {
    if (isRuleBullet(lines, open, index)) insertAfter = index;
  }
  if (insertAfter === -1) {
    // A section with no rule bullet left — every one deleted, or the citations
    // rewritten as something else. Discarding the bullets here would leave a
    // rule the run shipped uncited for good, so they go at the end of the
    // section as their own block, separated from whatever precedes them.
    const terminator = terminatorOf(lines[end]);
    // Where the section already closes with a blank line, that line is the
    // separator below the bullets: adding another leaves two, so a run that
    // promised one bullet also rewrote the section's whitespace.
    const closing = plainLine(lines[end - 1]).trim() === "";
    lines.splice(
      end - (closing ? 1 : 0),
      0,
      terminator,
      ...bullets.map((bullet) => `${bullet}${terminator}`),
      ...(closing ? [] : [terminator]),
    );
    return lines.join("\n");
  }

  const at = Math.min(endOfListItem(lines, open, insertAfter), end);
  const terminator = terminatorOf(lines[insertAfter]);
  lines.splice(at, 0, ...bullets.map((bullet) => `${bullet}${terminator}`));
  return lines.join("\n");
}
