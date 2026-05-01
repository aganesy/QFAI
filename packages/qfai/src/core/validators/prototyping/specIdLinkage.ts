import { readFile } from "node:fs/promises";
import path from "node:path";

import { resolvePath, type QfaiConfig } from "../../config.js";
import { collectSpecEntries } from "../../specLayout.js";
import type { Issue } from "../../types.js";
import { issue } from "../utils.js";

const PROTO_JSON_REL = ".qfai/evidence/prototyping/prototyping.json";

export async function validateSpecIdLinkage(root: string, config: QfaiConfig): Promise<Issue[]> {
  const doc = await readPrototypingJson(root);
  if (!doc || !Array.isArray(doc.specsCovered)) {
    return [];
  }

  const specsRoot = resolvePath(root, config, "specsDir");
  const knownSpecIds = new Set(
    (await collectSpecEntries(specsRoot)).map((entry) => entry.specNumber),
  );
  const issues: Issue[] = [];

  for (const value of doc.specsCovered) {
    if (typeof value !== "string") {
      continue;
    }
    const specId = normalizeSpecId(value);
    if (!/^\d{4}$/u.test(specId)) {
      issues.push(
        issue(
          "QFAI-PROT2-008",
          `prototyping.json specsCovered entry must be a 4-digit spec id (got ${JSON.stringify(value)}).`,
          "error",
          PROTO_JSON_REL,
          "prototyping.specIdLinkage.specsCoveredFormat",
        ),
      );
      continue;
    }
    if (!knownSpecIds.has(specId)) {
      issues.push(
        issue(
          "QFAI-PROT2-008",
          `prototyping.json specsCovered references missing spec-${specId}.`,
          "error",
          PROTO_JSON_REL,
          "prototyping.specIdLinkage.missingSpec",
          [path.join(config.paths.specsDir, `spec-${specId}`)],
        ),
      );
    }
  }

  return issues;
}

async function readPrototypingJson(root: string): Promise<Record<string, unknown> | undefined> {
  try {
    const parsed = JSON.parse(await readFile(path.join(root, PROTO_JSON_REL), "utf-8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

function normalizeSpecId(value: string): string {
  return value.replace(/^spec-/iu, "");
}
