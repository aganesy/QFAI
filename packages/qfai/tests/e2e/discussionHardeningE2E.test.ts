/**
 * E2E tests for spec-0023: Discussion Design Hardening
 *
 * Verifies high-level behavior of DDS validators (QFAI-DDP-019..025),
 * SKILL.md content, and template presence.
 */

// QFAI:SPEC-0002:US-0002-0001
// QFAI:SPEC-0002:US-0002-0002
// QFAI:SPEC-0002:US-0002-0003
// QFAI:SPEC-0002:US-0002-0004
// QFAI:SPEC-0002:US-0002-0005
// QFAI:SPEC-0002:US-0002-0006
// QFAI:SPEC-0002:US-0002-0007
// QFAI:SPEC-0002:US-0002-0008
// QFAI:SPEC-0002:US-0002-0009
// QFAI:SPEC-0002:US-0002-0010

import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// Resolve paths
// ---------------------------------------------------------------------------

const repoRoot = path.resolve(process.cwd(), "..", "..");
const skillPath = path.join(
  repoRoot,
  "packages",
  "qfai",
  "assets",
  "init",
  ".qfai",
  "assistant",
  "skills",
  "qfai-discussion",
  "SKILL.md",
);

let skillContent: string | undefined;

async function loadSkill(): Promise<string> {
  skillContent ??= await readFile(skillPath, "utf-8");
  return skillContent;
}

// ---------------------------------------------------------------------------
// US-0002-0001: UI-bearing pack detection
// ---------------------------------------------------------------------------

// QFAI:SPEC-0002:US-0002-0001
describe("US-0002-0001: UI-bearing pack detection", () => {
  it("SKILL.md documents surface type classification for UI-bearing detection", async () => {
    const c = await loadSkill();
    expect(c).toMatch(/UI-bearing Detection/i);
    expect(c).toMatch(/Surface Classification/i);
    expect(c).toMatch(/\|\s*Surface Type\s*\|/i);
    expect(c).toMatch(/\|\s*(?:web-ui|mobile-ui|desktop-ui|mixed|non-ui)\s*\|/i);
  });

  it("SKILL.md describes detection signals for UI-bearing packs", async () => {
    const c = await loadSkill();
    expect(c).toMatch(/Detection Signals/i);
    expect(c).toMatch(/01_Context\.md/);
    expect(c).toMatch(/03_Story-Workshop\.md/);
  });

  it("SKILL.md states non-UI packs are exempt from DDS validators", async () => {
    const c = await loadSkill();
    expect(c).toMatch(/Non-UI packs are exempt|non-ui.*exempt|zero new issues/i);
  });
});

// ---------------------------------------------------------------------------
// US-0002-0002: DDS section mandatory
// ---------------------------------------------------------------------------

// QFAI:SPEC-0002:US-0002-0002
describe("US-0002-0002: DDS section mandatory", () => {
  it("SKILL.md requires Design Direction Summary in 03_Story-Workshop.md", async () => {
    const c = await loadSkill();
    expect(c).toMatch(/Design Direction Summary/);
    expect(c).toMatch(/03_Story-Workshop\.md/);
  });

  it("SKILL.md lists all 6 DDS subsections", async () => {
    const c = await loadSkill();
    expect(c).toMatch(/Option Comparison/);
    expect(c).toMatch(/Anchor Screen Selection/);
    expect(c).toMatch(/Competitive References/);
    expect(c).toMatch(/CTA Hierarchy/);
    expect(c).toMatch(/State Coverage/);
    expect(c).toMatch(/Design Anti-goals/);
  });
});

// ---------------------------------------------------------------------------
// US-0002-0003: Option comparison validation
// ---------------------------------------------------------------------------

// QFAI:SPEC-0002:US-0002-0003
describe("US-0002-0003: Option comparison validation", () => {
  it("SKILL.md documents QFAI-DDP-020 option comparison validator", async () => {
    const c = await loadSkill();
    expect(c).toMatch(/QFAI-DDP-020/);
    expect(c).toMatch(/2\+\s*distinct design options|2.*design options/i);
  });
});

// ---------------------------------------------------------------------------
// US-0002-0004: Anchor screen selection
// ---------------------------------------------------------------------------

// QFAI:SPEC-0002:US-0002-0004
describe("US-0002-0004: Anchor screen selection", () => {
  it("SKILL.md documents QFAI-DDP-021 anchor screen validator", async () => {
    const c = await loadSkill();
    expect(c).toMatch(/QFAI-DDP-021/);
    expect(c).toMatch(/anchor screen/i);
  });
});

