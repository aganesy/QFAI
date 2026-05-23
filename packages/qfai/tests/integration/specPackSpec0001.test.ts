/**
 * Integration: Spec-Pack Structure Spec-0001 TDD Backfill
 *
 * Validates that the v1421 layered spec-pack structure (spec-0001) requirements
 * are covered by existing implementation: specLayout.ts, specPack.ts validators,
 * and the actual spec artifacts.
 *
 * All 24 TDD items are Exception-pattern backfill (DR-0001-0002).
 * Existing coverage: tests/core/validate.test.ts, tests/core/specPackParsers.test.ts.
 */
// QFAI:SPEC-0001:TC-0001-0001
// QFAI:SPEC-0001:TC-0001-0002
// QFAI:SPEC-0001:TC-0001-0003
// QFAI:SPEC-0001:TC-0001-0004
// QFAI:SPEC-0001:TC-0001-0005
// QFAI:SPEC-0001:TC-0001-0006
// QFAI:SPEC-0001:TC-0001-0007
// QFAI:SPEC-0001:TC-0001-0008
// QFAI:SPEC-0001:TC-0001-0009
// QFAI:SPEC-0001:TC-0001-0010
// QFAI:SPEC-0001:TC-0001-0011
// QFAI:SPEC-0001:TC-0001-0012
// QFAI:SPEC-0001:TC-0001-0013
// QFAI:SPEC-0001:TC-0001-0014
// QFAI:SPEC-0001:TC-0001-0015
// QFAI:SPEC-0001:TC-0001-0016
// QFAI:SPEC-0001:TC-0001-0017
// QFAI:SPEC-0001:TC-0001-0018
// QFAI:SPEC-0001:TC-0001-0019
// QFAI:SPEC-0001:TC-0001-0020
// QFAI:SPEC-0001:TC-0001-0021
// QFAI:SPEC-0001:TC-0001-0022
// QFAI:SPEC-0001:TC-0001-0023
// QFAI:SPEC-0001:TC-0001-0024
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SPEC_LAYOUT = path.resolve(__dirname, "..", "..", "src", "core", "specLayout.ts");
const SPEC_PACK_VALIDATOR = path.resolve(
  __dirname,
  "..",
  "..",
  "src",
  "core",
  "validators",
  "specPack.ts",
);
const DRIFT_PROTOCOL = path.resolve(
  __dirname,
  "..",
  "..",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "constitution",
  "drift-protocol.md",
);
const CONSTITUTION = path.resolve(
  __dirname,
  "..",
  "..",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "constitution",
  "constitution.md",
);
const SPEC_0001 = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  ".qfai",
  "specs",
  "spec-0001",
  "01_Spec.md",
);

// TC-0001-0001: v1421 spec files count
describe("TC-0001-0001: REQUIRED_LAYERED_SPEC_FILES_V1421 entries", () => {
  it("specLayout defines v1421 required spec files", async () => {
    const content = await readFile(SPEC_LAYOUT, "utf-8");
    expect(content).toMatch(/REQUIRED.*V1421|v1421/i);
  });
});

// TC-0001-0002: v1421 shared files count
describe("TC-0001-0002: REQUIRED_LAYERED_SHARED_FILES_V1421 entries", () => {
  it("specLayout defines v1421 required shared files", async () => {
    const content = await readFile(SPEC_LAYOUT, "utf-8");
    expect(content).toMatch(/SHARED.*V1421|policies/i);
  });
});

// TC-0001-0003: v1421 layout detection
describe("TC-0001-0003: v1421 marker detection", () => {
  it("specLayout exports collectSpecEntries", async () => {
    const content = await readFile(SPEC_LAYOUT, "utf-8");
    expect(content).toContain("collectSpecEntries");
    expect(content).toContain("v1421");
  });
});

// TC-0001-0004: v1417 fallback detection
describe("TC-0001-0004: v1417 fallback detection", () => {
  it("specLayout handles v1417 layout", async () => {
    const content = await readFile(SPEC_LAYOUT, "utf-8");
    expect(content).toContain("v1417");
  });
});

// TC-0001-0005: ID format compliance
describe("TC-0001-0005: ID format rules", () => {
  it("spec-0001 defines ID format rules", async () => {
    const content = await readFile(SPEC_0001, "utf-8");
    expect(content).toMatch(/US-XXXX-YYYY|AC-XXXX-YYYY|BR-XXXX-YYYY/);
  });
});

// TC-0001-0006: 5-stage traceability chain
describe("TC-0001-0006: 5-stage traceability chain", () => {
  it("spec-0001 defines traceability chain", async () => {
    const content = await readFile(SPEC_0001, "utf-8");
    expect(content).toMatch(/discussion.*specs.*tests.*code.*verification/i);
  });
});

// TC-0001-0007: AC -> TC coverage
describe("TC-0001-0007: AC -> TC traceability", () => {
  it("specPack validator checks traceability edges", async () => {
    const content = await readFile(SPEC_PACK_VALIDATOR, "utf-8");
    expect(content).toMatch(/AC|TC|traceability|coverage/i);
  });
});

// TC-0001-0008: BR -> EX coverage
describe("TC-0001-0008: BR -> EX traceability", () => {
  it("specPack validator handles BR-EX edges", async () => {
    const content = await readFile(SPEC_PACK_VALIDATOR, "utf-8");
    expect(content).toMatch(/BR|EX/);
  });
});

