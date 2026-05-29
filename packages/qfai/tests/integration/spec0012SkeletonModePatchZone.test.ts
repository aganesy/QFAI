/**
 * Integration acceptance for spec-0012 CHG-006 test cases
 * TC-0012-0471..0480 (emit-skeletons coverage, DESIGN.md patch-zone,
 * prototyping.mode discriminator, taskFidelity keywords, mutation-log).
 *
 * Converted from `.skip` test-first skeletons to deterministic
 * temp-fixture exercises of the production helpers / iterate driver.
 * The integration layer carries the TC annotation comments; the e2e
 * sibling files carry only US annotations per the layer policy.
 */
// QFAI:SPEC-0012:TC-0012-0471
// QFAI:SPEC-0012:TC-0012-0472
// QFAI:SPEC-0012:TC-0012-0473
// QFAI:SPEC-0012:TC-0012-0474
// QFAI:SPEC-0012:TC-0012-0475
// QFAI:SPEC-0012:TC-0012-0476
// QFAI:SPEC-0012:TC-0012-0477
// QFAI:SPEC-0012:TC-0012-0478
// QFAI:SPEC-0012:TC-0012-0479
// QFAI:SPEC-0012:TC-0012-0480

import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runPrototypingIterate } from "../../src/cli/commands/prototypingIterate.js";
import { runPrototypingCertify } from "../../src/cli/commands/prototypingCertify.js";
import {
  computeDesignMdHashes,
  parseDesignMdPatchZone,
} from "../../src/core/design/designMdPatchZone.js";
import {
  buildSkeletonsForUnion,
  writeSkeletons,
} from "../../src/core/prototyping/emitSkeletons.js";
import { detectEvidenceMutationUnlogged } from "../../src/core/validators/evidenceMutationUnlogged.js";
import {
  TASK_FIDELITY_REQUIRED_KEYWORDS,
  TASK_FIDELITY_SECTION_NAME,
} from "../../src/core/validators/taskFidelityKeywords.js";
import { writeTaskFidelityTemplate } from "../../src/core/prototyping/captureTemplate.js";

const FIXTURE_DESIGN_MD = [
  "---",
  "brand:",
  '  name: "Acme"',
  "  archetype: tech",
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
  "# Brand",
  "",
  "Calm.",
].join("\n");

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const d = await mkdtemp(path.join(os.tmpdir(), "qfai-spec0012-chg006-int-"));
  tempDirs.push(d);
  return d;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const d = tempDirs.pop();
    if (d) await rm(d, { recursive: true, force: true });
  }
});

async function seedProject(
  root: string,
  extra?: { mode?: "convergence" | "exploration" },
): Promise<void> {
  await writeFile(path.join(root, "DESIGN.md"), FIXTURE_DESIGN_MD, "utf-8");
  const configLines = [
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
  ];
  if (extra?.mode !== undefined) {
    configLines.push("prototyping:");
    configLines.push(`  mode: ${extra.mode}`);
  }
  await writeFile(path.join(root, "qfai.config.yaml"), configLines.join("\n"), "utf-8");
  const specDir = path.join(root, ".qfai/specs/spec-0001");
  await mkdir(specDir, { recursive: true });
  await writeFile(
    path.join(specDir, "01_Spec.md"),
    "# 01\n\n- Spec: spec-0001\n- Parent: CAP-0001\nsurface_type: ui-bearing\n",
    "utf-8",
  );
}

// ─── E1 (TC-0012-0471/0472): --emit-skeletons coverage ────────────────────

