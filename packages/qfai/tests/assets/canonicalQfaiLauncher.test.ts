import { readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");

const SKILL_ROOTS = [
  "packages/qfai/assets/init/.qfai/assistant/skills",
  ".qfai/assistant/skills",
];

const BASELINE_PATHS = [
  "packages/qfai/assets/init/.qfai/assistant/constitution/shared-skill-operating-baseline.md",
  ".qfai/assistant/constitution/shared-skill-operating-baseline.md",
];

/** CLI subcommands qfai actually registers; a bare invocation of any of them is not on PATH. */
const SUBCOMMANDS =
  "(?:validate|init|report|doctor|prototyping|discussion|guardrails|audit-log|handoff-upgrade|atdd-scaffold)";

const INLINE_BARE = new RegExp("`qfai " + SUBCOMMANDS + "\\b");
const FENCED_BARE = new RegExp("^\\s*qfai " + SUBCOMMANDS + "\\b");

type Offence = { file: string; line: number; text: string };

/**
 * Finds bare `qfai <subcommand>` invocations, counting only the two forms a
 * reader executes: an inline code span and a line inside a fenced block.
 * Free prose ("qfai validate/report") is left alone.
 */
function findBareInvocations(relativePath: string, content: string): Offence[] {
  const offences: Offence[] = [];
  let inFence = false;

  content.split(/\r?\n/).forEach((line, index) => {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      return;
    }
    const bare = inFence ? FENCED_BARE.test(line) : INLINE_BARE.test(line);
    if (bare) {
      offences.push({ file: relativePath, line: index + 1, text: line.trim() });
    }
  });

  return offences;
}

describe("shipped skills invoke qfai through npx", () => {
  it("no skill file prescribes a bare `qfai <subcommand>`", async () => {
    const files = await fg(
      SKILL_ROOTS.map((root) => `${root}/**/*.md`),
      { cwd: repoRoot, absolute: false },
    );
    expect(files.length).toBeGreaterThan(0);

    const offences: Offence[] = [];
    for (const file of files) {
      const content = await readFile(path.join(repoRoot, file), "utf-8");
      offences.push(...findBareInvocations(file, content));
    }

    expect(
      offences.map((entry) => `${entry.file}:${entry.line} ${entry.text}`),
      "qfai is a project dependency; gates must run as `npx qfai …`",
    ).toEqual([]);
  });

  it("the shared baseline states the canonical launcher once for every skill", async () => {
    for (const baseline of BASELINE_PATHS) {
      const content = await readFile(path.join(repoRoot, baseline), "utf-8");
      expect(content).toContain("## Canonical qfai Launcher (Mandatory)");
      expect(content).toContain("`npx --no-install qfai`");
      expect(content).toContain("`node_modules/.bin/qfai`");
    }
  });
});
