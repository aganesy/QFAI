import { readdir } from "node:fs/promises";
import path from "node:path";

import { loadConfig } from "../../core/config.js";
import { isEnoent } from "../../core/fs/errno.js";
import { findPacks, type LocatedPack } from "../../core/packLocator.js";
import {
  readDiscussionCurrentId,
  readDiscussionPointer,
  writeDiscussionCurrentId,
} from "../../core/state.js";
import { error, info } from "../lib/logger.js";

export type DiscussionAction = "list" | "use";

export type DiscussionOptions = {
  root: string;
  action: DiscussionAction;
  /** `list --active` view (read the active-session pointer). */
  active?: boolean;
  format?: "text" | "json";
  /** Positional `<id>` for `discussion use <id>`. */
  id?: string;
  /**
   * Output sinks. Injectable for deterministic testing; default to the
   * CLI logger (stdout / stderr).
   */
  write?: (message: string) => void;
  writeErr?: (message: string) => void;
};

type ResolvedDiscussionRoot = {
  discussionRoot: string;
  /** `qfai.config.yaml` load/normalize errors, already rendered. */
  configIssues: string[];
  /**
   * Set when the resolved `discussionRoot` may not be the configured one:
   * the file could not be read or parsed, or `paths.discussionDir` itself
   * was rejected and silently replaced by its default.
   */
  rootUntrusted?: string;
  configPath: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Decide whether the discussion root we just resolved is the one the
 * config file asked for.
 *
 * `loadConfig` normalizes each key independently and degrades a rejected
 * value to its default, so the presence of *an* issue says nothing about
 * *which* key was lost: `baseBranch: 123` leaves `paths.discussionDir`
 * perfectly intact. Only three things can make the resolved root a guess
 * rather than the configured location, and each is read off the raw
 * document instead of matched against issue text:
 *
 *   1. the file exists but could not be read or parsed (no document, yet
 *      an issue was recorded — an absent file records neither),
 *   2. the document, or its `paths` block, is not a mapping, so
 *      `discussionDir` could not be looked up at all,
 *   3. `paths.discussionDir` is present but is not a usable string.
 */
function untrustedRootReason(document: unknown, issues: string[]): string | undefined {
  if (document === undefined) {
    return issues.length > 0 ? issues.join("; ") : undefined;
  }
  if (!isRecord(document)) {
    return "設定ファイルのトップレベルがマッピングではないため paths.discussionDir を読み取れません。";
  }
  const paths = document.paths;
  if (paths === undefined || paths === null) {
    return undefined;
  }
  if (!isRecord(paths)) {
    return "paths がマッピングではないため paths.discussionDir を読み取れません。";
  }
  const discussionDir = paths.discussionDir;
  if (discussionDir === undefined || discussionDir === null) {
    return undefined;
  }
  if (typeof discussionDir !== "string" || discussionDir.trim().length === 0) {
    return "paths.discussionDir は空でない文字列である必要があります。";
  }
  return undefined;
}

async function resolveDiscussionRoot(root: string): Promise<ResolvedDiscussionRoot> {
  const { config, issues, configPath, document } = await loadConfig(root);
  const configIssues = issues.map((issue) => issue.message);
  const untrusted = untrustedRootReason(document, configIssues);
  // `path.resolve` (not `path.join`) so an absolute `paths.discussionDir`
  // is honored verbatim. With `path.join`, an absolute config value would
  // be naively concatenated under `<root>` (e.g. `<root>/tmp/discussion`),
  // hiding the configured location from `discussion list --active`.
  return {
    discussionRoot: path.resolve(root, config.paths.discussionDir),
    // `loadConfig` swallows a broken config into `defaultConfig` + issues.
    // Callers that enumerate the resolved root have to see those issues —
    // silently listing under a broken config hides a real defect — but
    // only the subset above decides whether the *root* is trustworthy.
    configIssues,
    ...(untrusted === undefined ? {} : { rootUntrusted: untrusted }),
    configPath,
  };
}

async function listCandidateDirs(discussionRoot: string): Promise<string[]> {
  // `findPacks` answers `[]` for a root it could not read as well as for one
  // that is genuinely empty, and the caller turns `[]` into "does not match an
  // existing discussion-* dir" — a claim about packs it never saw. Probe the
  // directory first so the two cases separate: an absent root really has no
  // candidates and the note is accurate, while an EACCES or an I/O error
  // throws and the caller drops the note instead of misreporting a real id.
  try {
    await readdir(discussionRoot);
  } catch (error: unknown) {
    if (!isEnoent(error)) {
      throw error;
    }
    return [];
  }
  const packs = await findPacks(discussionRoot, "discussion");
  return packs.map((pack) => pack.name).sort((left, right) => left.localeCompare(right));
}

type PackListing = { ok: true; packs: LocatedPack[] } | { ok: false; message: string };

/**
 * Enumerate the packs under `discussionRoot` (already sorted by name).
 *
 * An absent root is "no packs" — a legitimate empty listing. Every other
 * read failure (EACCES, EIO, a file where the dir should be, …) is
 * returned as a failure instead of being flattened into an empty list,
 * so no caller can report "there are no packs" when it merely could not
 * look.
 */
async function listPacks(discussionRoot: string): Promise<PackListing> {
  try {
    const packs = await findPacks(discussionRoot, "discussion", { onReadFailure: "throw" });
    return { ok: true, packs };
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    return { ok: false, message: `cannot enumerate ${discussionRoot}: ${detail}` };
  }
}

/**
 * Stderr note when `<id>` names no existing `discussion-*` dir. Best
 * effort by design: the pointer has already been written by the time
 * this runs, so an unreadable config / discussion root must cost the
 * note only — never turn a successful write into a failure.
 */
async function noteUnmatchedId(
  root: string,
  id: string,
  writeErr: (m: string) => void,
): Promise<void> {
  let discussionRoot: string;
  let candidates: string[];
  try {
    // `resolveDiscussionRoot` now answers a record (the bare `list` verb needs
    // the config issues alongside the path); this note only ever needed the
    // path, and a config it could not read still costs the note only.
    ({ discussionRoot } = await resolveDiscussionRoot(root));
    candidates = await listCandidateDirs(discussionRoot);
  } catch {
    return;
  }
  if (candidates.includes(id)) return;
  writeErr(
    `qfai discussion use: note: "${id}" does not match an existing discussion-* dir ` +
      `under ${discussionRoot}`,
  );
}

/**
 * `qfai discussion use <id>` — persist the active-session pointer.
 * Permissive: it records the operator's explicit choice even when the
 * named pack dir does not (yet) exist; the missing/duplicate condition
 * is surfaced at read time by `list --active`. The write is always
 * confirmed on stdout naming the file and the key it moved, and an
 * unmatched `<id>` additionally draws a stderr note, so a typo leaves
 * evidence where it is made instead of only at the next read.
 */
async function runUse(
  options: DiscussionOptions,
  write: (m: string) => void,
  writeErr: (m: string) => void,
): Promise<number> {
  const id = options.id?.trim();
  if (!id) {
    writeErr("qfai discussion use: <id> is required (e.g. qfai discussion use discussion-<ts>).");
    return 1;
  }
  await writeDiscussionCurrentId(options.root, id);
  write(`qfai discussion use: set discussion.currentId=${id} in .qfai/state.json`);
  await noteUnmatchedId(options.root, id, writeErr);
  return 0;
}

function emitActive(
  currentId: string,
  format: "text" | "json",
  write: (m: string) => void,
): number {
  if (format === "json") {
    write(JSON.stringify({ currentId }, null, 2));
  } else {
    write(currentId);
  }
  return 0;
}

function emitAmbiguityError(
  candidates: string[],
  writeErr: (m: string) => void,
  reason: string,
): number {
  const lines = [
    `qfai discussion list --active: ${reason}`,
    "Candidate discussion-* dirs:",
    ...candidates.map((name) => `  - ${name}`),
    "Choose one explicitly with: qfai discussion use <id>",
  ];
  writeErr(lines.join("\n"));
  return 1;
}

/**
 * `qfai discussion list --active` — print the active-session pointer
 * read from `.qfai/state.json#discussion.currentId`. Never infers the
 * active session from filesystem timestamps. The single-candidate
 * fallback (pointer absent + exactly one `discussion-*` dir) is the
 * one exception: it returns the lone candidate as the de-facto active
 * session and surfaces a stderr note so the operator can tell a
 * pointer-set output apart from an inference output. When the pointer
 * is absent (or resolves to a missing/duplicate dir) and multiple
 * candidate `discussion-*` dirs exist, exits non-zero naming the
 * candidates and the recovery command.
 */
async function runListActive(
  options: DiscussionOptions,
  write: (m: string) => void,
  writeErr: (m: string) => void,
): Promise<number> {
  const format = options.format ?? "text";
  const { discussionRoot } = await resolveDiscussionRoot(options.root);
  const listing = await listPacks(discussionRoot);
  if (!listing.ok) {
    writeErr(`qfai discussion list --active: ${listing.message}`);
    return 1;
  }
  const candidates = listing.packs.map((pack) => pack.name);
  const currentId = await readDiscussionCurrentId(options.root);

  if (currentId === null) {
    if (candidates.length === 1 && candidates[0]) {
      // Unambiguous: a single candidate is the de-facto active session.
      // Emit a stderr note so the operator can distinguish this
      // inference from a true pointer-set output (the stdout payload
      // is identical in both cases). Once a second candidate appears
      // the next invocation switches to the ambiguity-error path, so
      // the note also primes operators for the future failure mode.
      writeErr(
        "qfai discussion list --active: (no pointer set; single candidate assumed — " +
          "run 'qfai discussion use <id>' to pin)",
      );
      return emitActive(candidates[0], format, write);
    }
    if (candidates.length === 0) {
      writeErr(
        "qfai discussion list --active: no active session pointer and no discussion-* dirs found.",
      );
      return 1;
    }
    return emitAmbiguityError(
      candidates,
      writeErr,
      "no active session pointer (state.json#discussion.currentId is absent) and multiple candidate dirs exist.",
    );
  }

  // Pointer present: it must resolve to exactly one existing candidate.
  const matches = candidates.filter((name) => name === currentId);
  if (matches.length === 1) {
    return emitActive(currentId, format, write);
  }

  const reason =
    matches.length === 0
      ? `active session pointer "${currentId}" does not resolve to an existing discussion-* dir.`
      : `active session pointer "${currentId}" resolves to duplicate discussion-* dirs.`;
  return emitAmbiguityError(candidates, writeErr, reason);
}

/**
 * `qfai discussion list` — enumerate every `discussion-*` pack under
 * the configured discussion root (`paths.discussionDir`), marking the
 * active-session pointer target with `*`. This is the deliberate
 * counterpart to `list --active`: the pointer view answers "which pack
 * am I on?", this one answers "which packs exist?" — the question
 * `discussion use <id>` needs answered before it can be run. "Nothing
 * to list" is not a failure for a list verb, so zero candidates exits
 * 0 with an empty payload rather than reusing the `list --active`
 * recovery error. Failing to *read* the root is a different matter: it
 * exits non-zero rather than passing an unreadable directory off as an
 * empty list — and so is failing to *resolve* it: a `qfai.config.yaml`
 * that costs us `paths.discussionDir` aborts the listing instead of
 * enumerating the default dir as if it were the configured one. The
 * active-session pointer is held to the same standard: a state file we
 * could not read is not the same fact as a pointer that was never set,
 * and `active: false` on every pack would assert the latter.
 */
async function runListPacks(
  options: DiscussionOptions,
  write: (m: string) => void,
  writeErr: (m: string) => void,
): Promise<number> {
  const format = options.format ?? "text";
  const { discussionRoot, configIssues, rootUntrusted, configPath } = await resolveDiscussionRoot(
    options.root,
  );
  if (rootUntrusted !== undefined) {
    // The configured discussion root is unknown, so any listing produced
    // here would enumerate the *default* dir while claiming to answer
    // "which packs exist?". Refuse rather than hand back a plausible-
    // looking but wrong candidate set under exit 0.
    writeErr(
      [
        `qfai discussion list: ${configPath} から paths.discussionDir を確定できないため一覧を中止しました。`,
        `  - ${rootUntrusted}`,
        "設定を修正してから再実行してください。",
      ].join("\n"),
    );
    return 1;
  }
  if (configIssues.length > 0) {
    // Every other config problem leaves `paths.discussionDir` intact —
    // `loadConfig` normalizes key by key — so the candidate set below is
    // the configured one and the listing stands. Report the problems
    // anyway (on stderr, so `--format json` stdout stays parseable):
    // a list verb is no place to hide a broken config file.
    writeErr(
      [
        `qfai discussion list: ${configPath} に設定エラーがあります (一覧は続行します)。`,
        ...configIssues.map((message) => `  - ${message}`),
      ].join("\n"),
    );
  }
  const pointer = await readDiscussionPointer(options.root);
  if (!pointer.ok) {
    // `active` is asserted for every row of the payload, so an
    // indeterminate pointer would be published as "none of these packs is
    // active" — a fact we do not have. Refuse instead of guessing.
    writeErr(
      [
        `qfai discussion list: ${pointer.reason}`,
        "どの pack が active かを確定できないため一覧を中止しました。",
        "state ファイルを修復するか削除し (削除は pointer 未設定と同義)、" +
          "qfai discussion use <id> で設定し直してください。",
      ].join("\n"),
    );
    return 1;
  }
  const listing = await listPacks(discussionRoot);
  if (!listing.ok) {
    writeErr(`qfai discussion list: ${listing.message}`);
    return 1;
  }
  const currentId = pointer.currentId;

  // A `dangerous` dir is a `discussion-*` name the rest of the toolchain
  // refuses (QFAI-DPACK-005 asks for a rename or a removal), so it is not
  // something `discussion use <id>` can be pointed at. Listing it beside
  // the real packs would advertise it as a valid choice, so it is kept
  // out of the payload and named on stderr with its repair instead —
  // stderr so that `--format json` stdout stays parseable.
  const dangerous = listing.packs.filter((pack) => pack.isDangerous).map((pack) => pack.name);
  const packs = listing.packs
    .filter((pack) => !pack.isDangerous)
    .map((pack) => ({ id: pack.name, active: pack.name === currentId }));

  if (dangerous.length > 0) {
    writeErr(
      `qfai discussion list: ignored non-canonical discussion dir(s): ${dangerous.join(", ")} ` +
        "(rename to discussion-YYYYMMDDhhmmssSSS or remove them; see QFAI-DPACK-005).",
    );
  }

  if (format === "json") {
    write(JSON.stringify({ packs }, null, 2));
    return 0;
  }
  for (const pack of packs) {
    write(`${pack.active ? "*" : " "} ${pack.id}`);
  }
  return 0;
}

export async function runDiscussion(options: DiscussionOptions): Promise<number> {
  const write = options.write ?? info;
  const writeErr = options.writeErr ?? error;

  if (options.action === "use") {
    return runUse(options, write, writeErr);
  }

  // action === "list"
  if (options.active) {
    return runListActive(options, write, writeErr);
  }
  return runListPacks(options, write, writeErr);
}