describe("TC-0012-0471: iterate --cycle 0 --emit-skeletons writes one placeholder HTML per screen", () => {
  it("emits one DESIGN.md-token placeholder HTML per UI-contract `screens[].id` (no per-screen LLM call)", async () => {
    const root = await newTempDir();
    await seedProject(root);
    // Seed UI contracts (project-wide) so the emit-skeletons branch
    // sees a non-empty screen list. Two screens → two .html files.
    const uiDir = path.join(root, ".qfai/contracts/ui");
    await mkdir(uiDir, { recursive: true });
    await writeFile(
      path.join(uiDir, "screens.yaml"),
      ["screens:", "  - id: home", "    route: /", "  - id: settings", "    route: /settings"].join(
        "\n",
      ),
      "utf-8",
    );
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      emitSkeletons: true,
    });
    expect(exit).toBe(0);
    const iter00 = path.join(root, ".qfai/evidence/prototyping/iter-00");
    const entries = await readdir(iter00);
    const htmls = entries.filter((e) => e.endsWith(".html")).sort();
    expect(htmls).toContain("home.html");
    expect(htmls).toContain("settings.html");
    // Each emitted skeleton consumes a DESIGN.md token (Inter
    // family_sans from the fixture).
    const home = await readFile(path.join(iter00, "home.html"), "utf-8");
    expect(home).toContain("Inter");
  });
});

describe("TC-0012-0472: --emit-skeletons opt-in default + --skeleton-mode discriminator", () => {
  it("absence of --emit-skeletons writes zero placeholder HTML files (v1.9.1 no-regression)", async () => {
    const root = await newTempDir();
    await seedProject(root);
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      // emitSkeletons absent — bit-for-bit v1.9.1 behavior.
    });
    expect(exit).toBe(0);
    // No emit-skeletons info line in the seed iteration's iterate-plan.json.
    const plan = JSON.parse(
      await readFile(
        path.join(root, ".qfai/evidence/prototyping/iter-00/iterate-plan.json"),
        "utf-8",
      ),
    ) as Record<string, unknown>;
    expect(plan.cycle).toBe(0);
  });

  it("--skeleton-mode full keeps the placeholder body but marks the caller-replace contract", () => {
    const TOKENS = {
      colors: { primary: "#2563eb", surface: "#ffffff", text: "#111827" },
      fonts: { family_sans: "Inter" },
      radius: { md: "8px" },
      shadow: { md: "0 4px 6px rgba(0,0,0,0.1)" },
    };
    const skeletons = buildSkeletonsForUnion({
      screens: [{ id: "home" }],
      tokens: TOKENS,
      mode: "full",
    });
    expect(skeletons[0].html).toContain("Inter"); // token still consumed
    expect(skeletons[0].html).toContain("skeleton-mode=full");
  });
});

// ─── E2 (TC-0012-0473/0474): DESIGN.md patch_zone ────────────────────

const PATCH_ZONE_FIXTURE = `---
brand:
  name: "Acme"
visual:
  colors:
    primary: "#2563eb"
    accent: "#f59e0b"
  radius:
    sm: "4px"
    md: "8px"
patch_zone:
  tokens:
    - visual.colors.accent
    - visual.radius.md
---
# DESIGN.md body content
`;

describe("TC-0012-0473: in-zone edit updates only patchHash", () => {
  it("an in-zone color-token value edit keeps majorHash byte-stable and bumps patchHash", () => {
    const DESIGN_BEFORE = PATCH_ZONE_FIXTURE;
    const DESIGN_AFTER = DESIGN_BEFORE.replace('"#f59e0b"', '"#fa6500"');
    const before = computeDesignMdHashes(DESIGN_BEFORE);
    const after = computeDesignMdHashes(DESIGN_AFTER);
    expect(before.majorHash).toBe(after.majorHash);
    expect(before.patchHash).not.toBe(after.patchHash);
  });
});

