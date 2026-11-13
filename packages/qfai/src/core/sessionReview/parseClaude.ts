/**
 * A Claude Code session transcript (`<session>.jsonl`), reduced to session events.
 *
 * The records read: an `attachment` of type `hook_additional_context` is a hook's context; an
 * `assistant` message's `tool_use` blocks are tool calls; a `user` message holds `tool_result`
 * blocks, the text the user typed, or both. Every other record is counted and passed over,
 * so a record type a later host version adds changes nothing here.
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
} from "./events.js";
import { isTypedTurn } from "./signals.js";

const SHELL_TOOLS: ReadonlySet<string> = new Set(["Bash", "PowerShell"]);
const READ_TOOLS: ReadonlySet<string> = new Set(["Read"]);
const QUESTION_TOOLS: ReadonlySet<string> = new Set(["AskUserQuestion"]);

export async function parseClaudeTranscript(file: string): Promise<SessionEvents> {
  const events = emptyEvents();
  const counts = await readJsonl(file, (record) => {
    readClaudeRecord(record, events);
    return true;
  });
  events.records = counts.records;
  events.malformed = counts.malformed;
  return events;
}

export function readClaudeRecord(record: JsonRecord, events: SessionEvents): void {
  const type = record.type;
  if (type === "attachment") {
    const attachment = record.attachment;
    if (stringAt(attachment, "type") === "hook_additional_context" && isRecord(attachment)) {
      const content = attachment.content;
      const texts = Array.isArray(content) ? content : [content];
      for (const text of texts) if (typeof text === "string") events.hookContexts.push(text);
    }
    return;
  }
  const message = record.message;
  if (!isRecord(message)) return;
  const content = message.content;
  if (type === "assistant" && Array.isArray(content)) {
    for (const block of content) readToolUse(block, events);
    return;
  }
  if (type !== "user") return;
  // A message the user sends while a tool runs is stored in the record that carries the tool's
  // result, as a text block beside it, so the results are read and the text is still judged.
  const holdsResult =
    Array.isArray(content) && content.some((block) => stringAt(block, "type") === "tool_result");
  if (holdsResult) for (const block of content) readToolResult(block, events);
  if (record.isMeta === true || record.isCompactSummary === true) return;
  if (!holdsResult && record.toolUseResult !== undefined) return;
  // The host puts its own wrappers, such as a system reminder, in text blocks beside what the
  // user typed, so each block is judged alone.
  const blocks = Array.isArray(content)
    ? content.filter((block) => stringAt(block, "type") === "text").map(textOf)
    : [textOf(content)];
  const typed = blocks.filter(isTypedTurn);
  if (typed.length > 0) events.userTurns.push(typed.join("\n"));
}

function readToolUse(block: unknown, events: SessionEvents): void {
  if (!isRecord(block) || block.type !== "tool_use") return;
  const id = stringAt(block, "id") ?? "";
  const name = stringAt(block, "name") ?? "unknown";
  const input = block.input;
  const call: ToolCall = { id, name };
  if (READ_TOOLS.has(name)) {
    const readPath = stringAt(input, "file_path");
    if (readPath !== undefined) call.readPath = readPath;
  }
  if (SHELL_TOOLS.has(name)) {
    const command = stringAt(input, "command");
    if (command !== undefined) call.command = command;
  }
  if (QUESTION_TOOLS.has(name) && isRecord(input) && Array.isArray(input.questions)) {
    call.questions = input.questions.length;
  }
  events.calls.push(call);
}

function readToolResult(block: unknown, events: SessionEvents): void {
  if (!isRecord(block) || block.type !== "tool_result") return;
  const isError = block.is_error === true;
  const text = textOf(block.content);
  const stated = /^(?:<error>)?Exit code (-?\d+)/.exec(text)?.[1];
  // A command sent to the background has not finished, so its exit status is not known.
  const background = text.startsWith("Command running in background");
  let exitCode: number | null = 0;
  if (isError) exitCode = stated === undefined ? null : Number(stated);
  else if (background) exitCode = null;
  events.results.push({ id: stringAt(block, "tool_use_id") ?? "", isError, text, exitCode });
}
