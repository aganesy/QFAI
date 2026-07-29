import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");

/**
 * The distributed assistant surface. Skills do not only read `skills/**`: every
 * skill loads `constitution/**` and `catalog/**` too (for example
 * `qfai-verify/SKILL.md` always reads `constitution/workflow.md`), so a launcher
 * prescribed there is a launcher a skill run will actually execute.
 */
const SHIPPED_ASSISTANT_ROOT = "packages/qfai/assets/init/.qfai/assistant";

/**
 * Root mirror of the shipped surface. Only mirrored paths are scanned — the root
 * tree also carries legacy, non-distributed docs (`steering/**`, superseded
 * migration notes) that this repo keeps for its own history.
 */
const ROOT_ASSISTANT_MIRROR = ".qfai/assistant";

const BASELINE_PATHS = [
  `${SHIPPED_ASSISTANT_ROOT}/constitution/shared-skill-operating-baseline.md`,
  `${ROOT_ASSISTANT_MIRROR}/constitution/shared-skill-operating-baseline.md`,
];

/** CLI subcommands qfai actually registers; a bare invocation of any of them is not on PATH. */
const SUBCOMMANDS =
  "(?:validate|init|report|doctor|prototyping|discussion|guardrails|audit-log|handoff-upgrade|atdd-scaffold)";

const INLINE_BARE = new RegExp("`qfai " + SUBCOMMANDS + "\\b");
const FENCED_BARE = new RegExp("^\\s*qfai " + SUBCOMMANDS + "\\b");

type Offence = { file: string; line: number; text: string };

/**
 * Finds bare `qfai <subcommand>` invocations, counting only the two forms a
 * reader executes: an inline code span and a line inside a fenced block. Free
 * prose ("qfai validate/report") is left alone.
 */
function findNonCanonicalInvocations(relativePath: string, content: string): Offence[] {
  const offences: Offence[] = [];
  let inFence = false;

  content.split(/\r?\n/).forEach((line, index) => {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      return;
    }
    const bad = inFence ? FENCED_BARE.test(line) : INLINE_BARE.test(line);
    if (bad) {
      offences.push({ file: relativePath, line: index + 1, text: line.trim() });
    }
  });

  return offences;
}

/** Shipped assistant docs, each paired with its root mirror when one exists. */
async function collectAssistantDocs(): Promise<string[]> {
  const shipped = await fg(`${SHIPPED_ASSISTANT_ROOT}/**/*.md`, {
    cwd: repoRoot,
    absolute: false,
  });
  const files: string[] = [];
  for (const file of shipped) {
    files.push(file);
    const mirrored = `${ROOT_ASSISTANT_MIRROR}/${file.slice(SHIPPED_ASSISTANT_ROOT.length + 1)}`;
    if (existsSync(path.join(repoRoot, mirrored))) {
      files.push(mirrored);
    }
  }
  return files;
}

describe("shipped assistant docs invoke qfai through the canonical launcher", () => {
  it("no shipped doc prescribes a bare qfai invocation", async () => {
    const files = await collectAssistantDocs();
    expect(files.length).toBeGreaterThan(0);

    const offences: Offence[] = [];
    for (const file of files) {
      const content = await readFile(path.join(repoRoot, file), "utf-8");
      offences.push(...findNonCanonicalInvocations(file, content));
    }

    expect(
      offences.map((entry) => `${entry.file}:${entry.line} ${entry.text}`),
      "qfai is a project dependency; gates must run as `npx qfai …`",
    ).toEqual([]);
  });

  it("covers the constitution and catalog docs every skill loads", async () => {
    const files = await collectAssistantDocs();
    for (const required of [
      `${SHIPPED_ASSISTANT_ROOT}/constitution/workflow.md`,
      `${SHIPPED_ASSISTANT_ROOT}/catalog/test-layers.md`,
      `${ROOT_ASSISTANT_MIRROR}/constitution/workflow.md`,
      `${ROOT_ASSISTANT_MIRROR}/catalog/test-layers.md`,
    ]) {
      expect(files).toContain(required);
    }
  });

  // The reproducibility guard is a preflight, not a spelling. Measured with npm
  // 11.16.0 in a non-interactive shell: plain `npx cowsay hi` printed "The
  // following package was not found and will be installed" and exited 0, and a
  // following `npx --no-install cowsay hi` also exited 0, off the npx cache —
  // for a package present in neither node_modules of this workspace. Neither
  // spelling proves the qfai that ran was the project's; only a local binary
  // does.
  it("the shared baseline gates on a local binary, not on an npx flag", async () => {
    for (const baseline of BASELINE_PATHS) {
      const content = await readFile(path.join(repoRoot, baseline), "utf-8");
      expect(content).toContain("## Canonical qfai Launcher (Mandatory)");
      expect(content).toContain("Launcher preflight");
      expect(content).toContain("`node_modules/.bin/qfai`");
      expect(content).toContain("UNRUN");
      // The dependency is the prerequisite, and init does not create it.
      expect(content).toContain("`npm i -D qfai`");
      expect(content).toContain("does not add itself to `package.json` on init");
      // `--no-install` may only appear as the thing that is NOT the guard.
      expect(content).toContain("The preflight is the guard, not a flag.");
    }
  });
});
