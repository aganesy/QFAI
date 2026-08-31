import { constants } from "node:fs";
import type { FileHandle } from "node:fs/promises";
import { access, open, readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { collectFiles } from "../fs.js";
import { hasErrnoCode } from "../fs/errno.js";
import { parseHeadings } from "../parse/markdown.js";
import { splitMarkdownRow } from "../specPackParsers.js";
import { RULE_PROMOTIONS, newRuleSeverity } from "../sunset.js";
import type { Issue } from "../types.js";
import { resolveToolVersion } from "../version.js";
import { TODO_PLACEHOLDER_RE } from "./renderCritique.js";
import { issue } from "./utils.js";

const DRIFT_PROTOCOL_MARKER = "[DRIFT-PROTOCOL:MANDATORY]";
const REVIEWER_GATE_HEADING_PATTERN = /^###\s+Reviewer Gate\b.*$/im;
const ANY_MARKDOWN_HEADING_PATTERN = /^\s*#{1,6}\s+/m;

/**
 * The Stage 0 steering files the shared skill operating baseline names as
 * MANDATORY refresh targets. They ship from `qfai init` as templates whose
 * values are literal `<...>` placeholders, and `qfai-implement` Stage 0 is
 * told to take every Test / Lint / Typecheck / Build command from
 * `tech.md#standard-commands-copy-paste` rather than inventing one — so an
 * unreplaced `<test command>` is a gate that cannot run, which the
 * constitution classes as UNRUN rather than passed.
 */
const STEERING_CATALOG_FILES = ["manifest.md", "product.md", "structure.md", "tech.md"] as const;

/**
 * An unreplaced angle-bracket placeholder, e.g. `<test command>`.
 *
 * Deliberately narrow: the inner text may not span a line or nest another
 * bracket, and the negative lookahead drops closing tags (`</p>`) and
 * doctypes. HTML **comments** are not excluded here — the lookahead only
 * declined the opening `<!--`, leaving a commented-out `<obsolete command>`
 * inside it to match as the next token and fail a finished catalog under
 * `--strict`; whole comment spans are blanked by
 * {@link stripHtmlComments} before any line is scanned. Autolinks and mail
 * addresses are filtered in {@link isPlaceholderToken}, and bracketed link
 * destinations in {@link isLinkDestination}, rather than in the pattern, so
 * the reason each exclusion exists stays readable. Known
 * limitation: a genuine inline HTML tag written into a steering file
 * (`<br>`) still matches — these four files are prose templates, and the
 * alternative (a keyword allow-list) would miss the placeholders the
 * templates actually ship.
 */
const PLACEHOLDER_TOKEN_PATTERN = /<(?![/!])([^<>\n]{1,120})>/g;

/** An HTML comment, however many lines it spans. */
const HTML_COMMENT_PATTERN = /<!--[\s\S]*?-->/g;

/**
 * A CommonMark URI autolink body: `scheme:` then no whitespace or brackets.
 *
 * `<https://...>` is covered by this too, but so are `<tel:+1-212-555-0100>`
 * and `<urn:isbn:978...>`, which carry neither `://` nor an `@` and were
 * counted as unfilled slots — a false `QFAI-ASSETS-003` for any project whose
 * steering values are non-HTTP URIs.
 */
const URI_AUTOLINK_PATTERN = /^[A-Za-z][A-Za-z0-9+.-]{1,31}:[^\s<>]*$/;

/** A CommonMark email autolink body, e.g. `<team@example.com>`. */
const EMAIL_AUTOLINK_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * What may follow a pointy-bracket link destination: an optional title, `)`.
 *
 * `[設計書](<docs/System Design.md>)` is a *written* link whose destination is
 * bracketed because it carries a space — the one CommonMark shape that needs
 * the brackets. Its inner text is neither an autolink nor a mail address, so
 * it was counted as an unfilled slot and failed a finished catalog under
 * `--strict`. The token alone cannot tell the two apart; only the `](` before
 * it and the closing `)` after can, which is why the context is matched here.
 */
const LINK_DESTINATION_TAIL_PATTERN = /^\s*(?:"[^"]*"|'[^']*'|\([^()]*\))?\s*\)/;

/** Text before the first `## ` heading — the title and the "replace this" note. */
const PREAMBLE_SECTION = "(preamble)";

/**
 * A CommonMark list marker: `-` / `*` / `+`, or `1.` / `2)` for ordered lists.
 *
 * Every marker is accepted, not just `-` and `*`: a catalog written with
 * `+ TBD` or `1. TBD` left the whole line as the candidate value, where the
 * leading marker kept the bare-keyword test from ever matching and an
 * unfinished section passed `--strict`. Ordered markers are 1-9 digits
 * followed by `.` or `)`, as CommonMark defines them.
 */
const LIST_MARKER_PATTERN = /^\s*(?:[-*+]|\d{1,9}[.)])\s+/;

