import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";

import type { QfaiConfig } from "../../config.js";
import { PROTOTYPING_JSON_REL } from "../../prototyping/paths.js";
import type { Issue } from "../../types.js";
import { exists, issue } from "../utils.js";

const PROTO_JSON_REL = PROTOTYPING_JSON_REL;
const HANDOFF_REL = ".qfai/contracts/design/prototype-handoff.yaml";

export async function validatePrototypingArtifactRefIntegrity(
  root: string,
  _config: QfaiConfig,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const doc = await readJsonObject(path.join(root, PROTO_JSON_REL));

  if (doc && Array.isArray(doc.iterations)) {
    for (let i = 0; i < doc.iterations.length; i += 1) {
      const iter = asRecord(doc.iterations[i]);
      const refs = asRecord(iter?.evidenceRefs);
      await validateArtifactRef(
        root,
        refs?.screenshot,
        `iterations[${i}].evidenceRefs.screenshot`,
        issues,
        { required: true },
      );
      await validateArtifactRef(root, refs?.html, `iterations[${i}].evidenceRefs.html`, issues, {
        required: true,
      });
    }
  }

  const handoff = await readYamlObject(path.join(root, HANDOFF_REL));
  if (handoff) {
    await validateArtifactRef(
      root,
      handoff.finalArtifact,
      "prototype-handoff.finalArtifact",
      issues,
    );
    await validateArtifactRef(
      root,
      handoff.designSystemMirror,
      "prototype-handoff.designSystemMirror",
      issues,
    );
  }

  return issues;
}

async function validateArtifactRef(
  root: string,
  value: unknown,
  field: string,
  issues: Issue[],
  options: { required?: boolean } = {},
): Promise<void> {
  if (typeof value !== "string" || value.trim().length === 0) {
    if (options.required) {
      issues.push(
        issue(
          "QFAI-PROT-009",
          `${field} must be a non-empty repository-relative artifact path.`,
          "error",
          PROTO_JSON_REL,
          "prototyping.refIntegrity.emptyArtifactRef",
        ),
      );
    }
    return;
  }
  const resolved = resolveRepoRef(root, value);
  if (!resolved) {
    issues.push(
      issue(
        "QFAI-PROT-009",
        `${field} must stay within the repository root (got ${JSON.stringify(value)}).`,
        "error",
        PROTO_JSON_REL,
        "prototyping.refIntegrity.outsideRoot",
      ),
    );
    return;
  }
  if (!(await exists(resolved))) {
    issues.push(
      issue(
        "QFAI-PROT-009",
        `${field} references a missing artifact: ${value}.`,
        "error",
        PROTO_JSON_REL,
        "prototyping.refIntegrity.missingArtifact",
        [value],
      ),
    );
  }
}

function resolveRepoRef(root: string, value: string): string | undefined {
  const resolved = path.resolve(root, value);
  const relative = path.relative(root, resolved);
  return relative.startsWith("..") || path.isAbsolute(relative) ? undefined : resolved;
}

async function readJsonObject(filePath: string): Promise<Record<string, unknown> | undefined> {
  try {
    return asRecord(JSON.parse(await readFile(filePath, "utf-8")));
  } catch {
    return undefined;
  }
}

async function readYamlObject(filePath: string): Promise<Record<string, unknown> | undefined> {
  try {
    return asRecord(parseYaml(await readFile(filePath, "utf-8")));
  } catch {
    return undefined;
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
