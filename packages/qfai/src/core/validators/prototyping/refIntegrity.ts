import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";

import type { QfaiConfig } from "../../config.js";
import { isUntouchedCycleZeroSeed } from "../../prototyping/iteration.js";
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
      // The cycle-0 seed cites no evidence and owes none: `iterate`
      // writes it BEFORE capture, so any ref it carried named a file
      // that did not exist yet, and the project failed this gate for
      // the whole window between `iterate` and the first review.
      //
      // The test is the shared structural one, not a `reviewerId`
      // string. Keying a waiver on that field alone was not
      // load-bearing on the sibling gate — nothing cleared the stamp,
      // and writing it into any row waived that row — so both gates
      // ask the same question through one predicate: is this record
      // still the untouched seed the writer emitted?
      if (isUntouchedCycleZeroSeed(doc.iterations, i)) continue;
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
      { required: true, sourcePath: HANDOFF_REL },
    );
    await validateArtifactRef(
      root,
      handoff.designSystemMirror,
      "prototype-handoff.designSystemMirror",
      issues,
      { required: true, sourcePath: HANDOFF_REL },
    );
  }

  return issues;
}

async function validateArtifactRef(
  root: string,
  value: unknown,
  field: string,
  issues: Issue[],
  options: { required?: boolean; sourcePath?: string } = {},
): Promise<void> {
  // The Issue#path tells the operator WHICH file to edit. Default to
  // prototyping.json for fields that live there, but let
  // prototype-handoff.yaml callers point at the actual handoff file.
  const issuePath = options.sourcePath ?? PROTO_JSON_REL;
  if (typeof value !== "string" || value.trim().length === 0) {
    if (options.required) {
      issues.push(
        issue(
          "QFAI-PROT-009",
          `${field} must be a non-empty repository-relative artifact path.`,
          "error",
          issuePath,
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
        issuePath,
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
        issuePath,
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
