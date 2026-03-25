// QFAI:SPEC-0023:US-0023-0001
// QFAI:SPEC-0023:US-0023-0002
// QFAI:SPEC-0023:US-0023-0003
// QFAI:SPEC-0023:US-0023-0004
// QFAI:SPEC-0023:US-0023-0005
// QFAI:SPEC-0023:TC-0023-0001
// QFAI:SPEC-0023:TC-0023-0002
// QFAI:SPEC-0023:TC-0023-0003
// QFAI:SPEC-0023:TC-0023-0004
// QFAI:SPEC-0023:TC-0023-0005
// QFAI:SPEC-0023:TC-0023-0006
// QFAI:SPEC-0023:TC-0023-0007
// QFAI:SPEC-0023:TC-0023-0008
// QFAI:SPEC-0023:TC-0023-0009
// QFAI:SPEC-0023:TC-0023-0010
// QFAI:SPEC-0023:TC-0023-0011
// QFAI:SPEC-0023:TC-0023-0012
// QFAI:SPEC-0023:TC-0023-0013
// QFAI:SPEC-0023:TC-0023-0014
// QFAI:SPEC-0023:TC-0023-0015
// QFAI:SPEC-0023:TC-0023-0016
// QFAI:SPEC-0023:TC-0023-0017
// QFAI:SPEC-0023:TC-0023-0018
// QFAI:SPEC-0023:TC-0023-0019
// QFAI:SPEC-0023:TC-0023-0020
// QFAI:SPEC-0023:TC-0023-0021
// QFAI:SPEC-0023:TC-0023-0022
// QFAI:SPEC-0023:TC-0023-0023
// QFAI:SPEC-0023:TC-0023-0024
// QFAI:SPEC-0023:TC-0023-0032

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  isUiBearing,
  validateDdsPresence,
  validateOptionComparison,
  validateAnchorScreen,
  validateCompetitiveRefs,
  validateCtaHierarchy,
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
      await writeFile(path.join(packRoot, name), content, "utf-8");
    }
    await task(packRoot);
  } finally {
    await rm(packRoot, { recursive: true, force: true });
  }
}

