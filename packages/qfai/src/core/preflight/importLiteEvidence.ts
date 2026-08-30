import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import { resolvePath } from "../config.js";
import { isEnoent } from "../fs/errno.js";
import { CANONICAL_TIMESTAMP_RE, findPacks } from "../packLocator.js";
import { collectSpecEntries } from "../specLayout.js";

/**
 * Import-lite evidence lives at the canonical `<root>/.qfai/evidence`, the same
 * place every other writer uses (`init` seeds `.qfai/evidence/.gitignore`,
 * prototyping writes `.qfai/evidence/prototyping/**`, `audit log` reads
 * `.qfai/evidence/decisions/**`). It is deliberately NOT derived from
 * `paths.discussionDir`: a project that relocates its discussion packs (e.g.
 * `requirements/discussion`) would otherwise have the preflight look for
 * `requirements/evidence` while every producer — the shipped Stage 0 step
 * included — still writes `.qfai/evidence`, leaving `QFAI-IMPLITE-001`
 * unclearable.
 */
export const IMPORT_LITE_EVIDENCE_DIR_REL = ".qfai/evidence";

/**
 * The `-<timestamp>` suffix is optional on purpose. The remedy names
 * `import-lite-<ts>.md`, but the shipped template is
 * `templates/evidence/import-lite.md`; requiring the separator meant an
 * operator who copied the template under its own name still got the warning it
 * was supposed to clear.
 *
 * The suffix is only captured here. Whether it is a legitimate stamp is decided
 * by `CANONICAL_TIMESTAMP_RE` in `classifyEvidenceName`, so this pattern must
 * stay permissive enough to hand every hyphenated candidate over for that
 * check rather than silently reading it as the untimestamped name.
 */
const IMPORT_LITE_EVIDENCE_RE = /^import-lite(?:-(.*))?\.md$/i;

/**
 * `path.resolve`, not `path.join`: `runSddPreflight` is public and accepts a
 * relative root (`relative/project`), and every other path it reports goes
 * through `resolvePath`, which absolutises. Joining here left the import-lite
 * `selectedInputPath` — alone among the fields of one `SddPreflightResult` —
 * dependent on the caller's cwd, so a consumer reading the file later from a
 * different directory could not resolve the input source.
 */
export function resolveImportLiteEvidenceRoot(root: string): string {
  return path.resolve(root, ".qfai", "evidence");
}

/**
 * Absolute path of the import-lite evidence file to treat as the input source,
 * or `null` when the project has none.
 *
 * Only files that actually RECORD an input source count. A matching filename
 * alone is not evidence: an empty file, or the shipped template dropped in with
 * its placeholders untouched, names nothing traceable, yet it would clear
 * `QFAI-IMPLITE-001` and — through `resolveImportLiteEntrypoint` — flip the
 * preflight to `ready` and suppress `QFAI-DPACK-001` as well. Content is
 * therefore checked before a candidate is accepted, and an unusable record is
 * skipped rather than selected, so an older filled-in file still wins over a
 * newer hollow one.
 *
 * A timestamped record always outranks the untimestamped template filename: a
 * project that kept `import-lite.md` and later added
 * `import-lite-<timestamp>.md` must resolve to the newer record, and plain
 * lexicographic order does not guarantee that (the separator sorts against the
 * extension dot, not against a timestamp). Among timestamped records the
 * longest-then-highest digit string wins, which for equal-width timestamps is
 * chronological order.
 */
export async function findImportLiteEvidence(root: string): Promise<string | null> {
  const evidenceRoot = resolveImportLiteEvidenceRoot(root);
  let named: EvidenceCandidate[];
  try {
    const entries = await readdir(evidenceRoot, { withFileTypes: true });
    named = entries
      .filter((entry) => entry.isFile())
      .map((entry) => classifyEvidenceName(entry.name))
      .filter((candidate): candidate is EvidenceCandidate => candidate !== null);
  } catch {
    // ENOENT / EACCES: no readable evidence directory means no evidence.
    return null;
  }

  const usable = await Promise.all(
    named.map(async (candidate) =>
      (await recordsAnInputSource(path.join(evidenceRoot, candidate.name))) ? candidate : null,
    ),
  );
  const candidates = usable.filter(
    (candidate): candidate is EvidenceCandidate => candidate !== null,
  );

  const timestamped = candidates.filter((candidate) => candidate.stamp !== null);
  const untimestamped = candidates.filter((candidate) => candidate.stamp === null);

  const selected =
    timestamped.length > 0
      ? timestamped.sort(compareTimestampedCandidates).at(-1)
      : untimestamped.sort((left, right) => left.key.localeCompare(right.key)).at(-1);
  return selected === undefined ? null : path.join(evidenceRoot, selected.name);
}