/**
 * A GFM task-list checkbox, which is structure rather than the value.
 *
 * `- [ ] TBD` is an unanswered open question, but stripping only the list
 * marker left `[ ] TBD` as the candidate value, which no keyword test can
 * match. Exactly one space, `x` or `X` between the brackets, as GFM defines
 * it — so a link label (`- [設計書](...)`) is not mistaken for a checkbox.
 */
const TASK_LIST_MARKER_PATTERN = /^\[[ xX]\]\s+/;

/** A markdown table row written with outer pipes: `| a | b |`. */
const TABLE_ROW_PATTERN = /^\s*\|.*\|\s*$/;

/**
 * A GFM delimiter row — `| --- | --- |`, or `--- | ---` without outer pipes.
 *
 * Outer pipes are optional in GFM, so a Milestones table written as
 * `Milestone | Description` / `TBD | TBD` matched neither
 * {@link TABLE_ROW_PATTERN} nor the bare-keyword test on the whole line, and
 * an unfilled table passed `--strict`. The delimiter row is what turns a
 * pipe-separated block into a table, so it — rather than the mere presence of
 * a `|` somewhere in a line of prose — is what {@link markTableRows} keys on.
 * At least one `|` is required, which is also what keeps a `---` thematic
 * break out.
 */
const TABLE_DELIMITER_ROW_PATTERN = /^\s*\|?(?:\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$/;

/**
 * Block-level starts that close a GFM table, besides the blank line and the
 * heading {@link markTableRows} already stopped at.
 *
 * A GFM table runs "until the first empty line or beginning of another
 * block-level structure", and a list written directly under the last row is
 * exactly that: `- Test: TBD` under a Milestones table is a new block, but it
 * was swept into the table's run, split on `|` into a single cell, and its
 * bullet label never stripped — so the `TBD` went uncounted. Deliberately
 * short of every CommonMark block start: an HTML-block test would read a
 * pipe-less row that opens with a slot (`<milestone name> | <what shipped>`)
 * as a tag and cut the table short, which is the error this rule cares about
 * more.
 */
const BLOCK_START_PATTERNS = [
  /^ {0,3}(?:[-*+]|\d{1,9}[.)])\s/, // list item
  /^ {0,3}>/, // block quote
  /^ {0,3}(?:`{3,}|~{3,})/, // fenced code
  /^ {0,3}(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/, // thematic break
];

/**
 * Read-only, and non-blocking where the platform defines it.
 *
 * Opening a FIFO for reading blocks until a writer appears. Windows has no
 * `O_NONBLOCK`, and no FIFOs in this sense either, so plain read-only there.
 */
const OPEN_READ_FLAGS =
  typeof constants.O_NONBLOCK === "number"
    ? constants.O_RDONLY | constants.O_NONBLOCK
    : constants.O_RDONLY;

/**
 * Errno codes that mean "there is no readable catalog file here", which this
 * rule skips because it is about unfilled content, not about layout.
 *
 * `ENOENT` is plain absence. The rest say something that is not a regular
 * file occupies the path: `ENXIO` is the non-blocking open of a writer-less
 * FIFO, `EISDIR` a directory, `ENOTDIR` a non-directory ancestor, `ELOOP` a
 * symlink cycle. Every other code — `EACCES`, `EIO`, `EMFILE` — is a read
 * that failed for a reason the operator needs to see, and propagates rather
 * than passing off as a filled-in catalog.
 */
const SKIPPABLE_READ_CODES = new Set(["ENOENT", "ENXIO", "EISDIR", "ENOTDIR", "ELOOP"]);

export async function validateAssistantAssets(root: string, config: QfaiConfig): Promise<Issue[]> {
  const skillsDir = resolvePath(root, config, "skillsDir");
  const assistantDir = path.dirname(skillsDir);

  // Post-recut: drift-protocol.md is canonically located at
  // .qfai/assistant/constitution/drift-protocol.md. Fall back to the
  // legacy instructions/ path during the compatibility window so
  // projects that have not yet run `qfai init --upgrade-assistant-tree`
  // pass for now.
  const canonicalDriftProtocolPath = path.join(assistantDir, "constitution", "drift-protocol.md");
  const legacyDriftProtocolPath = path.join(assistantDir, "instructions", "drift-protocol.md");
  const driftProtocolPath = (await exists(canonicalDriftProtocolPath))
    ? canonicalDriftProtocolPath
    : legacyDriftProtocolPath;
  // Post-recut: test-layers.md is canonically located at
  // .qfai/assistant/catalog/test-layers.md. Fall back to the legacy
  // steering/ path during the compatibility window so projects that
  // have not yet run `qfai init --upgrade-assistant-tree` are not
  // double-penalized (D-DEPRECATED-PATH + QFAI-ASSETS-002).
  const canonicalTestLayersPath = path.join(assistantDir, "catalog", "test-layers.md");
  const legacyTestLayersPath = path.join(assistantDir, "steering", "test-layers.md");
  const testLayersPath = (await exists(canonicalTestLayersPath))
    ? canonicalTestLayersPath
    : legacyTestLayersPath;

  const issues: Issue[] = [];

  if (!(await exists(driftProtocolPath))) {
    issues.push(
      issue(
        "QFAI-ASSETS-001",
        "必須ファイル .qfai/assistant/constitution/drift-protocol.md (legacy fallback: .qfai/assistant/instructions/drift-protocol.md) が見つかりません。",
        "error",
        canonicalDriftProtocolPath,
        "assistantAssets.driftProtocol",
      ),
    );
  }

  if (!(await exists(testLayersPath))) {
    issues.push(
      issue(
        "QFAI-ASSETS-002",
        "必須ファイル .qfai/assistant/catalog/test-layers.md (legacy fallback: .qfai/assistant/steering/test-layers.md) が見つかりません。",
        "error",
        canonicalTestLayersPath,
        "assistantAssets.testLayers",
      ),
    );
  }

  issues.push(...(await collectSteeringPlaceholderIssues(root, assistantDir)));

  const skillFiles = await collectSkillFiles([skillsDir]);
  for (const skillFile of skillFiles) {
    const content = await readFile(skillFile, "utf-8");

    if (!content.includes(DRIFT_PROTOCOL_MARKER)) {
      issues.push(
        issue(
          "QFAI-SKILLS-010",
          "SKILL.md に必須 marker [DRIFT-PROTOCOL:MANDATORY] がありません。",
          "error",
          skillFile,
          "skills.driftProtocolMarker",
        ),
      );
    }

    const reviewerGateSection = extractReviewerGateSection(content);
    if (reviewerGateSection === null) {
      issues.push(
        issue(
          "QFAI-SKILLS-011",
          "SKILL.md に `### Reviewer Gate` セクションがありません。",
          "error",
          skillFile,
          "skills.reviewerGate",
        ),
      );
      continue;
    }

    const missingTerms = collectMissingReviewerGateTerms(reviewerGateSection);
    if (missingTerms.length > 0) {
      issues.push(
        issue(
          "QFAI-SKILLS-012",
          `Reviewer Gate に Drift/test-layer 観点が不足しています（不足: ${missingTerms.join(", ")}）。`,
          "warning",
          skillFile,
          "skills.reviewerGatePolicy",
        ),
      );
    }
  }

  return issues;
}

