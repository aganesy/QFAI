/**
 * `qfai prototyping iterate` writes `<contractsDir>/design/design-system.yaml`
 * on the cycle that ends the loop: the convergence stop (exit 64) and the
 * budget stop (exit 65). The file mirrors the root DESIGN.md token tables
 * byte-deterministically, and no earlier cycle writes it.
 */
// QFAI:AC-0001-0117-01

import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { runPrototypingIterate } from "../../../../src/cli/commands/prototypingIterate.js";
import { loadConfig } from "../../../../src/core/config.js";
import { hashDesignMd } from "../../../../src/core/design/designMd.js";
import { validatePrototypingDesignContractReadiness } from "../../../../src/core/validators/designContractReadiness.js";

const CONTRACTS_DIR = ".qfai/spec/03_contract";
const MIRROR_REL = `${CONTRACTS_DIR}/design/design-system.yaml`;
const PROTOTYPING_JSON_REL = ".qfai/evidence/prototyping/prototyping.json";
const MIRROR_CODES = new Set(["QFAI-DCON-005", "QFAI-DCON-009", "QFAI-DCON-032"]);

const COLOR_LINES = [
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
];
const RADIUS_SHADOW_LINES = [
  "  radius:",
  '    sm:   "0.25rem"',
  '    md:   "0.5rem"',
  '    lg:   "0.75rem"',
  '    full: "9999px"',
  "  shadow:",
  '    sm: "0 1px 2px rgba(15,23,42,0.05)"',
  '    md: "0 4px 6px rgba(15,23,42,0.08)"',
  '    lg: "0 12px 24px rgba(15,23,42,0.10)"',
];

// Every optional token section, authored out of canonical order, so the
// mirror's order is shown to come from the schema rather than the author.
const FULL_DESIGN_MD = [
  "---",
  "brand:",
  '  name: "Acme Ledger"',
  "  archetype: tech",
  '  theme: "Radix Themes: slate"',
  "visual:",
  "  shadow:",
  '    lg: "0 12px 24px rgba(15,23,42,0.10)"',
  '    sm: "0 1px 2px rgba(15,23,42,0.05)"',
  '    md: "0 4px 6px rgba(15,23,42,0.08)"',
  ...COLOR_LINES,
  "  typography:",
  '    family_mono:    "JetBrains Mono, ui-monospace, monospace"',
  '    family_sans:    "Inter, system-ui, sans-serif"',
  '    family_display: "Inter Tight, Inter, system-ui, sans-serif"',
  '    scale:  { "3xl": "1.875rem", xs: "0.75rem", sm: "0.875rem", base: "1rem", lg: "1.125rem", xl: "1.25rem", "2xl": "1.5rem" }',
  "    weight: { bold: 700, regular: 400, medium: 500 }",
  "  spacing:",
  "    scale: [0, 1, 2, 4, 8]",
  '    base: "0.25rem"',
  "  radius:",
  '    full: "9999px"',
  '    sm:   "0.25rem"',
  '    md:   "0.5rem"',
  '    lg:   "0.75rem"',
  "---",
  "",
  "# Brand",
  "",
  "Calm and exact.",
  "",
].join("\n");

const MINIMAL_DESIGN_MD = [
  "---",
  "brand:",
  '  name: "Acme Ledger"',
  "  archetype: tech",
  "visual:",
  ...COLOR_LINES,
  "  typography:",
  '    family_sans:    "Inter, system-ui, sans-serif"',
  '    family_display: "Inter, system-ui, sans-serif"',
  '    family_mono:    "JetBrains Mono, ui-monospace, monospace"',
  ...RADIUS_SHADOW_LINES,
  "---",
  "",
  "# Brand",
  "",
].join("\n");

const COLORS_YAML = [
  "  colors:",
  '    primary: "#1F2937"',
  '    secondary: "#6366F1"',
  '    accent: "#D97706"',
  '    surface: "#FFFFFF"',
  '    surface_muted: "#F3F4F6"',
  '    text: "#111827"',
  '    text_muted: "#6B7280"',
  '    danger: "#DC2626"',
  '    warning: "#F59E0B"',
  '    success: "#10B981"',
  '    border: "#E5E7EB"',
  '    overlay: "rgba(0,0,0,0.5)"',
];
const RADIUS_SHADOW_YAML = [
  "  radius:",
  '    sm: "0.25rem"',
  '    md: "0.5rem"',
  '    lg: "0.75rem"',
  '    full: "9999px"',
  "  shadow:",
  '    sm: "0 1px 2px rgba(15,23,42,0.05)"',
  '    md: "0 4px 6px rgba(15,23,42,0.08)"',
  '    lg: "0 12px 24px rgba(15,23,42,0.10)"',
];