/**
 * A matching directory entry, keeping the real `name` alongside the `key` the
 * pattern was matched against.
 *
 * The two differ when the real filename carries surrounding whitespace
 * (` import-lite.md`). Matching wants the normalized key, but the returned
 * path has to be built from `name`: joining the trimmed form produces a
 * `selectedInputPath` that does not exist, so the validator and the
 * full/verify gate would pass the project as having an input source while
 * `runSddPreflight` and its summary pointed at an unreadable file.
 */
type EvidenceCandidate = {
  name: string;
  key: string;
  stamp: string | null;
};

/**
 * A directory entry as an evidence candidate, or `null` when the name is not
 * one this project produces.
 *
 * Two shapes are legitimate and nothing else is: the bare template filename
 * `import-lite.md`, and `import-lite-<canonical timestamp>.md`. Treating the
 * hyphen as "anything may follow" admitted three kinds of file the writers
 * never emit — `import-lite-.md` and `import-lite-draft.md` slipped through as
 * untimestamped records, and a digit string of any width was ranked as a
 * timestamp, so `import-lite-999999999999999999.md` (18 digits) outranked every
 * real stamp forever. A hyphenated name that is not canonically stamped is
 * therefore rejected outright rather than demoted to the untimestamped tier:
 * demoting it would let `import-lite-draft.md` keep standing in for a record.
 */
function classifyEvidenceName(name: string): EvidenceCandidate | null {
  const key = name.trim();
  const matched = IMPORT_LITE_EVIDENCE_RE.exec(key);
  if (matched === null) {
    return null;
  }
  const suffix = matched[1];
  if (suffix === undefined) {
    return { name, key, stamp: null };
  }
  return CANONICAL_TIMESTAMP_RE.test(suffix) ? { name, key, stamp: suffix } : null;
}

/**
 * Oldest-to-newest ordering, so `.at(-1)` is the newest record. Every stamp
 * that reaches here is the same canonical width, which is what makes plain
 * string order chronological.
 */
function compareTimestampedCandidates(left: EvidenceCandidate, right: EvidenceCandidate): number {
  return (left.stamp ?? "").localeCompare(right.stamp ?? "");
}

async function recordsAnInputSource(filePath: string): Promise<boolean> {
  try {
    return recordsImportLiteInputSource(await readFile(filePath, "utf-8"));
  } catch {
    // ENOENT / EACCES / EISDIR: a file we cannot read records nothing.
    return false;
  }
}

/** A value still carrying the template's `<...>` angle-bracket placeholder. */
const PLACEHOLDER_RE = /^<[^>]*>$/;

/**
 * Fillers that stand in for an input source nobody supplied. `<...>` is the
 * shape the shipped template arrives in, but a hand-edited file just as often
 * keeps `- URLs: TBD`, `none` or `(placeholder)`, which name nothing traceable
 * either: accepting them would clear `QFAI-IMPLITE-001` and, through
 * `resolveImportLiteEntrypoint`, suppress `QFAI-DPACK-001` on a project with no
 * recorded input source at all.
 */
const UNFILLED_VALUES = new Set([
  "-",
  "--",
  "?",
  "??",
  "???",
  "n/a",
  "na",
  "nil",
  "none",
  "null",
  "pending",
  "placeholder",
  "tba",
  "tbc",
  "tbd",
  "todo",
  "unknown",
  "unspecified",
]);

