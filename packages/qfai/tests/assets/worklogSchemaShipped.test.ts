/**
 * The work-log surface's contract is published (#395).
 *
 * `qfai init` creates `.qfai/steering/` and writes a README and an entry
 * template that both point at `.qfai/contracts/cli/worklog-entry.schema.md` as
 * "the canonical schema" and as the source of "the authoritative list and
 * per-kind write trigger". That file lived only in qfai's own repository: not
 * under `assets/`, not in `package.json#files`, and the README states that
 * `qfai init` never seeds contracts. The pointer was unresolvable by
 * construction on every consuming project — while `validateWorklogSurface`
 * polices the surface in the `sdd` and full profiles.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const SCHEMA = "assistant/catalog/worklog-entry.schema.md";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

const readRepo = (rel: string): Promise<string> => readFile(path.join(repoRoot, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

describe("work-log entry schema", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the schema ships under assistant/catalog`, async () => {
      const schema = await read(tree, SCHEMA);

      expect(schema).toContain("# Work-log Entry Schema Contract");
      // The part that makes the surface usable, and that existed in no shipped
      // file: which `kind` an agent writes when.
      expect(schema).toContain("### `kind` enum (REQ-0004)");
      expect(schema).toContain("Write trigger");
    });

    it(`${tree}: the schema no longer claims to be unpublished`, async () => {
      const schema = flat(await read(tree, SCHEMA));

      expect(schema).not.toContain("NOT in `packages/qfai/package.json#files`");
      expect(schema).toContain(
        "This **schema** ships with the package and `npx qfai init` seeds it at `.qfai/assistant/catalog/worklog-entry.schema.md`",
      );
    });

    it(`${tree}: a skill names the surface and its trigger table`, async () => {
      // Nothing in the shipped tree told an agent to write an entry; the
      // validator policed a surface with no producer.
      const implement = flat(await read(tree, "assistant/skills/qfai-implement/SKILL.md"));
      const sdd = flat(await read(tree, "assistant/skills/qfai-sdd/SKILL.md"));

      for (const skill of [implement, sdd]) {
        expect(skill).toContain("`.qfai/assistant/catalog/worklog-entry.schema.md`");
        expect(skill).toContain("`kind` trigger table");
        expect(skill).toContain("so an unwritten one is simply lost");
      }
    });
  }

  it("init seeds no pointer to the unpublished contracts path", async () => {
    const init = await readRepo("packages/qfai/src/cli/commands/init.ts");

    expect(init).not.toContain(".qfai/contracts/cli/worklog-entry.schema.md");
    // All four references repointed, including the init report line.
    expect(init.split("assistant/catalog/worklog-entry.schema.md").length - 1).toBe(4);
  });

  it("the package README documents the surface", async () => {
    const readme = await readRepo("packages/qfai/README.md");

    expect(readme).toContain("### AI work-log surface (`.qfai/steering/`)");
    expect(readme).toContain("worklog-entry.schema.md");
    expect(flat(readme)).toContain("**per-kind write trigger**");
    // The two `steering` directories are easy to confuse and the issue says so.
    expect(flat(readme)).toContain(
      "a different directory from the legacy `.qfai/assistant/steering/`",
    );
  });
});