/**
 * `QFAI-ASSETS-003` — Stage 0 steering files still holding shipped placeholders.
 *
 * Emits one finding per file, naming every `## ` section that still contains
 * an unreplaced `<...>` slot or a bare `TODO`/`TBD` value, so
 * `/qfai-configure` gets a work list rather than a single "something is
 * unfilled" flag.
 *
 * Severity comes from a promotion window, not from a literal beside the call.
 * The escalation the rule deserves — error, since Stage 0 has been mandatory
 * for at least one skill run by the time a project has specs — cannot land the
 * day the detector does: these four files are copied verbatim by `qfai init`,
 * so a project that has never run `/qfai-configure` would fail its own
 * `validate --profile full` gate on upgrade with four findings on files it
 * never touched. That is the migration P7 exists for, so the rule ships at
 * `warning` behind {@link RULE_PROMOTIONS.steeringCatalogPlaceholders} and
 * becomes an `error` at the pinned release. Writing `"warning"` here instead
 * would have been the same window with no way for it to ever open.
 *
 * A missing file is skipped: this rule is about unfilled content, and the
 * pre-recut `steering/` layout is already reported by `D-DEPRECATED-PATH`.
 */
async function collectSteeringPlaceholderIssues(
  root: string,
  assistantDir: string,
): Promise<Issue[]> {
  // `resolveToolVersion` resolves rather than rejects — a read failure returns
  // `"unknown"`, which the comparator reads as inside the window, so an
  // unreadable version can never be what escalates this into a build failure.
  const promoteAt = RULE_PROMOTIONS.steeringCatalogPlaceholders.promoteAt;
  const severity = newRuleSeverity(await resolveToolVersion(), promoteAt);
  const windowNote =
    severity === "warning"
      ? ` ${promoteAt} リリースまでは warning、それ以降は error として報告されます。`
      : "";
  const issues: Issue[] = [];
  for (const fileName of STEERING_CATALOG_FILES) {
    const filePath = path.join(assistantDir, "catalog", fileName);
    const content = await readSteeringFile(filePath);
    if (content === null) {
      continue;
    }
    const sections = collectSteeringPlaceholders(content);
    if (sections.length === 0) {
      continue;
    }
    const total = sections.reduce((sum, entry) => sum + entry.count, 0);
    const detail = sections.map((entry) => `${entry.section} (${entry.count})`).join(", ");
    issues.push(
      issue(
        "QFAI-ASSETS-003",
        `Stage 0 steering ファイル ${toRepoRelative(root, filePath)} に未置換のテンプレート値が ${total} 件残っています（該当セクション: ${detail}）。${windowNote}`,
        severity,
        filePath,
        "assistantAssets.steeringPlaceholder",
        sections.map((entry) => entry.section),
        "canonical",
        "`/qfai-configure` を実行し、`<...>` / `TBD` を実測値に置き換えてください。特に tech.md の Standard commands は qfai-implement Stage 0 が gate コマンドの唯一の取得元とするため、未記入のままだと gate が実行不能になります。",
        { loc: { line: sections[0]?.firstLine ?? 1 } },
      ),
    );
  }
  return issues;
}

