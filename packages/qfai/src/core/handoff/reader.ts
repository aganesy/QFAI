import { readFile } from "node:fs/promises";

import type { HandoffArtifact } from "./types.js";

const REQUIRED_KEYS: ReadonlyArray<keyof HandoffArtifact> = [
  "version",
  "sessionId",
  "planner",
  "generator",
  "evaluator",
];

export class HandoffReader {
  async read(filePath: string): Promise<HandoffArtifact | null> {
    let raw: string;
    try {
      raw = await readFile(filePath, "utf-8");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[HandoffReader] Failed to read file: ${message}`);
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[HandoffReader] Corrupt or truncated JSON: ${message}`);
      return null;
    }

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      console.error("[HandoffReader] Invalid artifact: not an object");
      return null;
    }

    const obj = parsed as Record<string, unknown>;
    const missing = REQUIRED_KEYS.filter((key) => !(key in obj));
    if (missing.length > 0) {
      console.error(`[HandoffReader] Missing required keys: ${missing.join(", ")}`);
      return null;
    }

    return parsed as HandoffArtifact;
  }
}
