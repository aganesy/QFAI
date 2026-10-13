import { lstat, mkdir, open } from "node:fs/promises";
import path from "node:path";
import { isEnoent } from "../fs/errno.js";
import { readPinnedRegularFileBytes } from "../init/fsGuards.js";
import { graphEnvironmentKey } from "./layout.js";
import { assertGraphStoragePath } from "./storage.js";

export const GRAPH_STATE_BYTES = 32768;
export const GRAPH_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export class GraphLocalStateError extends Error {
  constructor(
    message: string,
    readonly recovery: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

export async function graphStateDirectory(root: string): Promise<string> {
  const directory = path.join(root, ".qfai", "tools", "state", graphEnvironmentKey());
  await assertGraphStoragePath(root, directory);
  await mkdir(directory, { recursive: true });
  await assertGraphStoragePath(root, directory);
  return directory;
}

export function invalidGraphState(): GraphLocalStateError {
  return new GraphLocalStateError(
    "Project graph permission state is invalid.",
    "Retain the local state and repair .qfai/tools/state before retrying the graph CLI or hook.",
  );
}

export function graphStateText(value: unknown, maximum: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maximum &&
    !value.includes("\0")
  );
}

export async function readGraphLocalFile(file: string): Promise<string | undefined> {
  try {
    const before = await lstat(file);
    if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1)
      throw invalidGraphState();
    const pinned = await readPinnedRegularFileBytes(file, GRAPH_STATE_BYTES);
    const after = await lstat(file);
    if (
      !pinned ||
      before.dev !== pinned.dev ||
      before.ino !== pinned.ino ||
      after.dev !== pinned.dev ||
      after.ino !== pinned.ino ||
      !after.isFile() ||
      after.isSymbolicLink() ||
      after.nlink !== 1
    )
      throw invalidGraphState();
    return pinned.content.toString("utf8");
  } catch (cause: unknown) {
    if (isEnoent(cause)) return undefined;
    throw cause;
  }
}

export async function writeGraphLocalFile(file: string, value: unknown): Promise<void> {
  const text = JSON.stringify(value);
  if (Buffer.byteLength(text) > GRAPH_STATE_BYTES) throw invalidGraphState();
  const handle = await open(file, "wx", 0o600);
  try {
    await handle.writeFile(text, "utf8");
  } finally {
    await handle.close();
  }
}