/**
 * The catalog path as the operator sees it: repo-relative, POSIX separators.
 *
 * The message used to spell `.qfai/assistant/catalog/<file>` literally, which
 * is only where the file sits when `paths.skillsDir` is the default — a
 * project that relocated its assistant tree was pointed at a path it does not
 * have. Falls back to the absolute path when the file is somehow outside the
 * repo root, since a wrong relative path would be worse than a long one.
 */
function toRepoRelative(root: string, filePath: string): string {
  const relative = path.relative(root, filePath);
  if (relative.length === 0 || relative.startsWith("..") || path.isAbsolute(relative)) {
    return filePath;
  }
  return relative.split(path.sep).join("/");
}

/**
 * One catalog file's text, or `null` when nothing readable is at that path.
 *
 * Opened rather than `readFile`'d, for two reasons the plain read got wrong:
 *
 * - A FIFO at `catalog/tech.md` made the read **block until a writer
 *   appeared**, hanging `validate --profile full` / `verify` outright. The
 *   `O_NONBLOCK` open answers `ENXIO` instead, and the `isFile()` check on
 *   the handle's own `fstat` — the same inode that is about to be read —
 *   declines every other non-regular file.
 * - `catch {}` treated *every* failure as "the file is absent", so an
 *   `EACCES` from a restrictive ACL or a transient `EIO` silently dropped
 *   `QFAI-ASSETS-003` for that file. Only {@link SKIPPABLE_READ_CODES} skips
 *   now; anything else propagates.
 */
