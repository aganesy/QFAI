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
/**
 * A shell segment that runs `qfai`: the command word first, through `npx`, `pnpm`, `yarn` (the
 * launcher a Plug'n'Play project uses) or the local bin.
 */
const QFAI_SEGMENT =
  /^(?:npx[ \t]+(?:-y[ \t]+|--yes[ \t]+)?|(?:pnpm|yarn)[ \t]+(?:exec[ \t]+)?|(?:\.\/)?node_modules\/\.bin\/)?qfai[ \t]+([a-z][a-z-]*)(?:[ \t]+([a-z][a-z-]*))?/;
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

/** The key a hook context that names QFAI takes when it is like none of the project's reminders. */
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
 * The keys a hook context is counted under, so no hook text reaches the report: its key when it
 * is one of the project's reminder texts; else the key of each reminder text it holds, as when a
 * host prefixes a reminder or joins several; else, for a context that names QFAI, the key shared
 * by the reminders that open with the same `QFAI <name>`, so a wording `reminders.json` no longer
 * lists still counts under its rule, or `unregistered`. A context of the project's own has none.
 */
export function reminderKeys(text: string, reminderTexts: ReadonlyMap<string, string>): string[] {
  const trimmed = text.trim();
  const exact = reminderTexts.get(trimmed);
  if (exact !== undefined) return [exact];
  const held = heldReminders(trimmed, reminderTexts);
  if (held.length > 0) return held;
  if (!trimmed.startsWith("QFAI ")) return [];
  const opening = reminderOpening(trimmed);
  if (opening === null) return [UNREGISTERED_REMINDER];
  const alike = [...reminderTexts]
    .filter(([listed]) => reminderOpening(listed) === opening)
    .map(([, key]) => key);
  return [alike.length > 0 ? sharedKey(alike) : UNREGISTERED_REMINDER];
}

/**
 * The keys of the reminder texts `text` holds, in the order they appear. A listed text found
 * inside a longer listed text it also holds, such as a brief text the full one starts with, is
 * that longer text's and is not counted again.
 */
function heldReminders(text: string, reminderTexts: ReadonlyMap<string, string>): string[] {
  const taken: { at: number; end: number; key: string }[] = [];
  const longestFirst = [...reminderTexts]
    .filter(([listed]) => listed !== "")
    .sort(([a], [b]) => b.length - a.length);
  for (const [listed, key] of longestFirst) {
    for (let at = text.indexOf(listed); at !== -1; at = text.indexOf(listed, at + 1)) {
      const end = at + listed.length;
      if (taken.some((range) => range.at <= at && end <= range.end)) continue;
      taken.push({ at, end, key });
      break;
    }
  }
  return taken.sort((a, b) => a.at - b.at).map((range) => range.key);
}

/**
 * The text of each reminder in a `reminders.json`, mapped to its key. A text several keys carry,
 * such as one reminder shown on several hooks, maps to the part of the keys they share.
 */
export function reminderIndex(
  entries: ReadonlyArray<readonly [key: string, text: string]>,
): Map<string, string> {
  const keysByText = new Map<string, string[]>();
  for (const [key, text] of entries) {
    const trimmed = text.trim();
    if (trimmed !== "") keysByText.set(trimmed, [...(keysByText.get(trimmed) ?? []), key]);
  }
  return new Map([...keysByText].map(([text, keys]) => [text, sharedKey(keys)]));
}