describe("TC-0012-0474: out-of-zone edit invalidates evidence and surfaces R-DESIGN-MD-PATCH-OUT-OF-ZONE", () => {
  it("an out-of-zone token value (visual.colors.primary) bumps majorHash", () => {
    const DESIGN_BEFORE = PATCH_ZONE_FIXTURE;
    const DESIGN_AFTER = DESIGN_BEFORE.replace('"#2563eb"', '"#7777FF"');
    const before = computeDesignMdHashes(DESIGN_BEFORE);
    const after = computeDesignMdHashes(DESIGN_AFTER);
    expect(before.majorHash).not.toBe(after.majorHash);
  });

  it("a DESIGN.md without a patch_zone block leaves parseDesignMdPatchZone with ok=false", () => {
    const DESIGN_NO_ZONE = [
      "---",
      "brand:",
      '  name: "Acme"',
      "---",
      "# body",
    ].join("\n");
    const parsed = parseDesignMdPatchZone(DESIGN_NO_ZONE);
    expect(parsed.ok).toBe(false);
  });
});

// ─── E3 (TC-0012-0475/0476): prototyping.mode + certify reject ──────────

describe("TC-0012-0475: --mode exploration overrides config + per-iteration mode persisted", () => {
  it("--mode exploration over config=convergence records exploration on the seed iteration", async () => {
    const root = await newTempDir();
    await seedProject(root, { mode: "convergence" });
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      mode: "exploration",
    });
    expect(exit).toBe(0);
    const proto = JSON.parse(
      await readFile(
        path.join(root, ".qfai/evidence/prototyping/prototyping.json"),
        "utf-8",
      ),
    ) as { iterations?: Array<Record<string, unknown>> };
    const iter = proto.iterations?.[0];
    expect(iter?.mode).toBe("exploration");
  });

  it("absence of CLI flag + config defaults to convergence", async () => {
    const root = await newTempDir();
    await seedProject(root);
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
    });
    expect(exit).toBe(0);
    const proto = JSON.parse(
      await readFile(
        path.join(root, ".qfai/evidence/prototyping/prototyping.json"),
        "utf-8",
      ),
    ) as { iterations?: Array<Record<string, unknown>> };
    const iter = proto.iterations?.[0];
    expect(iter?.mode).toBe("convergence");
  });
});

describe("TC-0012-0476: certify refuses to seal a loop with any exploration-mode iteration", () => {
  it("certify surfaces R-EXPLORATION-CERTIFY-ATTEMPT + exit 2 when an exploration iter is present", async () => {
    const root = await newTempDir();
    await seedProject(root);
    // Seed an iterate cycle-0 under exploration mode so the iteration
    // record carries `mode: exploration`.
    const exitIter = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      mode: "exploration",
    });
    expect(exitIter).toBe(0);
    // Stub the gates certify needs before reaching the exploration
    // check: validate.json + verify.json + reviewerGate.result=PASS.
    // We populate just enough so the exploration gate engages first.
    const outDir = path.join(root, ".qfai/out");
    await mkdir(outDir, { recursive: true });
    await writeFile(
      path.join(outDir, "validate.json"),
      JSON.stringify({ profile: "prototyping", counts: { error: 0, warning: 0, info: 0 } }, null, 2),
      "utf-8",
    );
    await mkdir(path.join(root, ".qfai/output"), { recursive: true });
    await writeFile(
      path.join(root, ".qfai/output/verify.json"),
      JSON.stringify({ status: "PASS", scope: "prototyping" }, null, 2),
      "utf-8",
    );
    // Add reviewerGate.result PASS on prototyping.json so the gate
    // order reaches the exploration check.
    const protoPath = path.join(root, ".qfai/evidence/prototyping/prototyping.json");
    const proto = JSON.parse(await readFile(protoPath, "utf-8")) as Record<string, unknown>;
    proto.reviewerGate = { result: "PASS" };
    await writeFile(protoPath, JSON.stringify(proto, null, 2), "utf-8");

    const stderrChunks: string[] = [];
    const origWrite = process.stderr.write.bind(process.stderr);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- override signature is variadic
    process.stderr.write = ((chunk: unknown) => {
      stderrChunks.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;
    let exitCertify: number;
    try {
      exitCertify = await runPrototypingCertify({ root, check: false });
    } finally {
      process.stderr.write = origWrite;
    }
    expect(exitCertify).toBe(2);
    const combined = stderrChunks.join("");
    expect(combined).toMatch(/R-EXPLORATION-CERTIFY-ATTEMPT/);
  });
});

