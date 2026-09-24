/**
 * The work-log surface's contract is published.
 *
 * `qfai init` creates `.qfai/steering/` and writes a README and an entry
 * template that both point at `.qfai/assistant/rule/worklog-entry.schema.md` as
 * the schema and per-kind write trigger. `validateWorklogSurface` enforces
 * the shipped shapes in the `sdd` and full profiles.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// tests/assets/<this file> -> packages/qfai -> packages -> repo root
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const QFAI_TREES = ["packages/qfai/assets/init/.qfai", ".qfai"];

const SCHEMA = "assistant/rule/worklog-entry.schema.md";

const read = (tree: string, rel: string): Promise<string> =>
  readFile(path.join(repoRoot, tree, rel), "utf-8");

const readRepo = (rel: string): Promise<string> => readFile(path.join(repoRoot, rel), "utf-8");

/** Wrap-tolerant containment: the sentence is the rule, its wrap column is not. */
const flat = (s: string): string => s.replace(/\s*\n\s*/g, " ");

describe("work-log entry schema", () => {
  for (const tree of QFAI_TREES) {
    it(`${tree}: the schema ships under assistant/rule`, async () => {
      const schema = await read(tree, SCHEMA);

      expect(schema).toContain("# Work-log Entry Schema Contract");
      expect(schema).toContain("### `kind` enum");
      expect(schema).toContain("Write trigger");
      expect(schema).toContain("scope: BF-0001");
      expect(schema).toContain("promote-to: decisions.md");
      expect(schema).toContain("`DEC-NNNN`");
    });

    it(`${tree}: the schema no longer claims to be unpublished`, async () => {
      const schema = flat(await read(tree, SCHEMA));

      expect(schema).toContain(
        "This **schema** ships with the package and `npx qfai init` seeds it at `.qfai/assistant/rule/worklog-entry.schema.md`",
      );
    });

    it(`${tree}: a skill names the surface and its trigger table`, async () => {
      // Nothing in the shipped tree told an agent to write an entry; the
      // validator policed a surface with no producer.
      const implement = flat(await read(tree, "assistant/skill/qfai-implement/SKILL.md"));
      const sdd = flat(await read(tree, "assistant/skill/qfai-sdd/SKILL.md"));

      for (const skill of [implement, sdd]) {
        expect(skill).toContain("worklog-entry.schema.md");
        expect(skill).toContain(".qfai/steering/");
      }
    });
  }

  it("init seeds no pointer to the unpublished contracts path", async () => {
    const init = await readRepo("packages/qfai/src/cli/commands/init.ts");

    expect(init).not.toContain(".qfai/contracts/cli/worklog-entry.schema.md");
    expect(init).toContain(".qfai/assistant/rule/worklog-entry.schema.md");
    expect(init).not.toContain("assistant/catalog/worklog-entry.schema.md");
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
