// QFAI:SPEC-0010:TC-0010-0017
// QFAI:SPEC-0010:TC-0010-0015
// QFAI:SPEC-0010:TC-0010-0016
// QFAI:SPEC-0010:TC-0010-0023
// QFAI:SPEC-0010:TC-0010-0009
// QFAI:SPEC-0010:TC-0010-0010
// QFAI:SPEC-0010:TC-0010-0011

import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { defaultConfig, type QfaiConfig } from "../../src/core/config.js";
import type { Issue } from "../../src/core/types.js";
import {
  deduplicateFindings,
  findingToIssue,
  mapSeverity,
  resolveAuditConfig,
  validateDesignAudit,
  type DesignFinding,
} from "../../src/core/validators/designAudit.js";
import { validateDesignSlop } from "../../src/core/validators/designSlop.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function config(overrides?: Partial<QfaiConfig>): QfaiConfig {
  return { ...defaultConfig, ...overrides };
}

function makeFinding(partial: Partial<DesignFinding> = {}): DesignFinding {
  return {
    ruleId: "DA-TEST-001",
    dimension: "hierarchy",
    severityTier: 1,
    message: "test finding",
    why: "test reason",
    evidence: [],
    guidance: "test guidance",
    ...partial,
  };
}

// ---------------------------------------------------------------------------
// TDD-0001 (TC-0010-0017): Config omission defaults
// ---------------------------------------------------------------------------

