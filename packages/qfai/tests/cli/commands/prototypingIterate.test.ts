import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runPrototypingIterate } from "../../../src/cli/commands/prototypingIterate.js";
import { hashDesignMd } from "../../../src/core/design/designMd.js";

// Canonical Phase 1 DESIGN.md sample. Used by every test that wants the
// hash gate to pass; mutate selectively per-test for the negative cases.
const CANONICAL_DESIGN_MD = [
  "---",
  "brand:",
  '  name: "Acme Ledger"',
  "  archetype: tech",
  "audience:",
  '  emotion: ["confident comparison"]',
  "visual:",
  "  colors:",
  '    primary:        "#1F2937"',
  '    secondary:      "#6366F1"',
  '    accent:         "#D97706"',
  '    surface:        "#FFFFFF"',
  '    surface_muted:  "#F3F4F6"',
  '    text:           "#111827"',
  '    text_muted:     "#6B7280"',
  '    danger:         "#DC2626"',
  '    warning:        "#F59E0B"',
  '    success:        "#10B981"',
  '    border:         "#E5E7EB"',
  '    overlay:        "rgba(0,0,0,0.5)"',
  "  typography:",
  '    family_sans:    "Inter, system-ui, sans-serif"',
  '    family_display: "Inter, system-ui, sans-serif"',
  '    family_mono:    "JetBrains Mono, ui-monospace, monospace"',
  "  radius:",
  '    sm:   "0.25rem"',
  '    md:   "0.5rem"',
  '    lg:   "0.75rem"',
  '    full: "9999px"',
  "  shadow:",
  '    sm: "0 1px 2px rgba(15,23,42,0.05)"',
  '    md: "0 4px 6px rgba(15,23,42,0.08)"',
  '    lg: "0 12px 24px rgba(15,23,42,0.10)"',
  "---",
  "",
  "# Brand Philosophy",
  "",
  "Restrained, calm, sober.",
  "",
].join("\n");

async function seedDesignMd(root: string, content?: string): Promise<string> {
  const text = content ?? CANONICAL_DESIGN_MD;
  await writeFile(path.join(root, "DESIGN.md"), text, "utf-8");
  return text;
}

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-iterate-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

async function seedMinimalProject(
  root: string,
  options: { uiBearing?: boolean; skipDesignMd?: boolean } = {},
): Promise<void> {
  const uiBearing = options.uiBearing ?? true;
  if (!options.skipDesignMd) {
    await seedDesignMd(root);
  }
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    [
      "paths:",
      "  contractsDir: .qfai/contracts",
      "  specsDir: .qfai/specs",
      "  discussionDir: .qfai/discussion",
      "  outDir: .qfai/out",
      "  skillsDir: .qfai/assistant/skills",
      "  promptsDir: .qfai/assistant/skills",
      "  srcDir: src",
      "  testsDir: tests",
      "validation:",
      "  failOn: error",
      "  require:",
      "    specSections: []",
      "  testStrategy:",
      "    requireLayerTags: false",
      "    requireSizeTags: false",
      "    requireApiAtdd: false",
      "    requireE2eAtdd: false",
      "    requireIntegrationAtdd: false",
      "    requireUnitTdd: false",
      "    requireSpecTagBlock: false",
      "    requireRoutingProfile: false",
    ].join("\n"),
    "utf-8",
  );

  const specDir = path.join(root, ".qfai/specs/spec-0001");
  await mkdir(specDir, { recursive: true });
  const marker = uiBearing ? "surface_type: ui-bearing\n" : "";
  await writeFile(
    path.join(specDir, "01_Spec.md"),
    `# 01 Spec — test\n\n- Spec: spec-0001\n- Parent: CAP-0001\n${marker}`,
    "utf-8",
  );
}

