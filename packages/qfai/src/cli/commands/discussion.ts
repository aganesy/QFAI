import path from "node:path";

import { loadConfig } from "../../core/config.js";
import { findPacks } from "../../core/packLocator.js";
import { readDiscussionCurrentId, writeDiscussionCurrentId } from "../../core/state.js";
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

async function resolveDiscussionRoot(root: string): Promise<string> {
  const { config } = await loadConfig(root);
  // `path.resolve` (not `path.join`) so an absolute `paths.discussionDir`
  // is honored verbatim. With `path.join`, an absolute config value would
  // be naively concatenated under `<root>` (e.g. `<root>/tmp/discussion`),
  // hiding the configured location from `discussion list --active`.
  return path.resolve(root, config.paths.discussionDir);
}

async function listCandidateDirs(discussionRoot: string): Promise<string[]> {
  const packs = await findPacks(discussionRoot, "discussion");
  return packs.map((pack) => pack.name).sort((left, right) => left.localeCompare(right));
}

/**
 * `qfai discussion use <id>` — persist the active-session pointer.
 * Permissive: it records the operator's explicit choice even when the
 * named pack dir does not (yet) exist; the missing/duplicate condition
 * is surfaced at read time by `list --active`.
 */
async function runUse(options: DiscussionOptions, writeErr: (m: string) => void): Promise<number> {
  const id = options.id?.trim();
  if (!id) {
    writeErr("qfai discussion use: <id> is required (e.g. qfai discussion use discussion-<ts>).");
    return 1;
  }
  await writeDiscussionCurrentId(options.root, id);
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
  const discussionRoot = await resolveDiscussionRoot(options.root);
  const candidates = await listCandidateDirs(discussionRoot);
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
 * recovery error.
 */
async function runListPacks(
  options: DiscussionOptions,
  write: (m: string) => void,
): Promise<number> {
  const format = options.format ?? "text";
  const discussionRoot = await resolveDiscussionRoot(options.root);
  const candidates = await listCandidateDirs(discussionRoot);
  const currentId = await readDiscussionCurrentId(options.root);
  const packs = candidates.map((id) => ({ id, active: id === currentId }));

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
    return runUse(options, writeErr);
  }

  // action === "list"
  if (options.active) {
    return runListActive(options, write, writeErr);
  }
  return runListPacks(options, write);
}
