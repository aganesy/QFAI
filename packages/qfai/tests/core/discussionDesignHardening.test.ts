// QFAI:SPEC-0002:US-0002-0001
// QFAI:SPEC-0002:US-0002-0002
// QFAI:SPEC-0002:US-0002-0003
// QFAI:SPEC-0002:US-0002-0004
// QFAI:SPEC-0002:US-0002-0005
// QFAI:SPEC-0002:TC-0002-0001
// QFAI:SPEC-0002:TC-0002-0002
// QFAI:SPEC-0002:TC-0002-0003
// QFAI:SPEC-0002:TC-0002-0004
// QFAI:SPEC-0002:TC-0002-0005
// QFAI:SPEC-0002:TC-0002-0006
// QFAI:SPEC-0002:TC-0002-0007
// QFAI:SPEC-0002:TC-0002-0008
// QFAI:SPEC-0002:TC-0002-0009
// QFAI:SPEC-0002:TC-0002-0010
// QFAI:SPEC-0002:TC-0002-0011
// QFAI:SPEC-0002:TC-0002-0012
// QFAI:SPEC-0002:TC-0002-0013
// QFAI:SPEC-0002:TC-0002-0014
// QFAI:SPEC-0002:TC-0002-0015
// QFAI:SPEC-0002:TC-0002-0016
// QFAI:SPEC-0002:TC-0002-0017
// QFAI:SPEC-0002:TC-0002-0018
// QFAI:SPEC-0002:TC-0002-0019
// QFAI:SPEC-0002:TC-0002-0020
// QFAI:SPEC-0002:TC-0002-0021
// QFAI:SPEC-0002:TC-0002-0022
// QFAI:SPEC-0002:TC-0002-0023
// QFAI:SPEC-0002:TC-0002-0024
// QFAI:SPEC-0002:TC-0002-0032

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  isUiBearing,
  validateSidecarPrimaryTruth,
  validateOptionComparison,
  validateSelectedDirection,
  validateCompetitiveRefs,
  validateInteractionPriorityHandoff,
  validateStateCoverage,
  validateDesignAntiGoals,
} from "../../src/core/validators/discussionDesignHardening.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function withPackDir(
  files: Record<string, string>,
  task: (packRoot: string) => Promise<void>,
): Promise<void> {
  const packRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-ddh-"));
  try {
    for (const [name, content] of Object.entries(files)) {
      const filePath = path.join(packRoot, name);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, content, "utf-8");
    }
    await task(packRoot);
  } finally {
    await rm(packRoot, { recursive: true, force: true });
  }
}

/**
 * Create a 30_option_comparison.md with option comparison (options only, no direction).
 */
function makeOptionComparisonContent(
  opts: {
    optionComparison?: string;
    designAntiGoals?: string;
  } = {},
): string {
  return [
    "# 30 Option Comparison",
    "",
    "## Option Comparison",
    "",
    opts.optionComparison ??
      [
        "- **Option A**: Card-based layout with prominent hero section",
        "- **Option B**: List-based layout with sidebar navigation",
      ].join("\n"),
    "",
    ...(opts.designAntiGoals !== undefined
      ? ["## Design Anti-goals", "", opts.designAntiGoals, ""]
      : []),
  ].join("\n");
}

/**
 * Create a 31_selected_anchor_screen.md with selected_option and why_selected.
 */
function makeSelectedAnchorContent(
  opts: {
    selectedOption?: string;
    whySelected?: string;
  } = {},
): string {
  return [
    "# 31 Selected Anchor Screen",
    "",
    `- selected_option: ${opts.selectedOption ?? "Option A"}`,
    `- why_selected: ${opts.whySelected ?? "Provides stronger visual hierarchy for primary content"}`,
  ].join("\n");
}

/**
 * Create a 03_Story-Workshop.md with Behavior Obligations section.
 */