function expectedFullMirror(sha: string): string {
  return [
    'source: "DESIGN.md"',
    `designMdSha256: "${sha}"`,
    "brand:",
    '  theme: "Radix Themes: slate"',
    "visual:",
    ...COLORS_YAML,
    "  typography:",
    '    family_sans: "Inter, system-ui, sans-serif"',
    '    family_display: "Inter Tight, Inter, system-ui, sans-serif"',
    '    family_mono: "JetBrains Mono, ui-monospace, monospace"',
    "    scale:",
    '      xs: "0.75rem"',
    '      sm: "0.875rem"',
    '      base: "1rem"',
    '      lg: "1.125rem"',
    '      xl: "1.25rem"',
    '      2xl: "1.5rem"',
    '      3xl: "1.875rem"',
    "    weight:",
    "      regular: 400",
    "      medium: 500",
    "      bold: 700",
    ...RADIUS_SHADOW_YAML,
    "  spacing:",
    '    base: "0.25rem"',
    "    scale:",
    "      - 0",
    "      - 1",
    "      - 2",
    "      - 4",
    "      - 8",
    "",
  ].join("\n");
}

function expectedMinimalMirror(sha: string): string {
  return [
    'source: "DESIGN.md"',
    `designMdSha256: "${sha}"`,
    "visual:",
    ...COLORS_YAML,
    "  typography:",
    '    family_sans: "Inter, system-ui, sans-serif"',
    '    family_display: "Inter, system-ui, sans-serif"',
    '    family_mono: "JetBrains Mono, ui-monospace, monospace"',
    ...RADIUS_SHADOW_YAML,
    "",
  ].join("\n");
}

const EXCEPTIONAL = {
  informationArchitecture: "exceptional",
  navigationFlow: "exceptional",
  usability: "exceptional",
  functionality: "exceptional",
} as const;

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function seedProject(designMd: string, options: { lock: boolean }): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-iterate-mirror-"));
  tempDirs.push(root);
  await writeFile(path.join(root, "DESIGN.md"), designMd, "utf-8");
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    [
      "paths:",
      `  contractsDir: ${CONTRACTS_DIR}`,
      "  specsDir: .qfai/spec",
      "  discussionDir: .qfai/discussion",
      "  outDir: .qfai/out",
      "  skillsDir: .qfai/assistant/skill",
      "  promptsDir: .qfai/assistant/prompt",
      "  srcDir: src",
      "  testsDir: tests",
      "validation:",
      "  failOn: error",
      "",
    ].join("\n"),
    "utf-8",
  );
  const uiDir = path.join(root, CONTRACTS_DIR, "ui");
  await mkdir(uiDir, { recursive: true });
  await writeFile(
    path.join(uiDir, "home.yaml"),
    "# QFAI-CONTRACT-ID: CON-UI-0001\nscreens: [{id: home, route: /}]\n",
    "utf-8",
  );
  if (options.lock) {
    await mkdir(path.join(root, CONTRACTS_DIR, "design"), { recursive: true });
    await writeFile(
      path.join(root, CONTRACTS_DIR, "design", "DESIGN.md.lock.yaml"),
      `designMdPath: "DESIGN.md"\ndesignMdSha256: "${hashDesignMd(designMd)}"\n`,
      "utf-8",
    );
  }
  return root;
}

async function exists(p: string): Promise<boolean> {
  return stat(p).then(
    () => true,
    () => false,
  );
}

async function readPrototypingJson(root: string): Promise<Record<string, unknown>> {
  const parsed: unknown = JSON.parse(
    await readFile(path.join(root, PROTOTYPING_JSON_REL), "utf-8"),
  );
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("prototyping.json is not an object");
  }
  return { ...parsed };
}

/** Records the reviewer's verdict on the seed iteration: nothing left to fix. */
async function recordConvergedReview(root: string): Promise<void> {
  const record = await readPrototypingJson(root);
  const iterations = Array.isArray(record.iterations) ? record.iterations : [];
  const seed: unknown = iterations[0];
  if (typeof seed !== "object" || seed === null) throw new Error("no seed iteration");
  record.iterations = [
    {
      ...seed,
      scores: EXCEPTIONAL,
      blockingFindings: [],
      layoutAntiPatternsDetected: [],
      designMdViolations: [],
    },
  ];
  await writeFile(path.join(root, PROTOTYPING_JSON_REL), JSON.stringify(record), "utf-8");
}

/** Ten reviewed iterations, none converged: the next call is the budget stop. */
async function seedExhaustedLoop(root: string, designMd: string): Promise<void> {
  const record = {
    designMd: { path: "DESIGN.md", sha256: hashDesignMd(designMd) },
    uiContractsCovered: ["CON-UI-0001"],
    frozenSurfaceUnion: ["CON-UI-0001"],
    iterations: Array.from({ length: 10 }, (_, index) => ({
      index,
      commitSha: "uncommitted",
      scores: { ...EXCEPTIONAL, usability: "strong" },
      blockingFindings: ["home: the empty state is not represented"],
      layoutAntiPatternsDetected: [],
      designMdViolations: [],
    })),
    acceptedIterationIndex: 9,
    stopReason: null,
  };
  await mkdir(path.dirname(path.join(root, PROTOTYPING_JSON_REL)), { recursive: true });
  await writeFile(path.join(root, PROTOTYPING_JSON_REL), JSON.stringify(record), "utf-8");
}

