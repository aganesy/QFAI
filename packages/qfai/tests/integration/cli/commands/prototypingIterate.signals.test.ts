/**
 * `iterate --capture` leaves counted signals beside each capture.
 *
 * The reviewer answers the eight criteria in a later step than this command,
 * and two of them are about restraint. Counting controls and words by eye is
 * what produces a made-up number, so the tool counts at capture time and
 * writes the result where the reviewer reads it.
 *
 * Capture is driven through an injectable `captureScreen` callback, so this
 * covers the plumbing — contract denominator in, sidecar out — and not
 * Playwright.
 */
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runPrototypingIterate } from "../../../../src/cli/commands/prototypingIterate.js";

const tempDirs: string[] = [];

async function newTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "qfai-signals-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

const DESIGN_MD = [
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
    "# 01 Spec — t\n\n- Spec: spec-0001\n- Parent: CAP-0001\nsurface_type: ui-bearing\n",
    "utf-8",
  );
  const uiDir = path.join(root, ".qfai/contracts/ui");
  await mkdir(uiDir, { recursive: true });
  await writeFile(
    path.join(uiDir, "spec-0001.yaml"),
    [
      "screens:",
      "  - id: home",
      "    route: /",
      "    title: Home",
      "    primary_tasks:",
      "      - Record an order",
      "      - Review yesterday's orders",
    ].join("\n"),
    "utf-8",
  );
}

/** One control, one label, and a sentence that explains the control. */
const HOME_HTML = [
  "<!doctype html><html><body>",
  "<h1>Orders</h1>",
  "<p>Use this page to record a new order.</p>",
  "<label>Customer</label><input name=customer>",
  "<button>Save</button>",
  "</body></html>",
].join("");

async function runCapture(root: string, html: string): Promise<number> {
  return runPrototypingIterate({
    root,
    cycle: 0,
    targetUrl: "http://localhost:5173",
    capture: true,
    screens: [{ id: "home", url: "/" }],
    captureScreen: async ({ pngPath, htmlPath }) => {
      await writeFile(pngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
      await writeFile(htmlPath, html);
      return { ok: true, durationMs: 5 };
    },
  });
}

async function readSignals(root: string): Promise<Record<string, unknown>> {
  const raw = await readFile(
    path.join(root, ".qfai/evidence/prototyping/iter-00/home.signals.json"),
    "utf-8",
  );
  return JSON.parse(raw) as Record<string, unknown>;
}

describe("iterate --capture writes counted signals", () => {
  it("counts the capture and divides by the tasks the contract declared", async () => {
    const root = await newTempDir();
    await seedProject(root);

    expect(await runCapture(root, HOME_HTML)).toBe(0);

    const signals = await readSignals(root);
    expect(signals).toMatchObject({
      screen: "home",
      interactiveControls: 2,
      primaryTasks: 2,
      controlsPerTask: 1,
      // "Orders" names the region, "Customer" names the field and "Save"
      // names the button; only the introduction explains.
      explanatoryWords: 8,
      explanatoryWordsPerControl: 4,
    });
  });

  it("reports an absent denominator rather than inventing one", async () => {
    // No contract, so no declared task. A zero here would read as "no
    // controls", which is the opposite of what the capture shows.
    const root = await newTempDir();
    await seedProject(root);
    await rm(path.join(root, ".qfai/contracts/ui/spec-0001.yaml"));

    expect(await runCapture(root, HOME_HTML)).toBe(0);

    const signals = await readSignals(root);
    expect(signals.primaryTasks).toBe(0);
    expect(signals.controlsPerTask).toBeNull();
  });

  it("does not fail the cycle when a capture cannot be parsed", async () => {
    // The counts are evidence, not a gate. A screen the counter cannot read
    // leaves the cycle to the capture pass, which reports its own failures.
    const root = await newTempDir();
    await seedProject(root);

    expect(await runCapture(root, "")).toBe(0);

    const signals = await readSignals(root);
    expect(signals).toMatchObject({ interactiveControls: 0, words: 0 });
  });

  it("writes one sidecar per screen and nothing for a screen it was not asked about", async () => {
    const root = await newTempDir();
    await seedProject(root);

    expect(await runCapture(root, HOME_HTML)).toBe(0);

    const entries = await readdir(path.join(root, ".qfai/evidence/prototyping/iter-00"));
    expect(entries.filter((e) => e.endsWith(".signals.json"))).toEqual(["home.signals.json"]);
  });
});