function makeStoryWorkshopContent(
  opts: {
    interactionContracts?: string;
    stateCoverage?: string;
    designAntiGoals?: string;
  } = {},
): string {
  return [
    "# 03 Story Workshop",
    "",
    "<style>.screen { background: #fff; }</style>",
    "",
    "## Behavior Obligations",
    "",
    "### State Coverage",
    opts.stateCoverage ??
      [
        "| State / Risk | Discovery Notes | Handoff to Contract |",
        "| ------------ | --------------- | ------------------- |",
        "| loading | Skeleton cards can hide the main task | Final `required_states` contract lives in `uiux/40_screen_contracts.md` |",
        "| error | Retry action must stay obvious during failure | Final `required_states` contract lives in `uiux/40_screen_contracts.md` |",
      ].join("\n"),
    "",
    "### Interaction Contracts",
    opts.interactionContracts ??
      [
        "| Primary Task | Key Action | Priority Hint | Expected Result | Error Handling |",
        "| ------------ | ---------- | ------------- | --------------- | -------------- |",
        '| Start evaluation | "Get Started" button | primary | User enters the main flow | Retry paths remain visible during failures |',
        "",
        "Screen-level contract details are finalized in `uiux/40_screen_contracts.md`. Primary tasks, required states, transitions, and observable outcomes are finalized there; Story Workshop is for discovery and handoff, not final contract fixation.",
      ].join("\n"),
    "",
    "### Design Anti-goals",
    opts.designAntiGoals ?? "- Anti-goal: Avoid modal-heavy flows that break user context",
  ].join("\n");
}

