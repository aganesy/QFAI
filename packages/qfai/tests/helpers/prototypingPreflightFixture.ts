/**
 * A workspace on which `qfai prototyping preflight` passes every check, so a
 * test can change one input and attribute the command's exit code to it.
 *
 * The preflight runs its whole profile. In a workspace missing the primary
 * spec, the design lock, the browser launcher or a reachable target, those
 * checks already fail it, and a change to the one check under test would move
 * nothing a test could observe.
 */
import { createHash } from "node:crypto";
import { createServer, type Server } from "node:http";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { runInit } from "../../src/cli/commands/init.js";

/** The UI contract the fixture declares: one screen with one primary task. */
export const PASSING_UI_CONTRACT = [
  "screens:",
  "  - id: home",
  "    title: Home",
  "    route: /",
  "    primary_tasks:",
  "      - Browse the surface",
  "",
].join("\n");

const DESIGN_MD = [
  "---",
  "brand:",
  '  name: "Acme Ledger"',
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
  "# Brand Philosophy",
  "",
  "Calm confidence.",
  "",
].join("\n");

/** Initializes `root` and seeds every input the prototyping preflight reads. */
export async function seedPrototypingPreflightFixture(
  root: string,
  targetUrl: string,
  uiContract = PASSING_UI_CONTRACT,
): Promise<void> {
  await runInit({ dir: root, force: false, dryRun: false, yes: true });
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    [
      "paths:",
      "  specsDir: .qfai/specs",
      "  contractsDir: .qfai/contracts",
      "  discussionDir: .qfai/discussion",
      "  outDir: .qfai/report",
      "  skillsDir: .qfai/assistant/skills",
      "  srcDir: src",
      "  testsDir: tests",
      "prototyping:",
      '  primarySpecId: "0001"',
      "  execution:",
      `    targetUrl: ${targetUrl}`,
      "    browserTool: playwright",
      "",
    ].join("\n"),
    "utf-8",
  );
  const specDir = path.join(root, ".qfai", "specs", "spec-0001");
  const uiDir = path.join(root, ".qfai", "contracts", "ui");
  const designDir = path.join(root, ".qfai", "contracts", "design");
  const binDir = path.join(root, "node_modules", ".bin");
  for (const dir of [specDir, uiDir, designDir, binDir]) await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(specDir, "01_Spec.md"),
    "---\nsurface_type: ui-bearing\n---\n\n# spec-0001\n",
    "utf-8",
  );
  await writeFile(path.join(specDir, "02_User-stories.md"), "# stories\n", "utf-8");
  await writeFile(path.join(uiDir, "ui-0001.yaml"), uiContract, "utf-8");
  await writeFile(path.join(root, "DESIGN.md"), DESIGN_MD, "utf-8");
  await writeFile(
    path.join(designDir, "DESIGN.md.lock.yaml"),
    [
      'designMdPath: "DESIGN.md"',
      `designMdSha256: "${createHash("sha256").update(DESIGN_MD, "utf8").digest("hex")}"`,
      'frozenAt: "2026-05-05T00:00:00Z"',
      "",
    ].join("\n"),
    "utf-8",
  );
  await writePlaywrightLauncher(binDir);
}

/** A `playwright` launcher that answers the version probe and nothing else. */
async function writePlaywrightLauncher(binDir: string): Promise<void> {
  if (process.platform === "win32") {
    await writeFile(
      path.join(binDir, "playwright.cmd"),
      "@echo off\r\necho Version 1.50.0\r\n",
      "utf-8",
    );
    return;
  }
  const launcher = path.join(binDir, "playwright");
  await writeFile(launcher, "#!/bin/sh\necho Version 1.50.0\n", "utf-8");
  await chmod(launcher, 0o755);
}

/** A local target the preflight can reach. */
export async function startTargetServer(): Promise<{ server: Server; url: string }> {
  const server = createServer((_, response) => {
    response.statusCode = 200;
    response.end("ok");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("the target server has no port");
  }
  return { server, url: `http://127.0.0.1:${address.port}` };
}

export async function stopTargetServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