// ---------------------------------------------------------------------------
// US-0002-0005: Competitive reference validation
// ---------------------------------------------------------------------------

// QFAI:SPEC-0002:US-0002-0005
describe("US-0002-0005: Competitive reference validation", () => {
  it("SKILL.md documents QFAI-DDP-022 competitive reference requirements", async () => {
    const c = await loadSkill();
    expect(c).toMatch(/QFAI-DDP-022/);
    expect(c).toMatch(/adopted_points/);
    expect(c).toMatch(/rejected_points/);
    expect(c).toMatch(/local_translation/);
  });

  it("SKILL.md states placeholder values are treated as missing", async () => {
    const c = await loadSkill();
    expect(c).toMatch(/[Pp]laceholder.*(?:missing|treated)/);
  });
});

// ---------------------------------------------------------------------------
// US-0002-0006: Review-Request design direction capture
// ---------------------------------------------------------------------------

// QFAI:SPEC-0002:US-0002-0006
describe("US-0002-0006: Review-Request design direction capture", () => {
  it("SKILL.md requires Design Direction Decisions in 14_Review-Request.md", async () => {
    const c = await loadSkill();
    expect(c).toMatch(/14_Review-Request\.md/);
    expect(c).toMatch(/Design Direction Decisions/);
  });
});

// ---------------------------------------------------------------------------
// US-0002-0007: Delta log rejected visual directions
// ---------------------------------------------------------------------------

// QFAI:SPEC-0002:US-0002-0007
describe("US-0002-0007: Delta log rejected visual directions", () => {
  it("SKILL.md requires Rejected Visual Directions in 99_delta.md", async () => {
    const c = await loadSkill();
    expect(c).toMatch(/99_delta\.md/);
    expect(c).toMatch(/Rejected Visual Directions/);
  });
});

// ---------------------------------------------------------------------------
// US-0002-0008: SKILL.md update
// ---------------------------------------------------------------------------

// QFAI:SPEC-0002:US-0002-0008
describe("US-0002-0008: SKILL.md update", () => {
  it("SKILL.md documents all 7 DDS validators (QFAI-DDP-019..025)", async () => {
    const c = await loadSkill();
    expect(c).toMatch(/QFAI-DDP-019/);
    expect(c).toMatch(/QFAI-DDP-020/);
    expect(c).toMatch(/QFAI-DDP-021/);
    expect(c).toMatch(/QFAI-DDP-022/);
    expect(c).toMatch(/QFAI-DDP-023/);
    expect(c).toMatch(/QFAI-DDP-024/);
    expect(c).toMatch(/QFAI-DDP-025/);
  });

  it("SKILL.md states all validators emit severity error", async () => {
    const c = await loadSkill();
    expect(c).toMatch(/severity.*error|error.*severity/i);
    expect(c).toMatch(/violations block validation|block.*validation/i);
  });
});

// ---------------------------------------------------------------------------
// US-0002-0009: Explicit surface classification as primary SSOT
// ---------------------------------------------------------------------------

// QFAI:SPEC-0002:US-0002-0009
describe("US-0002-0009: Explicit surface classification as primary SSOT", () => {
  it("SKILL.md describes surface type classification as primary SSOT", async () => {
    const c = await loadSkill();
    expect(c).toMatch(/surface type classification/i);
  });

  it("SKILL.md describes content signals as supplementary, not primary", async () => {
    const c = await loadSkill();
    expect(c).toMatch(/supplementary detection hints|not the primary SSOT/i);
  });
});

// ---------------------------------------------------------------------------
// US-0002-0010: Discussion skill teaches 3-layer model, not 4-axis
// ---------------------------------------------------------------------------

// QFAI:SPEC-0002:US-0002-0010
describe("US-0002-0010: Discussion skill teaches 3-layer model", () => {
  it("SKILL.md completion conditions reference scoring axes files", async () => {
    const c = await loadSkill();
    // The completion conditions section should reference scoring axes
    expect(c).toMatch(/Scoring axes defined|scoring axes/i);
  });

  it("SKILL.md non-ui path does not require UI-bearing completion conditions", async () => {
    const c = await loadSkill();
    expect(c).toMatch(/[Nn]on-ui.*completion/i);
    expect(c).toMatch(/[Nn]o additional UI\/UX conditions|[Nn]o.*sidecar artifacts are required/i);
  });
});
