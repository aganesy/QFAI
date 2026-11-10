/**
 * A Codex rollout (`rollout-*.jsonl`), reduced to session events.
 *
 * The records read: `session_meta` names the session and its working directory; a
 * `response_item` is a message, a tool call (`function_call`, `custom_tool_call`,
 * `local_shell_call`) or a call's output. A rollout marks what each message holds: a developer
 * message marked as a hook's additional context is a hook's context, and a user message marked as
 * user text is a typed turn. An unmarked message is passed over, as is every other record.
 */
import {
  emptyEvents,
  isRecord,
  readJsonl,
  stringAt,
  textOf,
  type JsonRecord,
  type SessionEvents,
  type ToolCall,
  type ToolResult,
} from "./events.js";
import { isTypedTurn } from "./signals.js";

const SHELL_CALLS: ReadonlySet<string> = new Set([
  "shell",
  "shell_command",
  "exec_command",
  "local_shell",
  "exec",
]);
const QUESTION_CALLS: ReadonlySet<string> = new Set([
  "request_user_input",
  "request_user_input_async",
]);

/**
 * A command's structured exit status: an `exit_code` field of the call's own JSON result. The
 * same field inside the command's output is escaped there (`\"exit_code\"`), so it is not matched.
 */
const EXIT_FIELD = /(?<!\\)"exit_code"\s*:\s*(-?\d+)/g;
/** The status line a shell output ends its header or its body with. */
const EXIT_LINE = /^(?:Exit code:?|Process exited with code) (-?\d+)\s*$/m;
/** A shell command inside an `exec` script: the string given as `cmd`. */
const EXEC_CMD = /\bcmd\s*:\s*("(?:[^"\\]|\\.)*")/g;

export type CodexSessionMeta = { id: string | undefined; cwd: string | undefined };

/** The `session_meta` payload's ID and working directory, from the record that carries it. */
export function codexSessionMeta(record: JsonRecord): CodexSessionMeta | null {
  if (record.type !== "session_meta") return null;
  return { id: stringAt(record.payload, "id"), cwd: stringAt(record.payload, "cwd") };
}

export async function parseCodexTranscript(file: string): Promise<SessionEvents> {
  const events = emptyEvents();
  const counts = await readJsonl(file, (record) => {
    readCodexRecord(record, events);
    return true;
  });
  events.records = counts.records;
  events.malformed = counts.malformed;
  return events;
}

export function readCodexRecord(record: JsonRecord, events: SessionEvents): void {
  if (record.type !== "response_item") return;
  const payload = record.payload;
  if (!isRecord(payload)) return;
  switch (payload.type) {
    case "message":
      readMessage(payload, events);
      return;
    case "function_call":
    case "custom_tool_call":
    case "local_shell_call":
      events.calls.push(readCall(payload));
      return;
    case "function_call_output":
    case "custom_tool_call_output":
      events.results.push(readOutput(payload, events.calls));
      return;
    default:
      return;
  }
}

/** The content-item kinds a message declares. */
function kindsOf(payload: JsonRecord): string[] {
  const meta = payload.internal_chat_message_metadata_passthrough;
  const kinds = isRecord(meta) ? meta.content_item_kinds : undefined;
  return Array.isArray(kinds) ? kinds.filter((kind) => typeof kind === "string") : [];
}

function readMessage(payload: JsonRecord, events: SessionEvents): void {
  const kinds = kindsOf(payload);
  const texts = Array.isArray(payload.content) ? payload.content.map(textOf) : [];
  if (payload.role === "developer" && kinds.includes("hooks.additional_context")) {
    events.hookContexts.push(...texts);
    return;
  }
  if (payload.role !== "user" || !kinds.includes("user.text")) return;
  const typed = texts.filter(isTypedTurn);
  if (typed.length > 0) events.userTurns.push(typed.join("\n"));
}

function readCall(payload: JsonRecord): ToolCall {
  const name = stringAt(payload, "name") ?? stringAt(payload, "type") ?? "unknown";
  const call: ToolCall = { id: stringAt(payload, "call_id") ?? "", name };
  const args = argumentsOf(payload);
  if (SHELL_CALLS.has(name) || payload.type === "local_shell_call") {
    const command = commandOf(args) ?? execCommands(stringAt(payload, "input"));
    if (command !== undefined) call.command = command;
  }
  if (QUESTION_CALLS.has(name) && isRecord(args) && Array.isArray(args.questions)) {
    call.questions = args.questions.length;
  }
  return call;
}

/** A call's arguments: the parsed `arguments` JSON, or a local shell call's `action`. */
function argumentsOf(payload: JsonRecord): unknown {
  const raw = payload.arguments;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return undefined;
    }
  }
  return payload.action ?? raw;
}

function commandOf(args: unknown): string | undefined {
  if (!isRecord(args)) return undefined;
  const command = args.command ?? args.cmd;
  if (typeof command === "string") return command;
  if (Array.isArray(command)) return command.filter((part) => typeof part === "string").join(" ");
  return undefined;
}

/** The shell commands an `exec` script runs, one per line, or none. */
function execCommands(script: string | undefined): string | undefined {
  if (script === undefined) return undefined;
  const commands: string[] = [];
  for (const match of script.matchAll(EXEC_CMD)) {
    const literal = match[1];
    if (literal === undefined) continue;
    try {
      const parsed: unknown = JSON.parse(literal);
      if (typeof parsed === "string") commands.push(parsed);
    } catch {
      // A string the JSON grammar does not read is not a command this parser can name.
    }
  }
  return commands.length > 0 ? commands.join("\n") : undefined;
}

/**
 * A call's output. The exit status is read only for a shell call, from the structured
 * `exit_code` field, or else from the status line: a status word inside a command's own output
 * is not the call's. A script that ran several commands failed when any of them did.
 */
function readOutput(payload: JsonRecord, calls: readonly ToolCall[]): ToolResult {
  const id = stringAt(payload, "call_id") ?? "";
  const output = payload.output;
  const text = textOf(output);
  let call: ToolCall | undefined;
  for (let at = calls.length - 1; at >= 0 && call === undefined; at -= 1) {
    if (calls[at]?.id === id) call = calls[at];
  }
  let exitCode: number | null = null;
  if (call !== undefined && (SHELL_CALLS.has(call.name) || call.command !== undefined)) {
    const fields = [...text.matchAll(EXIT_FIELD)].map((match) => Number(match[1]));
    const line = EXIT_LINE.exec(text)?.[1];
    if (fields.length > 0) exitCode = fields.find((code) => code !== 0) ?? 0;
    else if (line !== undefined) exitCode = Number(line);
  }
  const unsuccessful = isRecord(output) && output.success === false;
  return { id, isError: unsuccessful || (exitCode !== null && exitCode !== 0), text, exitCode };
}