async function readSteeringFile(filePath: string): Promise<string | null> {
  let handle: FileHandle | undefined;
  try {
    handle = await open(filePath, OPEN_READ_FLAGS);
    const stats = await handle.stat();
    if (!stats.isFile()) return null;
    return await handle.readFile("utf-8");
  } catch (error) {
    if (hasErrnoCode(error) && SKIPPABLE_READ_CODES.has(error.code)) return null;
    throw error;
  } finally {
    await handle?.close();
  }
}

type SteeringPlaceholderSection = { section: string; count: number; firstLine: number };

/**
 * Comment spans replaced by spaces, keeping every line break in place.
 *
 * A commented-out slot is not work left to do, and blanking rather than
 * deleting keeps `firstLine` and the enclosing `## ` section pointing at the
 * same rows the operator sees in their editor.
 */
function stripHtmlComments(content: string): string {
  return content.replace(HTML_COMMENT_PATTERN, (span) => span.replace(/[^\n]/g, " "));
}

/** Whether this line opens a block that ends the table running above it. */
function endsTableBlock(line: string): boolean {
  if (line.trim().length === 0 || ANY_MARKDOWN_HEADING_PATTERN.test(line)) {
    return true;
  }
  return BLOCK_START_PATTERNS.some((pattern) => pattern.test(line));
}

/**
 * Which lines are table rows, including tables written without outer pipes.
 *
 * A delimiter row marks its table: the header row immediately above it and
 * every following line up to whatever closes the block — a blank line, a
 * heading, or any other block start ({@link endsTableBlock}). Rows already
 * carrying outer pipes stay rows whether or not a well-formed delimiter row
 * accompanies them, so nothing that was counted before is lost.
 */
function markTableRows(lines: string[]): boolean[] {
  const rows = lines.map((line) => TABLE_ROW_PATTERN.test(line));
  for (const [index, line] of lines.entries()) {
    if (index === 0 || !TABLE_DELIMITER_ROW_PATTERN.test(line)) {
      continue;
    }
    // GFM needs a header row directly above the delimiter; without one this
    // is not a table and its neighbours are ordinary prose.
    const header = lines[index - 1] ?? "";
    if (header.trim().length === 0 || ANY_MARKDOWN_HEADING_PATTERN.test(header)) {
      continue;
    }
    rows[index - 1] = true;
    rows[index] = true;
    for (let next = index + 1; next < lines.length; next += 1) {
      const body = lines[next] ?? "";
      if (endsTableBlock(body)) {
        break;
      }
      rows[next] = true;
    }
  }
  return rows;
}

/** Placeholder counts per `## ` section, in document order. */
function collectSteeringPlaceholders(content: string): SteeringPlaceholderSection[] {
  const bySection = new Map<string, { count: number; firstLine: number }>();
  let section = PREAMBLE_SECTION;
  const stripped = stripHtmlComments(content);
  const lines = stripped.split(/\r?\n/);
  const tableRows = markTableRows(lines);
  // The repo's own heading parser, rather than a second regex for the same
  // shape: it hands back the heading *text*, which is what a heading left as
  // `## TBD` or `## **TBD**` needs scanned. Passing the raw line kept the
  // `##` glued to the value, and the anchored keyword test never matched.
  const headings = new Map(parseHeadings(stripped).map((entry) => [entry.line - 1, entry]));
  for (const [index, line] of lines.entries()) {
    const heading = headings.get(index);
    if (heading?.level === 2) {
      // The heading names the section from here on — and is scanned too. A
      // `## <product area>` left unreplaced is exactly the work `/qfai-configure`
      // still owes, and skipping the line hid it whenever the body beneath it
      // had been filled in.
      section = heading.title;
    }
    const count = countUnfilledMarkers(heading?.title ?? line, tableRows[index] === true);
    if (count === 0) {
      continue;
    }
    const seen = bySection.get(section);
    if (seen === undefined) {
      bySection.set(section, { count, firstLine: index + 1 });
    } else {
      seen.count += count;
    }
  }
  return Array.from(bySection, ([name, entry]) => ({
    section: name,
    count: entry.count,
    firstLine: entry.firstLine,
  }));
}