function makeCompetitiveRefsContent(
  entries: Array<{
    adopted_points?: string;
    rejected_points?: string;
    local_translation?: string;
  }>,
): string {
  const lines = ["# 04 Sources", "", "## Competitive Reference Registry", ""];
  for (const entry of entries) {
    lines.push("### Reference");
    if (entry.adopted_points !== undefined) {
      lines.push(`- adopted_points: ${entry.adopted_points}`);
    }
    if (entry.rejected_points !== undefined) {
      lines.push(`- rejected_points: ${entry.rejected_points}`);
    }
    if (entry.local_translation !== undefined) {
      lines.push(`- local_translation: ${entry.local_translation}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

/**
 * Minimal sidecar files for a valid UI-bearing pack.
 */
function sidecarFiles(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    "uiux/10_implementation_strategy.md": "# Strategy\nUI strategy content.",
    "uiux/30_option_comparison.md": makeOptionComparisonContent(),
    "uiux/31_selected_anchor_screen.md": makeSelectedAnchorContent(),
    "uiux/40_screen_contracts.md": "# Screen Contracts\n\n### Screen: Dashboard\n- screen_id: dashboard\n- route: /dashboard\n- purpose: Main view\n- actor: user\n- primary_tasks: View dashboard\n- secondary_tasks: Export data\n- required_states: default, loading, empty, error\n- transitions: navigate to detail\n- observable_outcomes: Data displayed\n- notes_for_verify: Check states\n- notes_for_reviewer: None",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// isUiBearing — TDD-0001..0004
// ---------------------------------------------------------------------------

describe("isUiBearing", { timeout: 10000 }, () => {
  // TDD-0001: TC-0002-0001
  it("detects HTML style tag as UI-bearing", async () => {
    await withPackDir(
      { "03_Story-Workshop.md": "<style>.screen { background: #fff; }</style>\nSome content." },
      async (packRoot) => {
        expect(await isUiBearing(packRoot)).toBe(true);
      },
    );
  });

  // TDD-0002: TC-0002-0002
  it("detects HTML div element as UI-bearing", async () => {
    await withPackDir(
      { "03_Story-Workshop.md": '<div class="screen"><h1>Dashboard</h1></div>' },
      async (packRoot) => {
        expect(await isUiBearing(packRoot)).toBe(true);
      },
    );
  });

  // TDD-0003: TC-0002-0003
  it("classifies plain text pack as non-UI", async () => {
    await withPackDir(
      { "03_Story-Workshop.md": "# Story\n\nAs a developer, I want API contracts.\n" },
      async (packRoot) => {
        expect(await isUiBearing(packRoot)).toBe(false);
      },
    );
  });

  // TDD-0004: TC-0002-0004
  it("detects Mermaid screen flow as UI-bearing", async () => {
    const content = [
      "# 03 Story Workshop",
      "",
      "```mermaid",
      "stateDiagram-v2",
      "  [*] --> LoginScreen",
      "  LoginScreen --> Dashboard",
      "```",
    ].join("\n");
    await withPackDir({ "03_Story-Workshop.md": content }, async (packRoot) => {
      expect(await isUiBearing(packRoot)).toBe(true);
    });
  });

  it("returns false when 03_Story-Workshop.md does not exist", async () => {
    const packRoot = await mkdtemp(path.join(os.tmpdir(), "qfai-ddh-empty-"));
    try {
      expect(await isUiBearing(packRoot)).toBe(false);
    } finally {
      await rm(packRoot, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// UIX discussion hardening: Sidecar primary truth — TDD-0005..0007
// ---------------------------------------------------------------------------

describe(
  "validateSidecarPrimaryTruth (UIX-VAL-DDH-SIDECAR-PRIMARY-TRUTH)",
  { timeout: 10000 },
  () => {
    // TDD-0005: TC-0002-0005
    it("pass — all 3 canonical sidecar files present", async () => {
      await withPackDir(sidecarFiles(), async (packRoot) => {
        const issues = await validateSidecarPrimaryTruth(packRoot);
        expect(issues).toEqual([]);
      });
    });

    // TDD-0006: TC-0002-0006
    it("fail — missing 30_option_comparison.md sidecar file", async () => {
      const files = sidecarFiles();
      delete files["uiux/30_option_comparison.md"];
      await withPackDir(files, async (packRoot) => {
        const issues = await validateSidecarPrimaryTruth(packRoot);
        expect(issues.length).toBeGreaterThan(0);
        expect(issues[0]?.code).toBe("UIX-VAL-DDH-SIDECAR-PRIMARY-TRUTH");
        expect(issues[0]?.severity).toBe("error");
        expect(issues[0]?.message).toContain("30_option_comparison.md");
      });
    });

    // TDD-0007: TC-0002-0007
    it("fail — no uiux/ directory at all", async () => {
      await withPackDir(
        {
          "03_Story-Workshop.md": "<style>.x{}</style>\n# Story\nPlain content.",
        },
        async (packRoot) => {
          const issues = await validateSidecarPrimaryTruth(packRoot);
          expect(issues.length).toBe(4);
          expect(issues.every((i) => i.code === "UIX-VAL-DDH-SIDECAR-PRIMARY-TRUTH")).toBe(true);
        },
      );
    });
  },
);

// ---------------------------------------------------------------------------
// UIX discussion hardening: Option comparison — TDD-0008..0009
// ---------------------------------------------------------------------------

describe("validateOptionComparison (UIX-VAL-DDH-OPTION-COMPARISON)", { timeout: 10000 }, () => {
  // TDD-0008: TC-0002-0008
  it("pass — 2 options present in 30_option_comparison.md", async () => {
    await withPackDir(sidecarFiles(), async (packRoot) => {
      const issues = await validateOptionComparison(packRoot);
      expect(issues).toEqual([]);
    });
  });

  // TDD-0009: TC-0002-0009
  it("fail — only 1 option", async () => {
    const comparison = makeOptionComparisonContent({
      optionComparison: "- **Option A**: Single card layout",
    });
    await withPackDir(sidecarFiles({ "uiux/30_option_comparison.md": comparison }), async (packRoot) => {
      const issues = await validateOptionComparison(packRoot);
      expect(issues.length).toBe(1);
      expect(issues[0]?.code).toBe("UIX-VAL-DDH-OPTION-COMPARISON");
      expect(issues[0]?.severity).toBe("error");
      expect(issues[0]?.message).toContain("1");
      expect(issues[0]?.message).toContain("2");
    });
  });
});

// ---------------------------------------------------------------------------
// UIX discussion hardening: Selected direction — TDD-0010..0011
// ---------------------------------------------------------------------------

describe("validateSelectedDirection (UIX-VAL-DDH-SELECTED-DIRECTION)", { timeout: 10000 }, () => {
  // TDD-0010: TC-0002-0010
  it("pass — 31_selected_anchor_screen.md has selected_option and why_selected", async () => {
    await withPackDir(sidecarFiles(), async (packRoot) => {
      const issues = await validateSelectedDirection(packRoot);
      expect(issues).toEqual([]);
    });
  });

  // TDD-0011: TC-0002-0011
  it("fail — 31_selected_anchor_screen.md missing", async () => {
    const files = sidecarFiles();
    delete files["uiux/31_selected_anchor_screen.md"];
    await withPackDir(files, async (packRoot) => {
      const issues = await validateSelectedDirection(packRoot);
      expect(issues.length).toBe(1);
      expect(issues[0]?.code).toBe("UIX-VAL-DDH-SELECTED-DIRECTION");
      expect(issues[0]?.severity).toBe("error");
    });
  });
});

// ---------------------------------------------------------------------------
// UIX discussion hardening: Competitive refs — TDD-0012..0016
// ---------------------------------------------------------------------------

describe("validateCompetitiveRefs (UIX-VAL-DDH-COMPETITIVE-REFERENCES)", { timeout: 10000 }, () => {
  // TDD-0012: TC-0002-0012
  it("pass — all 3 fields populated with substantive content", async () => {
    const sources = makeCompetitiveRefsContent([
      {
        adopted_points: "Clean card layout with clear hierarchy",
        rejected_points: "Overly complex navigation structure",
        local_translation: "Adapted card sizes for Japanese text density",
      },
    ]);
    await withPackDir({ "04_Sources.md": sources }, async (packRoot) => {
      const issues = await validateCompetitiveRefs(packRoot);
      expect(issues).toEqual([]);
    });
  });

  // TDD-0013: TC-0002-0013
  it("fail — rejected_points field missing", async () => {
    const sources = makeCompetitiveRefsContent([
      {
        adopted_points: "Clean card layout",
        local_translation: "Adapted for JP",
      },
    ]);
    await withPackDir({ "04_Sources.md": sources }, async (packRoot) => {
      const issues = await validateCompetitiveRefs(packRoot);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.code).toBe("UIX-VAL-DDH-COMPETITIVE-REFERENCES");
      expect(issues[0]?.severity).toBe("error");
      expect(issues[0]?.message).toContain("rejected_points");
    });
  });

  // TDD-0014: TC-0002-0014
  it("fail — placeholder TBD in local_translation", async () => {
    const sources = makeCompetitiveRefsContent([
      {
        adopted_points: "Clean card layout",
        rejected_points: "Complex nav",
        local_translation: "TBD",
      },
    ]);
    await withPackDir({ "04_Sources.md": sources }, async (packRoot) => {
      const issues = await validateCompetitiveRefs(packRoot);
      expect(issues.length).toBeGreaterThan(0);
      expect(
        issues.some(
          (i) =>
            i.code === "UIX-VAL-DDH-COMPETITIVE-REFERENCES" && i.message.includes("placeholder"),
        ),
      ).toBe(true);
    });
  });

  // TDD-0015: TC-0002-0015
  it("fail — empty string in adopted_points", async () => {
    const sources = makeCompetitiveRefsContent([
      {
        adopted_points: "",
        rejected_points: "Complex nav",
        local_translation: "Adapted for JP",
      },
    ]);
    await withPackDir({ "04_Sources.md": sources }, async (packRoot) => {
      const issues = await validateCompetitiveRefs(packRoot);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some((i) => i.code === "UIX-VAL-DDH-COMPETITIVE-REFERENCES")).toBe(true);
    });
  });

  // TDD-0016: TC-0002-0016
  it("fail — placeholder N/A in rejected_points", async () => {
    const sources = makeCompetitiveRefsContent([
      {
        adopted_points: "Clean card layout",
        rejected_points: "N/A",
        local_translation: "Adapted for JP",
      },
    ]);
    await withPackDir({ "04_Sources.md": sources }, async (packRoot) => {
      const issues = await validateCompetitiveRefs(packRoot);
      expect(issues.length).toBeGreaterThan(0);
      expect(
        issues.some(
          (i) =>
            i.code === "UIX-VAL-DDH-COMPETITIVE-REFERENCES" && i.message.includes("placeholder"),
        ),
      ).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// UIX discussion hardening: Primary action handoff clarity — TDD-0017..0018
// ---------------------------------------------------------------------------

describe(
  "validateInteractionPriorityHandoff (UIX-VAL-DDH-INTERACTION-HANDOFF)",
  { timeout: 10000 },
  () => {
    // TDD-0017: TC-0002-0017
    it("pass — primary task and key action are defined in Interaction Contracts", async () => {
      await withPackDir(
        { "03_Story-Workshop.md": makeStoryWorkshopContent() },
        async (packRoot) => {
          const issues = await validateInteractionPriorityHandoff(packRoot);
          expect(issues).toEqual([]);
        },
      );
    });

    // Canonical suite rejects legacy CTA wording
    it("fail - legacy CTA wording is rejected by canonical validator", async () => {
      const content = makeStoryWorkshopContent({
        interactionContracts: [
          "### CTA Hierarchy",
          "| Primary CTA | Secondary CTA | Placement |",
          "| ----------- | ------------- | --------- |",
          "| Start Trial | Learn More | hero section |",
        ].join("\n"),
      });
      await withPackDir({ "03_Story-Workshop.md": content }, async (packRoot) => {
        const issues = await validateInteractionPriorityHandoff(packRoot);
        expect(issues.length).toBe(1);
        expect(issues[0]?.code).toBe("UIX-VAL-DDH-INTERACTION-HANDOFF");
        expect(issues[0]?.severity).toBe("error");
      });
    });

    // Canonical suite rejects legacy "primary cta" as signal
    it("fail — legacy 'primary cta' signal is rejected by canonical validator", async () => {
      const content = makeStoryWorkshopContent({
        interactionContracts: "The primary cta is the Start Trial button in the hero section.",
      });
      await withPackDir({ "03_Story-Workshop.md": content }, async (packRoot) => {
        const issues = await validateInteractionPriorityHandoff(packRoot);
        expect(issues.length).toBe(1);
        expect(issues[0]?.code).toBe("UIX-VAL-DDH-INTERACTION-HANDOFF");
        expect(issues[0]?.severity).toBe("error");
      });
    });

    // TDD-0018: TC-0002-0018
    it("fail — no prioritized main action", async () => {
      const content = makeStoryWorkshopContent({
        interactionContracts:
          "| Element | Action | Expected Result | Error Handling |\n| ------- | ------ | --------------- | -------------- |\n| Help link | Learn more | User opens docs | Show generic fallback |",
      });
      await withPackDir({ "03_Story-Workshop.md": content }, async (packRoot) => {
        const issues = await validateInteractionPriorityHandoff(packRoot);
        expect(issues.length).toBe(1);
        expect(issues[0]?.code).toBe("UIX-VAL-DDH-INTERACTION-HANDOFF");
        expect(issues[0]?.severity).toBe("error");
      });
    });
  },
);

// ---------------------------------------------------------------------------
// UIX discussion hardening: State coverage — TDD-0019..0020
// ---------------------------------------------------------------------------

describe("validateStateCoverage (UIX-VAL-DDH-STATE-COVERAGE)", { timeout: 10000 }, () => {
  // TDD-0019: TC-0002-0019
  it("pass — state risk notes and contract handoff are defined", async () => {
    await withPackDir({ "03_Story-Workshop.md": makeStoryWorkshopContent() }, async (packRoot) => {
      const issues = await validateStateCoverage(packRoot);
      expect(issues).toEqual([]);
    });
  });

  // TDD-0020: TC-0002-0020
  it("fail — contract handoff is missing from state coverage", async () => {
    const content = makeStoryWorkshopContent({
      stateCoverage: [
        "| State / Risk | Discovery Notes | Handoff to Contract |",
        "| ------------ | --------------- | ------------------- |",
        "| loading | Skeleton animation can delay action discovery | review later |",
        "| error | Retry state needs attention | review later |",
      ].join("\n"),
    });
    await withPackDir({ "03_Story-Workshop.md": content }, async (packRoot) => {
      const issues = await validateStateCoverage(packRoot);
      expect(issues.length).toBe(1);
      expect(issues[0]?.code).toBe("UIX-VAL-DDH-STATE-COVERAGE");
      expect(issues[0]?.severity).toBe("error");
      expect(issues[0]?.message).toContain("handoff");
    });
  });
});

// ---------------------------------------------------------------------------
// UIX discussion hardening: Design anti-goals — TDD-0021..0022
// ---------------------------------------------------------------------------

describe("validateDesignAntiGoals (UIX-VAL-DDH-DESIGN-ANTI-GOALS)", { timeout: 10000 }, () => {
  // TDD-0021: TC-0002-0021
  it("pass — 1 anti-goal defined in Behavior Obligations", async () => {
    await withPackDir({ "03_Story-Workshop.md": makeStoryWorkshopContent() }, async (packRoot) => {
      const issues = await validateDesignAntiGoals(packRoot);
      expect(issues).toEqual([]);
    });
  });

  // TDD-0022: TC-0002-0022
  it("fail — no anti-goals", async () => {
    const content = makeStoryWorkshopContent({ designAntiGoals: "" });
    await withPackDir({ "03_Story-Workshop.md": content }, async (packRoot) => {
      const issues = await validateDesignAntiGoals(packRoot);
      expect(issues.length).toBe(1);
      expect(issues[0]?.code).toBe("UIX-VAL-DDH-DESIGN-ANTI-GOALS");
      expect(issues[0]?.severity).toBe("error");
    });
  });
});

// ---------------------------------------------------------------------------
// Cross-cutting: Severity + Message Format — TDD-0023..0024
// ---------------------------------------------------------------------------

describe("Cross-cutting validators", { timeout: 10000 }, () => {
  // TDD-0023: TC-0002-0023
  it("all validators emit severity=error", async () => {
    // Trigger failures: no selected anchor, no anti-goals, missing state handoff
    const story = makeStoryWorkshopContent({
      designAntiGoals: "",
      stateCoverage:
        "| State / Risk | Discovery Notes | Handoff to Contract |\n| ------------ | --------------- | ------------------- |\n| loading | no items | |",
    });
    await withPackDir(
      {
        // No 31_selected_anchor_screen.md — triggers selected direction error
        "03_Story-Workshop.md": story,
      },
      async (packRoot) => {
        const allIssues = [
          ...(await validateSelectedDirection(packRoot)),
          ...(await validateDesignAntiGoals(packRoot)),
          ...(await validateStateCoverage(packRoot)),
        ];
        expect(allIssues.length).toBeGreaterThan(0);
        for (const iss of allIssues) {
          expect(iss.severity).toBe("error");
        }
      },
    );
  });

  // TDD-0024: TC-0002-0024
  it("error messages contain 3-part format (field, reason, fix)", async () => {
    const sources = makeCompetitiveRefsContent([
      {
        adopted_points: "Clean card layout",
        local_translation: "Adapted for JP",
        // rejected_points missing
      },
    ]);
    await withPackDir({ "04_Sources.md": sources }, async (packRoot) => {
      const issues = await validateCompetitiveRefs(packRoot);
      expect(issues.length).toBeGreaterThan(0);
      const msg = issues[0]?.message;
      // 3-part: field name, reason, fix — separated by ". " or ":"
      expect(msg).toContain("rejected_points");
      expect(msg).toContain("missing");
      // Should contain remediation guidance
      expect(msg.length).toBeGreaterThan(30);
    });
  });

  it("all discussion hardening validators emit canonical-category issues", async () => {
    const comparison = makeOptionComparisonContent({
      optionComparison: "- **Option A**: Card layout",
    });
    const story = makeStoryWorkshopContent({
      interactionContracts: "",
      stateCoverage: "",
      designAntiGoals: "",
    });
    const sources = makeCompetitiveRefsContent([{ adopted_points: "TBD" }]);

    await withPackDir(
      {
        ...sidecarFiles({ "uiux/30_option_comparison.md": comparison }),
        "03_Story-Workshop.md": story,
        "04_Sources.md": sources,
      },
      async (packRoot) => {
        const allIssues = [
          ...(await validateOptionComparison(packRoot)),
          ...(await validateSelectedDirection(packRoot)),
          ...(await validateCompetitiveRefs(packRoot)),
          ...(await validateInteractionPriorityHandoff(packRoot)),
          ...(await validateStateCoverage(packRoot)),
          ...(await validateDesignAntiGoals(packRoot)),
        ];
        expect(allIssues.length).toBeGreaterThan(0);
        expect(allIssues.every((iss) => iss.category === "canonical")).toBe(true);
      },
    );
  });
});

// ---------------------------------------------------------------------------
// Post-merge fix tests: edge cases for heading-only, empty, placeholder
// ---------------------------------------------------------------------------

describe("Post-merge edge cases", { timeout: 10000 }, () => {
  // Fix #1: no sidecar files at all → 4 canonical sidecar-primary-truth errors
  it("no sidecar files → 4 canonical sidecar-primary-truth errors", async () => {
    await withPackDir(
      { "03_Story-Workshop.md": "<style>.screen { background: #fff; }</style>\nContent." },
      async (packRoot) => {
        const issues = await validateSidecarPrimaryTruth(packRoot);
        expect(issues.length).toBe(4);
        expect(issues.every((i) => i.code === "UIX-VAL-DDH-SIDECAR-PRIMARY-TRUTH")).toBe(true);
      },
    );
  });

  // Fix #2: empty Option Comparison in 30_option_comparison.md → canonical option-comparison error
  it("empty Option Comparison in 30_option_comparison.md → canonical option-comparison error", async () => {
    const comparison = makeOptionComparisonContent({ optionComparison: "" });
    await withPackDir(sidecarFiles({ "uiux/30_option_comparison.md": comparison }), async (packRoot) => {
      const issues = await validateOptionComparison(packRoot);
      expect(issues.length).toBe(1);
      expect(issues[0]?.code).toBe("UIX-VAL-DDH-OPTION-COMPARISON");
    });
  });

  // Fix #2: empty Interaction Contracts in Behavior Obligations → canonical interaction-handoff error
  it("empty Interaction Contracts in Behavior Obligations → canonical interaction-handoff error", async () => {
    const content = makeStoryWorkshopContent({ interactionContracts: "" });
    await withPackDir({ "03_Story-Workshop.md": content }, async (packRoot) => {
      const issues = await validateInteractionPriorityHandoff(packRoot);
      expect(issues.length).toBe(1);
      expect(issues[0]?.code).toBe("UIX-VAL-DDH-INTERACTION-HANDOFF");
    });
  });

  // Fix #2: empty State Coverage in Behavior Obligations → canonical state-coverage error
  it("empty State Coverage in Behavior Obligations → canonical state-coverage error", async () => {
    const content = makeStoryWorkshopContent({ stateCoverage: "" });
    await withPackDir({ "03_Story-Workshop.md": content }, async (packRoot) => {
      const issues = await validateStateCoverage(packRoot);
      expect(issues.length).toBe(1);
      expect(issues[0]?.code).toBe("UIX-VAL-DDH-STATE-COVERAGE");
      expect(issues[0]?.message).toContain("state-risk");
    });
  });

  // Fix #3: missing selected_option in 31_selected_anchor_screen.md → canonical selected-direction error
  it("missing selected_option in anchor → canonical selected-direction error", async () => {
    const anchor = "# 31 Selected Anchor Screen\n\n- why_selected: Good option";
    await withPackDir(sidecarFiles({ "uiux/31_selected_anchor_screen.md": anchor }), async (packRoot) => {
      const issues = await validateSelectedDirection(packRoot);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.code).toBe("UIX-VAL-DDH-SELECTED-DIRECTION");
    });
  });

  // Missing why_selected in 31_selected_anchor_screen.md
  it("missing why_selected in anchor → canonical selected-direction error", async () => {
    const anchor = "# 31 Selected Anchor Screen\n\n- selected_option: Option A";
    await withPackDir(sidecarFiles({ "uiux/31_selected_anchor_screen.md": anchor }), async (packRoot) => {
      const issues = await validateSelectedDirection(packRoot);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.code).toBe("UIX-VAL-DDH-SELECTED-DIRECTION");
    });
  });

  // Fix #3: placeholder Interaction Contracts → canonical interaction-handoff validation
  it("placeholder N/A in Interaction Contracts → canonical interaction-handoff error", async () => {
    const content = makeStoryWorkshopContent({ interactionContracts: "N/A" });
    await withPackDir({ "03_Story-Workshop.md": content }, async (packRoot) => {
      const issues = await validateInteractionPriorityHandoff(packRoot);
      expect(issues.length).toBe(1);
      expect(issues[0]?.code).toBe("UIX-VAL-DDH-INTERACTION-HANDOFF");
    });
  });

  // Template-shaped placeholder: "Primary Task: TBD"
  it("template-shaped placeholder in Interaction Contracts → canonical interaction-handoff error", async () => {
    const content = makeStoryWorkshopContent({
      interactionContracts:
        "Primary Task: TBD\nKey Action: Learn More\nPriority Hint: primary\nScreen-level contract details are finalized in `uiux/40_screen_contracts.md`. Primary tasks, required states, transitions, and observable outcomes are finalized there; Story Workshop is for discovery and handoff, not final contract fixation.",
    });
    await withPackDir({ "03_Story-Workshop.md": content }, async (packRoot) => {
      const issues = await validateInteractionPriorityHandoff(packRoot);
      expect(issues.length).toBe(1);
      expect(issues[0]?.code).toBe("UIX-VAL-DDH-INTERACTION-HANDOFF");
    });
  });

  // Fix #3: placeholder anti-goals → canonical anti-goal validation
  it("placeholder anti-goals → canonical anti-goal error", async () => {
    const content = makeStoryWorkshopContent({ designAntiGoals: "- TBD" });
    await withPackDir({ "03_Story-Workshop.md": content }, async (packRoot) => {
      const issues = await validateDesignAntiGoals(packRoot);
      expect(issues.length).toBe(1);
      expect(issues[0]?.code).toBe("UIX-VAL-DDH-DESIGN-ANTI-GOALS");
    });
  });

  // Template-shaped placeholder: "- Anti-goal: TBD"
  it("template-shaped placeholder in anti-goals → canonical anti-goal error", async () => {
    const content = makeStoryWorkshopContent({ designAntiGoals: "- Anti-goal: TBD" });
    await withPackDir({ "03_Story-Workshop.md": content }, async (packRoot) => {
      const issues = await validateDesignAntiGoals(packRoot);
      expect(issues.length).toBe(1);
      expect(issues[0]?.code).toBe("UIX-VAL-DDH-DESIGN-ANTI-GOALS");
    });
  });

  // Fix #4: Reference heading with zero fields → 3 canonical competitive-references errors
  it("Reference heading with zero fields → 3 canonical competitive-references errors", async () => {
    const sources = [
      "# 04 Sources",
      "",
      "## Competitive Reference Registry",
      "",
      "### Reference: Notion",
      "",
    ].join("\n");
    await withPackDir({ "04_Sources.md": sources }, async (packRoot) => {
      const issues = await validateCompetitiveRefs(packRoot);
      expect(issues.length).toBe(3);
      expect(issues.every((i) => i.code === "UIX-VAL-DDH-COMPETITIVE-REFERENCES")).toBe(true);
      const fields = issues.map((i) => i.message);
      expect(fields.some((m) => m.includes("adopted_points"))).toBe(true);
      expect(fields.some((m) => m.includes("rejected_points"))).toBe(true);
      expect(fields.some((m) => m.includes("local_translation"))).toBe(true);
    });
  });
});