/** Wrappers an unfilled value is commonly dressed in: `(placeholder)`, `[TBD]`, `"none"`. */
const VALUE_DECORATION_RE = /^[([{"'`*_]+|[)\]}"'`*_]+$/g;

/**
 * Sentence-final punctuation, ASCII and its full-width counterparts.
 *
 * A filler written as a sentence — `- URLs: TBD.`, `- Local paths: none.` — is
 * the same non-answer as the bare word, but comparing the decorated-stripped
 * value by exact equality accepted it as a real source. The placeholder rule
 * this module's `Sources` check mirrors already tolerates the trailing period
 * (`discussionPack.ts` ends its pattern `\.?$`), so normalizing here is what
 * keeps the two readings of "unfilled" the same.
 */
const TRAILING_PUNCTUATION_RE = /[.,;:!?。、．，；：！？…]+$/u;

/**
 * The comparable core of a value: decoration and sentence punctuation removed,
 * repeatedly, because the two interleave (`` `TBD`. `` strips only from the
 * outside in, one layer per pass). Each pass strictly shortens the string or
 * ends the loop, so it terminates.
 */
function bareValue(value: string): string {
  let bare = value.trim();
  for (;;) {
    const stripped = bare
      .replace(VALUE_DECORATION_RE, "")
      .replace(TRAILING_PUNCTUATION_RE, "")
      .trim();
    if (stripped === bare) {
      return bare;
    }
    bare = stripped;
  }
}

/** `true` when a value is blank, a `<...>` placeholder, or one of the fillers above. */
function isUnfilledValue(value: string): boolean {
  const bare = bareValue(value);
  if (bare.length === 0 || PLACEHOLDER_RE.test(bare)) {
    return true;
  }
  return UNFILLED_VALUES.has(bare.toLowerCase());
}

/**
 * The `Sources` bullets the template ships with (`- URLs:`, `- Local paths:`).
 * Stripping the label is what makes the empty template read as empty while
 * `- URLs: https://example.com/spec` and an indented child bullet both read as
 * a recorded source.
 */
const SOURCE_LABEL_RE = /^(?:urls?|local paths?|paths?|files?)\s*:\s*/i;

const METADATA_SECTION = "metadata";
const SOURCES_SECTION = "sources";
const EXCERPT_SECTION = "user provided excerpt";

/**
 * `true` when the evidence text names something a reader could trace the specs
 * back to: the template's identifying metadata (`generated_at`, `entrypoint:
 * import-lite`) plus at least one real entry under `Sources` or a real
 * `User provided excerpt`. `Assumptions / Missing information` deliberately
 * does not count — a list of what is missing is not an input source.
 */
function recordsImportLiteInputSource(text: string): boolean {
  const { sections, unclosedFence } = splitSections(text);
  if (unclosedFence) {
    // An unterminated fence swallows every heading that follows it, so the
    // whole tail of the template lands in whichever section opened the fence.
    // `hasRecordedExcerpt` then reads the `Assumptions / Missing information`
    // and `Notes` headings as excerpt prose, and an untouched template one
    // closing line short of well-formed clears `QFAI-IMPLITE-001` and
    // suppresses `QFAI-DPACK-001` while naming nothing traceable. Past that
    // line no section can be attributed, so the record is unusable rather than
    // partly readable; a well-formed sibling file still wins.
    return false;
  }
  if (!hasRequiredMetadata(sections.get(METADATA_SECTION) ?? [])) {
    return false;
  }
  return (
    hasRecordedSource(sections.get(SOURCES_SECTION) ?? []) ||
    hasRecordedExcerpt(sections.get(EXCERPT_SECTION) ?? [])
  );
}

/** Opening or closing marker of a fenced code block, with CommonMark's ≤3 space indent. */
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})(.*)$/;

/**
 * A parsed evidence body: section lines, plus whether the text ended with a
 * fence still open. The second half is what tells a genuine excerpt apart from
 * a document whose sections stopped being attributable partway through.
 */
type EvidenceSections = {
  sections: Map<string, string[]>;
  unclosedFence: boolean;
};

/**
 * Body lines keyed by the lowercased `## ` heading that introduced them.
 *
 * Fenced code blocks are tracked because the template's excerpt is a fence and
 * what an operator pastes into it is frequently Markdown of its own. Treating a
 * `## Requirement` INSIDE that fence as a heading restarted the section map
 * there, leaving `User provided excerpt` holding only the fence-open line — so
 * a genuine excerpt read as empty and blocked the import-lite preflight.
 */
function splitSections(text: string): EvidenceSections {
  const sections = new Map<string, string[]>();
  let current: string[] | null = null;
  let fence: string | null = null;
  for (const line of text.split(/\r?\n/)) {
    const fenced = FENCE_RE.exec(line);
    if (fenced !== null) {
      fence = nextFenceState(fence, fenced[1] ?? "", (fenced[2] ?? "").trim());
      current?.push(line);
      continue;
    }
    const heading = fence === null ? /^#{2,6}\s+(.*)$/.exec(line.trim()) : null;
    if (heading === null) {
      current?.push(line);
      continue;
    }
    current = [];
    sections.set((heading[1] ?? "").trim().toLowerCase(), current);
  }
  return { sections, unclosedFence: fence !== null };
}

/**
 * The open fence after this marker line, or `null` when none is open. A closing
 * fence must repeat the opener's character, be at least as long, and carry no
 * info string — so a ```` ```ts ```` inside a ```` ~~~ ```` block does not close it.
 */
function nextFenceState(fence: string | null, marker: string, info: string): string | null {
  if (fence === null) {
    return marker;
  }
  const closes = marker[0] === fence[0] && marker.length >= fence.length && info.length === 0;
  return closes ? null : fence;
}

/**
 * The `<ISO8601>` datetime the template asks `generated_at` to be replaced
 * with. The date is required; the time of day, its seconds, its fractional
 * seconds and the offset are each optional, because an operator who records
 * `2026-04-01` has still recorded when the evidence was produced — the field
 * exists to make the artifact's provenance traceable, not to be a precise
 * instant. `T` and a space both separate the halves, as ISO8601 permits.
 */
const ISO8601_DATETIME_RE =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:[.,]\d+)?)?\s*(?:Z|[+-]\d{2}:?\d{2})?)?$/i;

