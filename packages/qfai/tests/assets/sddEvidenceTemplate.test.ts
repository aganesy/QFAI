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

const VALIDATE_LOG_REDIRECT = "| tee .qfai/report/validate.log";

async function readShipped(relative: string): Promise<string[]> {
  return Promise.all(ASSISTANT_ROOTS.map((root) => readFile(path.join(root, relative), "utf-8")));
}

describe("sdd evidence template", () => {
  // `qfai validate` writes the run directory but never
  // `.qfai/report/validate.log`. A template whose command omits the redirect
  // leaves the log it then lists under "Validate evidence paths" absent, or —
  // worse — a stale copy from an earlier run that no longer describes the gate
  // result the evidence claims.
  it("captures the validate output into the log it cites as evidence", async () => {
    for (const template of await readShipped(TEMPLATE_REL)) {
      expect(template).toContain(VALIDATE_LOG_REDIRECT);
      expect(template).toContain("`.qfai/report/validate.log`");

      const commandBlock = template.slice(
        template.indexOf("## Commands executed"),
        template.indexOf("## Validate evidence paths"),
      );
      expect(commandBlock).toContain(VALIDATE_LOG_REDIRECT);
    }
  });

  it("runs the same command the skill body and the quality gate mandate", async () => {
    const [skill] = await readShipped(SKILL_REL);
    const [gate] = await readShipped(GATE_REL);
    const [template] = await readShipped(TEMPLATE_REL);

    for (const source of [skill, gate, template]) {
      expect(source).toBeDefined();
      expect(source).toContain(
        `qfai validate --profile sdd --fail-on error --format github ${VALIDATE_LOG_REDIRECT}`,
      );
    }
  });
});
