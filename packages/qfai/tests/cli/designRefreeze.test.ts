/**
 * `qfai design refreeze` — one command for every file that records the
 * DESIGN.md hash.
 *
 * The rows that matter most end in the validator rather than in the files: a
 * refreeze is only useful if `qfai validate` then accepts what it wrote, and a
 * suite that checked the written values alone could agree with itself while the
 * validator still refused the result.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { runDesignRefreeze } from "../../src/cli/commands/designRefreeze.js";
import { parseArgs } from "../../src/cli/lib/args.js";
import { EXIT_CODES } from "../../src/cli/lib/exitCodes.js";
import { defaultConfig } from "../../src/core/config.js";
import { DESIGN_MD_SAMPLE_MARKER, hashDesignMd } from "../../src/core/design/designMd.js";
import { validatePrototypingDesignContractReadiness } from "../../src/core/validators/designContractReadiness.js";
import { captureStdout } from "../helpers/stdout.js";

const dirs: string[] = [];

afterEach(async () => {
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

const FROZEN_AT = new Date("2026-09-25T10:11:12.345Z");

function designMd(accent: string, prose: string): string {
  return [
    "---",
    "brand:",
    '  name: "Acme Ledger"',
    "  archetype: tech",
    "visual:",
    "  colors:",
    '    primary: "#1F2937"',
    '    secondary: "#6366F1"',
    `    accent: "${accent}"`,
    '    surface: "#FFFFFF"',
    '    surface_muted: "#F3F4F6"',
    '    text: "#111827"',
    '    text_muted: "#6B7280"',
    '    danger: "#DC2626"',
    '    warning: "#F59E0B"',
    '    success: "#10B981"',
    '    border: "#E5E7EB"',
    '    overlay: "rgba(0,0,0,0.5)"',
    "  typography:",
    '    family_sans: "Inter, system-ui, sans-serif"',
    '    family_display: "Inter, system-ui, sans-serif"',
    '    family_mono: "JetBrains Mono, ui-monospace, monospace"',
    "  radius:",
    '    sm: "0.25rem"',
    '    md: "0.5rem"',
    '    lg: "0.75rem"',
    '    full: "9999px"',
    "  shadow:",
    '    sm: "0 1px 2px rgba(15,23,42,0.05)"',
    '    md: "0 4px 6px rgba(15,23,42,0.08)"',
    '    lg: "0 12px 24px rgba(15,23,42,0.10)"',
    "---",
    "",
    "# Brand Philosophy",
    "",
    prose,
    "",
  ].join("\n");
}

const ORIGINAL = designMd("#D97706", "Calm and exact.");
const ORIGINAL_SHA = hashDesignMd(ORIGINAL);

/** The mirror as prototyping hands it off, taken from a DESIGN.md. */
function mirrorFor(accent: string, sha: string): string {
  return [
    "# Written at handoff.",
    "source: DESIGN.md",
    `designMdSha256: "${sha}"`,
    "visual:",
    "  colors:",
    '    primary: "#1F2937"',
    '    secondary: "#6366F1"',
    `    accent: "${accent}"`,
    '    surface: "#FFFFFF"',
    '    surface_muted: "#F3F4F6"',
    '    text: "#111827"',
    '    text_muted: "#6B7280"',
    '    danger: "#DC2626"',
    '    warning: "#F59E0B"',
    '    success: "#10B981"',
    '    border: "#E5E7EB"',
    '    overlay: "rgba(0,0,0,0.5)"',
    "  typography:",
    '    family_sans: "Inter, system-ui, sans-serif"',
    '    family_display: "Inter, system-ui, sans-serif"',
    '    family_mono: "JetBrains Mono, ui-monospace, monospace"',
    "  radius:",
    '    sm: "0.25rem"',
    '    md: "0.5rem"',
    '    lg: "0.75rem"',
    '    full: "9999px"',
    "  shadow:",
    '    sm: "0 1px 2px rgba(15,23,42,0.05)"',
    '    md: "0 4px 6px rgba(15,23,42,0.08)"',
    '    lg: "0 12px 24px rgba(15,23,42,0.10)"',
    "",
  ].join("\n");
}

const designDir = (root: string): string => path.join(root, ".qfai", "contracts", "design");
const lockPath = (root: string): string => path.join(designDir(root), "DESIGN.md.lock.yaml");
const mirrorPath = (root: string): string => path.join(designDir(root), "design-system.yaml");
const handoffPath = (root: string): string => path.join(designDir(root), "prototype-handoff.yaml");