/**
 * Unfilled slots on one line: `<...>` tokens **plus** bare `TODO`/`TBD` values.
 *
 * A partly filled row carries both shapes at once — `| <milestone name> | TBD |`
 * is two slots, not one — so the two kinds are added rather than the first
 * kind short-circuiting the line. Each counted `<...>` token is blanked out of
 * the text handed to {@link countBareTodoValues} so a slot whose inner text is
 * itself a placeholder keyword (`<placeholder>`) is still charged once.
 */
function countUnfilledMarkers(line: string, isTableRow: boolean): number {
  let count = 0;
  const withoutSlots = line.replace(
    PLACEHOLDER_TOKEN_PATTERN,
    (match: string, inner: unknown, offset: unknown) => {
      const at = typeof offset === "number" ? offset : -1;
      if (
        typeof inner === "string" &&
        !isFilledLinkDestination(line, at, match.length, inner) &&
        isPlaceholderToken(inner)
      ) {
        count += 1;
        return "";
      }
      return match;
    },
  );
  return count + countBareTodoValues(withoutSlots, isTableRow);
}

/**
 * Whether this `<...>` token is a **written** destination in `[text](<dest>)`.
 *
 * Read off the surrounding line rather than the token, because the token is
 * identical either way: `<docs/System Design.md>` is a filled-in destination
 * only when a `](` opens it and a `)` — optionally after a link title —
 * closes it.
 *
 * A destination that spells a placeholder keyword is not written, though:
 * `[設計書](<TBD>)` is a broken link and the very work the rule reports, so
 * the link context alone stopped being enough to excuse a token.
 */
function isFilledLinkDestination(
  line: string,
  offset: number,
  length: number,
  inner: string,
): boolean {
  if (isUnfilledValue(inner)) {
    return false;
  }
  if (offset < 2 || line.slice(offset - 2, offset) !== "](") {
    return false;
  }
  return LINK_DESTINATION_TAIL_PATTERN.test(line.slice(offset + length));
}

function isPlaceholderToken(inner: string): boolean {
  const trimmed = inner.trim();
  if (trimmed.length === 0) {
    return false;
  }
  // `<https://example.com>`, `<tel:+1-212-555-0100>`, `<urn:isbn:978...>` and
  // `<team@example.com>` are markdown autolinks — filled content, not a slot
  // still waiting for one. Matched on the autolink *syntax* (a scheme, then
  // no whitespace) rather than on `://`, so a project whose steering values
  // use a non-HTTP scheme is not told its catalog is unfilled.
  if (URI_AUTOLINK_PATTERN.test(trimmed) || EMAIL_AUTOLINK_PATTERN.test(trimmed)) {
    return false;
  }
  // Every shipped slot is prose or a slot name, so it carries a letter. Keeps
  // `<3`-style typography out of the count. Any Unicode letter counts, not
  // only `[A-Za-z]`: a steering file localised into Japanese names its slots
  // in Japanese, and demanding an ASCII letter let every one of them
  // (`<テストコマンド>`) pass as filled.
  return /\p{L}/u.test(trimmed);
}

/**
 * Bare `TODO` / `TBD` values on one line, in whichever shape the file uses.
 *
 * A bullet (`- Key: TBD`) was the only shape recognised at first, so the
 * Milestones **table** the shipped `product.md` actually carries read as
 * filled once someone typed `| TBD | TBD |` into it, and a section body left
 * as a lone `TBD` line passed the same way. All three are the "placeholder-
 * only text" the Stage 0 baseline names, so all three are counted — per cell
 * for a table row, since each cell is its own value.
 *
 * Whether the line is a table row is decided per file by
 * {@link markTableRows} rather than by the line alone: GFM makes the outer
 * pipes optional, and `TBD | TBD` is only recognisable as two cells from the
 * delimiter row above it.
 */
