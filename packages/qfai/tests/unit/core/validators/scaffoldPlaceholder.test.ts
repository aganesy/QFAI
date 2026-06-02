/**
 * Unit: `D-SCAFFOLD-PLACEHOLDER` validator (BR-0008-0008).
 *
 * Pins the bridge between `qfai atdd scaffold` (which emits
 * skeleton files containing `QFAI-SCAFFOLD-PLACEHOLDER` +
 * `// TODO: implement assertion for <TC-ID>`) and
 * `qfai validate --profile atdd|full`, so unfilled scaffolds are
 * visible to the validate surface at severity warning. Pre-fix the
 * scaffolds existed on disk but no validator scanned them, leaving
 * the documented escalation path unreachable from the validate
 * command.
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

const PLACEHOLDER_BODY = `// QFAI:SPEC-0008:TC-0008-0001
// QFAI-SCAFFOLD-PLACEHOLDER — replace this block with a real assertion.
// AC refs: AC-0008-0001
// US refs: US-0008-0001

import { describe, it } from "vitest";

describe("TC-0008-0001", () => {
  // TODO: implement assertion for TC-0008-0001
  it.skip("pending — scaffold placeholder", () => {
    // TODO: implement assertion for TC-0008-0001
  });
});
`;

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
  it("emits D-SCAFFOLD-PLACEHOLDER (warning) for unfilled scaffold files under tests/atdd/", async () => {
    await seedScaffold("spec-0008", "TC-0008-0001", PLACEHOLDER_BODY);
    const issues = await validateScaffoldPlaceholder(root, defaultConfig);
    const finding = issues.find((i) => i.code === "D-SCAFFOLD-PLACEHOLDER");
    expect(finding).toBeDefined();
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
    await seedScaffold(
      "spec-0008",
      "TC-0008-0001",
      PLACEHOLDER_BODY.replace(/TC-0008-0001/g, "TC-0008-0001"),
    );
    await seedScaffold(
      "spec-0008",
      "TC-0008-0002",
      PLACEHOLDER_BODY.replace(/TC-0008-0001/g, "TC-0008-0002"),
    );
    const issues = await validateScaffoldPlaceholder(root, defaultConfig);
    const findings = issues.filter((i) => i.code === "D-SCAFFOLD-PLACEHOLDER");
    expect(findings.length).toBe(2);
    expect(findings.map((f) => f.message ?? "").join("\n")).toMatch(/TC-0008-0001/);
    expect(findings.map((f) => f.message ?? "").join("\n")).toMatch(/TC-0008-0002/);
  });
});
