/**
 * The counts `qfai session-review` reports, from a session's events.
 *
 * Every function here is pure: the events and the project's facts go in, sorted counts come out.
 * Nothing a message says leaves this module except a word from the fixed correction list, so the
 * report cannot carry a sentence the user or the agent wrote.
 */
import path from "node:path";

import { compareText, type SessionEvents, type ToolCall, type ToolResult } from "./events.js";

export type Count = { name: string; count: number };

export type FileRead = { path: string; reads: number; repeats: number; bytes: number };

export type ToolErrors = { tool: string; count: number; codes: Count[] };

export type QfaiCommand = { command: string; runs: number; exits: Count[] };

export type Correction = { turn: number; words: string[] };

export type SessionSignals = {
  records: number;
  malformed: number;
  typedTurns: number;
  reminders: Count[];
  reads: FileRead[];
  toolErrors: ToolErrors[];
  qfaiCommands: QfaiCommand[];
  questions: { calls: number; items: number };
  corrections: Correction[];
};

export type ProjectFacts = {
  root: string;
  platform: NodeJS.Platform;
  /** Each reminder text in the project's `reminders.json`, mapped to its key. */
  reminderTexts: ReadonlyMap<string, string>;
};

/** The directories whose files are QFAI's rules, skills and steps. */
const WATCHED_PREFIXES = [
  ".agents/rules/",
  ".agents/skills/",
  ".qfai/assistant/",
  ".claude/rules/",
  ".claude/skills/",
] as const;

/** The words that mark a typed turn as a correction. English is matched as whole words. */
const CORRECTION_WORDS_EN = [
  "actually",
  "do not",
  "don't",
  "i meant",
  "i said",
  "incorrect",
  "instead",
  "not what",
  "revert",
  "should not",
  "shouldn't",
  "stop",
  "undo",
  "wrong",
] as const;
/** Japanese correction words, written as escapes; each comment gives the meaning. */
const CORRECTION_WORDS_JA = [
  "\u3067\u306F\u306A\u304F", // rather than
  "\u3058\u3083\u306A\u304F\u3066", // not that, but
  "\u305D\u3046\u3058\u3083\u306A\u3044", // that is not it
  "\u3061\u304C\u3046", // wrong, in kana
  "\u3084\u3081\u3066", // stop it
  "\u3084\u308A\u76F4", // redo
  "\u5143\u306B\u623B", // put back
  "\u52DD\u624B\u306B", // without asking
  "\u623B\u3057\u3066", // undo it
  "\u9055\u3046", // wrong
  "\u9055\u3044\u307E\u3059", // that is wrong, politely
  "\u9593\u9055", // mistake
] as const;

const FINDING_CODE = /\bQFAI-[A-Z][A-Z0-9]*(?:-[A-Z][A-Z0-9]*)*-\d{3}\b/g;
/** A shell segment that runs `qfai`: the command word first, through `npx`, `pnpm` or the local bin. */
const QFAI_SEGMENT =
  /^(?:npx[ \t]+(?:-y[ \t]+|--yes[ \t]+)?|pnpm[ \t]+(?:exec[ \t]+)?|(?:\.\/)?node_modules\/\.bin\/)?qfai[ \t]+([a-z][a-z-]*)(?:[ \t]+([a-z][a-z-]*))?/;
/** The characters that end a shell command outside quotes. */
const COMMAND_SEPARATORS: ReadonlySet<string> = new Set([";", "&", "|", "(", ")", "\n"]);
const COMMANDS_WITH_SUBCOMMAND: ReadonlySet<string> = new Set([
  "atdd",
  "discussion",
  "sdd",
  "workflow",
]);

/** Openings of text the host writes into a user message: wrappers, notices, injected instructions. */
const HOST_TEXT_OPENINGS = ["[Request interrupted", "# AGENTS.md instructions"] as const;
/** The tags the hosts wrap their own text in, inside a user message. */
const HOST_WRAPPER_TAGS: ReadonlySet<string> = new Set([
  "bash-input",
  "bash-stderr",
  "bash-stdout",
  "command-args",
  "command-message",
  "command-name",
  "environment_context",
  "ide_opened_file",
  "ide_selection",
  "local-command-caveat",
  "local-command-stderr",
  "local-command-stdout",
  "system-reminder",
  "task-notification",
  "user-prompt-submit-hook",
  "user_instructions",
]);

/** The key a hook context that names QFAI but is none of the project's reminder texts takes. */
export const UNREGISTERED_REMINDER = "unregistered";

/** Whether a user message's text is one the user typed, not a wrapper or a notice the host wrote. */
export function isTypedTurn(text: string): boolean {
  const trimmed = text.trim();
  const tag = /^<([A-Za-z][\w-]*)[\s>]/.exec(trimmed)?.[1];
  if (tag !== undefined && HOST_WRAPPER_TAGS.has(tag)) return false;
  return trimmed !== "" && !HOST_TEXT_OPENINGS.some((opening) => trimmed.startsWith(opening));
}

