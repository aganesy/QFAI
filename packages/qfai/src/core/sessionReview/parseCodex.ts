/**
 * A Codex rollout (`rollout-*.jsonl`), reduced to session events.
 *
 * The records read: `session_meta` names the session and its working directory; a
 * `response_item` is a message, a tool call (`function_call`, `custom_tool_call`,
 * `local_shell_call`) or a call's output. A developer message whose content is marked as a hook's
 * additional context is a hook's context, and a user message marked as user text, or unmarked and
 * not a wrapper, is a typed turn. Every other record is counted and passed over.
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
      events.results.push(readOutput(payload));
      return;
    default:
      return;
  }
}

/** The content-item kinds a message declares, or none on a rollout that does not record them. */
function kindsOf(payload: JsonRecord): string[] {
  const meta = payload.internal_chat_message_metadata_passthrough;
  const kinds = isRecord(meta) ? meta.content_item_kinds : undefined;
  return Array.isArray(kinds) ? kinds.filter((kind) => typeof kind === "string") : [];
}

function readMessage(payload: JsonRecord, events: SessionEvents): void {
  const role = payload.role;
  const kinds = kindsOf(payload);
  const texts = Array.isArray(payload.content) ? payload.content.map(textOf) : [];
  if (role === "developer") {
    const hook = kinds.includes("hooks.additional_context");
    for (const text of texts) {
      if (hook || (kinds.length === 0 && text.startsWith("QFAI "))) events.hookContexts.push(text);
    }
    return;
  }
  if (role !== "user") return;
  if (kinds.length > 0 && !kinds.includes("user.text")) return;
  const text = texts.join("\n");
  if (isTypedTurn(text)) events.userTurns.push(text);
}

function readCall(payload: JsonRecord): ToolCall {
  const name = stringAt(payload, "name") ?? stringAt(payload, "type") ?? "unknown";
  const call: ToolCall = { id: stringAt(payload, "call_id") ?? "", name };
  const args = argumentsOf(payload);
  if (SHELL_CALLS.has(name) || payload.type === "local_shell_call") {
    const command = commandOf(args) ?? stringAt(payload, "input");
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

function readOutput(payload: JsonRecord): ToolResult {
  const output = payload.output;
  const text = textOf(output);
  const exits = [
    ...text.matchAll(/(?:exit_code\\?"?\s*[:=]\s*|Exit code:?\s*|exited with code\s*)(-?\d+)/g),
  ].map((match) => Number(match[1]));
  const failed = exits.find((code) => code !== 0);
  const exitCode = failed ?? (exits.length > 0 ? 0 : null);
  const unsuccessful = isRecord(output) && output.success === false;
  return {
    id: stringAt(payload, "call_id") ?? "",
    isError: unsuccessful || (exitCode !== null && exitCode !== 0),
    text,
    exitCode,
  };
}