/**
 * `true` when `value` is an ISO8601 datetime that names a real instant.
 *
 * The shape alone is not enough: `2026-99-99` has the right punctuation and no
 * such day, and `Date` would silently roll it into another month. Every
 * component is therefore read back off the constructed date, which rejects
 * out-of-range months, days and times — a non-leap February 29 included.
 */
function isIso8601DateTime(value: string): boolean {
  const matched = ISO8601_DATETIME_RE.exec(value);
  if (matched === null) {
    return false;
  }
  // The optional time groups are absent, not empty, when only a date was
  // written, so each component is read with an explicit zero default.
  const group = (index: number): number => {
    const raw = matched[index];
    return raw === undefined ? 0 : Number(raw);
  };
  const year = group(1);
  const month = group(2);
  const day = group(3);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day &&
    group(4) < 24 &&
    group(5) < 60 &&
    // 60 is the leap second ISO8601 allows.
    group(6) < 61
  );
}

/**
 * `generated_at` is validated as a datetime, not merely as "something was
 * typed". A free-text value (`yesterday`) or an impossible one (`2026-99-99`)
 * left the artifact's provenance untraceable while still clearing
 * `QFAI-IMPLITE-001` and, through `resolveImportLiteEntrypoint`, suppressing
 * `QFAI-DPACK-001`. The check subsumes the unfilled-value rule: no placeholder
 * or filler parses as a date.
 */
