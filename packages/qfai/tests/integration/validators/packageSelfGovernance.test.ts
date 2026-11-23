/**
 * Integration: the self-governance gate group's preconditions.
 *
 * A precondition that cannot observe one of its inputs (a permission error on
 * a parent directory) must report the check as incomplete, with the same
 * finding the detector uses for an input it cannot read, rather than stop
 * `qfai validate`. Permission is the portable way to make a path unobservable,
 * and neither Windows nor root honours it.
 */

import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  HANDOFF_SCHEMA_REL,
  HANDOFF_WRITER_PAIRS,
} from "../../../src/core/validators/handoffSchemaPairs.js";
import {
  runPackageSelfGovernanceValidators,
  unevaluatedPackageSelfGovernanceFamilies,
} from "../../../src/core/validators/packageSelfGovernance.js";
import {
  SKILL_MANIFEST_PROBE_IMPL_REL,
  SKILL_MANIFEST_SCHEMA_REL,
} from "../../../src/core/validators/skillManifestPairs.js";

const permissionsIgnored = process.platform === "win32" || process.geteuid?.() === 0;

let root: string;
let locked: string | undefined;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-self-governance-"));
  locked = undefined;
});

afterEach(async () => {
  if (locked) await chmod(locked, 0o700);
  await rm(root, { recursive: true, force: true });
});

async function writeAt(rel: string, body: string): Promise<void> {
  const abs = path.join(root, rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, body, "utf-8");
}

/** Make the directory holding `rel` unsearchable, so `rel` cannot be observed. */
async function lockParentOf(rel: string): Promise<void> {
  locked = path.dirname(path.join(root, rel));
  await chmod(locked, 0o000);
}

describe("package self-governance preconditions on an unobservable path", () => {
  it.skipIf(permissionsIgnored)(
    "reports QFAI-HANDOFF-001 as incomplete when the schema's directory cannot be read",
    async () => {
      await writeAt(HANDOFF_SCHEMA_REL, "export const HANDOFF_MINIMUM_FIELDS = [] as const;\n");
      for (const pair of HANDOFF_WRITER_PAIRS) {
        await writeAt(pair.writerRel, `references ${pair.writerToken}\n`);
      }
      await lockParentOf(HANDOFF_SCHEMA_REL);

      const issues = await runPackageSelfGovernanceValidators(root);
      const unevaluated = await unevaluatedPackageSelfGovernanceFamilies(root);

      expect(issues.map((i) => [i.code, i.severity, i.file])).toEqual([
        ["QFAI-HANDOFF-001", "error", HANDOFF_SCHEMA_REL],
      ]);
      expect(issues[0]?.message).toContain("could not be read (EACCES)");
      expect(issues[0]?.message).toContain("is incomplete");
      expect(unevaluated).toEqual(["QFAI-HANDOFF-001", "QFAI-MANIFEST-001"]);
    },
  );

  it.skipIf(permissionsIgnored)(
    "reports QFAI-MANIFEST-001 as incomplete when a pair side's directory cannot be read",
    async () => {
      await writeAt(SKILL_MANIFEST_PROBE_IMPL_REL, "SKILL_MANIFEST_RUNTIME_DEPENDENCIES_FIELD\n");
      await writeAt(SKILL_MANIFEST_SCHEMA_REL, "SKILL_MANIFEST_RUNTIME_DEPENDENCIES_FIELD\n");
      // The probe's directory, not the schema's: the handoff schema shares the
      // schema directory, and locking it would make that gate incomplete too.
      await lockParentOf(SKILL_MANIFEST_PROBE_IMPL_REL);

      const issues = await runPackageSelfGovernanceValidators(root);
      const unevaluated = await unevaluatedPackageSelfGovernanceFamilies(root);

      expect(issues.map((i) => [i.code, i.severity, i.file])).toEqual([
        ["QFAI-MANIFEST-001", "error", SKILL_MANIFEST_PROBE_IMPL_REL],
      ]);
      expect(issues[0]?.message).toContain("could not be read (EACCES)");
      expect(unevaluated).toEqual(["QFAI-HANDOFF-001", "QFAI-MANIFEST-001"]);
    },
  );
});
