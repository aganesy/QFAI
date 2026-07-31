import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(process.cwd(), "..", "..");

/** Shipped assistant tree plus its root mirror. */
const ASSISTANT_ROOTS = [
  path.join(repoRoot, "packages/qfai/assets/init/.qfai/assistant"),
  path.join(repoRoot, ".qfai/assistant"),
];

const TEMPLATE_REL = "skills/qfai-sdd/templates/evidence/sdd-spec.md";
const SKILL_REL = "skills/qfai-sdd/SKILL.md";
const GATE_REL = "skills/qfai-sdd/references/sdd-quality-gate.md";

/** The `| tee` this template used to mandate — see the first case below. */
const RETIRED_LOG_REDIRECT = "| tee";

async function readShipped(relative: string): Promise<string[]> {
  return Promise.all(ASSISTANT_ROOTS.map((root) => readFile(path.join(root, relative), "utf-8")));
}

describe("sdd evidence template", () => {
  // The log this template lists under "Validate evidence paths" has to be the
  // one the command above it produces. That used to require a `| tee`, because
  // `qfai validate` wrote the run directory and nothing else. It no longer
  // does: the writer emits `<paths.outDir>/validate.log` on every run, pointing
  // at that run's `run-*/`. So the redirect is now the wrong instruction — it
  // is unnecessary, and `| tee` is not portable to PowerShell, which is the
  // shell a Windows operator following this template would be in.
  it("cites the log the validate command writes, without a redirect", async () => {
    for (const template of await readShipped(TEMPLATE_REL)) {
      expect(template).toContain("`.qfai/report/validate.log`");

      const section = template.slice(
        template.indexOf("## Commands executed"),
        template.indexOf("## Validate evidence paths"),
      );
      // The fenced command only. The prose around it explains why there is no
      // redirect and necessarily names `| tee` to do so, so asserting over the
      // whole section would fail on its own explanation.
      const fenced = /```[^\n]*\n([\s\S]*?)```/.exec(section)?.[1] ?? "";
      expect(fenced).toContain("qfai validate --profile sdd --fail-on error --format github");
      expect(fenced).not.toContain(RETIRED_LOG_REDIRECT);
    }
  });

  it("runs the same command the skill body and the quality gate mandate", async () => {
    const [skills, gates, templates] = await Promise.all([
      readShipped(SKILL_REL),
      readShipped(GATE_REL),
      readShipped(TEMPLATE_REL),
    ]);
    const expectedCommand = "qfai validate --profile sdd --fail-on error --format github";

    // Indexed against ASSISTANT_ROOTS so BOTH halves are asserted. Destructuring
    // the first element checked only the shipped tree and left `.qfai/assistant`
    // — the half an author is most likely to forget — free to drift, which is
    // the guardrail this file exists to provide.
    ASSISTANT_ROOTS.forEach((root, index) => {
      const label = path.relative(repoRoot, root).replace(/\\/g, "/");
      const files: ReadonlyArray<readonly [string, string | undefined]> = [
        [SKILL_REL, skills[index]],
        [GATE_REL, gates[index]],
        [TEMPLATE_REL, templates[index]],
      ];
      for (const [relative, source] of files) {
        expect(source, `${label}/${relative} was not read`).toBeDefined();
        expect(source, `${label}/${relative} does not mandate the validate command`).toContain(
          expectedCommand,
        );
      }
    });
  });
});
