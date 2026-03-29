import { writeFile } from "node:fs/promises";
import path from "node:path";

import type { HandoffArtifact } from "./types.js";

const CREDENTIAL_KEY_PATTERNS = /\b(API_KEY|PASSWORD|SECRET|TOKEN)\b/i;
const CREDENTIAL_VALUE_PATTERNS = /(sk-|ghp_|gho_|github_pat_|xox[bpsa]-|glpat-|AKIA[A-Z0-9])/;

export class HandoffWriter {
  async write(artifact: HandoffArtifact, outputPath: string): Promise<void> {
    const relative = this.toRelativePaths(artifact);
    // Structure-preserving redaction; cast is safe because stripCredentials
    // only replaces string values, preserving the object shape.
    const stripped = this.stripCredentials(relative) as HandoffArtifact;
    const json = JSON.stringify(stripped, null, 2);
    await writeFile(outputPath, json, "utf-8");
  }

  stripCredentials(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === "string") {
      return CREDENTIAL_VALUE_PATTERNS.test(obj) ? "<REDACTED>" : obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.stripCredentials(item));
    }

    if (typeof obj === "object") {
      const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        if (CREDENTIAL_KEY_PATTERNS.test(key) && typeof value === "string") {
          result[key] = "<REDACTED>";
        } else if (typeof value === "string" && CREDENTIAL_VALUE_PATTERNS.test(value)) {
          result[key] = "<REDACTED>";
        } else {
          result[key] = this.stripCredentials(value);
        }
      }
      return result;
    }

    return obj;
  }

  toRelativePaths(artifact: HandoffArtifact): HandoffArtifact {
    const cwd = process.cwd();

    const convertPath = (value: string): string => {
      if (path.isAbsolute(value)) {
        return path.relative(cwd, value);
      }
      return value;
    };

    const convertStrings = (arr: string[]): string[] => arr.map((s) => convertPath(s));

    return {
      ...artifact,
      generator: {
        outputs: convertStrings(artifact.generator.outputs),
      },
      planner: {
        strategies: artifact.planner.strategies.map((s) => ({
          ...s,
          constraints: s.constraints.map((c) => convertPath(c)),
        })),
      },
      evaluator: {
        ...artifact.evaluator,
        decisions: artifact.evaluator.decisions.map((d) => convertPath(d)),
      },
    };
  }
}