async function seedPrototypingJson(
  root: string,
  iterations: Array<{
    index: number;
    scores: {
      informationArchitecture: string;
      navigationFlow: string;
      usability: string;
      functionality: string;
    };
    layoutAntiPatternsDetected?: string[];
    designMdViolations?: Array<{ kind: string; found: string }>;
  }>,
  options: { designMd?: { path: string; sha256: string } | null } = {},
): Promise<void> {
  const dir = path.join(root, ".qfai/evidence/prototyping");
  await mkdir(dir, { recursive: true });
  const body: Record<string, unknown> = {
    specsCovered: ["0001"],
    iterations: iterations.map((it) => ({
      index: it.index,
      commitSha: "a".repeat(40),
      scores: it.scores,
      proseCritique: "x".repeat(1500),
      layoutAntiPatternsDetected: it.layoutAntiPatternsDetected ?? [],
      designMdViolations: it.designMdViolations ?? [],
      pivotDirective: "continue",
      evidenceRefs: {
        screenshot: `.qfai/evidence/prototyping/iter-${String(it.index).padStart(2, "0")}/home.png`,
        html: `.qfai/evidence/prototyping/iter-${String(it.index).padStart(2, "0")}/home.html`,
      },
    })),
    acceptedIterationIndex: iterations.length - 1,
    stopReason: null,
  };
  // Default: record designMd whose sha matches CANONICAL_DESIGN_MD so
  // the hash gate is silent unless a test explicitly disables it.
  if (options.designMd === undefined) {
    body.designMd = { path: "DESIGN.md", sha256: hashDesignMd(CANONICAL_DESIGN_MD) };
  } else if (options.designMd !== null) {
    body.designMd = options.designMd;
  }
  await writeFile(path.join(dir, "prototyping.json"), JSON.stringify(body), "utf-8");
}

async function seedRawPrototypingJson(root: string, body: unknown): Promise<void> {
  const dir = path.join(root, ".qfai/evidence/prototyping");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "prototyping.json"), JSON.stringify(body), "utf-8");
}

// QFAI:SPEC-0012:TC-0012-0322
describe("runPrototypingIterate cycle 0", () => {
  it("returns 0 and creates iter-00/ with iterate-plan.json (target-url provided)", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);

    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
    });
    expect(exit).toBe(0);

    const planRaw = await readFile(
      path.join(root, ".qfai/evidence/prototyping/iter-00/iterate-plan.json"),
      "utf-8",
    );
    const plan = JSON.parse(planRaw) as {
      cycle: number;
      targetUrl: string | null;
      paths: { iterationDir: string; reviewJson: string };
      specs: string[];
      nextActions: string[];
    };
    expect(plan.cycle).toBe(0);
    expect(plan.targetUrl).toBe("http://localhost:5173");
    expect(plan.paths.iterationDir).toBe(".qfai/evidence/prototyping/iter-00");
    expect(plan.paths.reviewJson).toBe(".qfai/evidence/prototyping/iter-00/review.json");
    expect(plan.specs).toEqual(["0001"]);
    expect(plan.nextActions).toContain("iterate --cycle 1");
  });

  // QFAI:SPEC-0012:TC-0012-0323
  it("returns 2 when --target-url is missing at cycle 0", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    const exit = await runPrototypingIterate({ root, cycle: 0 });
    expect(exit).toBe(2);
  });
});

// QFAI:SPEC-0012:TC-0012-0324
describe("runPrototypingIterate convergence (exit 64)", () => {
  it("returns 64 when latest iter has all 4 axes exceptional and no anti-patterns", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedPrototypingJson(root, [
      {
        index: 0,
        scores: {
          informationArchitecture: "exceptional",
          navigationFlow: "exceptional",
          usability: "exceptional",
          functionality: "exceptional",
        },
        layoutAntiPatternsDetected: [],
        designMdViolations: [],
      },
    ]);

    const exit = await runPrototypingIterate({ root, cycle: 1 });
    expect(exit).toBe(64);
  });

  it("does NOT exit 64 when a layout anti-pattern is present even with all-exceptional scores", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    // Note: invariant-violating fixture intentionally bypasses
    // buildEvaluatorReview's runtime guard to mimic file tampering.
    await seedPrototypingJson(root, [
      {
        index: 0,
        scores: {
          informationArchitecture: "exceptional",
          navigationFlow: "exceptional",
          usability: "exceptional",
          functionality: "exceptional",
        },
        layoutAntiPatternsDetected: ["lap-001-saas-dashboard"],
        designMdViolations: [],
      },
    ]);

    const exit = await runPrototypingIterate({ root, cycle: 1 });
    expect(exit).toBe(0);
  });
});

