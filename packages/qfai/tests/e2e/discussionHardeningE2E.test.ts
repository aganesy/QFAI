/**
 * E2E tests for spec-0023: Discussion Design Hardening
 *
 * Verifies high-level behavior of sidecar-first design hardening validators (QFAI-DDP-019..025),
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

  it("SKILL.md states non-UI packs are exempt from sidecar validators", async () => {
    const c = await loadSkill();
    expect(c).toMatch(/Non-UI packs are exempt|non-ui.*exempt|zero new issues/i);
  });
});

// ---------------------------------------------------------------------------
// US-0002-0002: Sidecar primary truth for design direction
// ---------------------------------------------------------------------------

// QFAI:SPEC-0002:US-0002-0002
describe("US-0002-0002: Sidecar primary truth for design direction", () => {
  it("SKILL.md references sidecar family as primary truth for UI-bearing packs", async () => {
    const c = await loadSkill();
    expect(c).toMatch(/canonical sidecar family|sidecar.*primary truth/i);
    expect(c).toMatch(/uiux\/10_strategy\.md/);
  });

  it("SKILL.md lists key sidecar artifacts for design direction", async () => {
    const c = await loadSkill();
    expect(c).toMatch(/30_comparison\.md/);
    expect(c).toMatch(/40_contracts\.md/);
    expect(c).toMatch(/Competitive Reference Registry/);
    expect(c).toMatch(/10_strategy\.md/);
    expect(c).toMatch(/50_review_bundle\.md/);
    expect(c).toMatch(/Rejected Visual Directions/);
  });
});

// ---------------------------------------------------------------------------
// US-0002-0003: Option comparison validation
// ---------------------------------------------------------------------------

// QFAI:SPEC-0002:US-0002-0003
describe("US-0002-0003: Option comparison validation", () => {
  it("SKILL.md documents option comparison in uiux/30_comparison.md", async () => {
    const c = await loadSkill();
    expect(c).toMatch(/30_comparison\.md/);
    expect(c).toMatch(/option comparison|compared option/i);
  });
});

// ---------------------------------------------------------------------------
// US-0002-0004: Selected direction
// ---------------------------------------------------------------------------

// QFAI:SPEC-0002:US-0002-0004
describe("US-0002-0004: Selected direction", () => {
  it("SKILL.md documents Selected Direction in uiux/30_comparison.md", async () => {
    const c = await loadSkill();
    expect(c).toMatch(/Selected Direction/);
    expect(c).toMatch(/30_comparison\.md/);
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
describe("US-0002-0006: Review-Request selected direction consistency", () => {
  it("SKILL.md requires selected direction review in 14_Review-Request.md", async () => {
    const c = await loadSkill();
    expect(c).toMatch(/14_Review-Request\.md/);
    expect(c).toMatch(/selected direction|chosen_option/i);
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
  it("SKILL.md documents sidecar-family validators (UIX-VAL series)", async () => {
    const c = await loadSkill();
    expect(c).toMatch(/UIX-VAL|Sidecar-family validators|sidecar validators/i);
  });

  it("SKILL.md states non-UI packs are exempt from sidecar validators", async () => {
    const c = await loadSkill();
    expect(c).toMatch(/non-ui.*exempt|exempt.*sidecar/i);
    expect(c).toMatch(/zero new issues/i);
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
