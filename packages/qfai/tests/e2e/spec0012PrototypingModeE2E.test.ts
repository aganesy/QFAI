/**
 * E2E acceptance for spec-0012 CHG-006 user story US-0012-0140
 * (`prototyping.mode` discriminator: `convergence` | `exploration`
 * via config + `--mode` override; certify rejects sealing an
 * exploration-mode iteration with `R-EXPLORATION-CERTIFY-ATTEMPT`).
 *
 * Converted from `.skip` test-first skeleton to deterministic
 * temp-fixture exercises of the production iterate + certify
 * drivers. The mode-resolution invariants (cli > config > default)
 * are asserted alongside the per-iteration mode record and certify
 * refusal.
 */
// QFAI:SPEC-0012:US-0012-0140

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runPrototypingIterate } from "../../src/cli/commands/prototypingIterate.js";
import { runPrototypingCertify } from "../../src/cli/commands/prototypingCertify.js";

const MODE_DESIGN_MD = [
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
  const d = await mkdtemp(path.join(os.tmpdir(), "qfai-e2e-spec0012-mode-"));
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
  configMode?: "convergence" | "exploration",
): Promise<void> {
  await writeFile(path.join(root, "DESIGN.md"), MODE_DESIGN_MD, "utf-8");
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
  if (configMode !== undefined) {
    configLines.push("prototyping:");
    configLines.push(`  mode: ${configMode}`);
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

describe("US-0012-0140 — --mode exploration overrides config; per-iteration mode recorded", () => {
  it("--mode exploration over config=convergence stamps exploration on the seed iteration", async () => {
    const root = await newTempDir();
    await seedProject(root, "convergence");
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
    expect(proto.iterations?.[0]?.mode).toBe("exploration");
  });
});

describe("US-0012-0140 — boundary: absent flag + absent config defaults to convergence", () => {
  it("the seed iteration mode falls back to convergence when neither override is set", async () => {
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
    expect(proto.iterations?.[0]?.mode).toBe("convergence");
  });
});

describe("US-0012-0140 — error: certify refuses to seal a loop with any exploration iteration", () => {
  it("R-EXPLORATION-CERTIFY-ATTEMPT surfaces + exit 2 when iterations[i].mode = exploration is present", async () => {
    const root = await newTempDir();
    await seedProject(root);
    const exitIter = await runPrototypingIterate({
      root,
      cycle: 0,
      targetUrl: "http://localhost:5173",
      mode: "exploration",
    });
    expect(exitIter).toBe(0);
    const stderrChunks: string[] = [];
    const origWrite = process.stderr.write.bind(process.stderr);
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
    expect(stderrChunks.join("")).toMatch(/R-EXPLORATION-CERTIFY-ATTEMPT/);
  });
});