// QFAI:SPEC-0012:TC-0012-0325
describe("runPrototypingIterate max-iterations (exit 65)", () => {
  it("returns 65 when latest iter index === 14", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    const iterations = Array.from({ length: 15 }, (_, i) => ({
      index: i,
      scores: {
        informationArchitecture: "acceptable",
        navigationFlow: "acceptable",
        usability: "acceptable",
        functionality: "acceptable",
      },
    }));
    await seedPrototypingJson(root, iterations);

    // We can't pass cycle 15 (out of range), but the stop check fires
    // at the start of any cycle >= 1 by reading the latest iter index.
    const exit = await runPrototypingIterate({ root, cycle: 14 });
    expect(exit).toBe(65);
  });
});

// QFAI:SPEC-0012:TC-0012-0322 (alias — input validation shares cycle-0 entry path)
describe("runPrototypingIterate input validation", () => {
  it("returns 2 when --cycle is negative", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    const exit = await runPrototypingIterate({ root, cycle: -1 });
    expect(exit).toBe(2);
  });

  it("returns 2 when --cycle is > 14", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    const exit = await runPrototypingIterate({ root, cycle: 15 });
    expect(exit).toBe(2);
  });

  it("returns 2 when --cycle is fractional", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    const exit = await runPrototypingIterate({ root, cycle: 1.5 });
    expect(exit).toBe(2);
  });

  it("returns 2 when no UI-bearing spec is found", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { uiBearing: false });
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
    });
    expect(exit).toBe(2);
  });
});

describe("runPrototypingIterate continue (exit 0)", () => {
  it("returns 0 at cycle 1 when prior iter is acceptable (no convergence, not at max)", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedPrototypingJson(root, [
      {
        index: 0,
        scores: {
          informationArchitecture: "acceptable",
          navigationFlow: "acceptable",
          usability: "acceptable",
          functionality: "acceptable",
        },
      },
    ]);

    const exit = await runPrototypingIterate({ root, cycle: 1 });
    expect(exit).toBe(0);

    const planRaw = await readFile(
      path.join(root, ".qfai/evidence/prototyping/iter-01/iterate-plan.json"),
      "utf-8",
    );
    const plan = JSON.parse(planRaw) as { cycle: number };
    expect(plan.cycle).toBe(1);
  });

  it("returns 0 instead of throwing when the latest prior iter is malformed", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedRawPrototypingJson(root, {
      specsCovered: ["0001"],
      iterations: [{ index: 0, commitSha: "b".repeat(40) }],
      acceptedIterationIndex: 0,
      stopReason: null,
      designMd: { path: "DESIGN.md", sha256: hashDesignMd(CANONICAL_DESIGN_MD) },
    });

    const exit = await runPrototypingIterate({ root, cycle: 1 });
    expect(exit).toBe(0);

    const planRaw = await readFile(
      path.join(root, ".qfai/evidence/prototyping/iter-01/iterate-plan.json"),
      "utf-8",
    );
    const plan = JSON.parse(planRaw) as { cycle: number };
    expect(plan.cycle).toBe(1);
  });

  it("does not emit an unreachable iterate --cycle 15 action at cycle 14", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    // Seed iterations[0..13] so the cycle-14 call is on the realistic
    // `iterations.length === cycle` invariant (each prior cycle's
    // capture/review is recorded in iterations[]).
    const seededIterations = Array.from({ length: 14 }, (_, i) => ({
      index: i,
      scores: {
        informationArchitecture: "acceptable",
        navigationFlow: "acceptable",
        usability: "acceptable",
        functionality: "acceptable",
      },
    }));
    await seedPrototypingJson(root, seededIterations);

    const exit = await runPrototypingIterate({ root, cycle: 14 });
    expect(exit).toBe(0);

    const planRaw = await readFile(
      path.join(root, ".qfai/evidence/prototyping/iter-14/iterate-plan.json"),
      "utf-8",
    );
    const plan = JSON.parse(planRaw) as { cycle: number; nextActions: string[] };
    expect(plan.cycle).toBe(14);
    expect(plan.nextActions).not.toContain("iterate --cycle 15");
    expect(plan.nextActions).toContain("handoff");
    expect(plan.nextActions).toContain("certify");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// TC-3.5.x — DESIGN.md hash gate + iterate-plan token embedding
// ─────────────────────────────────────────────────────────────────────────

describe("runPrototypingIterate cycle 0 DESIGN.md ingestion (TC-3.5.x)", () => {
  it("TC-3.5.1: persists designMd { path, sha256 } into prototyping.json", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
    });
    expect(exit).toBe(0);
    const protoBody = JSON.parse(
      await readFile(path.join(root, ".qfai/evidence/prototyping/prototyping.json"), "utf-8"),
    ) as { designMd: { path: string; sha256: string } };
    expect(protoBody.designMd.path).toBe("DESIGN.md");
    expect(protoBody.designMd.sha256).toBe(hashDesignMd(CANONICAL_DESIGN_MD));
    expect(protoBody.designMd.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("TC-3.5.2: missing DESIGN.md → exit 2 with message", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { skipDesignMd: true });
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
    });
    expect(exit).toBe(2);
  });

  it("TC-3.5.3: malformed DESIGN.md (no front matter) → exit 2", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { skipDesignMd: true });
    await writeFile(path.join(root, "DESIGN.md"), "no front matter at all\n", "utf-8");
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
    });
    expect(exit).toBe(2);
  });

  it("TC-3.5.4: invalid archetype rejected → exit 2", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { skipDesignMd: true });
    await seedDesignMd(root, CANONICAL_DESIGN_MD.replace("archetype: tech", "archetype: neon"));
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
    });
    expect(exit).toBe(2);
  });

  it("TC-3.5.5: empty body still parses → exit 0", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { skipDesignMd: true });
    const fmOnly = CANONICAL_DESIGN_MD.split("---")[1];
    if (fmOnly === undefined) throw new Error("split produced no FM");
    await seedDesignMd(root, `---${fmOnly}---\n`);
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
    });
    expect(exit).toBe(0);
  });

  it("TC-3.5.7: cycle 0 → cycle 1 reads recorded sha", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    expect(
      await runPrototypingIterate({ root, cycle: 0, targetUrl: "http://localhost:5173" }),
    ).toBe(0);
    // The orchestrator pushes iterations[0] between cycles in the
    // realistic flow; simulate that here so cycle-0 → cycle-1 is on
    // the realistic `iterations.length === cycle` invariant.
    await seedPrototypingJson(root, [
      {
        index: 0,
        scores: {
          informationArchitecture: "acceptable",
          navigationFlow: "acceptable",
          usability: "acceptable",
          functionality: "acceptable",
        },
      },
    ]);
    expect(await runPrototypingIterate({ root, cycle: 1 })).toBe(0);
  });

  it("TC-3.5.8: cycle 0 missing --target-url → exit 2", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    expect(await runPrototypingIterate({ root, cycle: 0 })).toBe(2);
  });
});