export function summarise(events: SessionEvents, facts: ProjectFacts): SessionSignals {
  return {
    records: events.records,
    malformed: events.malformed,
    typedTurns: events.userTurns.length,
    reminders: countReminders(events.hookContexts, facts.reminderTexts),
    reads: countReads(events, facts),
    toolErrors: countToolErrors(events),
    qfaiCommands: countQfaiCommands(events),
    questions: countQuestions(events.calls),
    corrections: findCorrections(events.userTurns),
  };
}

/**
 * The key a hook context is counted under: its key in the project's reminder texts, a fixed key
 * for any other context that names QFAI, so no hook text reaches the report, or `null` for a
 * context of the project's own.
 */
export function reminderKey(
  text: string,
  reminderTexts: ReadonlyMap<string, string>,
): string | null {
  const trimmed = text.trim();
  const exact = reminderTexts.get(trimmed);
  if (exact !== undefined) return exact;
  return trimmed.startsWith("QFAI ") ? UNREGISTERED_REMINDER : null;
}

function countReminders(
  texts: readonly string[],
  reminderTexts: ReadonlyMap<string, string>,
): Count[] {
  const counts = new Map<string, number>();
  for (const text of texts) {
    const key = reminderKey(text, reminderTexts);
    if (key !== null) bump(counts, key);
  }
  return sortedCounts(counts);
}

/** A path as forward slashes with no repeated slash. */
function slashed(text: string): string {
  return text.replace(/\\+/g, "/").replace(/\/{2,}/g, "/");
}

/** The repository-relative form of `file` when it is under a watched directory, else `null`. */
export function watchedPath(
  file: string,
  facts: Pick<ProjectFacts, "root" | "platform">,
): string | null {
  return watchedOnly(relativeToRoot(slashed(file), facts));
}

/** A relative path with `.` and `..` resolved, when it stays under a watched directory. */
function watchedOnly(relative: string): string | null {
  const normal = path.posix.normalize(relative);
  return WATCHED_PREFIXES.some((prefix) => normal.startsWith(prefix)) ? normal : null;
}

/**
 * The ways a shell on this platform writes the root, with forward slashes: as given, and on
 * Windows also in the Git Bash form, `/c/...` for `C:/...`.
 */
function rootForms(facts: Pick<ProjectFacts, "root" | "platform">): string[] {
  const root = slashed(facts.root).replace(/\/$/, "");
  const drive = /^([A-Za-z]):\/(.*)$/.exec(root);
  if (facts.platform !== "win32" || drive === null) return [root];
  return [root, `/${(drive[1] ?? "").toLowerCase()}/${drive[2] ?? ""}`];
}