function countBareTodoValues(line: string, isTableRow: boolean): number {
  if (isTableRow) {
    // The repo's own GFM row splitter, not `split("|")`: it drops the outer
    // pipes and honours `\|`, the only way to write a pipe inside a cell. A
    // plain split cut `` `echo ok \| TBD` `` in half and read the tail as an
    // unfilled cell, failing a finished catalog under `--strict`.
    return splitMarkdownRow(line).filter((cell) => isUnfilledValue(cell)).length;
  }
  return isUnfilledListValue(line) ? 1 : 0;
}

/**
 * Whether one non-table line is an unfilled value, once its structure is off.
 *
 * Two shapes are tried, because a catalog writes values both ways:
 *
 * - the whole line minus the list marker and any task-list checkbox — `- TBD`,
 *   `- [ ] TBD`, or a section body left as a lone `TBD`;
 * - whatever follows the **last** colon, which is where a `label: value`
 *   bullet keeps its value. The label is taken as everything before that
 *   colon rather than matched by a shape, because labels carry the very
 *   characters a shape has to exclude: code spans (`` - Command for `lint`: TBD ``),
 *   emphasis (`- **Test:** TBD`) and URLs (`- Evidence URL (https://e.com): TBD`)
 *   all broke the previous `[^:`]{1,60}:` label and left the value unreadable.
 *   A value that itself contains a colon (`- Cutoff: 12:00`) is filled in, so
 *   reading only its tail cannot invent a finding.
 */
function isUnfilledListValue(line: string): boolean {
  const marker = LIST_MARKER_PATTERN.exec(line);
  const body =
    marker === null ? line : line.slice(marker[0].length).replace(TASK_LIST_MARKER_PATTERN, "");
  if (isUnfilledValue(body)) {
    return true;
  }
  const separator = body.lastIndexOf(":");
  return separator >= 0 && isUnfilledValue(body.slice(separator + 1));
}

/**
 * `TBD` / `` `TODO` `` / `**TBD**` — a placeholder keyword and nothing else.
 *
 * Code spans and markdown emphasis (`*`, `_`, `~`) are decoration an operator
 * puts *around* a value, not part of it, so they are peeled off both ends
 * before the keyword test. Without that, a catalog whose remaining slots read
 * `**TBD**` passed as filled.
 */
function isUnfilledValue(raw: string): boolean {
  const value = raw
    .trim()
    .replace(/^[`*_~]+|[`*_~]+$/g, "")
    .trim();
  // The shared regex also matches an empty string, but an empty bullet or
  // table cell is layout rather than an unfilled slot, so only real text is
  // judged.
  return value.length > 0 && TODO_PLACEHOLDER_RE.test(value);
}

async function collectSkillFiles(dirs: string[]): Promise<string[]> {
  const files = await Promise.all(dirs.map((dir) => collectFiles(dir)));
  return files
    .flat()
    .filter((filePath) => path.basename(filePath) === "SKILL.md")
    .sort((a, b) => a.localeCompare(b));
}

function extractReviewerGateSection(content: string): string | null {
  const headingMatch = REVIEWER_GATE_HEADING_PATTERN.exec(content);
  if (!headingMatch) {
    return null;
  }
  const headingStart = headingMatch.index;
  const headingText = headingMatch[0];
  const sectionStart = headingStart + headingText.length;
  const remainder = content.slice(sectionStart);
  const nextHeadingMatch = ANY_MARKDOWN_HEADING_PATTERN.exec(remainder);
  if (!nextHeadingMatch) {
    return remainder;
  }
  return remainder.slice(0, nextHeadingMatch.index);
}

function collectMissingReviewerGateTerms(section: string): string[] {
  const missing: string[] = [];
  if (!/drift protocol/i.test(section)) {
    missing.push("Drift Protocol");
  }
  if (!/test-layers\.md/i.test(section)) {
    missing.push("test-layers.md");
  }
  const hasSignalsPhrase = /\bnot gates?\b/i.test(section) || /\bsignals?\b/i.test(section);
  if (!hasSignalsPhrase) {
    missing.push("not gates/signals");
  }
  return missing;
}

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}