describe("runPrototypingIterate cycle N hash gate (TC-3.5.x)", () => {
  it("TC-3.5.9: matching sha → continue exit 0", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedPrototypingJson(root, [
      {
        index: 0,
        scores: {
          informationArchitecture: "acceptable",
          navigationFlow: "acceptable",
          usability: "acceptable",
          functionality: "acceptable",
        },
      },
    ]);
    expect(await runPrototypingIterate({ root, cycle: 1 })).toBe(0);
  });

  it("TC-3.5.10: mismatched sha → exit 2 with operator hint", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedPrototypingJson(
      root,
      [
        {
          index: 0,
          scores: {
            informationArchitecture: "acceptable",
            navigationFlow: "acceptable",
            usability: "acceptable",
            functionality: "acceptable",
          },
        },
      ],
      { designMd: { path: "DESIGN.md", sha256: "0".repeat(64) } },
    );
    expect(await runPrototypingIterate({ root, cycle: 1 })).toBe(2);
  });

  it("TC-3.5.11: missing designMd in prototyping.json → exit 2", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedPrototypingJson(
      root,
      [
        {
          index: 0,
          scores: {
            informationArchitecture: "acceptable",
            navigationFlow: "acceptable",
            usability: "acceptable",
            functionality: "acceptable",
          },
        },
      ],
      { designMd: null },
    );
    expect(await runPrototypingIterate({ root, cycle: 1 })).toBe(2);
  });

  it("TC-3.5.12: CRLF rewrite of DESIGN.md flips sha → exit 2", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedPrototypingJson(root, [
      {
        index: 0,
        scores: {
          informationArchitecture: "acceptable",
          navigationFlow: "acceptable",
          usability: "acceptable",
          functionality: "acceptable",
        },
      },
    ]);
    // Rewrite DESIGN.md with CRLF — same logical content, different bytes.
    await writeFile(
      path.join(root, "DESIGN.md"),
      CANONICAL_DESIGN_MD.replace(/\n/g, "\r\n"),
      "utf-8",
    );
    expect(await runPrototypingIterate({ root, cycle: 1 })).toBe(2);
  });

  it("TC-3.5.13: cycles 1..2 progressive (gate is per-cycle)", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    expect(
      await runPrototypingIterate({ root, cycle: 0, targetUrl: "http://localhost:5173" }),
    ).toBe(0);
    // The orchestrator pushes an iterations[N] entry between cycles
    // (capture + review step in the real flow). Simulate that here so
    // the cycle-N → cycle-N+1 transition is on the realistic
    // `iterations.length === N+1` invariant.
    await seedPrototypingJson(root, [
      {
        index: 0,
        scores: {
          informationArchitecture: "acceptable",
          navigationFlow: "acceptable",
          usability: "acceptable",
          functionality: "acceptable",
        },
      },
    ]);
    expect(await runPrototypingIterate({ root, cycle: 1 })).toBe(0);
    await seedPrototypingJson(root, [
      {
        index: 0,
        scores: {
          informationArchitecture: "acceptable",
          navigationFlow: "acceptable",
          usability: "acceptable",
          functionality: "acceptable",
        },
      },
      {
        index: 1,
        scores: {
          informationArchitecture: "strong",
          navigationFlow: "strong",
          usability: "strong",
          functionality: "strong",
        },
      },
    ]);
    expect(await runPrototypingIterate({ root, cycle: 2 })).toBe(0);
  });

  it("rejects corrupt iterations history (iterations[i].index !== i) with exit 2", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    // Plant a corrupt history: iterations.length === 3 but
    // iterations[2].index === 5 (gap). The validator's per-index
    // monotonicity check would reject the next iter later;
    // iterate now catches it at the command boundary.
    await seedRawPrototypingJson(root, {
      specsCovered: ["0001"],
      designMd: { path: "DESIGN.md", sha256: hashDesignMd(CANONICAL_DESIGN_MD) },
      iterations: [
        { index: 0 },
        { index: 1 },
        { index: 5 }, // gap
      ],
    });
    expect(await runPrototypingIterate({ root, cycle: 3 })).toBe(2);
  });

  it("rejects iterations entry that is null (corrupt non-object shape) with exit 2", async () => {
    // Pin the gap-check predicate's `it === null` branch. A corrupt
    // history with a `null` entry must surface at iterate (not slip
    // through to the validator one cycle later).
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedRawPrototypingJson(root, {
      specsCovered: ["0001"],
      designMd: { path: "DESIGN.md", sha256: hashDesignMd(CANONICAL_DESIGN_MD) },
      iterations: [{ index: 0 }, null],
    });
    expect(await runPrototypingIterate({ root, cycle: 2 })).toBe(2);
  });

  it("rejects iterations entry that is an array (corrupt non-record shape) with exit 2", async () => {
    // Pin the `Array.isArray(it)` branch — a YAML directive that
    // accidentally produces an array element here is rejected at
    // command boundary.
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedRawPrototypingJson(root, {
      specsCovered: ["0001"],
      designMd: { path: "DESIGN.md", sha256: hashDesignMd(CANONICAL_DESIGN_MD) },
      iterations: [{ index: 0 }, []],
    });
    expect(await runPrototypingIterate({ root, cycle: 2 })).toBe(2);
  });

  it("rejects iterations entry that is a scalar (corrupt non-object shape) with exit 2", async () => {
    // Pin the `typeof it !== "object"` branch — a stray string /
    // number entry in iterations[] is rejected at command boundary.
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedRawPrototypingJson(root, {
      specsCovered: ["0001"],
      designMd: { path: "DESIGN.md", sha256: hashDesignMd(CANONICAL_DESIGN_MD) },
      iterations: [{ index: 0 }, "broken"],
    });
    expect(await runPrototypingIterate({ root, cycle: 2 })).toBe(2);
  });

  it("rejects cycle >= 1 with missing prototyping.json#specsCovered (no frozen seed) with exit 2", async () => {
    // Codex 6c6n: a hand-edited or partially-corrupted prototyping.json
    // that never wrote `specsCovered` (or has it as `[]` or `[""]`)
    // must fail-fast at iterate. Previously the readFrozenSpecsCovered
    // null path was a silent skip, which would allow iterate to write
    // a fresh spec into iterate-plan.json that certify later blocks on.
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedRawPrototypingJson(root, {
      // No specsCovered field. designMd seed is well-formed so the
      // earlier hash gate passes; the new specsCovered fail-fast is
      // the only error path that should fire here.
      designMd: { path: "DESIGN.md", sha256: hashDesignMd(CANONICAL_DESIGN_MD) },
      iterations: [{ index: 0 }],
    });
    expect(await runPrototypingIterate({ root, cycle: 1 })).toBe(2);
  });

  it("rejects cycle >= 1 with empty prototyping.json#specsCovered with exit 2", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedRawPrototypingJson(root, {
      specsCovered: [],
      designMd: { path: "DESIGN.md", sha256: hashDesignMd(CANONICAL_DESIGN_MD) },
      iterations: [{ index: 0 }],
    });
    expect(await runPrototypingIterate({ root, cycle: 1 })).toBe(2);
  });

  it("rejects mid-loop primary-spec change (cycle 1 with frozen specsCovered != resolved spec) with exit 2", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    // Frozen seed claims spec-0099, but the resolved primary spec
    // (from disk markers) is spec-0001.
    await seedRawPrototypingJson(root, {
      specsCovered: ["0099"],
      designMd: { path: "DESIGN.md", sha256: hashDesignMd(CANONICAL_DESIGN_MD) },
      iterations: [{ index: 0 }],
    });
    expect(await runPrototypingIterate({ root, cycle: 1 })).toBe(2);
  });

  it("rejects out-of-sequence cycle requests (cycle 3 when iterations.length=1) with exit 2", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedPrototypingJson(root, [
      {
        index: 0,
        scores: {
          informationArchitecture: "acceptable",
          navigationFlow: "acceptable",
          usability: "acceptable",
          functionality: "acceptable",
        },
      },
    ]);
    // iterations.length === 1, expected next cycle === 1, but call cycle 3.
    // Validator later requires `iterations[i].index === i`, so creating
    // iter-03 here would make a gap that blocks validation/certification.
    expect(await runPrototypingIterate({ root, cycle: 3 })).toBe(2);
  });
});