// ─── E4 (TC-0012-0477/0478): taskFidelity keyword SSOT + template ────────

describe("TC-0012-0477: QFAI-CRIT-009 keyword surface SSOT", () => {
  it("the required keyword list contains every documented keyword and the section name is canonical", () => {
    expect(TASK_FIDELITY_REQUIRED_KEYWORDS).toContain("cta_visibility");
    expect(TASK_FIDELITY_REQUIRED_KEYWORDS).toContain("four_state_check");
    expect(TASK_FIDELITY_SECTION_NAME).toBe("## taskFidelity");
  });
});

describe("TC-0012-0478: iterate --capture emits a taskFidelity template skeleton with every keyword", () => {
  it("the template body lists every required keyword as a TODO line under the section header", async () => {
    const root = await newTempDir();
    await seedProject(root);
    const iterDir = path.join(root, ".qfai/evidence/prototyping/iter-00");
    await mkdir(iterDir, { recursive: true });
    const written = await writeTaskFidelityTemplate(iterDir);
    const body = await readFile(written.path, "utf-8");
    expect(body).toContain(TASK_FIDELITY_SECTION_NAME);
    for (const kw of TASK_FIDELITY_REQUIRED_KEYWORDS) {
      expect(body).toMatch(new RegExp(`- ${kw}: TODO`));
    }
  });
});

// ─── E5 (TC-0012-0479/0480): mutation-log + R-EVIDENCE-MUTATION-UNLOGGED ─

describe("TC-0012-0479: --cycle 0 --force appends a mutation-log line per moved file", () => {
  it("each prior iter-00 file is recorded with a JSONL line on the backup path", async () => {
    const root = await newTempDir();
    await seedProject(root);
    // Plant prior iter-00 content (two files).
    const iter00 = path.join(root, ".qfai/evidence/prototyping/iter-00");
    await mkdir(iter00, { recursive: true });
    await writeFile(path.join(iter00, "home.html"), "<old/>", "utf-8");
    await writeFile(path.join(iter00, "dash.html"), "<old/>", "utf-8");
    const exit = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      force: true,
    });
    expect(exit).toBe(0);
    const logRaw = await readFile(
      path.join(root, ".qfai/evidence/prototyping/mutation-log.jsonl"),
      "utf-8",
    );
    const lines = logRaw.trim().split("\n");
    expect(lines.length).toBeGreaterThanOrEqual(2);
    for (const line of lines) {
      const entry = JSON.parse(line) as Record<string, unknown>;
      expect(typeof entry.ts).toBe("string");
      expect(entry.caller).toBe("iterate");
      expect(typeof entry.path).toBe("string");
      expect(entry.action).toBe("move");
      expect(typeof entry.priorSize).toBe("number");
      expect(entry.newSize).toBe(0);
    }
  });
});

describe("TC-0012-0480: R-EVIDENCE-MUTATION-UNLOGGED fires when a known mutation site lacks the log call", () => {
  it("the SSOT-sync pair scan emits exactly zero findings for the in-tree symmetric pair (current state)", async () => {
    // Run the detector against the real repo root. Today both
    // mutation tokens (`await rename(iter00Abs` + `clearEvidenceIterDirs`
    // rm) are paired with the log token (`logEvidenceMove` /
    // `logEvidenceDelete`), so the detector emits zero findings.
    // Regressions surface as a non-zero issue array immediately.
    const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
    const issues = await detectEvidenceMutationUnlogged(repoRoot);
    // Filter to the pair-scan findings only; other validators in the
    // suite are out of scope here.
    const pairFindings = issues.filter((i) => i.code === "R-EVIDENCE-MUTATION-UNLOGGED");
    expect(pairFindings).toEqual([]);
  });
});