function makeDdsContent(
  opts: {
    optionComparison?: string;
    anchorScreen?: string;
    ctaHierarchy?: string;
    stateCoverage?: string;
    designAntiGoals?: string;
    competitiveReferences?: string;
  } = {},
): string {
  return [
    "# 03 Story Workshop",
    "",
    "<style>.screen { background: #fff; }</style>",
    "",
    "## Design Direction Summary",
    "",
    "### Option Comparison",
    opts.optionComparison ??
      [
        "- **Option A**: Card-based layout with prominent hero section",
        "- **Option B**: List-based layout with sidebar navigation",
      ].join("\n"),
    "",
    "### Anchor Screen Selection",
    opts.anchorScreen ??
      "Selected: Option A — Provides stronger visual hierarchy for primary content",
    "",
    "### Competitive References",
    opts.competitiveReferences ?? "See 04_Sources.md for full competitive reference registry",
    "",
    "### CTA Hierarchy",
    opts.ctaHierarchy ??
      [
        '- Primary: "Get Started" button, hero section center',
        '- Secondary: "Learn More" link, below fold',
      ].join("\n"),
    "",
    "### State Coverage",
    opts.stateCoverage ??
      [
        '- empty: Illustration with "No items yet" message and Create CTA',
        "- loading: Skeleton cards with pulse animation",
        "- error: Error banner with retry action",
        "- populated: Card grid with pagination",
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

// ---------------------------------------------------------------------------
// isUiBearing — TDD-0001..0004
// ---------------------------------------------------------------------------

describe("isUiBearing", { timeout: 10000 }, () => {
  // TDD-0001: TC-0023-0001
  it("detects HTML style tag as UI-bearing", async () => {
    await withPackDir(
      { "03_Story-Workshop.md": "<style>.screen { background: #fff; }</style>\nSome content." },
      async (packRoot) => {
        expect(await isUiBearing(packRoot)).toBe(true);
      },
    );
  });

  // TDD-0002: TC-0023-0002
  it("detects HTML div element as UI-bearing", async () => {
    await withPackDir(
      { "03_Story-Workshop.md": '<div class="screen"><h1>Dashboard</h1></div>' },
      async (packRoot) => {
        expect(await isUiBearing(packRoot)).toBe(true);
      },
    );
  });

  // TDD-0003: TC-0023-0003
  it("classifies plain text pack as non-UI", async () => {
    await withPackDir(
      { "03_Story-Workshop.md": "# Story\n\nAs a developer, I want API contracts.\n" },
      async (packRoot) => {
        expect(await isUiBearing(packRoot)).toBe(false);
      },
    );
  });

  // TDD-0004: TC-0023-0004
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
// QFAI-DDP-019: DDS Presence — TDD-0005..0007
// ---------------------------------------------------------------------------

describe("validateDdsPresence (QFAI-DDP-019)", { timeout: 10000 }, () => {
  // TDD-0005: TC-0023-0005
  it("pass — all 6 DDS subsections present", async () => {
    await withPackDir({ "03_Story-Workshop.md": makeDdsContent() }, async (packRoot) => {
      const issues = await validateDdsPresence(packRoot);
      expect(issues).toEqual([]);
    });
  });

  // TDD-0006: TC-0023-0006
  it("fail — missing State Coverage subsection", async () => {
    const content = makeDdsContent().replace(/### State Coverage[\s\S]*?(?=###|$)/, "");
    await withPackDir({ "03_Story-Workshop.md": content }, async (packRoot) => {
      const issues = await validateDdsPresence(packRoot);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]?.code).toBe("QFAI-DDP-019");
      expect(issues[0]?.severity).toBe("error");
      expect(issues[0]?.message).toContain("State Coverage");
    });
  });

  // TDD-0007: TC-0023-0007
  it("fail — DDS in wrong file (02_Scope.md)", async () => {
    await withPackDir(
      {
        "03_Story-Workshop.md": "<style>.x{}</style>\n# Story\nPlain content.",
        "02_Scope.md": makeDdsContent().replace(
          "<style>.screen { background: #fff; }</style>\n\n",
          "",
        ),
      },
      async (packRoot) => {
        const issues = await validateDdsPresence(packRoot);
        expect(issues.length).toBeGreaterThan(0);
        expect(issues.some((i) => i.code === "QFAI-DDP-019")).toBe(true);
      },
    );
  });
});

// ---------------------------------------------------------------------------
// QFAI-DDP-020: Option Comparison — TDD-0008..0009
// ---------------------------------------------------------------------------

describe("validateOptionComparison (QFAI-DDP-020)", { timeout: 10000 }, () => {
  // TDD-0008: TC-0023-0008
  it("pass — 2 options present", async () => {
    await withPackDir({ "03_Story-Workshop.md": makeDdsContent() }, async (packRoot) => {
      const issues = await validateOptionComparison(packRoot);
      expect(issues).toEqual([]);
    });
  });

  // TDD-0009: TC-0023-0009
  it("fail — only 1 option", async () => {
    const content = makeDdsContent({
      optionComparison: "- **Option A**: Single card layout",
    });
    await withPackDir({ "03_Story-Workshop.md": content }, async (packRoot) => {
      const issues = await validateOptionComparison(packRoot);
      expect(issues.length).toBe(1);
      expect(issues[0]?.code).toBe("QFAI-DDP-020");
      expect(issues[0]?.severity).toBe("error");
      expect(issues[0]?.message).toContain("1");
      expect(issues[0]?.message).toContain("2");
    });
  });
});

// ---------------------------------------------------------------------------
// QFAI-DDP-021: Anchor Screen — TDD-0010..0011
// ---------------------------------------------------------------------------

describe("validateAnchorScreen (QFAI-DDP-021)", { timeout: 10000 }, () => {
  // TDD-0010: TC-0023-0010
  it("pass — anchor references compared option", async () => {
    await withPackDir({ "03_Story-Workshop.md": makeDdsContent() }, async (packRoot) => {
      const issues = await validateAnchorScreen(packRoot);
      expect(issues).toEqual([]);
    });
  });

  // TDD-0011: TC-0023-0011
  it("fail — no anchor selection", async () => {
    const content = makeDdsContent({ anchorScreen: "" });
    await withPackDir({ "03_Story-Workshop.md": content }, async (packRoot) => {
      const issues = await validateAnchorScreen(packRoot);
      expect(issues.length).toBe(1);
      expect(issues[0]?.code).toBe("QFAI-DDP-021");
      expect(issues[0]?.severity).toBe("error");
    });
  });
});

// ---------------------------------------------------------------------------
// QFAI-DDP-022: Competitive Refs — TDD-0012..0016
// ---------------------------------------------------------------------------

describe("validateCompetitiveRefs (QFAI-DDP-022)", { timeout: 10000 }, () => {
  // TDD-0012: TC-0023-0012
  it("pass — all 3 fields populated with substantive content", async () => {
    const sources = makeCompetitiveRefsContent([
      {
        adopted_points: "Clean card layout with clear hierarchy",
        rejected_points: "Overly complex navigation structure",
        local_translation: "Adapted card sizes for Japanese text density",
      },
    ]);
    await withPackDir(
      { "03_Story-Workshop.md": makeDdsContent(), "04_Sources.md": sources },
      async (packRoot) => {
        const issues = await validateCompetitiveRefs(packRoot);
        expect(issues).toEqual([]);
      },
    );
  });

  // TDD-0013: TC-0023-0013
  it("fail — rejected_points field missing", async () => {
    const sources = makeCompetitiveRefsContent([
      {
        adopted_points: "Clean card layout",
        local_translation: "Adapted for JP",
      },
    ]);
    await withPackDir(
      { "03_Story-Workshop.md": makeDdsContent(), "04_Sources.md": sources },
      async (packRoot) => {
        const issues = await validateCompetitiveRefs(packRoot);
        expect(issues.length).toBeGreaterThan(0);
        expect(issues[0]?.code).toBe("QFAI-DDP-022");
        expect(issues[0]?.severity).toBe("error");
        expect(issues[0]?.message).toContain("rejected_points");
      },
    );
  });

  // TDD-0014: TC-0023-0014
  it("fail — placeholder TBD in local_translation", async () => {
    const sources = makeCompetitiveRefsContent([
      {
        adopted_points: "Clean card layout",
        rejected_points: "Complex nav",
        local_translation: "TBD",
      },
    ]);
    await withPackDir(
      { "03_Story-Workshop.md": makeDdsContent(), "04_Sources.md": sources },
      async (packRoot) => {
        const issues = await validateCompetitiveRefs(packRoot);
        expect(issues.length).toBeGreaterThan(0);
        expect(
          issues.some((i) => i.code === "QFAI-DDP-022" && i.message.includes("placeholder")),
        ).toBe(true);
      },
    );
  });

  // TDD-0015: TC-0023-0015
  it("fail — empty string in adopted_points", async () => {
    const sources = makeCompetitiveRefsContent([
      {
        adopted_points: "",
        rejected_points: "Complex nav",
        local_translation: "Adapted for JP",
      },
    ]);
    await withPackDir(
      { "03_Story-Workshop.md": makeDdsContent(), "04_Sources.md": sources },
      async (packRoot) => {
        const issues = await validateCompetitiveRefs(packRoot);
        expect(issues.length).toBeGreaterThan(0);
        expect(issues.some((i) => i.code === "QFAI-DDP-022")).toBe(true);
      },
    );
  });

  // TDD-0016: TC-0023-0016
  it("fail — placeholder N/A in rejected_points", async () => {
    const sources = makeCompetitiveRefsContent([
      {
        adopted_points: "Clean card layout",
        rejected_points: "N/A",
        local_translation: "Adapted for JP",
      },
    ]);
    await withPackDir(
      { "03_Story-Workshop.md": makeDdsContent(), "04_Sources.md": sources },
      async (packRoot) => {
        const issues = await validateCompetitiveRefs(packRoot);
        expect(issues.length).toBeGreaterThan(0);
        expect(
          issues.some((i) => i.code === "QFAI-DDP-022" && i.message.includes("placeholder")),
        ).toBe(true);
      },
    );
  });
});

// ---------------------------------------------------------------------------
// QFAI-DDP-023: CTA Hierarchy — TDD-0017..0018
// ---------------------------------------------------------------------------

describe("validateCtaHierarchy (QFAI-DDP-023)", { timeout: 10000 }, () => {
  // TDD-0017: TC-0023-0017
  it("pass — primary CTA defined", async () => {
    await withPackDir({ "03_Story-Workshop.md": makeDdsContent() }, async (packRoot) => {
      const issues = await validateCtaHierarchy(packRoot);
      expect(issues).toEqual([]);
    });
  });

  // TDD-0018: TC-0023-0018
  it("fail — no primary CTA", async () => {
    const content = makeDdsContent({
      ctaHierarchy: '- Secondary: "Learn More" link',
    });
    await withPackDir({ "03_Story-Workshop.md": content }, async (packRoot) => {
      const issues = await validateCtaHierarchy(packRoot);
      expect(issues.length).toBe(1);
      expect(issues[0]?.code).toBe("QFAI-DDP-023");
      expect(issues[0]?.severity).toBe("error");
    });
  });
});

// ---------------------------------------------------------------------------
// QFAI-DDP-024: State Coverage — TDD-0019..0020
// ---------------------------------------------------------------------------

describe("validateStateCoverage (QFAI-DDP-024)", { timeout: 10000 }, () => {
  // TDD-0019: TC-0023-0019
  it("pass — all 4 states defined", async () => {
    await withPackDir({ "03_Story-Workshop.md": makeDdsContent() }, async (packRoot) => {
      const issues = await validateStateCoverage(packRoot);
      expect(issues).toEqual([]);
    });
  });

  // TDD-0020: TC-0023-0020
  it("fail — error state missing", async () => {
    const content = makeDdsContent({
      stateCoverage: [
        "- empty: No items message",
        "- loading: Skeleton animation",
        "- populated: Card grid",
      ].join("\n"),
    });
    await withPackDir({ "03_Story-Workshop.md": content }, async (packRoot) => {
      const issues = await validateStateCoverage(packRoot);
      expect(issues.length).toBe(1);
      expect(issues[0]?.code).toBe("QFAI-DDP-024");
      expect(issues[0]?.severity).toBe("error");
      expect(issues[0]?.message).toContain("error");
    });
  });
});

// ---------------------------------------------------------------------------
// QFAI-DDP-025: Design Anti-goals — TDD-0021..0022
// ---------------------------------------------------------------------------

describe("validateDesignAntiGoals (QFAI-DDP-025)", { timeout: 10000 }, () => {
  // TDD-0021: TC-0023-0021
  it("pass — 1 anti-goal defined", async () => {
    await withPackDir({ "03_Story-Workshop.md": makeDdsContent() }, async (packRoot) => {
      const issues = await validateDesignAntiGoals(packRoot);
      expect(issues).toEqual([]);
    });
  });

  // TDD-0022: TC-0023-0022
  it("fail — no anti-goals", async () => {
    const content = makeDdsContent({ designAntiGoals: "" });
    await withPackDir({ "03_Story-Workshop.md": content }, async (packRoot) => {
      const issues = await validateDesignAntiGoals(packRoot);
      expect(issues.length).toBe(1);
      expect(issues[0]?.code).toBe("QFAI-DDP-025");
      expect(issues[0]?.severity).toBe("error");
    });
  });
});

// ---------------------------------------------------------------------------
// Cross-cutting: Severity + Message Format — TDD-0023..0024
// ---------------------------------------------------------------------------

describe("Cross-cutting validators", { timeout: 10000 }, () => {
  // TDD-0023: TC-0023-0023
  it("all validators emit severity=error", async () => {
    // Trigger failures from multiple validators
    const content = makeDdsContent({
      anchorScreen: "",
      designAntiGoals: "",
      stateCoverage: "- empty: no items",
    });
    await withPackDir({ "03_Story-Workshop.md": content }, async (packRoot) => {
      const allIssues = [
        ...(await validateAnchorScreen(packRoot)),
        ...(await validateDesignAntiGoals(packRoot)),
        ...(await validateStateCoverage(packRoot)),
      ];
      expect(allIssues.length).toBeGreaterThan(0);
      for (const iss of allIssues) {
        expect(iss.severity).toBe("error");
      }
    });
  });

  // TDD-0024: TC-0023-0024
  it("error messages contain 3-part format (field, reason, fix)", async () => {
    const sources = makeCompetitiveRefsContent([
      {
        adopted_points: "Clean card layout",
        local_translation: "Adapted for JP",
        // rejected_points missing
      },
    ]);
    await withPackDir(
      { "03_Story-Workshop.md": makeDdsContent(), "04_Sources.md": sources },
      async (packRoot) => {
        const issues = await validateCompetitiveRefs(packRoot);
        expect(issues.length).toBeGreaterThan(0);
        const msg = issues[0]?.message;
        // 3-part: field name, reason, fix — separated by ". " or ":"
        expect(msg).toContain("rejected_points");
        expect(msg).toContain("missing");
        // Should contain remediation guidance
        expect(msg.length).toBeGreaterThan(30);
      },
    );
  });
});