describe("runPrototypingIterate cycle 0 hard reset", () => {
  // Reuse the top-level seedRawPrototypingJson helper.
  async function readProtoJson(root: string): Promise<Record<string, unknown>> {
    const raw = await readFile(
      path.join(root, ".qfai/evidence/prototyping/prototyping.json"),
      "utf-8",
    );
    return JSON.parse(raw) as Record<string, unknown>;
  }

  it("zeroes pre-existing iterations[] on cycle 0", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedRawPrototypingJson(root, {
      iterations: [
        { index: 0, scores: { informationArchitecture: "exceptional" } },
        { index: 1, scores: { informationArchitecture: "strong" } },
      ],
      runId: "stale-prior-run",
      designMd: { path: "DESIGN.md", sha256: hashDesignMd(CANONICAL_DESIGN_MD) },
    });

    expect(
      await runPrototypingIterate({ root, cycle: 0, targetUrl: "http://localhost:5173" }),
    ).toBe(0);

    const body = await readProtoJson(root);
    expect(body.iterations).toEqual([]);
  });

  it("deletes reviewerGate / acceptedIterationIndex / stopReason / fullHarness on cycle 0", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedRawPrototypingJson(root, {
      iterations: [{ index: 0 }],
      reviewerGate: { result: "PASS", signoff: { reviewerId: "stale" } },
      acceptedIterationIndex: 0,
      stopReason: "axes-exceptional",
      fullHarness: {
        runId: "legacy-prior-run",
        status: "complete",
        scoringTrace: [{ axis: "ux", score: 5 }],
      },
    });

    expect(
      await runPrototypingIterate({ root, cycle: 0, targetUrl: "http://localhost:5173" }),
    ).toBe(0);

    const body = await readProtoJson(root);
    expect("reviewerGate" in body).toBe(false);
    expect("acceptedIterationIndex" in body).toBe(false);
    expect("stopReason" in body).toBe(false);
    expect("fullHarness" in body).toBe(false);
  });

  it("regenerates runId even when a prior runId exists", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedRawPrototypingJson(root, {
      runId: "loop-stale-prior-1234567890",
      iterations: [],
    });

    expect(
      await runPrototypingIterate({ root, cycle: 0, targetUrl: "http://localhost:5173" }),
    ).toBe(0);

    const body = await readProtoJson(root);
    expect(typeof body.runId).toBe("string");
    expect(body.runId).not.toBe("loop-stale-prior-1234567890");
    expect(body.runId as string).toMatch(/^loop-[0-9a-f]{12}-[0-9a-z]+$/);
  });

  it("seeds prototyping.json#specsCovered from the resolved primary spec", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);

    expect(
      await runPrototypingIterate({ root, cycle: 0, targetUrl: "http://localhost:5173" }),
    ).toBe(0);

    const body = await readProtoJson(root);
    // seedMinimalProject creates spec-0001 with `surface_type: ui-bearing`,
    // so the resolved primary spec id is "0001".
    expect(body.specsCovered).toEqual(["0001"]);
  });

  it("preserves operator-defined keys (mode, surface) across cycle 0 reset", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    await seedRawPrototypingJson(root, {
      mode: { effective: "standard", source: "explicit-request", rationale: "pre-existing" },
      surface: "web",
      iterations: [{ index: 0 }],
    });

    expect(
      await runPrototypingIterate({ root, cycle: 0, targetUrl: "http://localhost:5173" }),
    ).toBe(0);

    const body = await readProtoJson(root);
    expect(body.mode).toEqual({
      effective: "standard",
      source: "explicit-request",
      rationale: "pre-existing",
    });
    expect(body.surface).toBe("web");
  });
});

