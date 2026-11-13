/**
 * A Codex rollout (`rollout-*.jsonl`), reduced to session events.
 *
 * The records read: `session_meta` names the session and its working directory; a
 * `response_item` is a message, a tool call (`function_call`, `custom_tool_call`,
 * `local_shell_call`) or a call's output; an `event_msg` that reports a command execution ending
 * gives that command's status. A rollout marks what each message holds: a developer message
 * marked as a hook's additional context is a hook's context, and a user message marked as user
 * text is a typed turn. An unmarked message is passed over, as is every other record.
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
const READ_CALLS: ReadonlySet<string> = new Set(["read_file"]);
const QUESTION_CALLS: ReadonlySet<string> = new Set([
  "request_user_input",
  "request_user_input_async",
]);

/**
 * A command's structured exit status: an `exit_code` field of the call's own JSON result. The
 * same field inside the command's output is escaped there (`\"exit_code\"`), so it is not matched.
 */
const EXIT_FIELD = /(?<!\\)"exit_code"\s*:\s*(-?\d+)/g;
/** The status line of the header Codex writes above a shell command's output. */
const EXIT_LINE = /^(?:Exit code:|Process exited with code) (-?\d+)$/;
/** The line that ends that header; everything after it is what the command printed. */
const OUTPUT_LINE = "Output:";
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
  const payload = record.payload;
  if (!isRecord(payload)) return;
  if (record.type === "event_msg") {
    readExecution(payload, events);
    return;
  }
  if (record.type !== "response_item") return;
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
  if (READ_CALLS.has(name)) {
    const readPath = stringAt(args, "file_path") ?? stringAt(args, "path");
    if (readPath !== undefined) call.readPath = readPath;
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
 * A command execution's end, from the event that reports it: a paginated rollout's
 * `item_completed` holding a `CommandExecution`, or a legacy `exec_command_end`. It is tied to the
 * call of its ID, or else, for a command an `exec` script ran, to that script: the latest call,
 * when it is an `exec` script still waiting for its output. A command the user ran is no agent
 * call. A shell result already read for that call takes the execution too.
 */
function readExecution(payload: JsonRecord, events: SessionEvents): void {
  const item = payload.item;
  let source: JsonRecord;
  let id: string | undefined;
  if (payload.type === "item_completed" && isRecord(item) && item.type === "CommandExecution") {
    source = item;
    id = stringAt(item, "id");
  } else if (payload.type === "exec_command_end") {
    source = payload;
    id = stringAt(payload, "call_id");
  } else return;
  if (stringAt(source, "source") === "user_shell") return;
  const status = stringAt(source, "status");
  if (status === undefined || status === "in_progress") return;
  const code = source.exit_code;
  const exitCode = typeof code === "number" && Number.isInteger(code) ? code : null;
  const call = executionCall(id, events);
  if (call === undefined) return;
  call.executions = [
    ...(call.executions ?? []),
    { exitCode, failed: status !== "completed" || (exitCode !== null && exitCode !== 0) },
  ];
  const at = events.results.findIndex((result) => result.id === call.id);
  const result = events.results[at];
  if (result === undefined || !isShellCall(call)) return;
  const stated = shellStatus(result.text, call);
  events.results[at] = {
    ...result,
    exitCode: stated.exitCode,
    isError: result.isError || stated.failed,
  };
}

function executionCall(id: string | undefined, events: SessionEvents): ToolCall | undefined {
  const named = id === undefined ? undefined : latestCall(events.calls, id);
  if (named !== undefined) return named;
  const last = events.calls.at(-1);
  if (last?.name !== "exec") return undefined;
  return events.results.some((result) => result.id === last.id) ? undefined : last;
}

function isShellCall(call: ToolCall): boolean {
  return SHELL_CALLS.has(call.name) || call.command !== undefined;
}

function latestCall(calls: readonly ToolCall[], id: string): ToolCall | undefined {
  for (let at = calls.length - 1; at >= 0; at -= 1) {
    if (calls[at]?.id === id) return calls[at];
  }
  return undefined;
}

/**
 * A call's output. The exit status is read only for a shell call; a status word inside a
 * command's own output is not the call's.
 */
function readOutput(payload: JsonRecord, calls: readonly ToolCall[]): ToolResult {
  const id = stringAt(payload, "call_id") ?? "";
  const output = payload.output;
  const text = textOf(output);
  const unsuccessful = isRecord(output) && output.success === false;
  const call = latestCall(calls, id);
  const shell = call !== undefined && isShellCall(call);
  const stated = shell ? shellStatus(text, call) : { exitCode: null, failed: false };
  return { id, isError: unsuccessful || stated.failed, text, exitCode: stated.exitCode };
}

/**
 * A shell call's status: the structured `exit_code` fields of its result, else the executions
 * the rollout reported for it, else the status line of the header Codex writes above the output.
 * A script that ran several commands failed when any of them did.
 */
function shellStatus(text: string, call: ToolCall): { exitCode: number | null; failed: boolean } {
  const fields = [...text.matchAll(EXIT_FIELD)].map((match) => Number(match[1]));
  if (fields.length > 0) {
    const exitCode = fields.find((code) => code !== 0) ?? 0;
    return { exitCode, failed: exitCode !== 0 };
  }
  if (call.executions !== undefined) {
    const failed = call.executions.some((execution) => execution.failed);
    const codes = call.executions.map((execution) => execution.exitCode);
    const exitCode = codes.includes(null) ? null : (codes.find((code) => code !== 0) ?? 0);
    return { exitCode, failed };
  }
  const exitCode = wrapperExitCode(text);
  return { exitCode, failed: exitCode !== null && exitCode !== 0 };
}

/**
 * The status line in the header Codex writes above a shell command's output, or none. The header
 * ends at the `Output:` line, so a line the command printed is never read as the status.
 */
function wrapperExitCode(text: string): number | null {
  const lines = text.split(/\r?\n/);
  const end = lines.indexOf(OUTPUT_LINE);
  for (const line of lines.slice(0, Math.max(end, 0))) {
    const code = EXIT_LINE.exec(line)?.[1];
    if (code !== undefined) return Number(code);
  }
  return null;
}
