import { readFile } from "node:fs/promises";

import type { HandoffArtifact } from "./types.js";

const REQUIRED_KEYS: ReadonlyArray<keyof HandoffArtifact> = [
  "version",
  "sessionId",
  "timestamp",
  "iteration",
  "planner",
  "generator",
  "evaluator",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === "number");
}

function isStrategy(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value["approach"] === "string" &&
    isStringArray(value["constraints"]) &&
    typeof value["budgetGuidance"] === "string"
  );
}

/** Whether every field `HandoffArtifact` promises is present with its declared type. */
function isHandoffArtifact(value: Record<string, unknown>): value is HandoffArtifact {
  const { planner, generator, evaluator } = value;
  return (
    typeof value["version"] === "string" &&
    typeof value["sessionId"] === "string" &&
    typeof value["timestamp"] === "string" &&
    typeof value["iteration"] === "number" &&
    isRecord(planner) &&
    Array.isArray(planner["strategies"]) &&
    planner["strategies"].every(isStrategy) &&
    isRecord(generator) &&
    isStringArray(generator["outputs"]) &&
    isRecord(evaluator) &&
    isNumberArray(evaluator["scores"]) &&
    isStringArray(evaluator["decisions"])
  );
}

export class HandoffReader {
  async read(filePath: string): Promise<HandoffArtifact | null> {
    let raw: string;
    try {
      raw = await readFile(filePath, "utf-8");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console -- intentional error logging for file read failure
      console.error(`[HandoffReader] Failed to read file: ${message}`);
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console -- intentional error logging for corrupt JSON
      console.error(`[HandoffReader] Corrupt or truncated JSON: ${message}`);
      return null;
    }

    if (!isRecord(parsed)) {
      // eslint-disable-next-line no-console -- intentional error logging for invalid artifact
      console.error("[HandoffReader] Invalid artifact: not an object");
      return null;
    }

    const missing = REQUIRED_KEYS.filter((key) => !(key in parsed));
    if (missing.length === 0 && isHandoffArtifact(parsed)) {
      return parsed;
    }
    // eslint-disable-next-line no-console -- intentional error logging for missing keys and malformed fields
    console.error(
      missing.length > 0
        ? `[HandoffReader] Missing required keys: ${missing.join(", ")}`
        : "[HandoffReader] Invalid artifact: a field has the wrong type",
    );
    return null;
  }
}
