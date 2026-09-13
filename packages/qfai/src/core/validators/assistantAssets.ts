import { constants } from "node:fs";
import type { FileHandle } from "node:fs/promises";
import { access, lstat, open, readdir, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";

import {
  ADOPTER_OWNED_ASSETS,
  ADOPTER_OWNED_CATALOG_FILES,
  ASSISTANT_ASSETS_LOCK_BASENAME,
  GOVERNED_ASSISTANT_LAYERS,
  REGENERATED_ASSISTANT_LAYERS,
  buildShippedAssistantHashes,
  classifyAssistantAsset,
  collectGovernedAssistantFiles,
  collectRegeneratedAssistantFiles,
  hasRealGovernedAssistantParents,
  hashAssistantAssetFile,
  readAssistantAssetsLockStatus,
} from "../assistantAssetProvenance.js";
import type {
  AssistantAssetStatus,
  RegeneratedAssistantLayer,
} from "../assistantAssetProvenance.js";
import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { parseSkillFrontmatter, skillFrontmatterMapping } from "../agentFrontmatter.js";
import { collectFiles } from "../fs.js";
import { hasErrnoCode, isEnoent } from "../fs/errno.js";
import { readBoundedRegularFile } from "../../shared/boundedRead.js";
import { parseHeadings } from "../parse/markdown.js";
import { ASSISTANT_DIR } from "../paths/assistantPaths.js";
import { escapeRegExp } from "../regex.js";
import { splitMarkdownRow } from "../specPackParsers.js";
import type { Issue } from "../types.js";
import { getInitAssetsDir } from "../../shared/assets.js";
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
const STEERING_CATALOG_FILES = ADOPTER_OWNED_CATALOG_FILES;

/**
 * The provenance verdicts that mean "this file's content differs from the
 * release", which is the finished state for an adopter-owned document.
 *
 * Named as a set rather than tested inline so the pair stays together: they are
 * the same condition seen through a lock that has or has not been rewritten,
 * and exempting one without the other is what leaves the finding reachable.
 */
const ADOPTER_OWNED_DIVERGENCE: ReadonlySet<AssistantAssetStatus> = new Set([
  "forked",
  "stale",
] as const);

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
  // still pass.
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

  issues.push(...(await validateAssistantAssetProvenance(root, assistantDir)));
  issues.push(...(await collectRegeneratedLayerIssues(root, assistantDir)));
  issues.push(...(await collectSteeringPlaceholderIssues(root, assistantDir)));

  // Every skill-tree document is read once, here, and both the per-`SKILL.md`
  // checks below and the reference graph work from that one map.
  //
  // Reading `SKILL.md` twice — once by an unguarded `readFile` in the loop
  // below, and again by the graph — would let the unguarded read run first, so
  // an unreadable `SKILL.md` would reject this whole validator before
  // `QFAI-SKILLS-014` could report it: the entry point would be the one file
  // the rule could never speak about. Reading once also means the marker
  // checks and the citation graph can never disagree about a file's bytes.
  const { documents, unreadable } = await readSkillDocuments(skillsDir);
  issues.push(...unreadable);

  const skillFiles = await collectSkillFiles([skillsDir]);
  for (const skillFile of skillFiles) {
    const content = documents.get(skillFile);
    if (content === undefined) {
      // Unreadable, and already reported as `QFAI-SKILLS-014` above. The
      // marker and Reviewer-Gate checks have no bytes to judge.
      continue;
    }

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

  // Registration is asked of the loader boundary, not of every file named
  // SKILL.md: a template or an example copy below a skill is registered by
  // nothing, and a skill in a directory the crawl ignores is registered all the
  // same.
  const crawled = new Set(skillFiles);
  for (const entryPoint of await collectSkillEntryPoints(skillsDir)) {
    if (crawled.has(entryPoint)) {
      const content = documents.get(entryPoint);
      // Absent from the map means the crawl could not read it, and has already
      // said so. Reading it again here reports the same fault twice.
      if (content !== undefined)
        issues.push(...collectSkillRegistrationIssues(entryPoint, content));
      continue;
    }
    // Outside the crawl — a directory on the shared ignore list — so nothing has
    // reported this file, and a read that fails here is the only chance to say
    // the skill cannot be loaded.
    //
    // Through the bounded reader rather than a bare read: the path is whatever
    // the adopter's tree holds, and a FIFO does not fail on open — it blocks
    // until somebody writes to it, which would hang the run instead of
    // reporting the skill.
    // Resolved first, because the host opens through a link and the bounded
    // reader refuses one at the final component. What the reader then decides
    // is what the host would find at the other end: a regular file, or not.
    const resolved = await realpath(entryPoint).catch(() => entryPoint);
    const bytes = await readBoundedRegularFile(resolved, SKILL_DOCUMENT_MAX_BYTES);
    if (bytes === undefined) {
      issues.push(
        issue(
          "QFAI-SKILLS-014",
          `A skill's entry point is not an ordinary file this run can read within ${String(SKILL_DOCUMENT_MAX_BYTES)} bytes, so the host cannot load it either.`,
          "error",
          entryPoint,
          "skills.documentReadable",
          undefined,
          "canonical",
          "Make the entry point an ordinary readable file — grant read permission, repair a broken symlink, replace a directory or a device with the document — or delete it if it does not belong under `skills`.",
        ),
      );
      continue;
    }
    // Decoded strictly. `toString("utf-8")` turns an invalid byte into a
    // replacement character and hands back metadata that reads as usable, while
    // the host reports the file unreadable and omits the skill — so a run
    // passed an entry point nothing could load.
    const text = decodeUtf8(bytes);
    if (text === undefined) {
      issues.push(
        issue(
          "QFAI-SKILLS-014",
          "A skill's entry point holds bytes that are not valid UTF-8, so the host reports it unreadable and does not load the skill.",
          "error",
          entryPoint,
          "skills.documentReadable",
          undefined,
          "canonical",
          "Save the entry point as UTF-8. A byte that is not part of a valid sequence is usually text pasted from another encoding, or a binary file left at the path.",
        ),
      );
      continue;
    }
    issues.push(...collectSkillRegistrationIssues(entryPoint, text));
  }

  issues.push(...collectReferenceGraphIssues(root, skillsDir, documents));

  return issues;
}

/**
 * Compares the vendored `constitution/` and `catalog/` layers against the
 * release that is actually installed.
 *
 * Before this check the only coverage of qfai's own normative tree was two
 * existence probes, so a project could rewrite the file qfai calls its layer
 * SSOT and nothing anywhere would say so — downstream reasoning then cites the
 * fork by line number as though it were shipped policy. The three findings are
 * separate because the remedies are: a stale copy is refreshed by
 * `qfai init --force`, a fork needs a human merge decision, and an unshipped
 * file belongs in a `*.local.md` overlay.
 *
 * A project with no recorded provenance is not penalised for that alone: an
 * absent record is not itself a finding, and only files that also differ from
 * the installed release are reported. What severity they carry is not fixed
 * here; the whole family carries one severity, resolved once below.
 */
async function validateAssistantAssetProvenance(
  root: string,
  assistantDir: string,
): Promise<Issue[]> {
  // Nothing compared the governed layers before, so the first run that records
  // provenance meets every edit a project ever made to them at once. The remedy
  // is `qfai init --force`, which refreshes a file still matching its record,
  // and a manual merge for one that does not. What follows
  // unreadable version can never be what escalates these into a build failure.
  const assetProvenanceSeverity = "error";

  let shipped: Record<string, string>;
  try {
    // Path SSOT (`.qfai/contracts/cli/qfai-init.md`): the assistant-tree
    // segments come from `assistantPaths.ts` in init and in validate alike, so
    // a future move of `ASSISTANT_DIR` cannot leave the two reading different
    // trees.
    shipped = await buildShippedAssistantHashes(
      path.join(getInitAssetsDir(), ...ASSISTANT_DIR.split("/")),
    );
  } catch (error: unknown) {
    // Not "nothing to report": the comparison could not be made at all. An
    // install missing a governed layer, an unreadable shipped file, or a
    // library consumer without the package assets all land here, and returning
    // no findings let every such tree pass `validate` with its provenance
    // unchecked — `init` already fails closed on the same condition, so only
    // this side accepted it. The inability is itself the finding.
    return [unverifiableProvenanceIssue(assistantDir, "shipped", error, assetProvenanceSeverity)];
  }

  // Every component from the project root down, not just the layer directory.
  // `lstat` declines to resolve only the path it is given, so a `.qfai` — or a
  // `.qfai/assistant` — that is a symlink out of the repository still reported a
  // real `constitution/` on the far side: `validate` would walk and hash an
  // external tree, pass in silence whenever it matched the release, and take as
  // long as that tree was big. The same guard `init` applies before it writes.
  if (!(await hasRealGovernedAssistantParents(root, `${ASSISTANT_DIR}/probe`))) {
    return [
      unverifiableProvenanceIssue(
        assistantDir,
        "vendored",
        new Error(
          `A component of the path to ${ASSISTANT_DIR}/ is not a real directory (a symlink or junction may point outside the project).`,
        ),
        assetProvenanceSeverity,
      ),
    ];
  }

  const lockStatus = await readAssistantAssetsLockStatus(assistantDir);
  if (lockStatus.kind === "unreadable") {
    // Not "no record". A record that is there and unusable leaves the project
    // looking never-initialised, and every absence the record makes reportable
    // — a deleted layer above all — goes quiet with it.
    return [
      unverifiableProvenanceIssue(
        assistantDir,
        "record",
        new Error(`${ASSISTANT_ASSETS_LOCK_BASENAME}: ${lockStatus.reason}`),
        assetProvenanceSeverity,
      ),
    ];
  }
  const lock = lockStatus.kind === "lock" ? lockStatus.lock : null;
  const issues: Issue[] = [];
  let vendored: string[];
  try {
    vendored = await collectGovernedAssistantFiles(assistantDir);
  } catch (error: unknown) {
    // Same reasoning on the project's own side. A layer root that is not a real
    // directory reaches here rather than being walked.
    return [unverifiableProvenanceIssue(assistantDir, "vendored", error, assetProvenanceSeverity)];
  }

  // The union of both key sets, not just what is on disk. Walking only the
  // vendored files never classified a governed file the project deleted, so
  // removing a normative rule was the one edit that passed `validate` in
  // silence — the exact bypass this check exists to close.
  const relatives = [...new Set([...Object.keys(shipped), ...vendored])].sort((a, b) =>
    a.localeCompare(b),
  );

  // An absence is only reportable inside a layer the project actually has. A
  // consumer that never ran `init` here, or one still on the pre-recut
  // `instructions/` + `steering/` layout, is not missing files — it has no
  // governed layer at all, and reporting every shipped rule at it would be
  // noise, not governance.
  const presentLayers = new Set<string>();
  for (const layer of GOVERNED_ASSISTANT_LAYERS) {
    if (await isDirectory(path.join(assistantDir, layer))) {
      presentLayers.add(layer);
    }
  }

  // …unless the record says the project once had it. The exclusion above is
  // about a project that never received a layer, and it read a *deleted* one
  // the same way: with the layer gone, every shipped file under it was skipped
  // before `coveredByExistenceProbe` could see it, and QFAI-ASSETS-001/002 were
  // satisfied by the legacy fallback that `runUpgradeAssistantTree` leaves
  // behind — so on exactly the layout the upgrade path produces, deleting a
  // whole layer of normative rules passed `validate` in silence. A lock entry
  // under that layer is the evidence that qfai did put files there, and the
  // disappearance is reported once, against the layer, rather than once per
  // shipped file it used to hold.
  const recordedLayers = new Set<string>();
  for (const key of Object.keys(lock?.files ?? {})) {
    recordedLayers.add(key.split("/")[0] ?? "");
  }
  for (const layer of GOVERNED_ASSISTANT_LAYERS) {
    if (!presentLayers.has(layer) && recordedLayers.has(layer)) {
      issues.push(missingGovernedLayerIssue(assistantDir, layer, assetProvenanceSeverity));
    }
  }

  for (const relative of relatives) {
    const filePath = path.join(assistantDir, ...relative.split("/"));
    const status = classifyAssistantAsset(
      await hashAssistantAssetFile(filePath),
      shipped[relative],
      lock?.files[relative],
    );
    if (status === "missing" && !presentLayers.has(relative.split("/")[0] ?? "")) {
      continue;
    }
    if (status === "missing" && (await coveredByExistenceProbe(assistantDir, relative))) {
      // QFAI-ASSETS-001/002 already own these two: reporting the absence again
      // here would duplicate the finding. They only cover it while the legacy
      // fallback is *also* absent, though — see `coveredByExistenceProbe`.
      continue;
    }
    if (ADOPTER_OWNED_DIVERGENCE.has(status) && ADOPTER_OWNED_ASSETS.has(relative)) {
      // Filling these in is the instruction they carry, so the difference is
      // the finished state rather than a fork or a stale copy. What is left
      // unfilled is `QFAI-ASSETS-003`, which reads the same four files.
      continue;
    }
    const finding = provenanceIssue(status, relative, filePath, assetProvenanceSeverity);
    if (finding !== null) {
      issues.push(finding);
    }
  }

  return issues;
}

/**
 * How many differing paths a finding names before it stops listing them.
 *
 * Exported so the guard over this rule reads the cap rather than restating it.
 * A literal on each side is two answers to one question, and the pair goes
 * quiet the moment they disagree.
 */
export const NAMED_STALE_FILES = 3;

/**
 * `QFAI-ASSETS-009` — a regenerated layer behind the installed release.
 *
 * `skills/**` and `agents/**` are copied into the project once and refreshed
 * only by an explicit `qfai init --force`, so an upgraded project keeps running
 * the skill bodies and agent definitions it initialised with. A `SKILL.md`
 * several releases behind describes a workflow the installed validators no
 * longer implement, and it reads as authoritative because it is checked in.
 *
 * **One finding per layer, not one per file.** A project one release behind
 * differs in many files at once — the trees hold well over a hundred between
 * them — and a finding per file would bury every other result in the run.
 *
 * The comparison is against the shipped bytes alone. The governed layers need a
 * record of what qfai wrote so `--force` can tell a stale copy from a fork and
 * refresh only the first; here `--force` overwrites either way, so there is no
 * merge decision for a record to protect and nothing a record would add.
 *
 * That is also why the hint says the local edit is lost. `QFAI-ASSETS-004` can
 * offer `--force` as a plain refresh because a diverged file is left alone;
 * this layer has no such exemption, and a fix hint that quietly destroys work
 * is worse than the staleness it clears.
 *
 * Only what the release ships is compared. A file the project holds that the
 * release does not is left alone: `--force` copies, it does not prune, so
 * reporting one would name something the remedy cannot fix.
 */
async function collectRegeneratedLayerIssues(root: string, assistantDir: string): Promise<Issue[]> {
  const severity = "error";
  const shippedRoot = path.join(getInitAssetsDir(), ...ASSISTANT_DIR.split("/"));

  // The same parent-path guard the governed comparison applies, for the same
  // reason: a `.qfai` — or a `.qfai/assistant` — that links out of the
  // repository would have this walk hashing an external tree and passing
  // whenever it happened to match. The layer roots' own `lstat` check does not
  // cover it, because the link is above them.
  //
  // Abstains rather than reporting. The condition is about the path to the
  // assistant tree, not about one layer, and the governed comparison ahead of
  // this one raises `QFAI-ASSETS-008` for it in the same run — so reporting it
  // again would be one fault printed twice, differing only in which layers each
  // copy names.
  if (!(await hasRealGovernedAssistantParents(root, `${ASSISTANT_DIR}/probe`))) {
    return [];
  }

  const issues: Issue[] = [];
  for (const layer of REGENERATED_ASSISTANT_LAYERS) {
    // A project that never ran `init` here, or one still on the pre-recut
    // layout, has no such layer — it is not behind, it has nothing. Reporting
    // every shipped file at it would be noise rather than governance.
    if (!(await isDirectory(path.join(assistantDir, layer)))) {
      continue;
    }
    const finding = await regeneratedLayerIssue(assistantDir, shippedRoot, layer, severity);
    if (finding !== null) {
      issues.push(finding);
    }
  }
  return issues;
}

/** The finding for one regenerated layer, or `null` when it matches the release. */
async function regeneratedLayerIssue(
  assistantDir: string,
  shippedRoot: string,
  layer: RegeneratedAssistantLayer,
  severity: ProvenanceSeverity,
): Promise<Issue | null> {
  let shippedFiles: string[];
  try {
    shippedFiles = await collectRegeneratedAssistantFiles(shippedRoot, layer);
  } catch (error: unknown) {
    return unverifiableProvenanceIssue(assistantDir, "shipped", error, severity, [layer]);
  }
  if (shippedFiles.length === 0) {
    // Not "nothing to compare against, so nothing is wrong". The release ships
    // these layers, so an empty one is an install that lost them, and passing
    // here would report a tree as current on the strength of having no
    // yardstick.
    return unverifiableProvenanceIssue(
      assistantDir,
      "shipped",
      new Error(`the installed release ships no files under ${layer}/`),
      severity,
      [layer],
    );
  }

  const behind: string[] = [];
  for (const relative of shippedFiles) {
    const segments = relative.split("/");
    const shippedHash = await hashAssistantAssetFile(path.join(shippedRoot, ...segments), {
      // Whatever the package manager materialised. A store that links a shipped
      // file into place is not a fault of the project's.
      allowSymlink: true,
    });
    if (shippedHash === null) {
      // One unreadable shipped file is not evidence about the project's copy,
      // and calling it a difference would report staleness the remedy cannot
      // clear. The install is the problem, and it is the governed comparison's
      // to report.
      continue;
    }
    const projectHash = await hashAssistantAssetFile(path.join(assistantDir, ...segments));
    if (projectHash !== shippedHash) {
      behind.push(relative);
    }
  }
  if (behind.length === 0) {
    return null;
  }

  const named = behind.slice(0, NAMED_STALE_FILES).join(", ");
  const rest = behind.length - NAMED_STALE_FILES;
  const examples = rest > 0 ? `${named} and ${String(rest)} more` : named;
  return issue(
    "QFAI-ASSETS-009",
    `${ASSISTANT_DIR}/${layer}/ differs from the installed release in ${String(behind.length)} of ` +
      `the ${String(shippedFiles.length)} files it ships (${examples}). ` +
      "`qfai init` copies this layer once and only `--force` refreshes it, so the project is " +
      `running the ${layer} it initialised with.`,
    severity,
    path.join(assistantDir, layer),
    "assistantAssets.staleRegeneratedLayer",
    undefined,
    "canonical",
    `Run \`qfai init --force\` to regenerate ${ASSISTANT_DIR}/${layer}/ from the installed release. ` +
      "It overwrites every file in that layer, local edits included, so save any you mean to keep " +
      "before running it.",
  );
}

/**
 * `QFAI-ASSETS-003` — Stage 0 steering files still holding shipped placeholders.
 *
 * Emits one finding per file, naming every `## ` section that still contains
 * an unreplaced `<...>` slot or a bare `TODO`/`TBD` value, so
 * `/qfai-configure` gets a work list rather than a single "something is
 * unfilled" flag.
 *
 * An error, because Stage 0 is mandatory before a skill run and these four
 * files are the input every later phase reads. `qfai init` copies them verbatim
 * with their placeholders, so a project that has never run `/qfai-configure`
 * meets four findings on files it has not touched — which is the rule saying
 * Stage 0 is outstanding, and it clears when Stage 0 is done.
 *
 * A missing file is skipped: this rule is about unfilled content, and the
 * pre-recut `steering/` layout is already reported by `D-DEPRECATED-PATH`.
 */
async function collectSteeringPlaceholderIssues(
  root: string,
  assistantDir: string,
): Promise<Issue[]> {
  const severity = "error";
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
        `Stage 0 steering ファイル ${toRepoRelative(root, filePath)} に未置換のテンプレート値が ${total} 件残っています（該当セクション: ${detail}）。`,
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
 * A governed layer the record says qfai populated, which is no longer a
 * directory at all.
 *
 * Reported under `QFAI-ASSETS-007` — the same code a single deleted rule
 * carries — because it is the same defect at layer granularity, and the same
 * `npx qfai init` restores it.
 */
function missingGovernedLayerIssue(
  assistantDir: string,
  layer: string,
  assetProvenanceSeverity: ProvenanceSeverity,
): Issue {
  return issue(
    "QFAI-ASSETS-007",
    `${ASSISTANT_DIR}/${layer}/ is a governed layer recorded in .assets.lock.json, but no directory is there (the whole layer is missing).`,
    assetProvenanceSeverity,
    path.join(assistantDir, layer),
    "assistantAssets.missingVendoredLayer",
    undefined,
    "canonical",
    "Run `qfai init` to restore the shipped files of the missing layer. To take a normative rule out of scope, leave a Change Request rather than deleting it.",
  );
}

/**
 * Governed paths the existence probes above also check, mapped to the legacy
 * pre-recut path each one falls back to.
 */
const EXISTENCE_CHECKED_ELSEWHERE = new Map([
  ["constitution/drift-protocol.md", path.join("instructions", "drift-protocol.md")],
  ["catalog/test-layers.md", path.join("steering", "test-layers.md")],
]);

/**
 * True when QFAI-ASSETS-001/002 would report this absence itself.
 *
 * Those probes accept the legacy pre-recut path, so they report the canonical
 * file's absence only when the legacy one is missing too. A project part-way
 * through the recut — which `runUpgradeAssistantTree` produces deliberately,
 * since it leaves the legacy file behind — has both layouts at once, and
 * deleting the canonical rule there satisfied the probe from the legacy copy
 * while this exclusion silenced the provenance check. Removing a normative rule
 * was reportable in every layout but the one the upgrade path creates.
 *
 * The canonical path is checked for the same reason, and the two probes ask a
 * weaker question than this one: `access` answers "something is reachable
 * there", while provenance requires a readable **regular file**. A canonical
 * path left as a symlink, a directory or a FIFO therefore satisfies the probe
 * and is `missing` here, and deferring to a probe that will stay quiet is how
 * the absence would go unreported by both.
 */
async function coveredByExistenceProbe(assistantDir: string, relative: string): Promise<boolean> {
  const legacy = EXISTENCE_CHECKED_ELSEWHERE.get(relative);
  if (legacy === undefined) {
    return false;
  }
  const canonical = path.join(assistantDir, ...relative.split("/"));
  return !(await exists(canonical)) && !(await exists(path.join(assistantDir, legacy)));
}

/**
 * The governed layers could not be compared at all — so say so, rather than
 * reporting a clean tree.
 */
function unverifiableProvenanceIssue(
  assistantDir: string,
  side: "shipped" | "vendored" | "record",
  error: unknown,
  assetProvenanceSeverity: ProvenanceSeverity,
  // Which layers went unverified. Defaulted to the governed ones so the
  // provenance callers read as they did; the regenerated layers pass their own,
  // because a message naming `constitution/ / catalog/` for a `skills/` failure
  // sends the reader to the wrong directory.
  layers: readonly string[] = GOVERNED_ASSISTANT_LAYERS,
): Issue {
  const detail = error instanceof Error ? error.message : String(error);
  const subject =
    side === "shipped"
      ? "the shipped assets of the installed qfai release"
      : side === "record"
        ? `the project's provenance record (${ASSISTANT_DIR}/${ASSISTANT_ASSETS_LOCK_BASENAME})`
        : `the project's governed layers under ${ASSISTANT_DIR}/`;
  return issue(
    "QFAI-ASSETS-008",
    `${subject} could not be read, so the provenance of ${layers
      .map((layer) => `${layer}/`)
      .join(" / ")} was not verified (${detail}).`,
    assetProvenanceSeverity,
    assistantDir,
    "assistantAssets.unverifiableProvenance",
    undefined,
    "canonical",
    "Reinstall qfai, confirm each governed layer exists as a real directory (not a symlink or a junction), then run this again.",
  );
}

/**
 * The severity the whole provenance family carries, resolved once. Threaded in
 * rather than repeated per finding so the five codes cannot drift apart.
 */
type ProvenanceSeverity = "warning" | "error";

function provenanceIssue(
  status: ReturnType<typeof classifyAssistantAsset>,
  relative: string,
  filePath: string,
  assetProvenanceSeverity: ProvenanceSeverity,
): Issue | null {
  switch (status) {
    case "shipped":
      return null;
    case "stale":
      return issue(
        "QFAI-ASSETS-004",
        `${ASSISTANT_DIR}/${relative} still holds exactly what qfai wrote, but that differs from the content of the installed release (a stale copy).`,
        assetProvenanceSeverity,
        filePath,
        "assistantAssets.staleVendoredAsset",
        undefined,
        "canonical",
        "Run `qfai init --force` to refresh only the files that still hold what qfai wrote to the installed release.",
      );
    case "forked":
      return issue(
        "QFAI-ASSETS-005",
        `${ASSISTANT_DIR}/${relative} matches neither the content of the installed release nor the ${ASSISTANT_ASSETS_LOCK_BASENAME} record (a local fork).`,
        assetProvenanceSeverity,
        filePath,
        "assistantAssets.forkedVendoredAsset",
        undefined,
        "canonical",
        "Move the project-specific rule into a `*.local.md` overlay of the same layer and restore the qfai-owned file to its shipped content. If the difference has to be permanent, leave a Change Request.",
      );
    case "unshipped":
      return issue(
        "QFAI-ASSETS-006",
        `${ASSISTANT_DIR}/${relative} is a file the installed release does not ship (an addition that is not an overlay).`,
        assetProvenanceSeverity,
        filePath,
        "assistantAssets.unshippedVendoredAsset",
        undefined,
        "canonical",
        "Re-file it as a `*.local.md` overlay: qfai init never writes an overlay and the provenance check never reports one.",
      );
    case "missing":
      return issue(
        "QFAI-ASSETS-007",
        `${ASSISTANT_DIR}/${relative} is a normative file the installed release ships, but it is not there as a regular file (missing).`,
        assetProvenanceSeverity,
        filePath,
        "assistantAssets.missingVendoredAsset",
        undefined,
        "canonical",
        "Run `qfai init` to restore the missing shipped file (if a directory or a special file occupies the path, `qfai init --force` replaces it). To take a normative rule out of scope, leave a Change Request rather than deleting it.",
      );
  }
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
 * Recognising only a bullet (`- Key: TBD`) would let the Milestones **table**
 * the shipped `product.md` actually carries read as filled once someone typed
 * `| TBD | TBD |` into it, and let a section body left as a lone `TBD` line
 * pass the same way. All three are the "placeholder-
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

/**
 * The `SKILL.md` of every direct subdirectory of `skillsDir`.
 *
 * The document crawl skips directories on the shared ignore list — `tmp`,
 * `dist` and the rest — and those are ordinary names for a skill. The loader
 * skips nothing: it opens one `SKILL.md` per direct subdirectory whatever the
 * directory is called, so a skill in one of them is registered, or fails to be,
 * with the crawl saying nothing about it either way.
 */
/**
 * The ceiling on a skill entry point this pass reads.
 *
 * The bound is there for the kind rather than for the size: the reader that
 * refuses a FIFO and a device takes one, and a document is refused only if it
 * passes this.
 *
 * SIMPLIFIED: no host states a size limit, so this number is the reader's
 * requirement rather than a rule about skills — and it applies only to the
 * entry points the document crawl did not reach, which reads without a bound.
 * Lift when: a host documents a limit of its own, or an adopter reports a
 * `SKILL.md` refused for its size.
 */
const SKILL_DOCUMENT_MAX_BYTES = 8 * 1024 * 1024;

/**
 * A document's text, or `undefined` where the bytes are not valid UTF-8.
 *
 * Through a fatal decoder, because the lenient one substitutes a replacement
 * character and produces a document that parses: the front matter then reads as
 * usable metadata for a file the host refuses to open.
 */
function decodeUtf8(bytes: Buffer): string | undefined {
  try {
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    return undefined;
  }
}

async function collectSkillEntryPoints(skillsDir: string): Promise<string[]> {
  const entries = await readdir(skillsDir, { withFileTypes: true }).catch(() => []);
  const found: string[] = [];
  for (const entry of entries) {
    if (isHiddenSkillDirectory(skillsDir, path.join(skillsDir, entry.name))) continue;
    // A symlinked skill directory is a shape this CLI itself writes, and
    // `isDirectory()` is false for the link. What matters is what it resolves
    // to — and a link that resolves to nothing, or to something this process
    // cannot traverse, is a skill path the host cannot load either. Excluding
    // it here is the silence the guarded read exists to break, so it is kept
    // and the read reports it.
    const resolved = entry.isDirectory()
      ? true
      : entry.isSymbolicLink()
        ? ((await stat(path.join(skillsDir, entry.name)).catch(() => null))?.isDirectory() ?? null)
        : false;
    if (resolved === false) continue;
    const file = path.join(skillsDir, entry.name, "SKILL.md");
    if (resolved === null) {
      found.push(file);
      continue;
    }
    // Absent is the ordinary answer for a directory that holds no skill.
    // Anything else — a directory this process may not traverse, an I/O fault,
    // a `SKILL.md` that is a directory or a device — is an entry point the host
    // cannot load, and the read below is what says so.
    const probe = await stat(file)
      .then((stats) => (stats.isFile() ? "file" : "unusable"))
      .catch(async (cause: unknown) => {
        // A dangling symlink resolves to nothing and reports `ENOENT`, which is
        // the same answer as a directory holding no skill. `lstat` tells them
        // apart: the link is there, the host cannot load it, and the read below
        // is what says so.
        if (!isEnoent(cause)) return "unusable";
        const link = await lstat(file).catch(() => null);
        return link === null ? "absent" : "unusable";
      });
    if (probe !== "absent") found.push(file);
  }
  return found.sort((a, b) => a.localeCompare(b));
}

async function collectSkillFiles(dirs: string[]): Promise<string[]> {
  const files = await Promise.all(
    dirs.map((dir) =>
      collectFiles(dir, { skipDirectory: (directory) => isHiddenSkillDirectory(dir, directory) }),
    ),
  );
  return files
    .flat()
    .filter((filePath) => path.basename(filePath) === "SKILL.md")
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Whether a directory is a skill directory the host does not list: a
 * dot-prefixed one directly under the skills root.
 *
 * A draft parked as `.draft/` is a skill nothing registers. The walk is what
 * applies it, so the tree is never read: dropping its files afterwards leaves a
 * directory this process may not traverse failing the whole run, over a skill
 * the host never loads. A dot-prefixed directory inside a skill is not one — a
 * registered skill can name a document under it — so it is read like any
 * other.
 */
function isHiddenSkillDirectory(skillsDir: string, directory: string): boolean {
  const relative = path.relative(skillsDir, directory);
  return relative.startsWith(".") && relative !== ".." && !relative.includes(path.sep);
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

/**
 * A skill whose `name:` a host cannot key it by.
 *
 * Its own finding rather than a clause in the description one: the two fields
 * fail independently, and a document missing both should say so twice rather
 * than name whichever was checked first.
 */
function collectSkillNameIssue(
  skillFile: string,
  frontMatter: Record<string, unknown> | undefined,
): Issue[] {
  const directory = path.basename(path.dirname(skillFile));
  const name = frontMatter?.["name"];
  const value = typeof name === "string" ? name.trim() : "";
  const wrong = skillNameProblem(value, directory);
  if (wrong === null) return [];
  // A directory whose own name is not a legal one leaves no value that clears
  // both halves: its spelling fails what a host accepts, and every spelling
  // that passes differs from it. Telling the operator to copy it in would be an
  // action nobody can follow, so the rename comes first.
  const action = usableAsSkillName(directory)
    ? `Set \`name:\` to \`${directory}\` — the skill's own directory, which is what a host lists it under.`
    : `Rename the skill's directory, \`${printable(directory)}\`, to lowercase letters, digits and single hyphens within ${SKILL_NAME_MAX_LENGTH} characters, then set \`name:\` to the new name. A host lists the skill under the directory, so no value in this field can stand in for one it will not accept.`;
  return [
    issue(
      "QFAI-SKILLS-015",
      `SKILL.md carries no usable \`name:\`: ${wrong}. A host reads that field to key the skill, so the skill is not registered and the user cannot invoke it by name.`,
      "error",
      skillFile,
      "skills.name",
      undefined,
      "change",
      action,
    ),
  ];
}

/**
 * A value out of a `SKILL.md`, safe to print.
 *
 * The document is a file the run did not write, and the text formatter writes a
 * message straight to the terminal. A name carrying a newline or an escape
 * sequence forges lines in that output, so every character below ` `, the
 * delete character and the C1 block are written as their escapes instead.
 */
function printable(value: string): string {
  let out = "";
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    const unprintable = code < 0x20 || (code >= 0x7f && code <= 0x9f);
    out += unprintable ? `\\u${code.toString(16).padStart(4, "0")}` : character;
  }
  return out;
}

/**
 * The characters a host accepts in a skill's name, and how many.
 *
 * Lowercase letters, digits and single hyphens between them, to 64 characters.
 * A capital or a space is rejected by the loader outright, so a value carrying
 * one names a skill nobody can invoke.
 */
const SKILL_NAME_FORM = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SKILL_NAME_MAX_LENGTH = 64;

/**
 * How long a `description:` a host accepts.
 *
 * The field is registration metadata rather than the document: a host reads it
 * to decide whether to load the skill and whether to offer it, and refuses one
 * past this length outright. What a reader needs beyond a sentence or two is in
 * the document, which is loaded after the skill is registered.
 */
const SKILL_DESCRIPTION_MAX_LENGTH = 1024;

/**
 * How many characters `text` holds, counted as code points, as a host counts
 * them. Counted without building a copy: a crawled document has no size
 * ceiling, and a description the size of the document would be copied whole.
 */
function codePointCount(text: string): number {
  let count = 0;
  for (let index = 0; index < text.length; index += 1) {
    const unit = text.charCodeAt(index);
    const next = text.charCodeAt(index + 1);
    if (unit >= 0xd800 && unit <= 0xdbff && next >= 0xdc00 && next <= 0xdfff) index += 1;
    count += 1;
  }
  return count;
}

/** Whether a name is one a host accepts, whoever wrote it. */
function usableAsSkillName(value: string): boolean {
  return value.length <= SKILL_NAME_MAX_LENGTH && SKILL_NAME_FORM.test(value);
}

/** Why a `name:` is unusable, or `null` where it is not. */
function skillNameProblem(value: string, directory: string): string | null {
  if (value === "") return "the field is missing, empty, or not text";
  if (value.length > SKILL_NAME_MAX_LENGTH) {
    return `it is ${value.length} characters, past the ${SKILL_NAME_MAX_LENGTH} a host accepts`;
  }
  if (!SKILL_NAME_FORM.test(value)) {
    return `\`${printable(value)}\` is not lowercase letters, digits and single hyphens`;
  }
  // The directory is what a host lists the skill under, so a name that differs
  // from it names one the user will not find under either spelling.
  if (value !== directory) {
    return `\`${printable(value)}\` is not the skill's directory, \`${printable(directory)}\``;
  }
  return null;
}

/**
 * Whether a skill's front matter lets a host register it at all.
 *
 * A host reads `description:` for two jobs at once: whether to register the
 * skill, and whether to offer it to the model. Leaving it out to stop the second
 * loses the first on every host that requires the field — the skill is not
 * loaded, and the user cannot invoke it by name either, which is the opposite of
 * what the omission was for.
 *
 * A skill that should not be offered to the model says so with
 * `disable-model-invocation: true`, and keeps its description. That flag is the
 * Claude Code surface's, and the Codex surface this CLI also installs honours
 * nothing like it — so the field is how a skill asks, and not a promise every
 * host keeps. The rule is
 * general: no skill is named here, and the one that opts out is the one most
 * likely to lose the field to a contributor tidying front matter.
 */
function collectSkillRegistrationIssues(skillFile: string, content: string): Issue[] {
  // The block is there and cannot be read. Adding a key to it leaves the syntax
  // error in place, so nothing the operator writes clears this finding until the
  // block parses.
  const unreadable = parseSkillFrontmatter(content)?.parseError;
  if (unreadable !== undefined) {
    return [
      issue(
        "QFAI-SKILLS-015",
        `SKILL.md has front matter a host cannot read: ${unreadable}. That block is where the host reads \`name:\` and \`description:\` to register the skill.`,
        "error",
        skillFile,
        "skills.description",
        undefined,
        "change",
        // Both fields, because the block is unreadable and neither has been
        // looked at: told to repair one, the operator writes valid front matter
        // that fails this same finding again on the other.
        `Repair the front matter first, then make sure \`name:\` is \`${path.basename(path.dirname(skillFile))}\` and \`description:\` carries a sentence saying what the skill does.`,
      ),
    ];
  }
  const frontMatter = skillFrontmatterMapping(content);
  // Both fields, because every host reads both: the name is what a user invokes
  // and what a host keys the skill by, and the description is what it registers
  // and offers. A document carrying one without the other is not loaded.
  const missingName = collectSkillNameIssue(skillFile, frontMatter);
  const description = frontMatter?.["description"];
  if (typeof description === "string" && description.trim() !== "") {
    // Measured as a host reads it: trimmed, and in characters rather than UTF-16
    // units. Counted with its padding, or with an emoji as two, a description
    // within the limit was refused.
    const length = codePointCount(description.trim());
    if (/[<>]/.test(description)) {
      return [
        ...missingName,
        issue(
          "QFAI-SKILLS-015",
          "SKILL.md has a `description:` holding `<` or `>`, which a host refuses. The skill is not registered, and the user cannot invoke it by name.",
          "error",
          skillFile,
          "skills.description",
          undefined,
          "change",
          "Write `description:` without angle brackets: name the input in words, such as `a file path`, instead of `<file>`.",
        ),
      ];
    }
    return length > SKILL_DESCRIPTION_MAX_LENGTH
      ? [
          ...missingName,
          issue(
            "QFAI-SKILLS-015",
            `SKILL.md has a \`description:\` of ${length} characters, past the ${SKILL_DESCRIPTION_MAX_LENGTH} a host accepts. It is refused there, so the skill is not registered and the user cannot invoke it by name.`,
            "error",
            skillFile,
            "skills.description",
            undefined,
            "change",
            `Cut \`description:\` to ${SKILL_DESCRIPTION_MAX_LENGTH} characters — one or two sentences saying what the skill does and when to reach for it. What a reader needs beyond that belongs in the document below the front matter, which the host loads once the skill is registered.`,
          ),
        ]
      : missingName;
  }
  const optsOut = frontMatter?.["disable-model-invocation"] === true;
  // A key that is there and unusable is repaired by replacing its value. Told
  // to add one, the operator writes a second `description:` into the same
  // mapping, which is a document no host reads at all.
  const declared = frontMatter !== undefined && "description" in frontMatter;
  const problem = declared
    ? "SKILL.md has a `description:` with nothing a host can use in it — it is empty, or it is not text."
    : "SKILL.md has no `description:`.";
  const why = optsOut
    ? " `disable-model-invocation: true` asks the Claude Code surface not to fire the skill; every host reads `description:` to register it at all, so without the field the skill is not loaded and the user cannot invoke it by name either."
    : " A host reads that field to register the skill. `disable-model-invocation: true` beside it asks the Claude Code surface not to fire the skill on its own — the Codex surface reads `name` and `description` and honours no such field, so a skill that must never run unattended needs a guard of its own rather than that flag.";
  const repair = declared
    ? "Replace the value of `description:` with a sentence saying what the skill does"
    : "Add `description:` to the front matter";
  const beside = optsOut
    ? ", and keep `disable-model-invocation: true` beside it."
    : ". To keep the model from firing it on the Claude Code surface, declare `disable-model-invocation: true` beside it — and where it must not run unattended anywhere, guard the skill itself, because the Codex surface honours no such field.";
  return [
    ...missingName,
    issue(
      "QFAI-SKILLS-015",
      problem + why,
      "error",
      skillFile,
      "skills.description",
      undefined,
      "change",
      repair + beside,
    ),
  ];
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

async function isDirectory(target: string): Promise<boolean> {
  try {
    return (await stat(target)).isDirectory();
  } catch {
    return false;
  }
}

async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

/**
 * The inverse of the citation check: a reference nothing names is never read.
 *
 * Skills load by progressive disclosure — `SKILL.md` is the entry point and a
 * reference is opened only when a document already read names it. A file under
 * `references/` with no inbound citation from a reachable document therefore
 * ships to every consuming repository and is loaded in no run at all, which is
 * a property of the graph rather than a probability.
 *
 * A tree that grew a reference and lost its citation before anything checked
 * meets this on its first run, and the remedy is to restore the citation.
 */
function collectReferenceGraphIssues(
  root: string,
  skillsDir: string,
  documents: Map<string, string>,
): Issue[] {
  const reachable = collectReachableDocuments(citationContext(root, skillsDir), documents);
  const severity = "error";
  const unreachable = [...documents.keys()]
    .filter((file) => isReferenceDocument(skillsDir, file) && !reachable.has(file))
    .sort((a, b) => a.localeCompare(b))
    .map((file) =>
      issue(
        "QFAI-SKILLS-013",
        `references/ 配下のファイルが SKILL.md から到達可能な文書のどこからも参照されていないため、読み込まれることがありません。必要な文書なら参照するステップから引用し、不要なら削除してください。`,
        severity,
        file,
        "skills.referenceReachability",
        undefined,
        "canonical",
        "このファイルを読ませたいステップの本文からファイルへの相対パスを引用してください（SKILL.md から到達可能な文書のいずれかに書く必要があります）。読ませる必要がなくなった文書であれば削除してください。",
      ),
    );
  return unreachable;
}

type SkillDocuments = {
  /** Skill-tree documents that can cite or be cited, keyed by absolute path. */
  documents: Map<string, string>;
  /** One issue per document whose content could not be read at all. */
  unreadable: Issue[];
};

/**
 * A document that cannot be read is reported, not dropped.
 *
 * Swallowing the failure would delete the file from the graph: it would cite
 * nothing, be scanned for nothing, and — because the checks above only read
 * the required files and every `SKILL.md` — leave the tree with no finding at
 * all. An unusable reference is a worse outcome than an uncited one, so the
 * read error becomes its own issue.
 */
async function readSkillDocuments(skillsDir: string): Promise<SkillDocuments> {
  // A hidden tree is one the host does not list, so the walk never enters it:
  // collected, a draft's own references were held to the reachability rule and
  // its citations vouched for live documents. Nothing else is pruned by name:
  // a skill can name a document under its own `tmp/` or `dist/`, and the host
  // opens it.
  const files = await collectFiles(skillsDir, {
    extensions: [".md", ".yaml", ".yml"],
    skipDirectory: (directory) => isHiddenSkillDirectory(skillsDir, directory),
  });
  const documents = new Map<string, string>();
  const unreadable: Issue[] = [];
  const severity = "error";
  for (const file of files.sort((a, b) => a.localeCompare(b))) {
    try {
      // Decoded strictly, like an uncrawled entry point: the lenient read turns
      // an invalid byte into a replacement character, so the document parses
      // and its metadata reads as usable while the host refuses the file.
      const text = decodeUtf8(await readFile(file));
      if (text === undefined) {
        // What the host does about it turns on which document this is. It reads
        // an entry point to register the skill at all, and a reference only
        // once a step names one — so the same byte stops the skill in the first
        // case and a step partway through the work in the second.
        const message = isSkillEntryPoint(skillsDir, file)
          ? "A skill's entry point holds bytes that are not valid UTF-8, so the host reports it unreadable and registers no skill from it."
          : "A document under `skills` holds bytes that are not valid UTF-8. The host registers the skill from its entry point and reads this file only where a step names it, so the failure arrives partway through the work.";
        unreadable.push(
          issue(
            "QFAI-SKILLS-014",
            message,
            severity,
            file,
            "skills.documentReadable",
            undefined,
            "canonical",
            "Save the document as UTF-8. A byte that is not part of a valid sequence is usually text pasted from another encoding, or a binary file left at the path.",
          ),
        );
        continue;
      }
      documents.set(file, text);
    } catch (error) {
      unreadable.push(
        issue(
          "QFAI-SKILLS-014",
          `skills 配下の文書を読み込めませんでした（${describeReadError(error)}）。参照到達性を判定できないため、権限と I/O を確認してください。`,
          severity,
          file,
          "skills.documentReadable",
          undefined,
          "canonical",
          "メッセージが示す I/O エラーを解消してください（読み取り権限の付与、切れた symlink の張り直し、materialise されていないファイルの取得など）。skills 配下から外すべき文書であれば削除してください。",
        ),
      );
    }
  }
  return { documents, unreadable };
}

function describeReadError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Breadth-first closure over "document A cites the path of document B". */
function collectReachableDocuments(
  context: CitationContext,
  documents: Map<string, string>,
): Set<string> {
  const files = [...documents.keys()];
  const reachable = new Set(files.filter((file) => isSkillEntryPoint(context.skillsDir, file)));
  // Which targets the token scan cannot spell is a property of the target's own
  // path — it does not depend on who is citing it — so it is decided once for
  // the whole walk instead of re-tested for every (citing file, target) pair.
  // Keeping it SMALL is what makes the walk affordable, because the second
  // pass in `resolveCitations` is |reachable| × |unscannableTargets| — every
  // dequeued document is scanned for every member's spellings, whether or not
  // the fast path already resolved that document's citations. So membership is
  // deliberately narrow: a name carrying a space, a bracket or a `%`, plus
  // files outside the project whose ABSOLUTE spelling no token can span (see
  // {@link isTokenScannable}). A file inside the project is judged on its
  // project-relative spelling alone and never joins on account of the machine
  // path around the repository, which would otherwise put the entire tree in
  // here on a machine whose account name has a space in it.
  const unscannableTargets = files.filter((file) => !isTokenScannable(context, file));
  const queue = [...reachable];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) {
      break;
    }
    const content = documents.get(current) ?? "";
    for (const cited of resolveCitations(
      context,
      current,
      content,
      documents,
      unscannableTargets,
    )) {
      if (reachable.has(cited)) {
        continue;
      }
      reachable.add(cited);
      queue.push(cited);
    }
  }
  return reachable;
}

/**
 * The entry point a skill run actually opens: `<skillsDir>/<skill>/SKILL.md`.
 *
 * Rooting the closure at every file merely *named* `SKILL.md` would let a
 * generator template or an example copy under `templates/` or `references/`
 * seed it, so a reference only that copy cites would count as reachable even
 * though no run can open it. The skill loader reads one `SKILL.md` per direct
 * subdirectory of `skillsDir`, and the graph starts at exactly that set.
 */
function isSkillEntryPoint(skillsDir: string, file: string): boolean {
  const segments = toPosixRelative(skillsDir, file).split("/");
  return (
    segments.length === 2 &&
    segments[1] === "SKILL.md" &&
    segments[0] !== "" &&
    segments[0] !== ".."
  );
}

/**
 * Path-ish tokens naming a skill document: `references/foo.md`, `two-hop.md`,
 * `.qfai/assistant/skills/qfai-sdd/references/rcp_footer.md`.
 *
 * The name classes are Unicode and the extension is matched case-insensitively
 * because that is how the files themselves are collected: `collectFiles`
 * lower-cases the extension before comparing and puts no constraint on the
 * stem, so `references/設計.md` and `references/Guide.MD` are documents the
 * reachability check has to be able to see cited.
 *
 * A segment also admits `%XX`, because that is how a Markdown link spells a
 * character it cannot carry literally — `[設計](references/%E8%A8%AD%E8%A8%88.md)`
 * names `references/設計.md`. Either separator is accepted, and a leading
 * separator or drive letter is kept rather than dropped, so a path typed in
 * Windows form and a path that is absolute both still name their file.
 *
 * `~` is a path character here, not a delimiter. Without it the scan ENDS at
 * the tilde and the token is whatever follows: `references/notes~1.md` yielded
 * `1.md`, and an absolute path through a tilde-bearing directory yielded
 * everything past the tilde. Both spell legal names — `~` is a legal filename
 * character, backup conventions produce it, and `os.tmpdir()` on Windows is the
 * 8.3 short form (`C:\Users\RUNNER~1\…`) whenever the profile name exceeds
 * eight characters.
 *
 * Neither produced a false `QFAI-SKILLS-013` by the time this landed: the
 * by-path pass covers a target whose own name carries the tilde, and the
 * `skillsDirPrefix` recovery covers an absolute citation whose truncated tail
 * still holds that prefix. What was left is the token being WRONG — resolved
 * through a fallback rather than by the scan, which is the quadratic pass
 * {@link collectReachableDocuments} keeps small on purpose, and one edit to
 * either cover away from a live false positive. Admitting the character is the
 * direct fix; the two covers stay as covers.
 */
const CITATION_SEGMENT_SOURCE = String.raw`(?:[\p{L}\p{N}\p{M}._~-]|%[0-9A-Fa-f]{2})+`;
/**
 * The path-ish tokens {@link resolveCitations} will try to resolve, in order.
 *
 * @internal Exported for direct unit-testing — not part of the package's
 * public surface. The token is the unit the defect lives in, and every
 * end-to-end reading of it passes through two fallbacks that can cover a wrong
 * token up. A case on the reachability graph passes against the broken pattern
 * — measured — so it could not have pinned this.
 */
export function citationTokensIn(content: string): string[] {
  return [...content.matchAll(DOCUMENT_CITATION_PATTERN)].map((match) => match[0]);
}

const DOCUMENT_CITATION_PATTERN = new RegExp(
  String.raw`(?:[A-Za-z]:)?[\\/]?${CITATION_SEGMENT_SOURCE}(?:[\\/]${CITATION_SEGMENT_SOURCE})*\.(?:md|ya?ml)\b`,
  "giu",
);

/** Everything a citation token is resolved against, derived from the config. */
type CitationContext = {
  root: string;
  skillsDir: string;
  /** `<skillsDir>` as a project-root-relative prefix, when it has one. */
  skillsDirPrefix: RegExp | null;
};

function citationContext(root: string, skillsDir: string): CitationContext {
  return { root, skillsDir, skillsDirPrefix: skillsDirPrefixPattern(root, skillsDir) };
}

/**
 * The prefix a root-relative citation carries, taken from the configured
 * `skillsDir` rather than from the default directory name — a project that
 * moved its skills to `.custom/skills` cites `.custom/skills/...`.
 */
function skillsDirPrefixPattern(root: string, skillsDir: string): RegExp | null {
  const relative = toPosixRelative(root, skillsDir);
  if (relative === "" || relative === ".." || relative.startsWith("../")) {
    return null;
  }
  return new RegExp(`(?:^|/)${escapeRegExp(relative)}/`);
}

/**
 * A citation names one file, so the edge must land on one file.
 *
 * Matching a bare basename made every same-named document reachable at once:
 * `qfai-sdd/SKILL.md` citing `references/review-cycle-playbook.md` also lit up
 * `qfai-discussion/references/review-cycle-playbook.md`, which no discussion
 * document reaches. Each token is instead resolved against the citing
 * document's own directory, its skill root, the skills root and the project
 * root — so a cross-skill edge exists only where the path spells one out.
 *
 * A second pass covers the documents no path-ish token can name — a space or a
 * bracket in the file name — by searching the prose for that document's own
 * path instead of for a pattern.
 */
function resolveCitations(
  context: CitationContext,
  citingFile: string,
  content: string,
  documents: Map<string, string>,
  unscannableTargets: readonly string[],
): string[] {
  const cited = new Set<string>();
  for (const match of content.matchAll(DOCUMENT_CITATION_PATTERN)) {
    const target = citationCandidates(context, citingFile, match[0]).find((candidate) =>
      documents.has(candidate),
    );
    if (target !== undefined) {
      cited.add(target);
    }
  }
  for (const target of unscannableTargets) {
    if (cited.has(target) || target === citingFile) {
      continue;
    }
    if (citesByExplicitPath(context, citingFile, target, content)) {
      cited.add(target);
    }
  }
  return [...cited];
}

/**
 * Whether the token scan above can span this document's path at all.
 *
 * `collectFiles` puts no constraint on a name, so a document may be called
 * `references/My Guide.md` — a space no path-ish token can cross, which would
 * leave the scanner matching `Guide.md` and resolving nothing. Such a document
 * is looked up by its own path instead of by pattern.
 *
 * A file OUTSIDE the project has a second spelling, and it is asked too: the
 * character that stops the scan need not be in the part of the path the
 * project can see. A `skillsDir` outside the project is cited by ABSOLUTE
 * path, and the prefix leading to it belongs to the machine rather than to the
 * repository — a home directory with a space in it, or the `~` every Windows
 * 8.3 short name carries (`C:\Users\RUNNER~1\AppData\Local\Temp\…`). The token
 * scan restarts after that character and produces a tail
 * (`1/AppData/…/guide.md`) that resolves under no base, so a plainly cited
 * reference is reported uncited. Its project-relative spelling is clean, which
 * is why asking only that one missed it.
 *
 * A file INSIDE the project is never asked the second question, and that is
 * what bounds the cost. Such a file is cited relatively, so the machine prefix
 * cannot appear in any citation of it — and if it were asked, an account named
 * `John Doe` would make every document in the project unscannable at once and
 * put the whole tree through the by-path pass, which is quadratic (see
 * {@link collectReachableDocuments}). The trigger stays the case that needs
 * it: the citation form is absolute because the file is out of reach of a
 * relative one.
 */
function isTokenScannable(context: CitationContext, file: string): boolean {
  const relative = toPosixRelative(context.root, file);
  if (!isScannableSpelling(relative)) {
    return false;
  }
  return !escapesRoot(relative) || isScannableSpelling(toPosix(file));
}

/**
 * Whether `relative` leaves the project root, so citations of it are absolute.
 *
 * `path.relative` does not always return a relative path: across Windows
 * drives (`C:\project` to `D:\skills`) it returns the target unchanged, which
 * is why the absolute form is one of the answers here and not only `../`.
 */
function escapesRoot(relative: string): boolean {
  return (
    relative === ".." || relative.startsWith("../") || ABSOLUTE_CITATION_PATTERN.test(relative)
  );
}

/**
 * The drive letter and leading separator are spanned by the citation pattern's
 * own prefix group, not by a segment, so they are dropped before the segments
 * are judged: `C:` is not a scannable segment and never has to be one. This
 * matters for the project-relative spelling too, since `path.relative` can
 * hand back `D:/skills/demo/references/guide.md` — a path the scan spans fine.
 */
function isScannableSpelling(spelling: string): boolean {
  return spelling
    .replace(ABSOLUTE_CITATION_PREFIX_PATTERN, "")
    .split("/")
    .every((segment) => SCANNABLE_SEGMENT_PATTERN.test(segment));
}

const SCANNABLE_SEGMENT_PATTERN = /^[\p{L}\p{N}\p{M}._-]+$/u;

/** Every way `target` can be spelled from `citingFile`, URI forms included. */
function citationSpellings(context: CitationContext, citingFile: string, target: string): string[] {
  const skillRoot = skillRootOf(context.skillsDir, citingFile);
  const bases = [
    path.dirname(citingFile),
    ...(skillRoot === null ? [] : [skillRoot]),
    context.skillsDir,
    context.root,
  ];
  const spellings = new Set<string>();
  // The absolute form is a spelling too: a skillsDir outside the project has
  // no usable reading relative to the project root.
  for (const relative of [...bases.map((base) => toPosixRelative(base, target)), toPosix(target)]) {
    if (relative === "") {
      continue;
    }
    for (const spelling of pathSpellings(relative)) {
      spellings.add(spelling);
    }
  }
  return [...spellings];
}

/**
 * One relative path, in each notation a document may write it in.
 *
 * `encodeURI` is not enough on its own: it treats `#` and `?` as reserved and
 * leaves them in place, while a Markdown link target has to carry them as
 * `%23` and `%3F` or the parser reads a fragment or a query. Encoding each
 * segment the way a link does covers those; `encodeURI` is kept because it
 * leaves characters such as `+` and `,` alone, which a link may too.
 */
function pathSpellings(relative: string): string[] {
  const segments = relative.split("/");
  return [
    relative,
    // `references\My Guide.md` is the same path typed on Windows.
    segments.join("\\"),
    // `[Guide](references/My%20Guide.md)` names the same file.
    encodeURI(relative),
    segments.map((segment) => encodeURIComponent(segment)).join("/"),
  ];
}

function citesByExplicitPath(
  context: CitationContext,
  citingFile: string,
  target: string,
  content: string,
): boolean {
  return citationSpellings(context, citingFile, target).some((spelling) =>
    containsPathToken(content, spelling),
  );
}

/**
 * A path appears in the prose as a whole path, not as the tail of a longer one.
 *
 * Without the boundary check `references/guide.md` would also be found inside
 * `other/references/guide.md.bak`, which is a different file — the same
 * one-citation-one-file rule the token scan follows.
 */
function containsPathToken(content: string, spelling: string): boolean {
  for (
    let index = content.indexOf(spelling);
    index !== -1;
    index = content.indexOf(spelling, index + 1)
  ) {
    if (isHeadBoundary(content, index) && isTailBoundary(content, index + spelling.length)) {
      return true;
    }
  }
  return false;
}

const PATH_CHARACTER_PATTERN = /[\p{L}\p{N}\p{M}._\-/\\]/u;
const NAME_CHARACTER_PATTERN = /[\p{L}\p{N}\p{M}_-]/u;

function isHeadBoundary(content: string, index: number): boolean {
  return index === 0 || !PATH_CHARACTER_PATTERN.test(content.charAt(index - 1));
}

function isTailBoundary(content: string, index: number): boolean {
  const next = content.charAt(index);
  if (next === "") {
    return true;
  }
  // A trailing `.` ends the sentence unless a name continues after it.
  if (next === ".") {
    return !NAME_CHARACTER_PATTERN.test(content.charAt(index + 1));
  }
  return !PATH_CHARACTER_PATTERN.test(next);
}

function citationCandidates(context: CitationContext, citingFile: string, token: string): string[] {
  return citationTokenReadings(token).flatMap((reading) =>
    resolveCitationToken(context, citingFile, reading),
  );
}

/**
 * The paths one token can name: as typed, and with its `%XX` escapes decoded.
 *
 * Separators are folded to `/` first so a Windows-native `references\guide.md`
 * resolves to the same document as its POSIX spelling. The literal reading is
 * kept ahead of the decoded one so a file genuinely named `foo%20bar.md` still
 * wins over the file named `foo bar.md`.
 */
function citationTokenReadings(token: string): string[] {
  const normalized = token.split("\\").join("/");
  const decoded = decodePathSegments(normalized);
  return decoded === normalized ? [normalized] : [normalized, decoded];
}

/** Per segment, so a `%2F` cannot be mistaken for a separator we produced. */
function decodePathSegments(token: string): string {
  return token
    .split("/")
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        // A malformed escape is not an escape: keep the segment as typed.
        return segment;
      }
    })
    .join("/");
}

