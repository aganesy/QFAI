/**
 * What a transcript says, in the one shape the counts read.
 *
 * Claude Code and Codex record a session differently. Each parser reduces its own records to these
 * events, so the counting in `signals.ts` never meets a host's record format.
 */
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

/** One tool call the agent made. */
export type ToolCall = {
  id: string;
  name: string;
  /** The file a file-read tool was given. */
  readPath?: string;
  /** The command text a shell tool was given. */
  command?: string;
  /** The number of questions a structured-question call carried. */
  questions?: number;
  /** The command executions a host reported for the call apart from its output, in order. */
  executions?: Execution[];
};

/** One command execution's end: its exit code where stated, and whether it failed. */
export type Execution = { exitCode: number | null; failed: boolean };

/** What came back for a tool call. */
export type ToolResult = {
  id: string;
  isError: boolean;
  /** Used for counting only, and never emitted. */
  text: string;
  /** The exit status a shell result reports, `null` where none is stated. */
  exitCode: number | null;
};

export type SessionEvents = {
  records: number;
  malformed: number;
  /** Hook context texts shown to the agent, one per hook output. */
  hookContexts: string[];
  calls: ToolCall[];
  results: ToolResult[];
  /** The text of each message the user typed, in order. */
  userTurns: string[];
};

export function emptyEvents(): SessionEvents {
  return { records: 0, malformed: 0, hookContexts: [], calls: [], results: [], userTurns: [] };
}

export type JsonRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function stringAt(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) return undefined;
  const inner = value[key];
  return typeof inner === "string" ? inner : undefined;
}

/**
 * Feed each JSON-object line of `file` to `onRecord`, in order, and count the lines that are not
 * one. `onRecord` returns `false` to stop reading early and `true` to go on. CRLF line ends
 * read as line ends.
 */
export async function readJsonl(
  file: string,
  onRecord: (record: JsonRecord) => boolean,
): Promise<{ records: number; malformed: number }> {
  const stream = createReadStream(file, { encoding: "utf-8" });
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  let records = 0;
  let malformed = 0;
  try {
    for await (const raw of lines) {
      const line = raw.trim();
      if (line === "") continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        malformed += 1;
        continue;
      }
      if (!isRecord(parsed)) {
        malformed += 1;
        continue;
      }
      records += 1;
      if (!onRecord(parsed)) break;
    }
  } finally {
    lines.close();
    stream.destroy();
  }
  return { records, malformed };
}

/** Code-unit order, so the report is the same under every locale. */
export function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Whether a file-system error says the path is not there, which is an answer, not a failure. */
export function isMissing(error: unknown): boolean {
  if (!(error instanceof Error) || !("code" in error)) return false;
  return error.code === "ENOENT" || error.code === "ENOTDIR";
}

/** The text of a tool result or message body, whichever of the hosts' shapes it takes. */
export function textOf(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(textOf).join("\n");
  if (isRecord(value)) {
    const text = value.text ?? value.output ?? value.content;
    return text === undefined ? "" : textOf(text);
  }
  return "";
}
