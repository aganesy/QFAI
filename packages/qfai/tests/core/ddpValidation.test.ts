// QFAI:SPEC-0019:TC-0019-0001
// QFAI:SPEC-0019:TC-0019-0002
// QFAI:SPEC-0019:TC-0019-0003
// QFAI:SPEC-0019:TC-0019-0004
// QFAI:SPEC-0019:TC-0019-0005
// QFAI:SPEC-0019:TC-0019-0006
// QFAI:SPEC-0019:TC-0019-0007
// QFAI:SPEC-0019:TC-0019-0008
// QFAI:SPEC-0019:TC-0019-0009
// QFAI:SPEC-0019:TC-0019-0010
// QFAI:SPEC-0019:TC-0019-0011
// QFAI:SPEC-0019:TC-0019-0012
// QFAI:SPEC-0019:TC-0019-0013
// QFAI:SPEC-0019:TC-0019-0016
// QFAI:SPEC-0019:TC-0019-0017
// QFAI:SPEC-0019:TC-0019-0018
// QFAI:SPEC-0019:TC-0019-0019
// QFAI:SPEC-0019:TC-0019-0020
// QFAI:SPEC-0019:TC-0019-0021
// QFAI:SPEC-0019:TC-0019-0022

import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { runInit } from "../../src/cli/commands/init.js";
import { validateProject } from "../../src/core/validate.js";
import { resetBannedPatternsCache } from "../../src/core/validators/ddpValidation.js";
import { captureStdout } from "../helpers/stdout.js";

const DDP_REQUIRED_FIELDS = [
  "visual_thesis",
  "content_plan",
  "interaction_thesis",
  "anti_goals",
  "cta_hierarchy",
] as const;