/** A project frozen against ORIGINAL, with the mirror and handoff when asked. */
async function frozenProject(options: { handedOff: boolean }): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-design-refreeze-"));
  dirs.push(root);
  await mkdir(designDir(root), { recursive: true });
  await mkdir(path.join(root, ".qfai", "contracts", "ui"), { recursive: true });
  await writeFile(
    path.join(root, ".qfai", "contracts", "ui", "ui-0001.yaml"),
    "screens:\n  - id: home\n    title: Home\n    route: /\n",
    "utf-8",
  );
  await writeFile(path.join(root, "DESIGN.md"), ORIGINAL, "utf-8");
  await writeFile(
    lockPath(root),
    [
      "# Lock file recorded at the freeze.",
      'designMdPath: "DESIGN.md"',
      `designMdSha256: "${ORIGINAL_SHA}" # frozen content hash`,
      'frozenAt: "2026-05-05T12:34:56Z"',
      "schemaTokens:",
      "  radii: [sm, md, lg, full]",
      "",
    ].join("\n"),
    "utf-8",
  );
  if (options.handedOff) {
    await writeFile(mirrorPath(root), mirrorFor("#D97706", ORIGINAL_SHA), "utf-8");
    await writeFile(
      handoffPath(root),
      [
        "finalIterIndex: 1",
        'finalArtifact: ".qfai/prototypes/final/index.html"',
        'designMdPath: "DESIGN.md"',
        `designMdSha256: "${ORIGINAL_SHA}"`,
        'designSystemMirror: ".qfai/contracts/design/design-system.yaml"',
        'implementationNotes: "test"',
        "",
      ].join("\n"),
      "utf-8",
    );
  }
  return root;
}

async function refreeze(root: string, check = false): Promise<{ code: number; out: string }> {
  let code = -1;
  const out = await captureStdout(async () => {
    code = await runDesignRefreeze({ root, check, now: () => FROZEN_AT });
  });
  return { code, out };
}

/** The findings a stale hash or a stale mirror raises. */
async function hashFindings(root: string): Promise<string[]> {
  const issues = await validatePrototypingDesignContractReadiness(root, defaultConfig);
  return issues
    .filter(
      (i) =>
        i.code === "QFAI-DCON-032" ||
        i.code === "QFAI-DCON-005" ||
        (i.code === "QFAI-DCON-013" && i.message.includes("designMdSha256")),
    )
    .map((i) => `${i.code}: ${i.message}`);
}