describe("resolveAuditConfig", () => {
  it("applies all defaults when uiux is undefined", () => {
    const cfg = config();
    const resolved = resolveAuditConfig(cfg);

    expect(resolved.enabled).toBe(true);
    expect(resolved.slopDetection).toBe(true);
    expect(resolved.qualityProfile).toBe("default");
    expect(resolved.maxPrimaryCtas).toBe(1);
    expect(resolved.maxRawTokenLiteralWarnings).toBe(5);
    expect(resolved.maxDuplicateFindingsPerRule).toBe(5);
  });

  it("respects explicit overrides", () => {
    const cfg = config({
      uiux: {
        qualityProfile: "strict",
        audit: {
          enabled: false,
          slopDetection: false,
          maxPrimaryCtas: 3,
          maxRawTokenLiteralWarnings: 10,
          maxDuplicateFindingsPerRule: 2,
        },
      },
    });
    const resolved = resolveAuditConfig(cfg);

    expect(resolved.enabled).toBe(false);
    expect(resolved.slopDetection).toBe(false);
    expect(resolved.qualityProfile).toBe("strict");
    expect(resolved.maxPrimaryCtas).toBe(3);
    expect(resolved.maxRawTokenLiteralWarnings).toBe(10);
    expect(resolved.maxDuplicateFindingsPerRule).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// TDD-0002 (TC-0010-0015): audit.enabled=false full disable
// ---------------------------------------------------------------------------

describe("validateDesignAudit", { timeout: 10000 }, () => {
  let root: string;

  beforeEach(async () => {
    root = path.join(
      os.tmpdir(),
      `qfai-audit-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    // Create a UI-bearing discussion fixture
    const packDir = path.join(root, ".qfai", "discussion", "discussion-test");
    await mkdir(packDir, { recursive: true });
    await writeFile(
      path.join(packDir, "03_Story-Workshop.md"),
      "# Story Workshop\n<div>UI bearing content</div>\n",
      "utf-8",
    );
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("returns empty array when audit.enabled=false", async () => {
    const cfg = config({
      uiux: { audit: { enabled: false } },
    });
    const issues = await validateDesignAudit(root, cfg);
    expect(issues).toEqual([]);
  });

  it("returns empty array for non-UI-bearing packs", async () => {
    // Overwrite with plain text (no HTML tags)
    const packDir = path.join(root, ".qfai", "discussion", "discussion-test");
    await writeFile(
      path.join(packDir, "03_Story-Workshop.md"),
      "# Story Workshop\nPlain text only.\n",
      "utf-8",
    );
    const cfg = config();
    const issues = await validateDesignAudit(root, cfg);
    expect(issues).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// TDD-0003 (TC-0010-0016): slopDetection=false
// ---------------------------------------------------------------------------

describe("validateDesignSlop", { timeout: 10000 }, () => {
  let root: string;

  beforeEach(async () => {
    root = path.join(os.tmpdir(), `qfai-slop-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const packDir = path.join(root, ".qfai", "discussion", "discussion-test");
    await mkdir(packDir, { recursive: true });
    await writeFile(
      path.join(packDir, "03_Story-Workshop.md"),
      "# Story Workshop\n<div>UI bearing content</div>\n",
      "utf-8",
    );
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("returns empty array when slopDetection=false", async () => {
    const cfg = config({
      uiux: { audit: { slopDetection: false } },
    });
    const issues = await validateDesignSlop(root, cfg);
    expect(issues).toEqual([]);
  });

  it("returns empty array when audit.enabled=false", async () => {
    const cfg = config({
      uiux: { audit: { enabled: false } },
    });
    const issues = await validateDesignSlop(root, cfg);
    expect(issues).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// TDD-0004 (TC-0010-0023): Finding→Issue conversion
// ---------------------------------------------------------------------------

describe("findingToIssue", () => {
  it("converts DesignFinding to Issue with correct fields", () => {
    const finding = makeFinding({
      ruleId: "DA-001",
      severityTier: 1,
      message: "CTA hierarchy violation",
      guidance: "Reduce to single primary CTA",
      evidence: ["button.primary x3"],
      file: "03_Story-Workshop.md",
    });

    const result = findingToIssue(finding, "default");

    expect(result.code).toBe("DA-001");
    expect(result.severity).toBe("error");
    expect(result.rule).toBe("audit.hierarchy");
    expect(result.message).toBe("CTA hierarchy violation");
    expect(result.suggested_action).toBe("Reduce to single primary CTA");
    expect(result.file).toBe("03_Story-Workshop.md");
    expect(result.refs).toEqual(["button.primary x3"]);
    expect(result.category).toBe("compatibility");
  });

  it("omits refs when evidence is empty", () => {
    const finding = makeFinding({ evidence: [] });
    const result = findingToIssue(finding, "default");
    expect(result.refs).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// TDD-0005 (TC-0010-0009): Profile T1 default → error
// ---------------------------------------------------------------------------

describe("mapSeverity", () => {
  it("returns error for tier 1 with default profile", () => {
    expect(mapSeverity(1, "default")).toBe("error");
  });

  it("returns error for tier 1 with strict profile", () => {
    expect(mapSeverity(1, "strict")).toBe("error");
  });

  it("returns error for tier 1 with high profile", () => {
    expect(mapSeverity(1, "high")).toBe("error");
  });

  // ---------------------------------------------------------------------------
  // TDD-0006 (TC-0010-0010): Profile T2 default → warning
  // ---------------------------------------------------------------------------

  it("returns warning for tier 2 with default profile", () => {
    expect(mapSeverity(2, "default")).toBe("warning");
  });

  it("returns warning for tier 2 with high profile", () => {
    expect(mapSeverity(2, "high")).toBe("warning");
  });

  // ---------------------------------------------------------------------------
  // TDD-0007 (TC-0010-0011): Profile T2 strict → error
  // ---------------------------------------------------------------------------

  it("returns error for tier 2 with strict profile", () => {
    expect(mapSeverity(2, "strict")).toBe("error");
  });

  // Tier 3 mapping
  it("returns info for tier 3 cosmetic category with default profile", () => {
    expect(mapSeverity(3, "default", "generic-shell")).toBe("info");
    expect(mapSeverity(3, "default", "stock-imagery")).toBe("info");
    expect(mapSeverity(3, "default", "placeholder-copy")).toBe("info");
  });

  it("returns warning for tier 3 functional category with default profile", () => {
    expect(mapSeverity(3, "default", "dark-pattern")).toBe("warning");
    expect(mapSeverity(3, "default", "inconsistency")).toBe("warning");
    expect(mapSeverity(3, "default", "accessibility-theater")).toBe("warning");
  });

  it("returns warning for tier 3 with high profile regardless of category", () => {
    expect(mapSeverity(3, "high", "generic-shell")).toBe("warning");
    expect(mapSeverity(3, "high", "dark-pattern")).toBe("warning");
  });

  it("returns warning for tier 3 with strict profile regardless of category", () => {
    expect(mapSeverity(3, "strict", "generic-shell")).toBe("warning");
    expect(mapSeverity(3, "strict", "dark-pattern")).toBe("warning");
  });
});

// ---------------------------------------------------------------------------
// TDD-0012 (TC-0010-0002): Clean UI-bearing all pass
// TDD-0013 (TC-0010-0003): Missing primary CTA → QFAI-AUD-001
// TDD-0014 (TC-0010-0004): Token drift over threshold → QFAI-AUD-004
// TDD-0015 (TC-0010-0005): Token drift under threshold (boundary)
// TDD-0016 (TC-0010-0006): Dual-primary CTA → QFAI-AUD-020 warning
// ---------------------------------------------------------------------------

describe("validateDesignAudit — audit rules", { timeout: 10000 }, () => {
  let root: string;

  beforeEach(async () => {
    root = path.join(
      os.tmpdir(),
      `qfai-audit-rules-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  async function createUiBearingPack(content: string): Promise<void> {
    const packDir = path.join(root, ".qfai", "discussion", "discussion-20240101000000000");
    await mkdir(path.join(packDir, "uiux"), { recursive: true });
    await writeFile(path.join(packDir, "03_Story-Workshop.md"), content, "utf-8");
  }

  async function writeCanonicalAuditArtifacts(
    contractsLines: string[],
    comparisonLines = [
      "# 30 Comparison",
      "",
      "## Option Comparison",
      "",
      "- **Option A**: Primary dashboard",
      "- **Option B**: Dense table view",
      "",
      "## Selected Direction",
      "",
      "Selected: Option A - best matches current workflow",
    ],
  ): Promise<void> {
    const packDir = path.join(root, ".qfai", "discussion", "discussion-20240101000000000", "uiux");
    await writeFile(path.join(packDir, "40_contracts.md"), contractsLines.join("\n"), "utf-8");
    await writeFile(path.join(packDir, "30_comparison.md"), comparisonLines.join("\n"), "utf-8");
  }

  it("TDD-0012: returns empty array for clean UI-bearing fixture", async () => {
    await createUiBearingPack(["# 03 Story Workshop", "<div>UI content</div>"].join("\n"));
    await writeCanonicalAuditArtifacts([
      "# Screen Contracts",
      "",
      "### Screen: Dashboard",
      "",
      "- screen_id: dashboard",
      "- route: /dashboard",
      "- purpose: Review current status",
      "- actor: end-user",
      "- primary_tasks:",
      "  - Submit order",
      "- required_states:",
      "  - default: Data visible",
      "  - loading: Spinner",
      "  - empty: Empty state",
      "  - error: Error with retry",
      "- transitions:",
      "  - default -> loading: Refresh requested",
      "- observable_outcomes:",
      "  - Order summary is visible",
      "- notes_for_verify: Check state coverage",
      "- notes_for_reviewer: Focus on primary action",
    ]);
    const cfg = config();
    const issues = await validateDesignAudit(root, cfg);
    expect(issues).toEqual([]);
  });

  it("TDD-0013: missing primary CTA → QFAI-AUD-001 error", async () => {
    await createUiBearingPack(["# 03 Story Workshop", "<div>UI content</div>"].join("\n"));
    await writeCanonicalAuditArtifacts([
      "# Screen Contracts",
      "",
      "### Screen: Dashboard",
      "",
      "- screen_id: dashboard",
      "- route: /dashboard",
      "- purpose: Review current status",
      "- actor: end-user",
      "- primary_tasks:",
      "- required_states:",
      "  - default: Data visible",
      "  - loading: Spinner",
      "  - empty: Empty state",
      "  - error: Error with retry",
      "- transitions:",
      "  - default -> loading: Refresh requested",
      "- observable_outcomes:",
      "  - Order summary is visible",
      "- notes_for_verify: Check state coverage",
      "- notes_for_reviewer: Focus on primary action",
    ]);
    const cfg = config();
    const issues = await validateDesignAudit(root, cfg);
    const ctaIssue = issues.find((i) => i.code === "QFAI-AUD-001");
    expect(ctaIssue).toBeDefined();
    expect(ctaIssue?.severity).toBe("error");
  });

  it("TDD-0014: token drift over threshold → QFAI-AUD-004", async () => {
    await createUiBearingPack(["# 03 Story Workshop", "<div>UI content</div>"].join("\n"));
    await writeCanonicalAuditArtifacts([
      "# Screen Contracts",
      "",
      "### Screen: Dashboard",
      "",
      "- screen_id: dashboard",
      "- route: /dashboard",
      "- purpose: Review current status",
      "- actor: end-user",
      "- primary_tasks:",
      "  - Submit",
      "- required_states:",
      "  - default: Data visible",
      "  - loading: Spinner",
      "  - empty: Empty state",
      "  - error: Error with retry",
      "- transitions:",
      "  - default -> loading: Refresh requested",
      "- observable_outcomes:",
      "  - Order summary is visible",
      "- notes_for_verify: Check state coverage",
      "- notes_for_reviewer: Focus on primary action",
    ]);
    // Default token dir: contractsDir/design (.qfai/contracts/design)
    const tokensDir = path.join(root, ".qfai", "contracts", "design");
    await mkdir(tokensDir, { recursive: true });
    await writeFile(path.join(tokensDir, "tokens.yml"), "primary: '#007bff'\n", "utf-8");

    // Create HTML mock with 6 total raw color occurrences (threshold=5)
    const contractsUiDir = path.join(root, ".qfai", "contracts", "ui");
    await mkdir(contractsUiDir, { recursive: true });
    await writeFile(
      path.join(contractsUiDir, "ui-0001-dashboard.html"),
      [
        '<div style="color: #ff0000; background: #00ff00">',
        '  <span style="border-color: #0000ff">',
        '    <p style="color: rgb(255, 128, 0)">',
        '      <a style="color: #aabbcc; background: hsl(120, 50%, 50%)">text</a>',
        "    </p>",
        "  </span>",
        "</div>",
      ].join("\n"),
      "utf-8",
    );

    const cfg = config();
    const issues = await validateDesignAudit(root, cfg);
    const tokenIssue = issues.find((i) => i.code === "QFAI-AUD-004");
    expect(tokenIssue).toBeDefined();
    expect(tokenIssue?.severity).toBe("error");
  });

  it("TDD-0015: token drift under threshold → no QFAI-AUD-004", async () => {
    await createUiBearingPack(["# 03 Story Workshop", "<div>UI content</div>"].join("\n"));
    await writeCanonicalAuditArtifacts([
      "# Screen Contracts",
      "",
      "### Screen: Dashboard",
      "",
      "- screen_id: dashboard",
      "- route: /dashboard",
      "- purpose: Review current status",
      "- actor: end-user",
      "- primary_tasks:",
      "  - Submit",
      "- required_states:",
      "  - default: Data visible",
      "  - loading: Spinner",
      "  - empty: Empty state",
      "  - error: Error with retry",
      "- transitions:",
      "  - default -> loading: Refresh requested",
      "- observable_outcomes:",
      "  - Order summary is visible",
      "- notes_for_verify: Check state coverage",
      "- notes_for_reviewer: Focus on primary action",
    ]);
    // Default token dir: contractsDir/design (.qfai/contracts/design)
    const tokensDir = path.join(root, ".qfai", "contracts", "design");
    await mkdir(tokensDir, { recursive: true });
    await writeFile(path.join(tokensDir, "tokens.yml"), "primary: '#007bff'\n", "utf-8");

    // Create HTML mock with 4 total raw occurrences (below threshold=5)
    const contractsUiDir = path.join(root, ".qfai", "contracts", "ui");
    await mkdir(contractsUiDir, { recursive: true });
    await writeFile(
      path.join(contractsUiDir, "ui-0001-dashboard.html"),
      [
        '<div style="color: #ff0000; background: #00ff00">',
        '  <span style="border-color: #0000ff">',
        '    <a style="color: #aabbcc">text</a>',
        "  </span>",
        "</div>",
      ].join("\n"),
      "utf-8",
    );

    const cfg = config();
    const issues = await validateDesignAudit(root, cfg);
    const tokenIssue = issues.find((i) => i.code === "QFAI-AUD-004");
    expect(tokenIssue).toBeUndefined();
  });

  it("TDD-0016: dual primary CTAs → QFAI-AUD-020 warning", async () => {
    await createUiBearingPack(["# 03 Story Workshop", "<div>UI content</div>"].join("\n"));
    await writeCanonicalAuditArtifacts([
      "# Screen Contracts",
      "",
      "### Screen: Dashboard",
      "",
      "- screen_id: dashboard",
      "- route: /dashboard",
      "- purpose: Review current status",
      "- actor: end-user",
      "- primary_tasks:",
      "  - Submit order",
      "  - Save draft",
      "- required_states:",
      "  - default: Data visible",
      "  - loading: Spinner",
      "  - empty: Empty state",
      "  - error: Error with retry",
      "- transitions:",
      "  - default -> loading: Refresh requested",
      "- observable_outcomes:",
      "  - Order summary is visible",
      "- notes_for_verify: Check state coverage",
      "- notes_for_reviewer: Focus on primary action",
    ]);
    const cfg = config();
    const issues = await validateDesignAudit(root, cfg);
    const ctaIssue = issues.find((i) => i.code === "QFAI-AUD-020");
    expect(ctaIssue).toBeDefined();
    expect(ctaIssue?.severity).toBe("warning");
  });
});

// ---------------------------------------------------------------------------
// TDD-0021 (TC-0010-0024): Validator registration
// ---------------------------------------------------------------------------

describe("validator registration", () => {
  it("TDD-0021: exports validateDesignAudit and validateDesignSlop from index", async () => {
    const { validateDesignAudit: auditFn, validateDesignSlop: slopFn } =
      await import("../../src/core/validators/index.js");
    expect(typeof auditFn).toBe("function");
    expect(typeof slopFn).toBe("function");
  });
});
// TDD-0020 (TC-0010-0022): Dedup under threshold (boundary)
// ---------------------------------------------------------------------------

describe("deduplicateFindings", () => {
  function makeIssue(code: string, message: string): Issue {
    return {
      code,
      severity: "warning",
      category: "compatibility",
      message,
    };
  }

  it("TDD-0019: caps issues per rule and adds summary when over threshold", () => {
    const issues: Issue[] = Array.from({ length: 8 }, (_, i) =>
      makeIssue("QFAI-AUD-001", `finding ${i + 1}`),
    );
    const result = deduplicateFindings(issues, 5);

    const individual = result.filter((i) => !i.message.includes("suppressed"));
    const summary = result.filter((i) => i.message.includes("suppressed"));

    expect(individual).toHaveLength(5);
    expect(summary).toHaveLength(1);
    expect(result).toHaveLength(6);
    expect(summary[0].message).toContain("3");
    expect(summary[0].code).toBe("QFAI-AUD-001");
  });

  it("TDD-0020: passes all issues when under threshold", () => {
    const issues: Issue[] = Array.from({ length: 4 }, (_, i) =>
      makeIssue("QFAI-AUD-001", `finding ${i + 1}`),
    );
    const result = deduplicateFindings(issues, 5);

    expect(result).toHaveLength(4);
    const summary = result.filter((i) => i.message.includes("suppressed"));
    expect(summary).toHaveLength(0);
  });
});
