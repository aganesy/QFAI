/**
 * Unit: `D-SCAFFOLD-PLACEHOLDER` validator (BR-0008-0008 /
 * BR-0008-0009).
 *
 * Pins the bridge between `qfai atdd scaffold` (which emits
 * skeleton files containing `QFAI-SCAFFOLD-PLACEHOLDER` +
 * `// TODO: implement assertion for <TC-ID>`) and
 * `qfai validate --profile atdd|full`, so unfilled scaffolds are
 * visible to the validate surface AND the per-(spec, TC)
 * escalation counter advances every validate cycle.
 *
 * Severity contract per AC-0008-0011 / TC-0008-0014:
 *   - Cycles 1, 2: severity `warning`
 *   - Cycle 3 onward: severity `error` (default
 *     `atdd.scaffoldEscalateCycles = 3` per DR-0272)
 */
// QFAI:SPEC-0008:TC-0008-0013
// QFAI:SPEC-0008:TC-0008-0014

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../../../src/core/config.js";
import { validateScaffoldPlaceholder } from "../../../../src/core/validators/scaffoldPlaceholder.js";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-scaffold-placeholder-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function seedScaffold(specId: string, tcId: string, body: string): Promise<void> {
  const dir = path.join(root, "tests", "atdd", specId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${tcId}.test.ts`), body, "utf-8");
}

function placeholderBodyFor(tcId: string): string {
  return `// QFAI:SPEC-0008:${tcId}
// QFAI-SCAFFOLD-PLACEHOLDER — replace this block with a real assertion.
// AC refs: AC-0008-0001
// US refs: US-0008-0001

import { describe, it } from "vitest";

describe("${tcId}", () => {
  // TODO: implement assertion for ${tcId}
  it.skip("pending — scaffold placeholder", () => {
    // TODO: implement assertion for ${tcId}
  });
});
`;
}

const FILLED_BODY = `// QFAI:SPEC-0008:TC-0008-0001
// AC refs: AC-0008-0001

import { describe, it, expect } from "vitest";

describe("TC-0008-0001", () => {
  it("passes the real assertion", () => {
    expect(1 + 1).toBe(2);
  });
});
`;

describe("validateScaffoldPlaceholder", () => {
  it("emits D-SCAFFOLD-PLACEHOLDER (warning) for unfilled scaffold files on the first validate cycle", async () => {
    await seedScaffold("spec-0008", "TC-0008-0001", placeholderBodyFor("TC-0008-0001"));
    const issues = await validateScaffoldPlaceholder(root, defaultConfig);
    const finding = issues.find((i) => i.code === "D-SCAFFOLD-PLACEHOLDER");
    expect(finding).toBeDefined();
    // First cycle: warning.
    expect(finding?.severity).toBe("warning");
    expect(finding?.message ?? "").toMatch(/TC-0008-0001/);
    expect(finding?.message ?? "").toMatch(/tests\/atdd\/spec-0008\/TC-0008-0001\.test\.ts/);
  });

  it("does NOT emit when the placeholder marker has been removed (operator filled the scaffold)", async () => {
    await seedScaffold("spec-0008", "TC-0008-0001", FILLED_BODY);
    const issues = await validateScaffoldPlaceholder(root, defaultConfig);
    expect(issues.filter((i) => i.code === "D-SCAFFOLD-PLACEHOLDER")).toEqual([]);
  });

  it("does NOT emit when tests/atdd does not exist (fresh project)", async () => {
    const issues = await validateScaffoldPlaceholder(root, defaultConfig);
    expect(issues).toEqual([]);
  });

  it("captures TC IDs from multiple placeholder files in one finding per file", async () => {
    await seedScaffold("spec-0008", "TC-0008-0001", placeholderBodyFor("TC-0008-0001"));
    await seedScaffold("spec-0008", "TC-0008-0002", placeholderBodyFor("TC-0008-0002"));
    const issues = await validateScaffoldPlaceholder(root, defaultConfig);
    const findings = issues.filter((i) => i.code === "D-SCAFFOLD-PLACEHOLDER");
    expect(findings.length).toBe(2);
    expect(findings.map((f) => f.message ?? "").join("\n")).toMatch(/TC-0008-0001/);
    expect(findings.map((f) => f.message ?? "").join("\n")).toMatch(/TC-0008-0002/);
  });

  // Pin the BR-0008-0009 / AC-0008-0011 / TC-0008-0014 escalation
  // contract: after `atdd.scaffoldEscalateCycles` (default 3)
  // consecutive validate cycles with the SAME placeholder
  // unremoved, the finding escalates from warning to error. The
  // validator increments a per-(spec, TC) counter in
  // `.qfai/state.json#atdd.scaffoldAttempts` on every call, so
  // running validate three times in a row trips the gate.
  it("escalates from warning to error after 3 consecutive validate cycles (BR-0008-0009 default)", async () => {
    await seedScaffold("spec-0008", "TC-0008-0001", placeholderBodyFor("TC-0008-0001"));

    // Cycle 1: counter advances 0 → 1; warning.
    const issues1 = await validateScaffoldPlaceholder(root, defaultConfig);
    const finding1 = issues1.find((i) => i.code === "D-SCAFFOLD-PLACEHOLDER");
    expect(finding1?.severity).toBe("warning");

    // Cycle 2: counter advances 1 → 2; still warning.
    const issues2 = await validateScaffoldPlaceholder(root, defaultConfig);
    const finding2 = issues2.find((i) => i.code === "D-SCAFFOLD-PLACEHOLDER");
    expect(finding2?.severity).toBe("warning");

    // Cycle 3: counter advances 2 → 3; threshold reached → error.
    const issues3 = await validateScaffoldPlaceholder(root, defaultConfig);
    const finding3 = issues3.find((i) => i.code === "D-SCAFFOLD-PLACEHOLDER");
    expect(finding3?.severity).toBe("error");
    expect(finding3?.message ?? "").toMatch(/escalated to error/);
  });

  it("honors qfai.config.yaml#atdd.scaffoldEscalateCycles override", async () => {
    await seedScaffold("spec-0008", "TC-0008-0001", placeholderBodyFor("TC-0008-0001"));
    const customConfig = {
      ...defaultConfig,
      atdd: { ...defaultConfig.atdd, scaffoldEscalateCycles: 1 },
    };
    // Threshold = 1 → very first cycle escalates immediately to
    // error (counter 0 → 1, `shouldEscalate(1, 1)` is true).
    const issues = await validateScaffoldPlaceholder(root, customConfig);
    const finding = issues.find((i) => i.code === "D-SCAFFOLD-PLACEHOLDER");
    expect(finding?.severity).toBe("error");
  });
});
