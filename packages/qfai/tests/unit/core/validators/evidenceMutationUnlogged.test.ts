/**
 * Unit: `R-EVIDENCE-MUTATION-UNLOGGED` (severity error).
 *
 * - TC-0012-0480: a code path that mutates iter-NN evidence without
 *   invoking the mutation-log writer surfaces the reviewer-gate finding.
 *
 * Detection mechanism: a static SSOT-sync pair scan listing known
 * mutation call-sites under `core/prototyping/` and asserting each
 * source file that performs `fs.rename` / `fs.unlink` / overwriting
 * `writeFile` under iter-NN ALSO contains a paired call to a member
 * of the mutation-log writer module (`logEvidenceMove`,
 * `logEvidenceDelete`, `logEvidenceOverwrite`, or
 * `appendMutationLogEntry`).
 */
// QFAI:SPEC-0012:TC-0012-0480

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  detectEvidenceMutationUnlogged,
  EVIDENCE_MUTATION_PAIRS,
} from "../../../../src/core/validators/evidenceMutationUnlogged.js";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-mutation-unlogged-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function writeSource(rel: string, body: string): Promise<void> {
  const abs = path.join(root, rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, body, "utf-8");
}

describe("TC-0012-0480: detectEvidenceMutationUnlogged fires (error) for unlogged iter-NN mutation sites", () => {
  it("fires when a mutation call-site is present but no logEvidence* call is paired", async () => {
    // Seed a source file that calls fs.rename under iter-NN but never
    // funnels through the mutation-log writer.
    for (const pair of EVIDENCE_MUTATION_PAIRS) {
      // Embed every mutation token so the pair scan engages.
      const mutationLines = pair.mutationTokens
        .map((token) => `${token}backupAbs);`)
        .join("\n");
      await writeSource(
        pair.sourceRel,
        `import { rename } from "node:fs/promises";\n${mutationLines}\n// iter-NN backup move (UNLOGGED)\n`,
      );
    }
    const issues = await detectEvidenceMutationUnlogged(root);
    const findings = issues.filter((i) => i.code === "R-EVIDENCE-MUTATION-UNLOGGED");
    expect(findings.length).toBeGreaterThanOrEqual(1);
    const f = findings[0];
    expect(f?.severity).toBe("error");
    expect(f?.message).toMatch(/iter-NN|iter-/i);
    expect(f?.message).toMatch(/logEvidence|mutationLog/i);
  });

  it("does NOT fire when the mutation call-site is paired with a logEvidence* call", async () => {
    for (const pair of EVIDENCE_MUTATION_PAIRS) {
      const mutationLines = pair.mutationTokens
        .map((token) => `${token}backupAbs);`)
        .join("\n");
      const logToken = pair.logTokens[0] ?? "logEvidenceMove";
      await writeSource(
        pair.sourceRel,
        `import { rename } from "node:fs/promises";\nimport { ${logToken} } from "../prototyping/mutationLog.js";\nawait ${logToken}(root, "iterate", rel, size);\n${mutationLines}\n`,
      );
    }
    const issues = await detectEvidenceMutationUnlogged(root);
    expect(issues.filter((i) => i.code === "R-EVIDENCE-MUTATION-UNLOGGED")).toEqual([]);
  });

  it("does NOT fire when neither token is present (file has no iter-NN mutation surface)", async () => {
    for (const pair of EVIDENCE_MUTATION_PAIRS) {
      await writeSource(
        pair.sourceRel,
        `// no mutation calls; this file is a different concern\nexport const x = 1;\n`,
      );
    }
    const issues = await detectEvidenceMutationUnlogged(root);
    expect(issues.filter((i) => i.code === "R-EVIDENCE-MUTATION-UNLOGGED")).toEqual([]);
  });

  it("does NOT fire when the source file is absent (consumer install without source)", async () => {
    const issues = await detectEvidenceMutationUnlogged(root);
    expect(issues.filter((i) => i.code === "R-EVIDENCE-MUTATION-UNLOGGED")).toEqual([]);
  });
});
