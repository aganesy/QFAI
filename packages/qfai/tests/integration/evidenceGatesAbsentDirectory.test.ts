/**
 * Integration: the evidence presence gates and a checkout with no evidence.
 *
 * The prototyping outputs are local and untracked, so a fresh checkout has no
 * `.qfai/evidence/prototyping/`. `full` and `verify` (what project CI runs)
 * then skip the three presence gates: `QFAI-PROT-001` for a missing
 * `prototyping.json`, `QFAI-UIE-001` and `QFAI-UIE-002`. The `prototyping` and
 * `saas-package` profiles keep them, and so does any checkout whose evidence
 * directory exists.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { validateProject } from "../../src/core/validate.js";
import type { ValidationProfile } from "../../src/core/types.js";

const PRESENCE_CODES = ["QFAI-PROT-001", "QFAI-UIE-001", "QFAI-UIE-002"];

const UI_CONTRACT = `# QFAI-CONTRACT-ID: UI-0001
screens:
  - id: orders
    title: Orders
    route: /orders
`;

let root: string;

async function seedUiContract(): Promise<void> {
  const uiDir = path.join(root, ".qfai", "spec", "03_contract", "ui");
  await mkdir(uiDir, { recursive: true });
  await writeFile(path.join(uiDir, "orders.yaml"), UI_CONTRACT, "utf-8");
}

async function presenceFindings(profile: ValidationProfile): Promise<string[]> {
  const result = await validateProject(root, undefined, { profile });
  return [
    ...new Set(result.issues.map((i) => i.code).filter((code) => PRESENCE_CODES.includes(code))),
  ].sort();
}

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-evidence-absent-"));
  await seedUiContract();
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("the evidence directory is absent", () => {
  // QFAI:EX-0001-0040-04
  it.each<ValidationProfile>(["full", "verify"])(
    "reports no presence gate under the %s profile",
    async (profile) => {
      expect(await presenceFindings(profile)).toEqual([]);
    },
    60_000,
  );

  // QFAI:EX-0001-0040-01
  // QFAI:EX-0001-0040-02
  // QFAI:EX-0001-0040-05
  it.each<ValidationProfile>(["prototyping", "saas-package"])(
    "still reports every presence gate under the %s profile",
    async (profile) => {
      expect(await presenceFindings(profile)).toEqual(PRESENCE_CODES);
    },
    60_000,
  );
});

describe("the evidence directory is present", () => {
  // QFAI:EX-0001-0040-06
  it.each<ValidationProfile>(["full", "verify"])(
    "reports the screenshot and HTML gates under the %s profile",
    async (profile) => {
      await mkdir(path.join(root, ".qfai", "evidence", "prototyping"), { recursive: true });

      expect(await presenceFindings(profile)).toEqual([
        "QFAI-PROT-001",
        "QFAI-UIE-001",
        "QFAI-UIE-002",
      ]);
    },
    60_000,
  );
});