/** The words a QFAI reminder names its rule by: `QFAI <name>`, up to `(`, `:` or `.`. */
function reminderOpening(text: string): string | null {
  return /^QFAI [^(:.]+/.exec(text)?.[0].trim() ?? null;
}

/**
 * One key for several: the key itself when they are one, else their shared leading
 * `-`-separated words (`grilling` for `grilling-plan` and `grilling-delegation`), else all of
 * them joined with `+`.
 */
function sharedKey(keys: readonly string[]): string {
  const distinct = [...new Set(keys)].sort(compareText);
  const [first, ...rest] = distinct.map((key) => key.split("-"));
  // Every caller passes at least one key; this keeps the type checker's empty case answered.
  if (first === undefined) return UNREGISTERED_REMINDER;
  let length = first.length;
  for (const words of rest) {
    let same = 0;
    while (same < Math.min(length, words.length) && words[same] === first[same]) same += 1;
    length = same;
  }
  return length > 0 ? first.slice(0, length).join("-") : distinct.join("+");
}

function countReminders(
  texts: readonly string[],
  reminderTexts: ReadonlyMap<string, string>,
): Count[] {
  const counts = new Map<string, number>();
  for (const text of texts) {
    for (const key of reminderKeys(text, reminderTexts)) bump(counts, key);
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

/**
 * The watched files a shell command names. Each word is read whole, a quoted blank included,
 * then normalized, and only then tested against the watched directories. A quoted word that
 * names no file, such as the script of `bash -c "cat <path>"`, is read as a command in turn.
 * A patch names files it writes, so it names none.
 */
export function pathsInCommand(
  command: string,
  facts: Pick<ProjectFacts, "root" | "platform">,
): string[] {
  if (command.includes("apply_patch")) return [];
  const found: string[] = [];
  const visit = (word: string): void => {
    const files = watchedFilesIn(word, facts);
    found.push(...files);
    if (files.length === 0 && SHELL_BREAK.test(word)) shellWords(word).forEach(visit);
  };
  shellWords(slashed(command)).forEach(visit);
  return [...new Set(found)];
}

/** The watched files one shell word names. An option's value, as in `--file=<path>`, is one too. */
function watchedFilesIn(word: string, facts: Pick<ProjectFacts, "root" | "platform">): string[] {
  const values = word.includes("=") ? [word, word.slice(word.indexOf("=") + 1)] : [word];
  return values
    .map((value) => watchedOnly(relativeToRoot(value, facts)))
    .filter((file): file is string => file !== null && namesOneFile(file));
}

/** A character that ends a shell word outside quotes: a blank, a separator or a redirection. */
const SHELL_BREAK = /[\s;|&()`<>]/;

/**
 * The words of a shell line with their quotes removed, split at blanks and at separators and
 * redirections outside quotes, so a quoted blank stays inside its word.
 */
function shellWords(command: string): string[] {
  return shellTokens(command).map((token) => token.word);
}

/**
 * The words of a shell line as `shellWords` reads them, each marked when it belongs to a
 * redirection: the target after `>`, `>>`, `<` or `&>`, as in `2>/dev/null` or `> out`, an `&`
 * duplicate such as the `1` of `2>&1`, and the descriptor number fused before the operator.
 */
function shellTokens(command: string): { word: string; redirection: boolean }[] {
  const tokens: { word: string; redirection: boolean }[] = [];
  let current = "";
  let quoted = false;
  let quote: "'" | '"' | null = null;
  // Whether the next word is a redirection's target.
  let target = false;
  const finish = (): void => {
    if (current !== "" || quoted) {
      tokens.push({ word: current, redirection: target });
      target = false;
    }
    current = "";
    quoted = false;
  };
  for (const char of command) {
    if (quote !== null) {
      if (char === quote) quote = null;
      else current += char;
    } else if (char === "'" || char === '"') {
      quote = char;
      quoted = true;
    } else if (char === "<" || char === ">") {
      if (!quoted && /^\d+$/.test(current)) tokens.push({ word: current, redirection: true });
      else finish();
      current = "";
      quoted = false;
      target = true;
    } else if (SHELL_BREAK.test(char)) finish();
    else current += char;
  }
  finish();
  return tokens.filter((token) => token.word !== "");
}

/** A leading `NAME=value` word: an assignment the shell makes for the command, not its name. */
const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;

/**
 * The name and operand words of one shell command: its words after the leading `NAME=value`
 * assignments, with every redirection's words left out.
 */
function commandWords(segment: string): { name: string; words: string[] } {
  const words = shellTokens(segment)
    .filter((token) => !token.redirection)
    .map((token) => token.word);
  const start = words.findIndex((word) => !ASSIGNMENT.test(word));
  const [name = "", ...rest] = start === -1 ? [] : words.slice(start);
  return { name, words: rest };
}

/** Whether a normalized path names one file: not a directory, a glob or a variable. */
function namesOneFile(file: string): boolean {
  return !file.endsWith("/") && !/[*?[\]{}$]/.test(file);
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
      // The output is one file's only when no other operand, watched or not, can add to it.
      const alone = files.length === 1 && otherOperands(call.command, facts) === 0;
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

/** The commands whose first operand is a script or a pattern, not a file. */
const SCRIPT_FIRST = new Set(["awk", "egrep", "fgrep", "gawk", "grep", "rg", "sed"]);

/** The commands whose operands are text they print, not files. */
const TEXT_ONLY = new Set(["echo", "printf"]);

/**
 * How many operands of a shell line, other than the watched files it names, can name a file
 * that adds to its output: every word after each command's name that is no option, no count,
 * no redirection and no leading script, so an extensionless file such as `LICENSE` counts. The
 * name is the first word after the leading `NAME=value` assignments. Each word is read
 * whole, a quoted blank included; a quoted script that names no watched file is read as a
 * command in turn.
 */
function otherOperands(command: string, facts: Pick<ProjectFacts, "root" | "platform">): number {
  let count = 0;
  for (const segment of shellSegments(slashed(command))) {
    const { name, words } = commandWords(segment);
    const base = path.posix.basename(name).toLowerCase();
    if (TEXT_ONLY.has(base)) continue;
    let scriptPending = SCRIPT_FIRST.has(base);
    for (const word of words) {
      if (word.startsWith("-") || /^\d+$/.test(word)) continue;
      if (scriptPending) {
        scriptPending = false;
        continue;
      }
      if (watchedFilesIn(word, facts).length > 0) continue;
      count += SHELL_BREAK.test(word) ? otherOperands(word, facts) : 1;
    }
  }
  return count;
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
 * keeps the next character. An unquoted `#` that starts a word comments out the rest of its
 * line, and an `&` inside a redirection (`2>&1`, `&>`) separates nothing.
 */
function shellSegments(command: string): string[] {
  return shellParts(command).map((part) => part.text);
}

/** The commands a shell line holds, as `shellSegments` splits them, each with the separator that ended it. */
function shellParts(command: string): { text: string; separator: string }[] {
  const parts: { text: string; separator: string }[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  // Whether the next character starts a word: true after an unescaped blank or separator.
  let wordStart = true;
  for (let at = 0; at < command.length; at += 1) {
    const char = command[at] ?? "";
    if (quote === null && char === "#" && wordStart) {
      const end = command.indexOf("\n", at);
      if (end === -1) break;
      at = end - 1;
      continue;
    }
    if (quote === null && COMMAND_SEPARATORS.has(char) && !inRedirection(command, at)) {
      parts.push({ text: current, separator: char });
      current = "";
      wordStart = true;
      continue;
    }
    current += char;
    wordStart = quote === null && /\s/.test(char);
    if (char === "\\" && quote !== "'") {
      current += command[at + 1] ?? "";
      at += 1;
    } else if (quote === null && (char === "'" || char === '"')) quote = char;
    else if (char === quote) quote = null;
  }
  parts.push({ text: current, separator: "" });
  return parts;
}

/** Whether the `&` at `at` belongs to a redirection, as in `2>&1`, `<&3` or `&>file`. */
function inRedirection(command: string, at: number): boolean {
  if (command[at] !== "&") return false;
  const before = command[at - 1];
  return before === ">" || before === "<" || command[at + 1] === ">";
}

/**
 * Whether the line's last nonempty command runs `qfai` in the foreground. After a trailing `&`
 * the shell's status is the background job's start, not qfai's.
 */
function endsWithQfai(command: string): boolean {
  const parts = shellParts(command);
  const lastAt = parts.flatMap((part, index) => (part.text.trim() === "" ? [] : [index])).at(-1);
  if (lastAt === undefined) return false;
  const after = parts
    .slice(lastAt)
    .map((part) => part.separator)
    .join("");
  if (/^&(?!&)/.test(after)) return false;
  return qfaiCommandsIn(parts[lastAt]?.text.trim() ?? "").length === 1;
}

/** The variables a shell expands to the last command's status: Bash's and PowerShell's. */
const STATUS_VARIABLE = /\$\?|\$\{\?\}|\$LASTEXITCODE\b/i;

/**
 * The status a command line's final `echo` printed for the `qfai` command just before it, as in
 * `npx qfai validate; echo "exit=$?"`: the output's last line, read against the echo's own words
 * with the status variable as a number. `null` when the echo does not follow the `qfai` command
 * after `;` or a line break, holds a `'` or a leading option, names the variable other than
 * once, or the output does not end with its line.
 */
export function echoedStatus(command: string, output: string): number | null {
  const parts = shellParts(command);
  const filled = parts.flatMap((part, index) => (part.text.trim() === "" ? [] : [index]));
  const echoAt = filled.at(-1);
  const beforeAt = filled.at(-2);
  if (echoAt === undefined || beforeAt === undefined) return null;
  const echo = /^echo[ \t]+([^-'][^']*)$/.exec(parts[echoAt]?.text.trim() ?? "")?.[1];
  const joint = parts
    .slice(beforeAt, echoAt)
    .map((part) => part.separator)
    .join("");
  // After `&` the status is the background job's start and after `|` the pipe's. After `&&` or
  // `||` the echo runs only on one outcome, so where it did not run, qfai's own last line would
  // be read as a status.
  const sequential = /^[;\n]+$/.test(joint);
  if (
    echo === undefined ||
    !sequential ||
    qfaiCommandsIn(parts[beforeAt]?.text.trim() ?? "").length !== 1
  ) {
    return null;
  }
  const words = echo
    .replace(/"/g, "")
    .trim()
    .replace(/[ \t]+/g, " ");
  const pieces = words.split(STATUS_VARIABLE);
  if (pieces.length !== 2) return null;
  const pattern = new RegExp(
    `^${escapeRegExp(pieces[0] ?? "")}(-?\\d+)${escapeRegExp(pieces[1] ?? "")}$`,
  );
  const lastLine = output.trimEnd().split(/\r?\n/).at(-1)?.trim() ?? "";
  const printed = pattern.exec(lastLine)?.[1];
  return printed === undefined ? null : Number(printed);
}

function countQfaiCommands(events: SessionEvents): QfaiCommand[] {
  const results = resultsById(events.results);
  const commands = new Map<string, { runs: number; exits: Map<string, number> }>();
  for (const call of events.calls) {
    if (call.command === undefined) continue;
    const names = qfaiCommandsIn(call.command);
    // The shell's status is a qfai command's only when the call ran one and it ran last, or
    // when an `echo` right after it printed the status.
    const result = results.get(call.id);
    let exitCode: number | null = null;
    if (names.length === 1 && endsWithQfai(call.command)) exitCode = result?.exitCode ?? null;
    else if (names.length === 1) exitCode = echoedStatus(call.command, result?.text ?? "");
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
    const escaped = escapeRegExp(word).replace(/ /g, "\\s+");
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

/** `text` as a regular expression that matches it literally. */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function bump(counts: Map<string, number>, key: string): void {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

function sortedCounts(counts: ReadonlyMap<string, number>): Count[] {
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => compareText(a.name, b.name));
}