function hasRequiredMetadata(lines: string[]): boolean {
  const fields = new Map<string, string>();
  for (const line of lines) {
    const matched = /^-?\s*([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line.trim());
    if (matched !== null) {
      fields.set((matched[1] ?? "").toLowerCase(), (matched[2] ?? "").trim());
    }
  }
  if (!isIso8601DateTime(bareValue(fields.get("generated_at") ?? ""))) {
    return false;
  }
  return (fields.get("entrypoint") ?? "").toLowerCase() === "import-lite";
}

function hasRecordedSource(lines: string[]): boolean {
  return lines.some((line) => {
    const value = line
      .trim()
      .replace(/^[-*+]\s*/, "")
      .replace(SOURCE_LABEL_RE, "")
      .trim();
    return !isUnfilledValue(value);
  });
}

function hasRecordedExcerpt(lines: string[]): boolean {
  // The fence delimiters themselves are part of the section body now that
  // `splitSections` keeps fenced content together; they are punctuation, not an
  // excerpt.
  return lines.some((line) => !FENCE_RE.test(line) && !isUnfilledValue(line.trim()));
}

/**
 * The import-lite evidence file that a project may legitimately use as its SDD
 * input source, or `null` when the entrypoint does not apply.
 *
 * It applies only to the shape the shipped Stage 0 step and `QFAI-IMPLITE-001`
 * describe — a project that ALREADY carries spec packs and has no discussion
 * pack at all. Dropping an evidence file must not let a fresh project skip
 * `/qfai-discussion`, and a pack that exists under a non-canonical name is
 * still an input source that has to be repaired (`QFAI-DPACK-005`) rather than
 * bypassed, so any located pack disqualifies the entrypoint.
 *
 * "Already carries spec packs" is checked against the files on disk, not
 * against the entry count: `collectSpecEntries` also returns an entry for an
 * unknown or empty `spec-NNNN/` directory so the missing-fileset diagnostics
 * stay deterministic, so an empty `spec-0001/` plus an evidence file would
 * otherwise have flipped a brand-new project to `ready` and suppressed
 * `QFAI-DPACK-001` with it.
 */
export async function resolveImportLiteEntrypoint(
  root: string,
  config: QfaiConfig,
): Promise<string | null> {
  const specEntries = await collectSpecEntries(resolvePath(root, config, "specsDir"));
  const populated = await Promise.all(
    specEntries.map((entry) => hasRecognizableSpecFile(entry.dir)),
  );
  if (!populated.includes(true)) {
    return null;
  }
  const discussionRoot = resolvePath(root, config, "discussionDir");
  if (await isDirectoryUnreadable(discussionRoot)) {
    // `findPacks` swallows every error and returns `[]`, which is
    // indistinguishable from "no pack at all". An unreadable discussion
    // directory (EACCES, I/O error) is an uninspectable input source, not an
    // absent one: allowing the fallback here would declare the preflight
    // `ready` and silence `QFAI-DPACK-001` on a project nobody could check.
    return null;
  }
  const packs = await findPacks(discussionRoot, "discussion");
  if (packs.length > 0) {
    return null;
  }
  return await findImportLiteEvidence(root);
}

/**
 * The anchor filenames `collectSpecEntries` keys its layout probes on. One of
 * them present is the weakest evidence that a `spec-NNNN/` directory holds a
 * spec a human actually authored.
 */
const SPEC_ANCHOR_FILES = new Set(["01_spec.md", "01_user-stories.md", "spec.md"]);

/**
 * The anchor has to carry something, not merely exist. Keying only on the
 * filename made `touch spec-0001/01_Spec.md` the whole cost of the fallback:
 * an empty anchor plus an evidence file flipped a project with no authored
 * spec at all to `ready` and suppressed `QFAI-DPACK-001`, which is the same
 * bypass the empty-directory rule above already closes one level up.
 */
async function hasRecognizableSpecFile(dir: string): Promise<boolean> {
  let anchors: string[];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    anchors = entries
      .filter((entry) => entry.isFile() && SPEC_ANCHOR_FILES.has(entry.name.toLowerCase()))
      .map((entry) => entry.name);
  } catch {
    // ENOENT / EACCES: an unreadable spec directory proves nothing, so it does
    // not enable the fallback.
    return false;
  }
  const authored = await Promise.all(
    anchors.map((name) => hasAuthoredSpecContent(path.join(dir, name))),
  );
  return authored.includes(true);
}

async function hasAuthoredSpecContent(filePath: string): Promise<boolean> {
  try {
    return recordsSpecContent(await readFile(filePath, "utf-8"));
  } catch {
    // ENOENT / EACCES / EISDIR: an anchor we cannot read carries nothing.
    return false;
  }
}

/**
 * `true` when at least one line of the anchor says something an author put
 * there — the weakest reading of "not empty and not placeholders only", which
 * is deliberately where the bar sits. A heading counts: `# Spec 0001` is a
 * one-line spec stub, and this predicate only decides whether the import-lite
 * entrypoint applies, not whether the spec is complete (`QFAI-SPEC-*` owns
 * that). Judging the anchor more harshly here would reject spec stubs the rest
 * of the toolchain accepts and reopen the warning with no remedy in reach.
 *
 * Heading and bullet markers are stripped before the line is judged so a
 * template still on `# <spec title>` reads as the placeholder it is.
 */
function recordsSpecContent(text: string): boolean {
  return text.split(/\r?\n/).some((line) => {
    const value = line
      .trim()
      .replace(/^#{1,6}\s*/, "")
      .replace(/^[-*+]\s*/, "")
      .trim();
    return !isUnfilledValue(value);
  });
}

/**
 * `true` when `dir` exists but cannot be enumerated. A missing directory is
 * `false`: absence is a legitimate, inspectable state.
 */
async function isDirectoryUnreadable(dir: string): Promise<boolean> {
  try {
    await readdir(dir);
    return false;
  } catch (error) {
    return !isEnoent(error);
  }
}
