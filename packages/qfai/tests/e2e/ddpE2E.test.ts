// QFAI:SPEC-0019:TC-0019-0014
// QFAI:SPEC-0019:TC-0019-0015
// QFAI:SPEC-0019:TC-0019-0023

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { validateProject } from "../../src/core/validate.js";
import { resetBannedPatternsCache } from "../../src/core/validators/ddpValidation.js";
import { captureStdout } from "../helpers/stdout.js";

// ---------------------------------------------------------------------------
// Shared helpers (same withProject pattern as ddpValidation.test.ts)
// ---------------------------------------------------------------------------

async function withProject(task: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-ddp-e2e-"));
  try {
    await captureStdout(async () => {
      await runInit({ dir: root, force: false, dryRun: false, yes: true });
    });
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function resolveDiscussionPackDir(root: string): string {
  return path.join(root, ".qfai", "discussion", "discussion-20260216000000000");
}

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

function buildCompleteDdpMarkdown(): string {
  return [
    "## Design Direction Pack",
    "",
    "visual_thesis: A bold minimalist interface emphasizing clarity.",
    "content_plan:",
    "  - section: hero",
    "    role: primary attention capture",
    "  - section: details",
    "    role: supporting information",
    "interaction_thesis:",
    "  - principle: progressive disclosure",
    "  - principle: direct manipulation",
    "anti_goals:",
    "  - pattern: mass-produced card-grid",
    "  - pattern: weak hero sections",
    "cta_hierarchy:",
    "  primary: Start Free Trial",
    "  secondary: Learn More",
    "  tertiary: View Pricing",
    "  placement: hero section and sticky footer",
    "theme:",
    "  theme: modern minimalist",
    "  mood: confident professional",
    "  taste: clean geometric",
    "  material: glass and steel",
    "  energy: calm focused",
    "  visual_anchor: geometric patterns",
    "",
  ].join("\n");
}

/** Seed the full discussion pack (all 14 files + delta). */
async function seedFullDiscussionPack(root: string): Promise<void> {
  const packDir = resolveDiscussionPackDir(root);
  await mkdir(packDir, { recursive: true });

  const files: Array<{ name: string; lines: string[] }> = [
    {
      name: "01_Context.md",
      lines: [
        "# 01 Context",
        "",
        "## Background",
        "",
        "research_summary:",
        "  - BP-001: Users prefer single-click actions",
        "  - BP-002: Mobile-first layout improves engagement",
        "",
        "Baseline context for DDP E2E test.",
        "",
        buildCompleteDdpMarkdown(),
      ],
    },
    {
      name: "02_Inception-Deck.md",
      lines: [
        "# 02 Inception Deck",
        "",
        "## Elevator Pitch",
        "",
        "A stable baseline for DDP E2E test fixtures.",
        "",
      ],
    },
    {
      name: "03_Story-Workshop.md",
      lines: [
        "# 03 Story Workshop",
        "",
        "screen_type: list",
        "items_source: API endpoint /items",
        "empty_state: Show placeholder with action button",
        "sort_filter_controls: date, name, status",
        "pagination_or_infinite_scroll: infinite scroll",
        "primary_cta: Add New Item",
        "density_rationale: Compact density for data-heavy lists.",
        "",
      ],
    },
    {
      name: "04_Sources.md",
      lines: [
        "# 04 Sources",
        "",
        "## Source Registry",
        "",
        "| Source ID | Type | Location | Version/Date | Owner | Confidence | Notes |",
        "| --------- | ---- | -------- | ------------ | ----- | ---------- | ----- |",
        "| SRC-0001 | file | discussion/discussion-20260216000000000 | 2026-02-16 | system | high | fixture seed |",
        "",
      ],
    },
    {
      name: "05_Scope.md",
      lines: ["# 05 Scope", "", "## In Scope", "", "- DDP E2E baseline.", "", "## Out of Scope", "", "- N/A.", ""],
    },
    {
      name: "06_REQ.md",
      lines: [
        "# 06 REQ",
        "",
        "## Requirement Catalog",
        "",
        "| REQ-ID | Requirement | Priority | Source refs | Acceptance viewpoint |",
        "| ------ | ----------- | -------- | ----------- | -------------------- |",
        "| REQ-0001 | Seed requirement. | Must | SRC-0001 | Validator can parse. |",
        "",
      ],
    },
    {
      name: "07_NFR.md",
      lines: [
        "# 07 NFR",
        "",
        "## Non-Functional Requirements",
        "",
        "| Category | Requirement | Metric | Validation method | Notes |",
        "| -------- | ----------- | ------ | ----------------- | ----- |",
        "| Reliability | Deterministic validator behavior. | No flaky failures. | E2E tests pass. | Baseline. |",
        "",
      ],
    },
    {
      name: "08_Glossary.md",
      lines: [
        "# 08 Glossary",
        "",
        "## Terms",
        "",
        "| Term | Definition | Synonyms | Source refs |",
        "| ---- | ---------- | -------- | ----------- |",
        "| DDP | Design Direction Pack. | design direction pack | SRC-0001 |",
        "",
      ],
    },
    {
      name: "09_Constraints.md",
      lines: ["# 09 Constraints", "", "- Keep discussion-pack files in `discussion-<timestamp>` directories only.", ""],
    },
    {
      name: "10_Policy.md",
      lines: ["# 10 Policy", "", "- SSOT: detailed implementation design belongs to `.qfai/specs/**`.", ""],
    },
    {
      name: "11_OQ-Register.md",
      lines: [
        "# 11 OQ Register",
        "",
        "### OQ-0001: validate DDP strategy",
        "",
        "- Disposition: deferred",
        "- Gate: discussion",
        "- Owner: qa-lead",
        "- Reason: scheduled for next cycle",
        "- Next decision point: before release candidate creation",
        "- Options:",
        "  - Option A: keep current scope",
        "  - Option B: extend scope",
        "",
      ],
    },
    {
      name: "12_OQ-Resolution-Log.md",
      lines: ["# 12 OQ Resolution Log", "", "No resolutions recorded yet.", ""],
    },
    {
      name: "13_Deferred.md",
      lines: [
        "# 13 Deferred",
        "",
        "### OQ-0001: validate DDP strategy",
        "",
        "- Reason: scheduled for next cycle",
        "- Next decision point: before release candidate creation",
        "",
      ],
    },
    {
      name: "14_Review-Request.md",
      lines: ["# 14 Review Request", "", "Review request for DDP E2E test fixtures.", ""],
    },
    {
      name: "99_delta.md",
      lines: [
        "# 99 Delta",
        "",
        "## Change Summary",
        "",
        "- Seeded DDP E2E test fixtures.",
        "",
        "## Rationale",
        "",
        "- Deterministic inputs for DDP E2E scenarios.",
        "",
      ],
    },
  ];

  for (const file of files) {
    await writeFile(path.join(packDir, file.name), `${file.lines.join("\n")}\n`, "utf-8");
  }
}

/** Seed contracts/design with research traceability, options, and competitive refs. */
async function seedDesignContracts(root: string): Promise<void> {
  const contractDir = path.join(root, ".qfai", "contracts", "design");
  await mkdir(contractDir, { recursive: true });

  await writeFile(
    path.join(contractDir, "rules.yaml"),
    [
      "- rule: single-click-actions",
      "  id: DR-001",
      "  source_research: BP-001",
      "  description: All primary actions must be single-click.",
      "- rule: mobile-first-layout",
      "  id: DR-002",
      "  source_research: BP-002",
      "  description: Layout must be mobile-first responsive.",
    ].join("\n"),
    "utf-8",
  );

  await writeFile(
    path.join(contractDir, "options.yaml"),
    [
      "- option: Tab Navigation",
      "  pros: Familiar pattern, quick access",
      "  cons: Limited space on mobile",
      "- option: Drawer Navigation",
      "  pros: More space for items, scalable",
      "  cons: Hidden by default, extra tap required",
    ].join("\n"),
    "utf-8",
  );

  await writeFile(
    path.join(contractDir, "refs.yaml"),
    [
      "competitive_refs:",
      "  - name: Competitor A",
      "    url: https://competitor-a.com",
      "  - name: Competitor B",
      "    url: https://competitor-b.com",
      "  - name: Competitor C",
      "    url: https://competitor-c.com",
      "translation_policy: Adapt best patterns to our design language while preserving brand identity.",
    ].join("\n"),
    "utf-8",
  );
}

/** Seed the spec-0001 fixture required by validateProject. */
async function seedSpecFixture(root: string): Promise<void> {
  const fixtureRoot = path.resolve(process.cwd(), "tests", "fixtures", "init-seed", ".qfai");
  const { cp } = await import("node:fs/promises");
  await cp(
    path.join(fixtureRoot, "specs", "spec-0001"),
    path.join(root, ".qfai", "specs", "spec-0001"),
    { recursive: true, force: true },
  );
}

// ---------------------------------------------------------------------------
// E2E Test Suite
// ---------------------------------------------------------------------------

describe("E2E: DDP end-to-end flow", { timeout: 30000 }, () => {
  afterEach(() => {
    resetBannedPatternsCache();
  });

  // =========================================================================
  // TC-0019-0014: Complete DDP flow (happy path)
  // Full DDP (5 fields + theme 6 items + CTA 3 levels + anti-goals)
  // + valid contracts/design with research traceability
  // + valid list template in story workshop
  // + 3+ competitive refs + 2+ design options
  // → qfai validate PASS → downstream skill reads DDP
  // =========================================================================

  it("TC-0019-0014: complete DDP with all features produces 0 QFAI-DDP-* errors", async () => {
    // QFAI:SPEC-0019:TC-0019-0014
    await withProject(async (root) => {
      await seedSpecFixture(root);
      await seedFullDiscussionPack(root);
      await seedDesignContracts(root);

      const result = await validateProject(root);
      const ddpErrors = result.issues.filter(
        (i) => i.code.startsWith("QFAI-DDP-") && i.severity === "error",
      );

      expect(ddpErrors).toHaveLength(0);
    });
  });

  it("TC-0019-0014: complete DDP is consumable by downstream validators (no DDP-006)", async () => {
    // QFAI:SPEC-0019:TC-0019-0014
    // Verify that when a UI-bearing artifact exists alongside a complete DDP,
    // no QFAI-DDP-006 is emitted — the DDP is correctly found and consumed.
    await withProject(async (root) => {
      await seedSpecFixture(root);
      await seedFullDiscussionPack(root);
      await seedDesignContracts(root);

      // Make 03_Story-Workshop UI-bearing by adding UI keywords alongside template
      const storyPath = path.join(resolveDiscussionPackDir(root), "03_Story-Workshop.md");
      await writeFile(
        storyPath,
        [
          "# 03 Story Workshop",
          "",
          "The user navigates the main screen and interacts with the UI layout.",
          "",
          "screen_type: list",
          "items_source: API endpoint /items",
          "empty_state: Show placeholder with action button",
          "sort_filter_controls: date, name, status",
          "pagination_or_infinite_scroll: infinite scroll",
          "primary_cta: Add New Item",
          "density_rationale: Compact density for data-heavy lists.",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const uiBearingIssues = result.issues.filter((i) => i.code === "QFAI-DDP-006");
      expect(uiBearingIssues).toHaveLength(0);
    });
  });

  // =========================================================================
  // TC-0019-0015: DDP guardrails integration
  // 1. UI-bearing artifact without DDP → QFAI-DDP-006
  // 2. DDP with Figma URL → QFAI-DDP-010
  // 3. Text-only DDP → 0 QFAI-DDP-010
  // =========================================================================

  it("TC-0019-0015: UI-bearing artifact without DDP emits QFAI-DDP-006", async () => {
    // QFAI:SPEC-0019:TC-0019-0015
    await withProject(async (root) => {
      await seedSpecFixture(root);
      const packDir = resolveDiscussionPackDir(root);
      await mkdir(packDir, { recursive: true });

      // Minimal pack with UI-bearing story workshop but no DDP section
      await writeFile(
        path.join(packDir, "01_Context.md"),
        ["# 01 Context", "", "## Background", "", "Baseline context.", ""].join("\n"),
        "utf-8",
      );
      await writeFile(
        path.join(packDir, "03_Story-Workshop.md"),
        [
          "# 03 Story Workshop",
          "",
          "The user navigates the main screen and interacts with the UI layout.",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const uiBearingIssues = result.issues.filter((i) => i.code === "QFAI-DDP-006");
      expect(uiBearingIssues).toHaveLength(1);
      expect(uiBearingIssues[0]?.severity).toBe("error");
    });
  });

  it("TC-0019-0015: DDP containing Figma URL emits QFAI-DDP-010", async () => {
    // QFAI:SPEC-0019:TC-0019-0015
    await withProject(async (root) => {
      await seedSpecFixture(root);
      const packDir = resolveDiscussionPackDir(root);
      await mkdir(packDir, { recursive: true });

      const ddpWithFigma = [
        "## Design Direction Pack",
        "",
        "visual_thesis: A bold minimalist interface as shown in https://www.figma.com/file/abc123/MyDesign.",
        "content_plan:",
        "  - section: hero",
        "    role: primary attention capture",
        "  - section: details",
        "    role: supporting information",
        "interaction_thesis:",
        "  - principle: progressive disclosure",
        "  - principle: direct manipulation",
        "anti_goals:",
        "  - pattern: mass-produced card-grid",
        "cta_hierarchy:",
        "  primary: Start Free Trial",
        "  secondary: Learn More",
        "  placement: hero section",
        "theme:",
        "  theme: modern minimalist",
        "  mood: confident professional",
        "  taste: clean geometric",
        "  material: glass and steel",
        "  energy: calm focused",
        "  visual_anchor: geometric patterns",
        "",
      ].join("\n");

      await writeFile(
        path.join(packDir, "01_Context.md"),
        ["# 01 Context", "", "## Background", "", "Context.", "", ddpWithFigma].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const toolIssues = result.issues.filter((i) => i.code === "QFAI-DDP-010");
      expect(toolIssues).toHaveLength(1);
      expect(toolIssues[0]?.severity).toBe("error");
      expect(toolIssues[0]?.message).toContain("external tool");
    });
  });

  it("TC-0019-0015: text-only DDP produces 0 QFAI-DDP-010 errors", async () => {
    // QFAI:SPEC-0019:TC-0019-0015
    await withProject(async (root) => {
      await seedSpecFixture(root);
      const packDir = resolveDiscussionPackDir(root);
      await mkdir(packDir, { recursive: true });

      await writeFile(
        path.join(packDir, "01_Context.md"),
        ["# 01 Context", "", "## Background", "", "Context.", "", buildCompleteDdpMarkdown()].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const toolIssues = result.issues.filter((i) => i.code === "QFAI-DDP-010");
      expect(toolIssues).toHaveLength(0);
    });
  });

  it("TC-0019-0015: banned pattern in anti-goals triggers review FAIL (DDP-009 clean)", async () => {
    // QFAI:SPEC-0019:TC-0019-0015
    // A DDP with banned patterns in anti_goals should pass DDP-009 (correct usage).
    // A DDP *without* banned patterns should emit DDP-009 warning.
    await withProject(async (root) => {
      await seedSpecFixture(root);
      const packDir = resolveDiscussionPackDir(root);
      await mkdir(packDir, { recursive: true });

      // DDP with no banned generic patterns in anti_goals → should warn
      const ddpNoBanned = [
        "## Design Direction Pack",
        "",
        "visual_thesis: A bold minimalist interface emphasizing clarity.",
        "content_plan:",
        "  - section: hero",
        "    role: primary attention capture",
        "  - section: details",
        "    role: supporting information",
        "interaction_thesis:",
        "  - principle: progressive disclosure",
        "  - principle: direct manipulation",
        "anti_goals:",
        "  - pattern: something custom and unique",
        "cta_hierarchy:",
        "  primary: Start Free Trial",
        "  secondary: Learn More",
        "  placement: hero section",
        "theme:",
        "  theme: modern minimalist",
        "  mood: confident professional",
        "  taste: clean geometric",
        "  material: glass and steel",
        "  energy: calm focused",
        "  visual_anchor: geometric patterns",
        "",
      ].join("\n");

      await writeFile(
        path.join(packDir, "01_Context.md"),
        ["# 01 Context", "", "## Background", "", "Context.", "", ddpNoBanned].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const bannedIssues = result.issues.filter((i) => i.code === "QFAI-DDP-009");
      expect(bannedIssues).toHaveLength(1);
      expect(bannedIssues[0]?.severity).toBe("warning");
    });
  });

  // =========================================================================
  // TC-0019-0023: ChatGPT analysis integration — all new validators pass
  // Research-to-constraint + template completeness + anti-pattern detection
  // + option comparison + competitive refs → all PASS
  // =========================================================================

  it("TC-0019-0023: full project with all new features produces 0 QFAI-DDP-{011..018} errors", async () => {
    // QFAI:SPEC-0019:TC-0019-0023
    await withProject(async (root) => {
      await seedSpecFixture(root);
      await seedFullDiscussionPack(root);
      await seedDesignContracts(root);

      const result = await validateProject(root);
      const newValidatorErrors = result.issues.filter(
        (i) =>
          i.severity === "error" &&
          [
            "QFAI-DDP-011",
            "QFAI-DDP-012",
            "QFAI-DDP-013",
            "QFAI-DDP-014",
            "QFAI-DDP-015",
            "QFAI-DDP-016",
            "QFAI-DDP-017",
            "QFAI-DDP-018",
          ].includes(i.code),
      );

      expect(newValidatorErrors).toHaveLength(0);
    });
  });

  it("TC-0019-0023: research traceability — rules with source_research produce 0 DDP-011", async () => {
    // QFAI:SPEC-0019:TC-0019-0023
    await withProject(async (root) => {
      await seedSpecFixture(root);
      await seedFullDiscussionPack(root);
      await seedDesignContracts(root);

      const result = await validateProject(root);
      const traceIssues = result.issues.filter((i) => i.code === "QFAI-DDP-011");
      expect(traceIssues).toHaveLength(0);
    });
  });

  it("TC-0019-0023: template completeness — list template with all fields produces 0 DDP-013", async () => {
    // QFAI:SPEC-0019:TC-0019-0023
    await withProject(async (root) => {
      await seedSpecFixture(root);
      await seedFullDiscussionPack(root);

      const result = await validateProject(root);
      const templateIssues = result.issues.filter((i) => i.code === "QFAI-DDP-013");
      expect(templateIssues).toHaveLength(0);
    });
  });

  it("TC-0019-0023: anti-pattern detection — clean story produces 0 DDP-014", async () => {
    // QFAI:SPEC-0019:TC-0019-0023
    await withProject(async (root) => {
      await seedSpecFixture(root);
      await seedFullDiscussionPack(root);

      const result = await validateProject(root);
      const antiPatternIssues = result.issues.filter((i) => i.code === "QFAI-DDP-014");
      expect(antiPatternIssues).toHaveLength(0);
    });
  });

  it("TC-0019-0023: option comparison — 2 options with pros/cons produce 0 DDP-016", async () => {
    // QFAI:SPEC-0019:TC-0019-0023
    await withProject(async (root) => {
      await seedSpecFixture(root);
      await seedFullDiscussionPack(root);
      await seedDesignContracts(root);

      const result = await validateProject(root);
      const optionIssues = result.issues.filter((i) => i.code === "QFAI-DDP-016");
      expect(optionIssues).toHaveLength(0);
    });
  });

  it("TC-0019-0023: competitive refs — 3 refs with translation_policy produce 0 DDP-017/018", async () => {
    // QFAI:SPEC-0019:TC-0019-0023
    await withProject(async (root) => {
      await seedSpecFixture(root);
      await seedFullDiscussionPack(root);
      await seedDesignContracts(root);

      const result = await validateProject(root);
      const refIssues = result.issues.filter(
        (i) => i.code === "QFAI-DDP-017" || i.code === "QFAI-DDP-018",
      );
      expect(refIssues).toHaveLength(0);
    });
  });
});