describe("runPrototypingIterate cycle 0 stale-dir cleanup", () => {
  it("deletes stale iter-NN/ dirs on cycle 0 reset", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    // Plant stale iter dirs from a fictitious prior loop.
    const evidenceRoot = path.join(root, ".qfai/evidence/prototyping");
    await mkdir(path.join(evidenceRoot, "iter-07"), { recursive: true });
    await writeFile(path.join(evidenceRoot, "iter-07/index.html"), "<old/>", "utf-8");
    await mkdir(path.join(evidenceRoot, "iter-14"), { recursive: true });
    await writeFile(path.join(evidenceRoot, "iter-14/index.html"), "<old/>", "utf-8");

    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
    });
    expect(exit).toBe(0);

    const iter07Exists = await readFile(
      path.join(evidenceRoot, "iter-07/index.html"),
      "utf-8",
    ).then(
      () => true,
      () => false,
    );
    expect(iter07Exists).toBe(false);
    const iter14Exists = await readFile(
      path.join(evidenceRoot, "iter-14/index.html"),
      "utf-8",
    ).then(
      () => true,
      () => false,
    );
    expect(iter14Exists).toBe(false);
    // Fresh cycle 0 must produce its own iter-00.
    const newPlan = await readFile(path.join(evidenceRoot, "iter-00/iterate-plan.json"), "utf-8");
    expect(newPlan.length).toBeGreaterThan(0);
  });

  it("does NOT delete a non-directory entry that happens to match iter-NN regex", async () => {
    // The cleanup name says `deleteStaleIterDirs` — restrict it to
    // actual directories. A stray file named `iter-99` (operator
    // artifact without an extension) MUST survive the reset.
    const root = await newTempDir();
    await seedMinimalProject(root);
    const evidenceRoot = path.join(root, ".qfai/evidence/prototyping");
    await mkdir(evidenceRoot, { recursive: true });
    await writeFile(path.join(evidenceRoot, "iter-99"), "stray-file-not-a-dir", "utf-8");

    expect(
      await runPrototypingIterate({ root, cycle: 0, targetUrl: "http://localhost:5173" }),
    ).toBe(0);

    const stray = await readFile(path.join(evidenceRoot, "iter-99"), "utf-8");
    expect(stray).toBe("stray-file-not-a-dir");
  });

  it("deletes a stale completion-certificate.json on cycle 0 reset", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    const evidenceRoot = path.join(root, ".qfai/evidence/prototyping");
    await mkdir(evidenceRoot, { recursive: true });
    await writeFile(
      path.join(evidenceRoot, "completion-certificate.json"),
      JSON.stringify({ runId: "stale-prior-run", reviewerSignoff: { approved: true } }),
      "utf-8",
    );

    expect(
      await runPrototypingIterate({ root, cycle: 0, targetUrl: "http://localhost:5173" }),
    ).toBe(0);

    const stillThere = await readFile(
      path.join(evidenceRoot, "completion-certificate.json"),
      "utf-8",
    ).then(
      () => true,
      () => false,
    );
    expect(stillThere).toBe(false);
  });

  it("succeeds at cycle 0 when no completion-certificate.json exists (ENOENT is silent)", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    // No completion-certificate.json on disk; cycle 0 must not log
    // an error or return non-zero.
    expect(
      await runPrototypingIterate({ root, cycle: 0, targetUrl: "http://localhost:5173" }),
    ).toBe(0);
  });

  it("preserves non-iter sibling files in evidence dir", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    const evidenceRoot = path.join(root, ".qfai/evidence/prototyping");
    await mkdir(evidenceRoot, { recursive: true });
    // Sibling that is NOT an iter-NN dir — must survive the reset.
    await writeFile(path.join(evidenceRoot, "notes.md"), "keep me", "utf-8");

    expect(
      await runPrototypingIterate({ root, cycle: 0, targetUrl: "http://localhost:5173" }),
    ).toBe(0);

    const survived = await readFile(path.join(evidenceRoot, "notes.md"), "utf-8");
    expect(survived).toBe("keep me");
  });
});