async function mirrorIssues(root: string): Promise<{ code: string; message: string }[]> {
  const { config } = await loadConfig(root);
  const issues = await validatePrototypingDesignContractReadiness(root, config);
  return issues
    .filter((i) => MIRROR_CODES.has(i.code))
    .map((i) => ({ code: i.code, message: i.message }));
}

function sectionKeys(mirror: unknown, section: string): string[] {
  if (typeof mirror !== "object" || mirror === null) return [];
  const visual: unknown = Reflect.get(mirror, "visual");
  if (typeof visual !== "object" || visual === null) return [];
  const value: unknown = Reflect.get(visual, section);
  return typeof value === "object" && value !== null ? Object.keys(value) : [];
}

describe("iterate writes design-system.yaml on the cycle that ends the loop", () => {
  // QFAI:EX-0001-0117-01
  it("converged stop (64): absent before the loop ends, then an exact, deterministic mirror", async () => {
    const root = await seedProject(FULL_DESIGN_MD, { lock: true });
    const mirrorAbs = path.join(root, MIRROR_REL);

    expect(
      await runPrototypingIterate({ root, cycle: 0, targetUrl: "http://localhost:4321" }),
    ).toBe(0);
    expect(await exists(mirrorAbs)).toBe(false);

    await recordConvergedReview(root);
    expect(await runPrototypingIterate({ root, cycle: 1 })).toBe(64);

    const first = await readFile(mirrorAbs, "utf-8");
    expect(first).toBe(expectedFullMirror(hashDesignMd(FULL_DESIGN_MD)));

    const parsed: unknown = parseYaml(first);
    expect(sectionKeys(parsed, "colors")).toEqual([
      "primary",
      "secondary",
      "accent",
      "surface",
      "surface_muted",
      "text",
      "text_muted",
      "danger",
      "warning",
      "success",
      "border",
      "overlay",
    ]);
    expect(sectionKeys(parsed, "typography")).toEqual([
      "family_sans",
      "family_display",
      "family_mono",
      "scale",
      "weight",
    ]);
    expect(sectionKeys(parsed, "radius")).toEqual(["sm", "md", "lg", "full"]);
    expect(sectionKeys(parsed, "shadow")).toEqual(["sm", "md", "lg"]);
    expect(sectionKeys(parsed, "spacing")).toEqual(["base", "scale"]);

    // The same stop, asked again, writes the same bytes.
    await rm(mirrorAbs);
    expect(await runPrototypingIterate({ root, cycle: 1 })).toBe(64);
    expect(await readFile(mirrorAbs, "utf-8")).toBe(first);

    expect(await mirrorIssues(root)).toEqual([]);
  });

  // QFAI:EX-0001-0117-01
  it("the validator's mirror check is live on the written file: a changed or an extra token fails it", async () => {
    const root = await seedProject(FULL_DESIGN_MD, { lock: true });
    await runPrototypingIterate({ root, cycle: 0, targetUrl: "http://localhost:4321" });
    await recordConvergedReview(root);
    expect(await runPrototypingIterate({ root, cycle: 1 })).toBe(64);

    const mirrorAbs = path.join(root, MIRROR_REL);
    const written = await readFile(mirrorAbs, "utf-8");
    await writeFile(
      mirrorAbs,
      written
        .replace('primary: "#1F2937"', 'primary: "#FF0000"')
        .replace('    lg: "0.75rem"\n', '    lg: "0.75rem"\n    xl: "1rem"\n'),
      "utf-8",
    );
    const messages = (await mirrorIssues(root)).map((i) => i.message);
    expect(messages.some((m) => m.includes("visual.colors.primary"))).toBe(true);
    expect(messages.some((m) => m.includes("visual.radius.xl"))).toBe(true);
  });

  // QFAI:EX-0001-0117-01
  it("budget stop (65): the mirror omits every section DESIGN.md leaves out, and a missing lock takes the DESIGN.md hash", async () => {
    const root = await seedProject(MINIMAL_DESIGN_MD, { lock: false });
    await seedExhaustedLoop(root, MINIMAL_DESIGN_MD);

    expect(await runPrototypingIterate({ root, cycle: 9 })).toBe(65);

    const written = await readFile(path.join(root, MIRROR_REL), "utf-8");
    expect(written).toBe(expectedMinimalMirror(hashDesignMd(MINIMAL_DESIGN_MD)));
    const parsed: unknown = parseYaml(written);
    expect(sectionKeys(parsed, "typography")).toEqual([
      "family_sans",
      "family_display",
      "family_mono",
    ]);
    expect(sectionKeys(parsed, "spacing")).toEqual([]);
    expect(await mirrorIssues(root)).toEqual([]);
  });

  // QFAI:EX-0001-0117-01
  it("a cycle that does not end the loop writes no mirror", async () => {
    const root = await seedProject(MINIMAL_DESIGN_MD, { lock: true });
    expect(
      await runPrototypingIterate({ root, cycle: 0, targetUrl: "http://localhost:4321" }),
    ).toBe(0);
    expect(await runPrototypingIterate({ root, cycle: 1 })).toBe(0);
    expect(await exists(path.join(root, MIRROR_REL))).toBe(false);
  });
});
