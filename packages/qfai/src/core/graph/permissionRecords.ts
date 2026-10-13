import { opendir, unlink } from "node:fs/promises";
import path from "node:path";
import {
  GRAPH_UUID,
  graphStateText,
  invalidGraphState,
  readGraphLocalFile,
  GraphLocalStateError,
} from "./localFiles.js";

interface ObservedScope {
  id: string;
  domain: "code" | "documents";
  target: string;
  operation: string;
  worktree: string;
  session: string;
  createdAt: number;
  expiresAt: number;
}

export type PendingGraphSearch = ObservedScope & { kind: "pending" };
export type GrantedGraphSearch = ObservedScope & { kind: "grant"; reason: string };
export type GraphSearchRecord = PendingGraphSearch | GrantedGraphSearch;
export interface StoredGraphRecord {
  file: string;
  record: GraphSearchRecord;
  draft: boolean;
}

export async function readGraphSearchRecords(
  root: string,
  directory: string,
): Promise<StoredGraphRecord[]> {
  const records: StoredGraphRecord[] = [];
  const entries = await opendir(directory);
  for await (const entry of entries) {
    if (entry.name === "state.lock" || entry.name === "analysis.lock") continue;
    if (records.length >= 128) throw fullGraphState();
    const match = /^(.+)\.(pending|grant|draft)\.json$/.exec(entry.name);
    if (!match || !GRAPH_UUID.test(match[1] ?? "")) throw invalidGraphState();
    const file = path.join(directory, entry.name);
    const text = await readGraphLocalFile(file);
    if (text === undefined) throw invalidGraphState();
    let input: unknown;
    try {
      input = JSON.parse(text);
    } catch {
      throw invalidGraphState();
    }
    const record = parseGraphSearchRecord(input, root);
    if (
      !record ||
      record.id !== match[1] ||
      (match[2] === "pending" ? record.kind !== "pending" : record.kind !== "grant")
    )
      throw invalidGraphState();
    records.push({ file, record, draft: match[2] === "draft" });
  }
  const current: StoredGraphRecord[] = [];
  for (const item of records) {
    if (Date.now() >= item.record.expiresAt) await unlink(item.file);
    else current.push(item);
  }
  return current;
}

export function fullGraphState(): GraphLocalStateError {
  return new GraphLocalStateError(
    "Project graph permission state is full.",
    "Retry after pending attempts or search grants expire; retain valid worktree state.",
  );
}

function parseGraphSearchRecord(input: unknown, root: string): GraphSearchRecord | undefined {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return undefined;
  const value = input as Record<string, unknown>;
  const fields = [
    "id",
    "kind",
    "domain",
    "target",
    "operation",
    "worktree",
    "session",
    "createdAt",
    "expiresAt",
  ];
  if (value.kind === "grant") fields.push("reason");
  if (
    Object.keys(value).length !== fields.length ||
    fields.some((field) => !Object.hasOwn(value, field)) ||
    typeof value.id !== "string" ||
    !GRAPH_UUID.test(value.id) ||
    (value.kind !== "pending" && value.kind !== "grant") ||
    (value.domain !== "code" && value.domain !== "documents") ||
    !graphStateText(value.target, 4096) ||
    !graphStateText(value.operation, 128) ||
    !graphStateText(value.worktree, 4096) ||
    value.worktree !== path.resolve(root) ||
    !graphStateText(value.session, 4096) ||
    typeof value.createdAt !== "number" ||
    typeof value.expiresAt !== "number" ||
    !Number.isSafeInteger(value.createdAt) ||
    value.createdAt < 0 ||
    value.createdAt > Date.now() ||
    !Number.isSafeInteger(value.expiresAt) ||
    value.expiresAt !== value.createdAt + (value.kind === "pending" ? 600000 : 60000)
  )
    return undefined;
  const scope: ObservedScope = {
    id: value.id,
    domain: value.domain,
    target: value.target,
    operation: value.operation,
    worktree: value.worktree,
    session: value.session,
    createdAt: value.createdAt,
    expiresAt: value.expiresAt,
  };
  if (value.kind === "pending") return { ...scope, kind: "pending" };
  return graphStateText(value.reason, 2048)
    ? { ...scope, kind: "grant", reason: value.reason }
    : undefined;
}