/**
 * An absolute citation stays absolute.
 *
 * `paths.skillsDir` may point outside the project — `/shared/qfai-skills` — and
 * a document there names its neighbours by full path. Dropping the leading
 * separator and re-joining the rest under the citing file or the project root
 * resolves every such citation to a file that does not exist, so the reference
 * it names is reported as unreachable. The relative readings are kept as well,
 * so a token that merely looks absolute resolves the way it always did.
 */
function resolveCitationToken(
  context: CitationContext,
  citingFile: string,
  token: string,
): string[] {
  const candidates = ABSOLUTE_CITATION_PATTERN.test(token) ? [path.resolve(token)] : [];
  const relativeToken = token.replace(ABSOLUTE_CITATION_PREFIX_PATTERN, "");
  if (relativeToken === "") {
    return candidates;
  }
  const skillRoot = skillRootOf(context.skillsDir, citingFile);
  const bases = [
    path.dirname(citingFile),
    ...(skillRoot === null ? [] : [skillRoot]),
    context.skillsDir,
    context.root,
  ];
  candidates.push(...bases.map((base) => path.resolve(base, relativeToken)));
  const prefixMatch = context.skillsDirPrefix?.exec(relativeToken) ?? null;
  if (prefixMatch !== null) {
    const withinSkills = relativeToken.slice(prefixMatch.index + prefixMatch[0].length);
    candidates.push(path.resolve(context.skillsDir, withinSkills));
  }
  return candidates;
}

const ABSOLUTE_CITATION_PATTERN = /^(?:[A-Za-z]:)?\//;
const ABSOLUTE_CITATION_PREFIX_PATTERN = /^(?:[A-Za-z]:)?\/+/;

/** The `<skillsDir>/<skill>` directory a document belongs to, if any. */
function skillRootOf(skillsDir: string, file: string): string | null {
  const relative = toPosixRelative(skillsDir, file);
  const [skill, ...rest] = relative.split("/");
  if (skill === undefined || skill === "" || skill === ".." || rest.length === 0) {
    return null;
  }
  return path.join(skillsDir, skill);
}

function isReferenceDocument(skillsDir: string, file: string): boolean {
  return /^[^/]+\/references\//.test(toPosixRelative(skillsDir, file));
}

function toPosixRelative(from: string, to: string): string {
  return toPosix(path.relative(from, to));
}

function toPosix(target: string): string {
  return target.split(path.sep).join("/");
}
