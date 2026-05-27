/**
 * lap-009 md5-duplicate-capture advisory-failing finding
 * (spec-0012 Phase 4 / REQ-0012-0070 / TC-0012-0453).
 *
 * Two distinct screens whose captured PNG bytes share the same md5
 * digest surface a lap-009 finding listing both offenders + the shared
 * md5. Determinism: re-running the same iter produces the identical
 * finding. Reviewer override requires a non-empty `justification:`.
 */

// QFAI:SPEC-0012:TC-0012-0453

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  findMd5DuplicateCaptures,
  isAdvisoryOverrideAccepted,
} from "../../../../src/core/prototyping/layoutAntiPatternsAdvisory.js";
import { runPrototypingIterate } from "../../../../src/cli/commands/prototypingIterate.js";

const DESIGN_MD = [
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
  "# Brand",
  "Calm.",
].join("\n");

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-lap009-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function seedProject(root: string): Promise<void> {
  await writeFile(path.join(root, "DESIGN.md"), DESIGN_MD, "utf-8");
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
    ].join("\n"),
    "utf-8",
  );
  const specDir = path.join(root, ".qfai/specs/spec-0001");
  await mkdir(specDir, { recursive: true });
  await writeFile(
    path.join(specDir, "01_Spec.md"),
    "# 01\n\n- Spec: spec-0001\n- Parent: CAP-0001\nsurface_type: ui-bearing\n",
    "utf-8",
  );
}

describe("lap-009 md5-duplicate-capture advisory-failing", () => {
  it("emits a lap-009 finding when two screens share the same md5 (deterministic)", () => {
    // The same bytes for both screens → identical md5 → lap-009 fires
    const shared = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const map = new Map<string, Buffer>([
      ["home", shared],
      ["dashboard", shared],
    ]);
    const findings = findMd5DuplicateCaptures(map);
    expect(findings.length).toBe(1);
    expect(findings[0]?.code).toBe("lap-009");
    expect(findings[0]?.category).toBe("duplicate-capture");
    expect(findings[0]?.offenders.sort()).toEqual(["dashboard", "home"]);
    // Determinism: re-running produces identical findings.
    const again = findMd5DuplicateCaptures(map);
    expect(again).toEqual(findings);
  });

  it("emits zero findings when every md5 is unique", () => {
    const map = new Map<string, Buffer>([
      ["home", Buffer.from([0x01])],
      ["dashboard", Buffer.from([0x02])],
    ]);
    const findings = findMd5DuplicateCaptures(map);
    expect(findings).toEqual([]);
  });

  it("override without Reviewer justification is rejected", () => {
    expect(isAdvisoryOverrideAccepted(undefined)).toBe(false);
    expect(isAdvisoryOverrideAccepted({ findingCode: "lap-009", justification: "" })).toBe(false);
    expect(isAdvisoryOverrideAccepted({ findingCode: "lap-009", justification: "   " })).toBe(
      false,
    );
    expect(
      isAdvisoryOverrideAccepted({
        findingCode: "lap-009",
        justification: "Both screens intentionally duplicate the dashboard layout.",
      }),
    ).toBe(true);
  });

  it("surfaces lap-009 warning via runCapturePath when two screens share md5", async () => {
    const root = await newTempDir();
    await seedProject(root);
    // `warn()` routes to stdout in the shared logger (cli/lib/logger.ts),
    // so capture stdout to observe the advisory finding.
    const stdoutChunks: string[] = [];
    const origWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string | Uint8Array) => {
      stdoutChunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf-8"));
      return true;
    }) as typeof process.stdout.write;
    try {
      const shared = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
      const exit = await runPrototypingIterate({
        root,
        cycle: 0,
        targetUrl: "http://localhost:5173",
        capture: true,
        screens: [
          { id: "home", url: "/" },
          { id: "dashboard", url: "/dashboard" },
        ],
        captureScreen: async ({ pngPath, htmlPath }) => {
          await writeFile(pngPath, shared);
          await writeFile(htmlPath, "<html></html>");
          return { ok: true, durationMs: 5 };
        },
      });
      expect(exit).toBe(0);
      const joined = stdoutChunks.join("");
      expect(joined).toMatch(/lap-009/);
      expect(joined).toMatch(/duplicate-capture/);
    } finally {
      process.stdout.write = origWrite;
    }
  });
});
