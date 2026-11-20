import { mkdir } from "node:fs/promises";
import path from "node:path";
import { graphEnvironmentKey } from "./layout.js";
import { assertGraphStoragePath } from "./storage.js";

export const GRAPH_STATE_BYTES = 32768;

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
    "Project graph state is invalid.",
    "Retain the local state and repair .qfai/tools/state before retrying the graph CLI.",
  );
}