describe("qfai design refreeze", () => {
  it("records a prose-only edit in the lock, the mirror and the handoff, and validation accepts it", async () => {
    const root = await frozenProject({ handedOff: true });
    const edited = designMd("#D97706", "Calm, exact and quiet.");
    await writeFile(path.join(root, "DESIGN.md"), edited, "utf-8");
    expect(await hashFindings(root)).not.toEqual([]);

    const { code, out } = await refreeze(root);

    expect(code).toBe(EXIT_CODES.ok);
    const sha = hashDesignMd(edited);
    const lock = await readFile(lockPath(root), "utf-8");
    expect(lock).toContain(`designMdSha256: "${sha}" # frozen content hash`);
    expect(lock).toContain('frozenAt: "2026-09-25T10:11:12Z"');
    // Fields and comments the command does not own stay as written.
    expect(lock).toContain("# Lock file recorded at the freeze.");
    expect(parseYaml(lock)).toMatchObject({ schemaTokens: { radii: ["sm", "md", "lg", "full"] } });
    expect(await readFile(mirrorPath(root), "utf-8")).toContain(`designMdSha256: "${sha}"`);
    expect(await readFile(handoffPath(root), "utf-8")).toContain(`designMdSha256: "${sha}"`);
    expect(out).toContain("updated .qfai/contracts/design/DESIGN.md.lock.yaml");
    expect(out).toContain("updated .qfai/contracts/design/design-system.yaml (designMdSha256)");
    expect(out).toContain("updated .qfai/contracts/design/prototype-handoff.yaml");
    expect(await hashFindings(root)).toEqual([]);
  });

  it("copies an edited token into the mirror", async () => {
    const root = await frozenProject({ handedOff: true });
    await writeFile(path.join(root, "DESIGN.md"), designMd("#B45309", "Calm and exact."), "utf-8");

    const { code, out } = await refreeze(root);

    expect(code).toBe(EXIT_CODES.ok);
    expect(out).toContain("design-system.yaml (designMdSha256, visual)");
    const mirror: unknown = parseYaml(await readFile(mirrorPath(root), "utf-8"));
    expect(mirror).toMatchObject({ visual: { colors: { accent: "#B45309" } } });
    expect(await hashFindings(root)).toEqual([]);
  });

  it("updates only the lock before prototyping has handed off, and creates nothing", async () => {
    const root = await frozenProject({ handedOff: false });
    await writeFile(path.join(root, "DESIGN.md"), designMd("#D97706", "Edited."), "utf-8");

    const { code, out } = await refreeze(root);

    expect(code).toBe(EXIT_CODES.ok);
    expect(out).toContain("DESIGN.md.lock.yaml");
    expect(out).not.toContain("design-system.yaml");
    await expect(readFile(mirrorPath(root), "utf-8")).rejects.toThrow();
    await expect(readFile(handoffPath(root), "utf-8")).rejects.toThrow();
  });

  it("--check names every file out of date, exits 1 and writes nothing", async () => {
    const root = await frozenProject({ handedOff: true });
    await writeFile(path.join(root, "DESIGN.md"), designMd("#D97706", "Edited."), "utf-8");
    const before = await readFile(lockPath(root), "utf-8");

    const { code, out } = await refreeze(root, true);

    expect(code).toBe(EXIT_CODES.findings);
    expect(out).toContain("out of date: .qfai/contracts/design/DESIGN.md.lock.yaml");
    expect(out).toContain("out of date: .qfai/contracts/design/design-system.yaml");
    expect(out).toContain("out of date: .qfai/contracts/design/prototype-handoff.yaml");
    expect(await readFile(lockPath(root), "utf-8")).toBe(before);
  });

  it("leaves every file untouched when nothing is out of date, so frozenAt keeps the real freeze", async () => {
    const root = await frozenProject({ handedOff: true });
    const before = await readFile(lockPath(root), "utf-8");

    const check = await refreeze(root, true);
    const run = await refreeze(root);

    expect(check.code).toBe(EXIT_CODES.ok);
    expect(run.code).toBe(EXIT_CODES.ok);
    expect(run.out).toContain("nothing to update");
    expect(await readFile(lockPath(root), "utf-8")).toBe(before);
  });

  it("refuses without a lock: the first freeze is not this command's", async () => {
    const root = await frozenProject({ handedOff: false });
    await rm(lockPath(root));

    const { code } = await refreeze(root);

    expect(code).toBe(EXIT_CODES.inputError);
    await expect(readFile(lockPath(root), "utf-8")).rejects.toThrow();
  });

  it("refuses to freeze the sample brand", async () => {
    const root = await frozenProject({ handedOff: false });
    const before = await readFile(lockPath(root), "utf-8");
    await writeFile(
      path.join(root, "DESIGN.md"),
      designMd("#D97706", `<!-- ${DESIGN_MD_SAMPLE_MARKER} -->`),
      "utf-8",
    );

    const { code } = await refreeze(root);

    expect(code).toBe(EXIT_CODES.inputError);
    expect(await readFile(lockPath(root), "utf-8")).toBe(before);
  });

  it("refuses a DESIGN.md that does not parse", async () => {
    const root = await frozenProject({ handedOff: false });
    await writeFile(path.join(root, "DESIGN.md"), "# no front matter\n", "utf-8");

    const { code } = await refreeze(root);

    expect(code).toBe(EXIT_CODES.inputError);
  });
});

describe("qfai design refreeze arguments", () => {
  it("reads the subcommand and --check", () => {
    const parsed = parseArgs(["design", "refreeze", "--check"], process.cwd());
    expect(parsed.invalid).toBe(false);
    expect(parsed.options.designAction).toBe("refreeze");
    expect(parsed.options.designCheckOnly).toBe(true);
  });

  it("refuses a missing or unknown subcommand", () => {
    expect(parseArgs(["design"], process.cwd()).invalid).toBe(true);
    expect(parseArgs(["design", "freeze"], process.cwd()).invalid).toBe(true);
  });

  it("refuses a flag refreeze does not read", () => {
    expect(parseArgs(["design", "refreeze", "--force"], process.cwd()).invalid).toBe(true);
  });
});