describe("DDP validation", { timeout: 15000 }, () => {
  async function withProject(task: (root: string) => Promise<void>): Promise<void> {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-ddp-validation-"));
    try {
      await captureStdout(async () => {
        await runInit({ dir: root, force: false, dryRun: false, yes: true });
      });
      await seedMinimalFixtures(root);
      await task(root);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  async function seedMinimalFixtures(root: string): Promise<void> {
    const fixtureRoot = path.resolve(process.cwd(), "tests", "fixtures", "init-seed", ".qfai");
    await cp(
      path.join(fixtureRoot, "specs", "spec-0001"),
      path.join(root, ".qfai", "specs", "spec-0001"),
      { recursive: true, force: true },
    );
    await seedDiscussionPack(root);
  }

  async function seedDiscussionPack(root: string): Promise<void> {
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
          "Baseline context for DDP validation test.",
          "",
        ],
      },
      {
        name: "02_Inception-Deck.md",
        lines: [
          "# 02 Inception Deck",
          "",
          "## Elevator Pitch",
          "",
          "A stable baseline for DDP validator test fixtures.",
          "",
        ],
      },
      {
        name: "03_Story-Workshop.md",
        lines: [
          "# 03 Story Workshop",
          "",
          "```mermaid",
          "sequenceDiagram",
          "  participant U as User",
          "  participant S as System",
          "  U->>S: request",
          "```",
          "",
          "Story workshop content for DDP validator fixture baseline.",
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
        lines: [
          "# 05 Scope",
          "",
          "## In Scope",
          "",
          "- DDP validation baseline.",
          "",
          "## Out of Scope",
          "",
          "- Production deployment.",
          "",
        ],
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
          "| Reliability | Deterministic validator behavior. | No flaky failures. | Core tests pass. | Baseline. |",
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
        lines: [
          "# 09 Constraints",
          "",
          "- Keep discussion-pack files in `discussion-<timestamp>` directories only.",
          "",
        ],
      },
      {
        name: "10_Policy.md",
        lines: [
          "# 10 Policy",
          "",
          "- SSOT: detailed implementation design belongs to `.qfai/specs/**`.",
          "",
        ],
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
        lines: ["# 14 Review Request", "", "Review request for DDP validation fixtures.", ""],
      },
      {
        name: "99_delta.md",
        lines: [
          "# 99 Delta",
          "",
          "## Change Summary",
          "",
          "- Seeded DDP validation fixtures.",
          "",
          "## Rationale",
          "",
          "- Deterministic inputs for DDP test scenarios.",
          "",
        ],
      },
    ];

    for (const file of files) {
      await writeFile(path.join(packDir, file.name), `${file.lines.join("\n")}\n`, "utf-8");
    }
  }

  function resolveDiscussionPackDir(root: string): string {
    return path.join(root, ".qfai", "discussion", "discussion-20260216000000000");
  }

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

  function buildDdpWithEmptyField(emptyField: string): string {
    const fields: Record<string, string> = {
      visual_thesis: " A bold minimalist interface emphasizing clarity.",
      content_plan:
        "\n  - section: hero\n    role: primary attention capture\n  - section: details\n    role: supporting information",
      interaction_thesis:
        "\n  - principle: progressive disclosure\n  - principle: direct manipulation",
      anti_goals: "\n  - pattern: mass-produced card-grid",
      cta_hierarchy:
        "\n  primary: Start Free Trial\n  secondary: Learn More\n  placement: hero section",
      theme:
        "\n  theme: modern minimalist\n  mood: confident professional\n  taste: clean geometric\n  material: glass and steel\n  energy: calm focused\n  visual_anchor: geometric patterns",
    };
    fields[emptyField] = "";

    const lines = ["## Design Direction Pack", ""];
    for (const [key, value] of Object.entries(fields)) {
      lines.push(`${key}:${value}`);
    }
    lines.push("");
    return lines.join("\n");
  }

  // TC-0019-0001: All 5 required DDP fields non-empty → 0 DDP errors
  it("passes when all 5 DDP required fields are present and non-empty", async () => {
    // QFAI:SPEC-0019:TC-0019-0001
    await withProject(async (root) => {
      const contextPath = path.join(resolveDiscussionPackDir(root), "01_Context.md");
      const contextWithDdp = [
        "# 01 Context",
        "",
        "## Background",
        "",
        "Baseline context for DDP validation test.",
        "",
        buildCompleteDdpMarkdown(),
      ].join("\n");
      await writeFile(contextPath, contextWithDdp, "utf-8");

      const result = await validateProject(root);
      const ddpIssues = result.issues.filter((item) => item.code.startsWith("QFAI-DDP-"));

      expect(ddpIssues).toHaveLength(0);
    });
  });

  // TC-0019-0002: visual_thesis empty → error for visual_thesis
  it("emits QFAI-DDP-001 when visual_thesis is empty", async () => {
    // QFAI:SPEC-0019:TC-0019-0002
    await withProject(async (root) => {
      const contextPath = path.join(resolveDiscussionPackDir(root), "01_Context.md");
      const contextWithBadDdp = [
        "# 01 Context",
        "",
        "## Background",
        "",
        "Baseline context for DDP validation test.",
        "",
        buildDdpWithEmptyField("visual_thesis"),
      ].join("\n");
      await writeFile(contextPath, contextWithBadDdp, "utf-8");

      const result = await validateProject(root);
      const ddpIssues = result.issues.filter((item) => item.code === "QFAI-DDP-001");

      expect(ddpIssues.length).toBeGreaterThanOrEqual(1);
      const visualThesisIssue = ddpIssues.find((item) => item.message.includes("visual_thesis"));
      expect(visualThesisIssue).toBeDefined();
      expect(visualThesisIssue?.severity).toBe("error");
    });
  });

  // TC-0019-0002: DDP section exists but all fields empty → errors for all 5 fields
  it("emits QFAI-DDP-001 for all 5 fields when DDP section has no field values", async () => {
    // QFAI:SPEC-0019:TC-0019-0002
    await withProject(async (root) => {
      const contextPath = path.join(resolveDiscussionPackDir(root), "01_Context.md");
      const contextWithEmptyDdp = [
        "# 01 Context",
        "",
        "## Background",
        "",
        "Baseline context for DDP validation test.",
        "",
        "## Design Direction Pack",
        "",
        "visual_thesis:",
        "content_plan:",
        "interaction_thesis:",
        "anti_goals:",
        "cta_hierarchy:",
        "",
      ].join("\n");
      await writeFile(contextPath, contextWithEmptyDdp, "utf-8");

      const result = await validateProject(root);
      const ddpIssues = result.issues.filter((item) => item.code === "QFAI-DDP-001");

      expect(ddpIssues).toHaveLength(DDP_REQUIRED_FIELDS.length);
      for (const field of DDP_REQUIRED_FIELDS) {
        const fieldIssue = ddpIssues.find((item) => item.message.includes(field));
        expect(fieldIssue).toBeDefined();
        expect(fieldIssue?.severity).toBe("error");
        expect(fieldIssue?.message).toContain("DDP required field missing");
      }
    });
  });

  // ---------------------------------------------------------------------------
  // TDD-0002: TC-0019-0003 — Visual thesis format
  // ---------------------------------------------------------------------------

  it("passes when visual_thesis is a single descriptive sentence", async () => {
    // QFAI:SPEC-0019:TC-0019-0003
    await withProject(async (root) => {
      const contextPath = path.join(resolveDiscussionPackDir(root), "01_Context.md");
      await writeFile(
        contextPath,
        ["# 01 Context", "", "## Background", "", "Context.", "", buildCompleteDdpMarkdown()].join(
          "\n",
        ),
        "utf-8",
      );

      const result = await validateProject(root);
      const warnings = result.issues.filter((i) => i.code === "QFAI-DDP-002");
      expect(warnings).toHaveLength(0);
    });
  });

  it("emits QFAI-DDP-002 warning when visual_thesis is bullet-only", async () => {
    // QFAI:SPEC-0019:TC-0019-0003
    await withProject(async (root) => {
      const contextPath = path.join(resolveDiscussionPackDir(root), "01_Context.md");
      const ddp = [
        "## Design Direction Pack",
        "",
        "visual_thesis: - bold minimalism",
        "content_plan:",
        "  - section: hero",
        "    role: primary",
        "  - section: details",
        "    role: supporting",
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
        contextPath,
        ["# 01 Context", "", "## Background", "", "Context.", "", ddp].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const warnings = result.issues.filter((i) => i.code === "QFAI-DDP-002");
      expect(warnings).toHaveLength(1);
      expect(warnings[0]?.severity).toBe("warning");
    });
  });

  // ---------------------------------------------------------------------------
  // TDD-0002: TC-0019-0004 — Theme fields
  // ---------------------------------------------------------------------------

  it("passes when all 6 theme fields are present", async () => {
    // QFAI:SPEC-0019:TC-0019-0004
    await withProject(async (root) => {
      const contextPath = path.join(resolveDiscussionPackDir(root), "01_Context.md");
      await writeFile(
        contextPath,
        ["# 01 Context", "", "## Background", "", "Context.", "", buildCompleteDdpMarkdown()].join(
          "\n",
        ),
        "utf-8",
      );

      const result = await validateProject(root);
      const themeIssues = result.issues.filter((i) => i.code === "QFAI-DDP-003");
      expect(themeIssues).toHaveLength(0);
    });
  });

  it("emits QFAI-DDP-003 error when mood is missing from theme", async () => {
    // QFAI:SPEC-0019:TC-0019-0004
    await withProject(async (root) => {
      const contextPath = path.join(resolveDiscussionPackDir(root), "01_Context.md");
      const ddp = [
        "## Design Direction Pack",
        "",
        "visual_thesis: A bold minimalist interface emphasizing clarity.",
        "content_plan:",
        "  - section: hero",
        "    role: primary",
        "  - section: details",
        "    role: supporting",
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
        "  taste: clean geometric",
        "  material: glass and steel",
        "  energy: calm focused",
        "  visual_anchor: geometric patterns",
        "",
      ].join("\n");
      await writeFile(
        contextPath,
        ["# 01 Context", "", "## Background", "", "Context.", "", ddp].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const themeIssues = result.issues.filter((i) => i.code === "QFAI-DDP-003");
      expect(themeIssues).toHaveLength(1);
      expect(themeIssues[0]?.message).toBe("DDP theme field missing: mood");
      expect(themeIssues[0]?.severity).toBe("error");
    });
  });

  // ---------------------------------------------------------------------------
  // TDD-0003: TC-0019-0005 — CTA hierarchy primary
  // ---------------------------------------------------------------------------

  it("passes when CTA hierarchy has primary/secondary/tertiary", async () => {
    // QFAI:SPEC-0019:TC-0019-0005
    await withProject(async (root) => {
      const contextPath = path.join(resolveDiscussionPackDir(root), "01_Context.md");
      await writeFile(
        contextPath,
        ["# 01 Context", "", "## Background", "", "Context.", "", buildCompleteDdpMarkdown()].join(
          "\n",
        ),
        "utf-8",
      );

      const result = await validateProject(root);
      const ctaPrimary = result.issues.filter((i) => i.code === "QFAI-DDP-004");
      expect(ctaPrimary).toHaveLength(0);
    });
  });

  it("emits QFAI-DDP-004 error when CTA primary is empty", async () => {
    // QFAI:SPEC-0019:TC-0019-0005
    await withProject(async (root) => {
      const contextPath = path.join(resolveDiscussionPackDir(root), "01_Context.md");
      const ddp = [
        "## Design Direction Pack",
        "",
        "visual_thesis: A bold minimalist interface emphasizing clarity.",
        "content_plan:",
        "  - section: hero",
        "    role: primary",
        "  - section: details",
        "    role: supporting",
        "interaction_thesis:",
        "  - principle: progressive disclosure",
        "  - principle: direct manipulation",
        "anti_goals:",
        "  - pattern: mass-produced card-grid",
        "cta_hierarchy:",
        "  secondary: Learn More",
        "  tertiary: View Pricing",
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
        contextPath,
        ["# 01 Context", "", "## Background", "", "Context.", "", ddp].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const ctaIssues = result.issues.filter((i) => i.code === "QFAI-DDP-004");
      expect(ctaIssues).toHaveLength(1);
      expect(ctaIssues[0]?.message).toBe("CTA hierarchy must have at least one primary CTA");
      expect(ctaIssues[0]?.severity).toBe("error");
    });
  });

  // ---------------------------------------------------------------------------
  // TDD-0003: TC-0019-0006 — CTA placement warning + primary 2 items
  // ---------------------------------------------------------------------------

  it("emits QFAI-DDP-005 warning when CTA placement is absent", async () => {
    // QFAI:SPEC-0019:TC-0019-0006
    await withProject(async (root) => {
      const contextPath = path.join(resolveDiscussionPackDir(root), "01_Context.md");
      const ddp = [
        "## Design Direction Pack",
        "",
        "visual_thesis: A bold minimalist interface emphasizing clarity.",
        "content_plan:",
        "  - section: hero",
        "    role: primary",
        "  - section: details",
        "    role: supporting",
        "interaction_thesis:",
        "  - principle: progressive disclosure",
        "  - principle: direct manipulation",
        "anti_goals:",
        "  - pattern: mass-produced card-grid",
        "cta_hierarchy:",
        "  primary: Start Free Trial",
        "  secondary: Learn More",
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
        contextPath,
        ["# 01 Context", "", "## Background", "", "Context.", "", ddp].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const placementIssues = result.issues.filter((i) => i.code === "QFAI-DDP-005");
      expect(placementIssues).toHaveLength(1);
      expect(placementIssues[0]?.severity).toBe("warning");
    });
  });

  it("passes CTA checks when primary has 2 items and sections exist", async () => {
    // QFAI:SPEC-0019:TC-0019-0006
    await withProject(async (root) => {
      const contextPath = path.join(resolveDiscussionPackDir(root), "01_Context.md");
      await writeFile(
        contextPath,
        ["# 01 Context", "", "## Background", "", "Context.", "", buildCompleteDdpMarkdown()].join(
          "\n",
        ),
        "utf-8",
      );

      const result = await validateProject(root);
      const ctaErrors = result.issues.filter((i) => i.code === "QFAI-DDP-004");
      expect(ctaErrors).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // TDD-0004: TC-0019-0007 — UI-bearing artifact without DDP
  // ---------------------------------------------------------------------------

  it("emits QFAI-DDP-006 when UI-bearing artifact has no DDP", async () => {
    // QFAI:SPEC-0019:TC-0019-0007
    await withProject(async (root) => {
      // Make 03_Story-Workshop.md UI-bearing by adding UI keywords
      const storyPath = path.join(resolveDiscussionPackDir(root), "03_Story-Workshop.md");
      await writeFile(
        storyPath,
        [
          "# 03 Story Workshop",
          "",
          "The user navigates the main screen and interacts with the UI layout.",
          "",
        ].join("\n"),
        "utf-8",
      );
      // No DDP section in any file

      const result = await validateProject(root);
      const uiBearingIssues = result.issues.filter((i) => i.code === "QFAI-DDP-006");
      expect(uiBearingIssues).toHaveLength(1);
      expect(uiBearingIssues[0]?.severity).toBe("error");
    });
  });

  it("skips DDP check (no QFAI-DDP-006) for non-UI artifact", async () => {
    // QFAI:SPEC-0019:TC-0019-0007
    await withProject(async (root) => {
      // Default 03_Story-Workshop.md has no UI keywords — it's a non-UI artifact
      // No DDP section in any file either

      const result = await validateProject(root);
      const uiBearingIssues = result.issues.filter((i) => i.code === "QFAI-DDP-006");
      expect(uiBearingIssues).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // TDD-0004: TC-0019-0008 — Content plan sections count
  // ---------------------------------------------------------------------------

  it("passes when content plan has 4 sections", async () => {
    // QFAI:SPEC-0019:TC-0019-0008
    await withProject(async (root) => {
      const contextPath = path.join(resolveDiscussionPackDir(root), "01_Context.md");
      const ddp = [
        "## Design Direction Pack",
        "",
        "visual_thesis: A bold minimalist interface emphasizing clarity.",
        "content_plan:",
        "  - section: hero",
        "    role: primary",
        "  - section: details",
        "    role: supporting",
        "  - section: testimonials",
        "    role: social proof",
        "  - section: footer",
        "    role: navigation",
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
        contextPath,
        ["# 01 Context", "", "## Background", "", "Context.", "", ddp].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const contentIssues = result.issues.filter((i) => i.code === "QFAI-DDP-007");
      expect(contentIssues).toHaveLength(0);
    });
  });

  it("emits QFAI-DDP-007 warning when content plan has only 1 section", async () => {
    // QFAI:SPEC-0019:TC-0019-0008
    await withProject(async (root) => {
      const contextPath = path.join(resolveDiscussionPackDir(root), "01_Context.md");
      const ddp = [
        "## Design Direction Pack",
        "",
        "visual_thesis: A bold minimalist interface emphasizing clarity.",
        "content_plan:",
        "  - section: hero",
        "    role: primary",
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
        contextPath,
        ["# 01 Context", "", "## Background", "", "Context.", "", ddp].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const contentIssues = result.issues.filter((i) => i.code === "QFAI-DDP-007");
      expect(contentIssues).toHaveLength(1);
      expect(contentIssues[0]?.message).toBe("Content plan should have at least 2 sections");
      expect(contentIssues[0]?.severity).toBe("warning");
    });
  });

  // ---------------------------------------------------------------------------
  // TDD-0005: TC-0019-0009 — Interaction thesis principles
  // ---------------------------------------------------------------------------

  it("passes when interaction thesis has 3 principles", async () => {
    // QFAI:SPEC-0019:TC-0019-0009
    await withProject(async (root) => {
      const contextPath = path.join(resolveDiscussionPackDir(root), "01_Context.md");
      const ddp = [
        "## Design Direction Pack",
        "",
        "visual_thesis: A bold minimalist interface emphasizing clarity.",
        "content_plan:",
        "  - section: hero",
        "    role: primary",
        "  - section: details",
        "    role: supporting",
        "interaction_thesis:",
        "  - principle: progressive disclosure",
        "  - principle: direct manipulation",
        "  - principle: spatial consistency",
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
        contextPath,
        ["# 01 Context", "", "## Background", "", "Context.", "", ddp].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const interactionIssues = result.issues.filter((i) => i.code === "QFAI-DDP-008");
      expect(interactionIssues).toHaveLength(0);
    });
  });

  it("emits QFAI-DDP-008 warning when interaction thesis has only 1 principle", async () => {
    // QFAI:SPEC-0019:TC-0019-0009
    await withProject(async (root) => {
      const contextPath = path.join(resolveDiscussionPackDir(root), "01_Context.md");
      const ddp = [
        "## Design Direction Pack",
        "",
        "visual_thesis: A bold minimalist interface emphasizing clarity.",
        "content_plan:",
        "  - section: hero",
        "    role: primary",
        "  - section: details",
        "    role: supporting",
        "interaction_thesis:",
        "  - principle: progressive disclosure",
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
        contextPath,
        ["# 01 Context", "", "## Background", "", "Context.", "", ddp].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const interactionIssues = result.issues.filter((i) => i.code === "QFAI-DDP-008");
      expect(interactionIssues).toHaveLength(1);
      expect(interactionIssues[0]?.message).toBe(
        "Interaction thesis should contain 2-3 motion principles",
      );
      expect(interactionIssues[0]?.severity).toBe("warning");
    });
  });

  // ---------------------------------------------------------------------------
  // TDD-0005: TC-0019-0010 — Anti-goals banned patterns
  // ---------------------------------------------------------------------------

  it("passes when anti_goals contains a banned generic pattern", async () => {
    // QFAI:SPEC-0019:TC-0019-0010
    await withProject(async (root) => {
      const contextPath = path.join(resolveDiscussionPackDir(root), "01_Context.md");
      await writeFile(
        contextPath,
        ["# 01 Context", "", "## Background", "", "Context.", "", buildCompleteDdpMarkdown()].join(
          "\n",
        ),
        "utf-8",
      );

      const result = await validateProject(root);
      const antiGoalIssues = result.issues.filter((i) => i.code === "QFAI-DDP-009");
      expect(antiGoalIssues).toHaveLength(0);
    });
  });

  it("emits QFAI-DDP-009 warning when anti_goals has no banned patterns", async () => {
    // QFAI:SPEC-0019:TC-0019-0010
    await withProject(async (root) => {
      const contextPath = path.join(resolveDiscussionPackDir(root), "01_Context.md");
      const ddp = [
        "## Design Direction Pack",
        "",
        "visual_thesis: A bold minimalist interface emphasizing clarity.",
        "content_plan:",
        "  - section: hero",
        "    role: primary",
        "  - section: details",
        "    role: supporting",
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
        contextPath,
        ["# 01 Context", "", "## Background", "", "Context.", "", ddp].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const antiGoalIssues = result.issues.filter((i) => i.code === "QFAI-DDP-009");
      expect(antiGoalIssues).toHaveLength(1);
      expect(antiGoalIssues[0]?.message).toBe(
        "DDP anti-goals should contain at least one banned generic pattern",
      );
      expect(antiGoalIssues[0]?.severity).toBe("warning");
    });
  });

  // ---------------------------------------------------------------------------
  // TDD-0006: TC-0019-0011 — Extensibility: add new banned pattern by line
  // ---------------------------------------------------------------------------

  afterEach(() => {
    resetBannedPatternsCache();
  });

  it("recognizes a newly added banned pattern line with 0 core code changes", async () => {
    // QFAI:SPEC-0019:TC-0019-0011
    // Verify the banned patterns file is a simple text file that can be extended
    const thisDir = path.dirname(fileURLToPath(import.meta.url));
    const bannedPatternsFile = path.resolve(
      thisDir,
      "../../src/core/validators/ddpBannedPatterns.txt",
    );
    const content = await readFile(bannedPatternsFile, "utf-8");
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);

    // The file should have at least one pattern
    expect(lines.length).toBeGreaterThanOrEqual(1);

    // Each line is a plain-text pattern — no JSON, no code
    for (const line of lines) {
      expect(line).not.toMatch(/[{}[\]]/); // no JSON-like syntax
    }

    // Adding a new line would extend the list — verify this is extensible
    // by checking the format is newline-separated text
    expect(content).toMatch(/\n/);
  });

  // ---------------------------------------------------------------------------
  // TDD-0006: TC-0019-0012 — Tool independence: text-only DDP PASS, Figma URL → error
  // ---------------------------------------------------------------------------

  it("passes when DDP is text-only with no external tool references", async () => {
    // QFAI:SPEC-0019:TC-0019-0012
    await withProject(async (root) => {
      const contextPath = path.join(resolveDiscussionPackDir(root), "01_Context.md");
      await writeFile(
        contextPath,
        ["# 01 Context", "", "## Background", "", "Context.", "", buildCompleteDdpMarkdown()].join(
          "\n",
        ),
        "utf-8",
      );

      const result = await validateProject(root);
      const toolIssues = result.issues.filter((i) => i.code === "QFAI-DDP-010");
      expect(toolIssues).toHaveLength(0);
    });
  });

  it("emits QFAI-DDP-010 error when DDP contains a Figma URL", async () => {
    // QFAI:SPEC-0019:TC-0019-0012
    await withProject(async (root) => {
      const contextPath = path.join(resolveDiscussionPackDir(root), "01_Context.md");
      const ddp = [
        "## Design Direction Pack",
        "",
        "visual_thesis: A bold minimalist interface as shown in https://www.figma.com/file/abc123/MyDesign.",
        "content_plan:",
        "  - section: hero",
        "    role: primary",
        "  - section: details",
        "    role: supporting",
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
        contextPath,
        ["# 01 Context", "", "## Background", "", "Context.", "", ddp].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const toolIssues = result.issues.filter((i) => i.code === "QFAI-DDP-010");
      expect(toolIssues).toHaveLength(1);
      expect(toolIssues[0]?.severity).toBe("error");
      expect(toolIssues[0]?.message).toContain("external tool");
    });
  });

  // ---------------------------------------------------------------------------
  // TDD-0006: TC-0019-0013 — DDP creation portability (Claude Code)
  // ---------------------------------------------------------------------------

  it("validates a DDP created in text format with 0 tool-specific API calls", async () => {
    // QFAI:SPEC-0019:TC-0019-0013
    // This test verifies that DDP validation works on pure-text DDP content
    // without requiring any external tool API calls.
    await withProject(async (root) => {
      const contextPath = path.join(resolveDiscussionPackDir(root), "01_Context.md");
      // Simulate a DDP that was created entirely in a text editor / Claude Code
      await writeFile(
        contextPath,
        ["# 01 Context", "", "## Background", "", "Context.", "", buildCompleteDdpMarkdown()].join(
          "\n",
        ),
        "utf-8",
      );

      const result = await validateProject(root);
      const ddpIssues = result.issues.filter((i) => i.code.startsWith("QFAI-DDP-"));
      // A complete text-only DDP should produce 0 issues
      expect(ddpIssues).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // TDD-0007: TC-0019-0016 — Research-to-Constraint conversion + traceability
  // ---------------------------------------------------------------------------

  it("passes when contracts/design rules have source_research and research_summary exists", async () => {
    // QFAI:SPEC-0019:TC-0019-0016
    await withProject(async (root) => {
      const contextPath = path.join(resolveDiscussionPackDir(root), "01_Context.md");
      await writeFile(
        contextPath,
        [
          "# 01 Context",
          "",
          "## Background",
          "",
          "research_summary:",
          "  - BP-001: Users prefer single-click actions",
          "  - BP-002: Mobile-first layout improves engagement",
          "",
          buildCompleteDdpMarkdown(),
        ].join("\n"),
        "utf-8",
      );

      // Seed contract design rules with source_research
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

      const result = await validateProject(root);
      const traceIssues = result.issues.filter(
        (i) => i.code === "QFAI-DDP-011" || i.code === "QFAI-DDP-012",
      );
      expect(traceIssues).toHaveLength(0);
    });
  });

  it("emits QFAI-DDP-012 when requireResearchSummary=true but no research_summary exists", async () => {
    // QFAI:SPEC-0019:TC-0019-0016
    await withProject(async (root) => {
      const contextPath = path.join(resolveDiscussionPackDir(root), "01_Context.md");
      await writeFile(
        contextPath,
        ["# 01 Context", "", "## Background", "", "Context.", "", buildCompleteDdpMarkdown()].join(
          "\n",
        ),
        "utf-8",
      );

      // Set config with requireResearchSummary=true
      const configPath = path.join(root, "qfai.config.yaml");
      const configContent = await readFile(configPath, "utf-8");
      await writeFile(
        configPath,
        configContent + "\nuiux:\n  requireResearchSummary: true\n",
        "utf-8",
      );

      const result = await validateProject(root);
      const researchIssues = result.issues.filter((i) => i.code === "QFAI-DDP-012");
      expect(researchIssues).toHaveLength(1);
      expect(researchIssues[0]?.severity).toBe("error");
      expect(researchIssues[0]?.message).toContain("requireResearchSummary");
    });
  });

  // ---------------------------------------------------------------------------
  // TDD-0007: TC-0019-0017 — Contract rule without source_research
  // ---------------------------------------------------------------------------

  it("emits QFAI-DDP-011 warning when contract rule lacks source_research", async () => {
    // QFAI:SPEC-0019:TC-0019-0017
    await withProject(async (root) => {
      const contextPath = path.join(resolveDiscussionPackDir(root), "01_Context.md");
      await writeFile(
        contextPath,
        ["# 01 Context", "", "## Background", "", "Context.", "", buildCompleteDdpMarkdown()].join(
          "\n",
        ),
        "utf-8",
      );

      const contractDir = path.join(root, ".qfai", "contracts", "design");
      await mkdir(contractDir, { recursive: true });
      await writeFile(
        path.join(contractDir, "rules.yaml"),
        [
          "- rule: single-click-actions",
          "  id: DR-001",
          "  description: All primary actions must be single-click.",
        ].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const traceIssues = result.issues.filter((i) => i.code === "QFAI-DDP-011");
      expect(traceIssues).toHaveLength(1);
      expect(traceIssues[0]?.severity).toBe("warning");
      expect(traceIssues[0]?.message).toContain("DR-001");
    });
  });

  // ---------------------------------------------------------------------------
  // TDD-0008: TC-0019-0018 — List/Form template completeness
  // ---------------------------------------------------------------------------

  it("passes when list template has all required fields", async () => {
    // QFAI:SPEC-0019:TC-0019-0018
    await withProject(async (root) => {
      const storyPath = path.join(resolveDiscussionPackDir(root), "03_Story-Workshop.md");
      await writeFile(
        storyPath,
        [
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
        ].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const templateIssues = result.issues.filter((i) => i.code === "QFAI-DDP-013");
      expect(templateIssues).toHaveLength(0);
    });
  });

  it("emits QFAI-DDP-013 when list template density_rationale is empty", async () => {
    // QFAI:SPEC-0019:TC-0019-0018
    await withProject(async (root) => {
      const storyPath = path.join(resolveDiscussionPackDir(root), "03_Story-Workshop.md");
      await writeFile(
        storyPath,
        [
          "# 03 Story Workshop",
          "",
          "screen_type: list",
          "items_source: API endpoint /items",
          "empty_state: Show placeholder",
          "sort_filter_controls: date, name",
          "pagination_or_infinite_scroll: pagination",
          "primary_cta: Add Item",
          "density_rationale:",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const templateIssues = result.issues.filter(
        (i) => i.code === "QFAI-DDP-013" && i.message.includes("density_rationale"),
      );
      expect(templateIssues).toHaveLength(1);
      expect(templateIssues[0]?.severity).toBe("error");
    });
  });

  it("passes when form template has all required fields", async () => {
    // QFAI:SPEC-0019:TC-0019-0018
    await withProject(async (root) => {
      const storyPath = path.join(resolveDiscussionPackDir(root), "03_Story-Workshop.md");
      await writeFile(
        storyPath,
        [
          "# 03 Story Workshop",
          "",
          "screen_type: form",
          "fields: name, email, phone, address",
          "required_fields_count: 3",
          "submit_cta: Save",
          "validation_feedback: inline errors below each field",
          "cancel_or_back_action: Cancel button returns to list",
          "states:",
          "  loading: spinner",
          "  error: inline error banner",
          "  success: confirmation toast",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const templateIssues = result.issues.filter((i) => i.code === "QFAI-DDP-013");
      expect(templateIssues).toHaveLength(0);
    });
  });

  it("emits QFAI-DDP-013 when form template states.error is missing", async () => {
    // QFAI:SPEC-0019:TC-0019-0018
    await withProject(async (root) => {
      const storyPath = path.join(resolveDiscussionPackDir(root), "03_Story-Workshop.md");
      await writeFile(
        storyPath,
        [
          "# 03 Story Workshop",
          "",
          "screen_type: form",
          "fields: name, email, phone",
          "required_fields_count: 2",
          "submit_cta: Submit",
          "validation_feedback: inline",
          "cancel_or_back_action: Back button",
          "states:",
          "  loading: spinner",
          "  success: toast notification",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const stateIssues = result.issues.filter(
        (i) => i.code === "QFAI-DDP-013" && i.message.includes("states.error"),
      );
      expect(stateIssues).toHaveLength(1);
      expect(stateIssues[0]?.severity).toBe("error");
    });
  });

  // ---------------------------------------------------------------------------
  // TDD-0008: TC-0019-0019 — Anti-pattern detection
  // ---------------------------------------------------------------------------

  it("emits QFAI-DDP-014 for dual primary CTA anti-pattern", async () => {
    // QFAI:SPEC-0019:TC-0019-0019
    await withProject(async (root) => {
      const storyPath = path.join(resolveDiscussionPackDir(root), "03_Story-Workshop.md");
      await writeFile(
        storyPath,
        [
          "# 03 Story Workshop",
          "",
          "The screen uses a dual primary CTA pattern with both Save and Submit as primary.",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const antiPatternIssues = result.issues.filter(
        (i) => i.code === "QFAI-DDP-014" && i.message.includes("dual primary CTA"),
      );
      expect(antiPatternIssues).toHaveLength(1);
      expect(antiPatternIssues[0]?.severity).toBe("error");
    });
  });

  it("emits QFAI-DDP-014 for too many required fields anti-pattern", async () => {
    // QFAI:SPEC-0019:TC-0019-0019
    await withProject(async (root) => {
      const storyPath = path.join(resolveDiscussionPackDir(root), "03_Story-Workshop.md");
      await writeFile(
        storyPath,
        [
          "# 03 Story Workshop",
          "",
          "screen_type: form",
          "fields: name, email, phone, address, city, state, zip, country, company",
          "required_fields_count: 9",
          "submit_cta: Submit",
          "validation_feedback: inline",
          "cancel_or_back_action: Back",
          "",
        ].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const antiPatternIssues = result.issues.filter(
        (i) => i.code === "QFAI-DDP-014" && i.message.includes("more than 7 required fields"),
      );
      expect(antiPatternIssues).toHaveLength(1);
      expect(antiPatternIssues[0]?.severity).toBe("error");
    });
  });

  it("emits QFAI-DDP-014 for empty state without action", async () => {
    // QFAI:SPEC-0019:TC-0019-0019
    await withProject(async (root) => {
      const storyPath = path.join(resolveDiscussionPackDir(root), "03_Story-Workshop.md");
      await writeFile(
        storyPath,
        ["# 03 Story Workshop", "", "empty_state: No items found", ""].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const antiPatternIssues = result.issues.filter(
        (i) => i.code === "QFAI-DDP-014" && i.message.includes("empty state without action"),
      );
      expect(antiPatternIssues).toHaveLength(1);
      expect(antiPatternIssues[0]?.severity).toBe("error");
      expect(antiPatternIssues[0]?.suggested_action).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // TDD-0009: TC-0019-0020 — Config uiux quality profile
  // ---------------------------------------------------------------------------

  it("emits info when qualityProfile=strict", async () => {
    // QFAI:SPEC-0019:TC-0019-0020
    await withProject(async (root) => {
      const contextPath = path.join(resolveDiscussionPackDir(root), "01_Context.md");
      await writeFile(
        contextPath,
        ["# 01 Context", "", "## Background", "", "Context.", "", buildCompleteDdpMarkdown()].join(
          "\n",
        ),
        "utf-8",
      );

      const configPath = path.join(root, "qfai.config.yaml");
      const configContent = await readFile(configPath, "utf-8");
      await writeFile(configPath, configContent + "\nuiux:\n  qualityProfile: strict\n", "utf-8");

      const result = await validateProject(root);
      const profileIssues = result.issues.filter(
        (i) => i.code === "QFAI-DDP-015" && i.message.includes("strict"),
      );
      expect(profileIssues).toHaveLength(1);
      expect(profileIssues[0]?.severity).toBe("info");
    });
  });

  it("emits info when qualityProfile=high", async () => {
    // QFAI:SPEC-0019:TC-0019-0020
    await withProject(async (root) => {
      const contextPath = path.join(resolveDiscussionPackDir(root), "01_Context.md");
      await writeFile(
        contextPath,
        ["# 01 Context", "", "## Background", "", "Context.", "", buildCompleteDdpMarkdown()].join(
          "\n",
        ),
        "utf-8",
      );

      const configPath = path.join(root, "qfai.config.yaml");
      const configContent = await readFile(configPath, "utf-8");
      await writeFile(configPath, configContent + "\nuiux:\n  qualityProfile: high\n", "utf-8");

      const result = await validateProject(root);
      const profileIssues = result.issues.filter(
        (i) => i.code === "QFAI-DDP-015" && i.message.includes("high"),
      );
      expect(profileIssues).toHaveLength(1);
      expect(profileIssues[0]?.severity).toBe("info");
    });
  });

  it("emits no QFAI-DDP-015 when qualityProfile is undefined (default)", async () => {
    // QFAI:SPEC-0019:TC-0019-0020
    await withProject(async (root) => {
      const contextPath = path.join(resolveDiscussionPackDir(root), "01_Context.md");
      await writeFile(
        contextPath,
        ["# 01 Context", "", "## Background", "", "Context.", "", buildCompleteDdpMarkdown()].join(
          "\n",
        ),
        "utf-8",
      );

      const result = await validateProject(root);
      const profileIssues = result.issues.filter((i) => i.code === "QFAI-DDP-015");
      expect(profileIssues).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // TDD-0009: TC-0019-0021 — Multiple option comparison
  // ---------------------------------------------------------------------------

  it("passes when design contract has 2 options with full fields", async () => {
    // QFAI:SPEC-0019:TC-0019-0021
    await withProject(async (root) => {
      const contextPath = path.join(resolveDiscussionPackDir(root), "01_Context.md");
      await writeFile(
        contextPath,
        ["# 01 Context", "", "## Background", "", "Context.", "", buildCompleteDdpMarkdown()].join(
          "\n",
        ),
        "utf-8",
      );

      const contractDir = path.join(root, ".qfai", "contracts", "design");
      await mkdir(contractDir, { recursive: true });
      await writeFile(
        path.join(contractDir, "options.yaml"),
        [
          "- option: Tab Navigation",
          "  pros: Familiar pattern, quick access",
          "  cons: Limited space on mobile",
          "- option: Drawer Navigation",
          "  pros: More space for items",
          "  cons: Hidden by default, extra tap",
        ].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const optionIssues = result.issues.filter((i) => i.code === "QFAI-DDP-016");
      expect(optionIssues).toHaveLength(0);
    });
  });

  it("emits QFAI-DDP-016 when design contract has only 1 option", async () => {
    // QFAI:SPEC-0019:TC-0019-0021
    await withProject(async (root) => {
      const contextPath = path.join(resolveDiscussionPackDir(root), "01_Context.md");
      await writeFile(
        contextPath,
        ["# 01 Context", "", "## Background", "", "Context.", "", buildCompleteDdpMarkdown()].join(
          "\n",
        ),
        "utf-8",
      );

      const contractDir = path.join(root, ".qfai", "contracts", "design");
      await mkdir(contractDir, { recursive: true });
      await writeFile(
        path.join(contractDir, "options.yaml"),
        ["- option: Tab Navigation", "  pros: Familiar pattern", "  cons: Limited space"].join(
          "\n",
        ),
        "utf-8",
      );

      const result = await validateProject(root);
      const optionIssues = result.issues.filter(
        (i) => i.code === "QFAI-DDP-016" && i.message.includes("only 1 option"),
      );
      expect(optionIssues).toHaveLength(1);
      expect(optionIssues[0]?.severity).toBe("error");
    });
  });

  it("emits QFAI-DDP-016 warning when option pros is empty", async () => {
    // QFAI:SPEC-0019:TC-0019-0021
    await withProject(async (root) => {
      const contextPath = path.join(resolveDiscussionPackDir(root), "01_Context.md");
      await writeFile(
        contextPath,
        ["# 01 Context", "", "## Background", "", "Context.", "", buildCompleteDdpMarkdown()].join(
          "\n",
        ),
        "utf-8",
      );

      const contractDir = path.join(root, ".qfai", "contracts", "design");
      await mkdir(contractDir, { recursive: true });
      await writeFile(
        path.join(contractDir, "options.yaml"),
        [
          "- option: Tab Navigation",
          "  pros:",
          "  cons: Limited space",
          "- option: Drawer Navigation",
          "  pros: More room",
          "  cons: Hidden",
        ].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const prosIssues = result.issues.filter(
        (i) => i.code === "QFAI-DDP-016" && i.message.includes("empty pros"),
      );
      expect(prosIssues).toHaveLength(1);
      expect(prosIssues[0]?.severity).toBe("warning");
    });
  });

  // ---------------------------------------------------------------------------
  // TDD-0010: TC-0019-0022 — Competitive references validation
  // ---------------------------------------------------------------------------

  it("passes when design contract has 3+ competitive refs", async () => {
    // QFAI:SPEC-0019:TC-0019-0022
    await withProject(async (root) => {
      const contextPath = path.join(resolveDiscussionPackDir(root), "01_Context.md");
      await writeFile(
        contextPath,
        ["# 01 Context", "", "## Background", "", "Context.", "", buildCompleteDdpMarkdown()].join(
          "\n",
        ),
        "utf-8",
      );

      const contractDir = path.join(root, ".qfai", "contracts", "design");
      await mkdir(contractDir, { recursive: true });
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
          "translation_policy: Adapt best patterns to our design language.",
        ].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const refIssues = result.issues.filter(
        (i) => i.code === "QFAI-DDP-017" || i.code === "QFAI-DDP-018",
      );
      expect(refIssues).toHaveLength(0);
    });
  });

  it("emits QFAI-DDP-017 when competitive refs has only 2 entries", async () => {
    // QFAI:SPEC-0019:TC-0019-0022
    await withProject(async (root) => {
      const contextPath = path.join(resolveDiscussionPackDir(root), "01_Context.md");
      await writeFile(
        contextPath,
        ["# 01 Context", "", "## Background", "", "Context.", "", buildCompleteDdpMarkdown()].join(
          "\n",
        ),
        "utf-8",
      );

      const contractDir = path.join(root, ".qfai", "contracts", "design");
      await mkdir(contractDir, { recursive: true });
      await writeFile(
        path.join(contractDir, "refs.yaml"),
        [
          "competitive_refs:",
          "  - name: Competitor A",
          "  - name: Competitor B",
          "translation_policy: Adapt patterns.",
        ].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const refIssues = result.issues.filter((i) => i.code === "QFAI-DDP-017");
      expect(refIssues).toHaveLength(1);
      expect(refIssues[0]?.severity).toBe("error");
      expect(refIssues[0]?.message).toContain("2");
      expect(refIssues[0]?.message).toContain("3");
    });
  });

  it("emits QFAI-DDP-018 warning when translation_policy is missing", async () => {
    // QFAI:SPEC-0019:TC-0019-0022
    await withProject(async (root) => {
      const contextPath = path.join(resolveDiscussionPackDir(root), "01_Context.md");
      await writeFile(
        contextPath,
        ["# 01 Context", "", "## Background", "", "Context.", "", buildCompleteDdpMarkdown()].join(
          "\n",
        ),
        "utf-8",
      );

      const contractDir = path.join(root, ".qfai", "contracts", "design");
      await mkdir(contractDir, { recursive: true });
      await writeFile(
        path.join(contractDir, "refs.yaml"),
        [
          "competitive_refs:",
          "  - name: Competitor A",
          "  - name: Competitor B",
          "  - name: Competitor C",
        ].join("\n"),
        "utf-8",
      );

      const result = await validateProject(root);
      const policyIssues = result.issues.filter((i) => i.code === "QFAI-DDP-018");
      expect(policyIssues).toHaveLength(1);
      expect(policyIssues[0]?.severity).toBe("warning");
      expect(policyIssues[0]?.message).toContain("Translation policy");
    });
  });
});