describe("iterate-plan.json design tokens (TC-3.5.x)", () => {
  it("TC-3.5.14: contains designTokens with Tailwind config shape", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    expect(
      await runPrototypingIterate({ root, cycle: 0, targetUrl: "http://localhost:5173" }),
    ).toBe(0);
    const plan = JSON.parse(
      await readFile(
        path.join(root, ".qfai/evidence/prototyping/iter-00/iterate-plan.json"),
        "utf-8",
      ),
    ) as {
      designTokens: {
        colors: Record<string, string>;
        fontFamily: Record<string, string>;
        borderRadius: Record<string, string>;
        boxShadow: Record<string, string>;
      };
    };
    expect(Object.keys(plan.designTokens.colors).sort()).toEqual(
      [
        "accent",
        "border",
        "danger",
        "overlay",
        "primary",
        "secondary",
        "success",
        "surface",
        "surface_muted",
        "text",
        "text_muted",
        "warning",
      ].sort(),
    );
    expect(Object.keys(plan.designTokens.fontFamily).sort()).toEqual(
      ["display", "mono", "sans"].sort(),
    );
    expect(Object.keys(plan.designTokens.borderRadius).sort()).toEqual(
      ["full", "lg", "md", "sm"].sort(),
    );
    expect(Object.keys(plan.designTokens.boxShadow).sort()).toEqual(["lg", "md", "sm"].sort());
  });

  it("TC-3.5.15: unparseable DESIGN.md does NOT produce iter-00 dir", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root, { skipDesignMd: true });
    await writeFile(path.join(root, "DESIGN.md"), "no front matter\n", "utf-8");
    expect(
      await runPrototypingIterate({ root, cycle: 0, targetUrl: "http://localhost:5173" }),
    ).toBe(2);
    const planExists = await readFile(
      path.join(root, ".qfai/evidence/prototyping/iter-00/iterate-plan.json"),
      "utf-8",
    ).then(
      () => true,
      () => false,
    );
    expect(planExists).toBe(false);
  });

  it("TC-3.5.16: token shape exactness — counts 12+3+4+3", async () => {
    const root = await newTempDir();
    await seedMinimalProject(root);
    expect(
      await runPrototypingIterate({ root, cycle: 0, targetUrl: "http://localhost:5173" }),
    ).toBe(0);
    const plan = JSON.parse(
      await readFile(
        path.join(root, ".qfai/evidence/prototyping/iter-00/iterate-plan.json"),
        "utf-8",
      ),
    ) as {
      designTokens: {
        colors: Record<string, string>;
        fontFamily: Record<string, string>;
        borderRadius: Record<string, string>;
        boxShadow: Record<string, string>;
      };
    };
    expect(Object.keys(plan.designTokens.colors)).toHaveLength(12);
    expect(Object.keys(plan.designTokens.fontFamily)).toHaveLength(3);
    expect(Object.keys(plan.designTokens.borderRadius)).toHaveLength(4);
    expect(Object.keys(plan.designTokens.boxShadow)).toHaveLength(3);
  });
});