function relativeToRoot(file: string, facts: Pick<ProjectFacts, "root" | "platform">): string {
  const fold = (value: string): string =>
    facts.platform === "win32" ? value.toLowerCase() : value;
  for (const form of rootForms(facts)) {
    if (fold(file).startsWith(fold(`${form}/`))) return file.slice(form.length + 1);
  }
  return file.replace(/^\.\//, "");
}

/** The watched files a shell command names. A patch names files it writes, so it names none. */
export function pathsInCommand(
  command: string,
  facts: Pick<ProjectFacts, "root" | "platform">,
): string[] {
  if (command.includes("apply_patch")) return [];
  let text = slashed(command);
  for (const form of rootForms(facts)) {
    const escaped = form.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    text = text.replace(new RegExp(`${escaped}/`, facts.platform === "win32" ? "gi" : "g"), " ");
  }
  const found: string[] = [];
  const pattern =
    /(?:^|[^A-Za-z0-9_.\-/])(?:\.\/)?((?:\.agents\/(?:rules|skills)|\.qfai\/assistant|\.claude\/(?:rules|skills))\/[A-Za-z0-9_.\-/]*[A-Za-z0-9_-])/g;
  for (const match of text.matchAll(pattern)) {
    const file = match[1] === undefined ? null : watchedOnly(match[1]);
    if (file !== null) found.push(file);
  }
  return [...new Set(found)];
}

function countReads(events: SessionEvents, facts: ProjectFacts): FileRead[] {
  const results = resultsById(events.results);
  const reads = new Map<string, { reads: number; bytes: number }>();
  const add = (file: string, bytes: number): void => {
    const entry = reads.get(file) ?? { reads: 0, bytes: 0 };
    entry.reads += 1;
    entry.bytes += bytes;
    reads.set(file, entry);
  };
  for (const call of events.calls) {
    const resultBytes = Buffer.byteLength(results.get(call.id)?.text ?? "", "utf-8");
    if (call.readPath !== undefined) {
      const file = watchedPath(call.readPath, facts);
      if (file !== null) add(file, resultBytes);
    }
    if (call.command !== undefined) {
      const files = pathsInCommand(call.command, facts);
      // The output is one file's only when the command names no other path, watched or not.
      const alone = files.length === 1 && pathArguments(call.command) === 1;
      for (const file of files) add(file, alone ? resultBytes : 0);
    }
  }
  return [...reads]
    .map(([file, entry]) => ({
      path: file,
      reads: entry.reads,
      repeats: entry.reads - 1,
      bytes: entry.bytes,
    }))
    .sort((a, b) => compareText(a.path, b.path));
}

/** How many words of a shell line look like a path: holding a slash, or ending in an extension. */
function pathArguments(command: string): number {
  return command
    .split(/[\s'"`;|&()]+/)
    .filter((word) => /[\\/]/.test(word) || /\.[A-Za-z0-9]+$/.test(word)).length;
}

function countToolErrors(events: SessionEvents): ToolErrors[] {
  const names = new Map(events.calls.map((call) => [call.id, call.name]));
  const errors = new Map<string, { count: number; codes: Map<string, number> }>();
  for (const result of events.results) {
    if (!result.isError) continue;
    const tool = names.get(result.id) ?? "unknown";
    const entry = errors.get(tool) ?? { count: 0, codes: new Map<string, number>() };
    entry.count += 1;
    for (const code of result.text.match(FINDING_CODE) ?? []) bump(entry.codes, code);
    errors.set(tool, entry);
  }
  return [...errors]
    .map(([tool, entry]) => ({ tool, count: entry.count, codes: sortedCounts(entry.codes) }))
    .sort((a, b) => compareText(a.tool, b.tool));
}

/** Each `qfai` command a shell command runs, as `qfai <command>` or `qfai <command> <subcommand>`. */
export function qfaiCommandsIn(command: string): string[] {
  const found: string[] = [];
  for (const segment of shellSegments(command)) {
    const [, name, sub] = QFAI_SEGMENT.exec(slashed(segment).trim()) ?? [];
    if (name === undefined) continue;
    found.push(
      sub !== undefined && COMMANDS_WITH_SUBCOMMAND.has(name)
        ? `qfai ${name} ${sub}`
        : `qfai ${name}`,
    );
  }
  return found;
}

/**
 * The commands a shell line holds, split where a separator stands outside quotes. A quoted
 * separator, as in `printf '; qfai validate'`, is text, and a backslash outside single quotes
 * keeps the next character.
 */
function shellSegments(command: string): string[] {
  const segments: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  for (let at = 0; at < command.length; at += 1) {
    const char = command[at] ?? "";
    if (quote === null && COMMAND_SEPARATORS.has(char)) {
      segments.push(current);
      current = "";
      continue;
    }
    current += char;
    if (char === "\\" && quote !== "'") {
      current += command[at + 1] ?? "";
      at += 1;
    } else if (quote === null && (char === "'" || char === '"')) quote = char;
    else if (char === quote) quote = null;
  }
  segments.push(current);
  return segments;
}

function endsWithQfai(command: string): boolean {
  const last = shellSegments(command)
    .map((segment) => segment.trim())
    .filter((segment) => segment !== "")
    .at(-1);
  return last !== undefined && qfaiCommandsIn(last).length === 1;
}

function countQfaiCommands(events: SessionEvents): QfaiCommand[] {
  const results = resultsById(events.results);
  const commands = new Map<string, { runs: number; exits: Map<string, number> }>();
  for (const call of events.calls) {
    if (call.command === undefined) continue;
    const names = qfaiCommandsIn(call.command);
    // The shell's status is a qfai command's only when the call ran one and it ran last.
    const exitCode =
      names.length === 1 && endsWithQfai(call.command)
        ? (results.get(call.id)?.exitCode ?? null)
        : null;
    for (const name of names) {
      const entry = commands.get(name) ?? { runs: 0, exits: new Map<string, number>() };
      entry.runs += 1;
      bump(entry.exits, exitCode === null ? "unknown" : String(exitCode));
      commands.set(name, entry);
    }
  }
  return [...commands]
    .map(([command, entry]) => ({ command, runs: entry.runs, exits: sortedCounts(entry.exits) }))
    .sort((a, b) => compareText(a.command, b.command));
}

function countQuestions(calls: readonly ToolCall[]): { calls: number; items: number } {
  let asked = 0;
  let items = 0;
  for (const call of calls) {
    if (call.questions === undefined) continue;
    asked += 1;
    items += call.questions;
  }
  return { calls: asked, items };
}

/** The correction words a typed turn holds, sorted. */
export function correctionWords(text: string): string[] {
  const lower = text.toLowerCase();
  const words: string[] = [];
  for (const word of CORRECTION_WORDS_EN) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+");
    if (new RegExp(`(?<![a-z'])${escaped}(?![a-z'])`).test(lower)) words.push(word);
  }
  for (const word of CORRECTION_WORDS_JA) if (text.includes(word)) words.push(word);
  return words.sort(compareText);
}

function findCorrections(turns: readonly string[]): Correction[] {
  const corrections: Correction[] = [];
  turns.forEach((text, index) => {
    const words = correctionWords(text);
    if (words.length > 0) corrections.push({ turn: index + 1, words });
  });
  return corrections;
}

function resultsById(results: readonly ToolResult[]): Map<string, ToolResult> {
  return new Map(results.map((result) => [result.id, result]));
}

function bump(counts: Map<string, number>, key: string): void {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

function sortedCounts(counts: ReadonlyMap<string, number>): Count[] {
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => compareText(a.name, b.name));
}