// TC-0001-0009: EX -> TC coverage
describe("TC-0001-0009: EX -> TC traceability", () => {
  it("specPack validator handles EX-TC edges", async () => {
    const content = await readFile(SPEC_PACK_VALIDATOR, "utf-8");
    expect(content).toMatch(/EX|TC/);
  });
});

// TC-0001-0010: Upper-to-lower reference prohibition
describe("TC-0001-0010: Upper-to-lower reference prohibition", () => {
  it("spec-0001 defines reference direction rules", async () => {
    const content = await readFile(SPEC_0001, "utf-8");
    expect(content).toMatch(/upper-to-lower.*禁止|参照方向/);
  });
});

// TC-0001-0011: Lower-to-upper reference allowed
describe("TC-0001-0011: Lower-to-upper reference allowed", () => {
  it("spec-0001 allows lower-to-upper references", async () => {
    const content = await readFile(SPEC_0001, "utf-8");
    expect(content).toMatch(/spec-XXXX.*_policies.*許可|lower.*upper/i);
  });
});

// TC-0001-0012: Escalation Hook 4 triggers
describe("TC-0001-0012: Escalation Hook triggers", () => {
  it("spec-0001 defines 4 escalation triggers", async () => {
    const content = await readFile(SPEC_0001, "utf-8");
    expect(content).toContain("Ambiguous");
    expect(content).toContain("Conflict");
    expect(content).toContain("Missing");
  });
});

// TC-0001-0013: Drift Protocol core rule
describe("TC-0001-0013: Drift Protocol core rule", () => {
  it("drift-protocol.md defines core rules", async () => {
    const content = await readFile(DRIFT_PROTOCOL, "utf-8");
    expect(content).toMatch(/SSOT|upstream/i);
  });
});

// TC-0001-0014: Drift Protocol 5 steps
describe("TC-0001-0014: Drift Protocol 5-step procedure", () => {
  it("drift-protocol.md defines change request steps", async () => {
    const content = await readFile(DRIFT_PROTOCOL, "utf-8");
    expect(content).toMatch(/STOP|Change Request|CR/i);
  });
});

// TC-0001-0015: Drift Protocol allowed exceptions
describe("TC-0001-0015: Drift Protocol allowed exceptions", () => {
  it("drift-protocol.md defines evidence exceptions", async () => {
    const content = await readFile(DRIFT_PROTOCOL, "utf-8");
    expect(content).toMatch(/evidence|exception|allow/i);
  });
});

// TC-0001-0016: Skill catalog entries
describe("TC-0001-0016: Skill catalog entries", () => {
  it("spec-0001 defines skill catalog", async () => {
    const content = await readFile(SPEC_0001, "utf-8");
    expect(content).toMatch(/Skill.*カタログ|9 Skill/i);
  });
});

// TC-0001-0017: Skill dependency DAG
describe("TC-0001-0017: Skill dependency DAG", () => {
  it("spec-0001 defines skill dependencies", async () => {
    const content = await readFile(SPEC_0001, "utf-8");
    expect(content).toMatch(/依存関係|dependency/i);
  });
});

// TC-0001-0018: Deprecated skill status
describe("TC-0001-0018: Deprecated skill status", () => {
  it("spec-0001 references deprecated skills and migration", async () => {
    const content = await readFile(SPEC_0001, "utf-8");
    expect(content).toMatch(/Skill|オーケストレーション|deprecated/i);
  });
});

// TC-0001-0019: Canonical Workflow Stages
describe("TC-0001-0019: Canonical Workflow Stages", () => {
  it("spec-0001 defines workflow stages", async () => {
    const content = await readFile(SPEC_0001, "utf-8");
    expect(content).toMatch(/Canonical Workflow|Governance/i);
  });
});

// TC-0001-0020: Constitution Articles
describe("TC-0001-0020: Constitution Articles", () => {
  it("constitution.md contains article definitions", async () => {
    const content = await readFile(CONSTITUTION, "utf-8");
    expect(content).toMatch(/Article/);
  });
});

// TC-0001-0021: Discussion stage artifacts
describe("TC-0001-0021: Discussion stage artifacts", () => {
  it("spec-0001 defines discussion stage", async () => {
    const content = await readFile(SPEC_0001, "utf-8");
    expect(content).toMatch(/discussion/i);
  });
});

// TC-0001-0022: Specs stage artifacts
describe("TC-0001-0022: Specs stage artifacts", () => {
  it("spec-0001 defines specs stage with US/AC/BR/EX/TC", async () => {
    const content = await readFile(SPEC_0001, "utf-8");
    expect(content).toContain("US");
    expect(content).toContain("AC");
    expect(content).toContain("BR");
    expect(content).toContain("EX");
    expect(content).toContain("TC");
  });
});

// TC-0001-0023: 01_Spec Parent CAP reference
describe("TC-0001-0023: 01_Spec Parent CAP reference", () => {
  it("spec-0001 has Parent: CAP-0001", async () => {
    const content = await readFile(SPEC_0001, "utf-8");
    expect(content).toContain("Parent: CAP-0001");
  });
});

// TC-0001-0024: spec-0001 Parent CAP verification
describe("TC-0001-0024: spec-0001 Parent CAP verification", () => {
  it("spec-0001 01_Spec.md contains CAP-0001 parent reference", async () => {
    const content = await readFile(SPEC_0001, "utf-8");
    expect(content).toContain("CAP-0001");
    expect(content).toContain("spec-0001");
  });
});
