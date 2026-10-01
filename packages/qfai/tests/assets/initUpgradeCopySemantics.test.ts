import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseContractRules } from "../../src/core/storyTree/contractRules.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const readRepo = (rel: string): Promise<string> => readFile(path.join(repoRoot, rel), "utf-8");

const CONTRACT = ".qfai/spec/03_contract/cli/cli-0009-qfai-init.md";
const IMPL = "packages/qfai/src/cli/commands/init.ts";

/** The init contract's business-rule statement that holds `needle`. */
async function ruleWith(needle: string): Promise<string> {
  const scan = parseContractRules(CONTRACT, await readRepo(CONTRACT));
  const rule = scan.rules.find((candidate) => candidate.statement.includes(needle));
  expect(rule, `no init business rule states: ${needle}`).toBeDefined();
  return rule?.statement ?? "";
}

function upgradeHelperBody(source: string): string | undefined {
  const start = source.indexOf("async function runUpgradeAssistantTree(");
  if (start < 0) return undefined;
  const end = source.indexOf("\n}\n", start);
  if (end < 0) return undefined;
  return source.slice(start, end);
}

describe("assistant-tree upgrade preserves adopter files", () => {
  it("copies only relocation-table files and leaves legacy originals", async () => {
    const rule = await ruleWith("`--upgrade-assistant-tree` copies each file");
    expect(rule).toContain("copies each file the relocation table names");
    expect(rule).toContain("A file the table does not recognise stays at its legacy path");
    expect(rule).toContain("no legacy path is deleted and no destination is overwritten");
  });

  it("excludes adopter-owned spec files and retired assistant layers", async () => {
    const rule = await ruleWith("`--upgrade-assistant-tree` copies each file");
    for (const file of ["product.md", "manifest.md", "tech.md", "structure.md"]) {
      expect(rule).toContain(file);
    }
    expect(rule).toContain("which migration step 3 merges into the spec tree");
    expect(rule).toContain("writes no migration memo");

    const seeding = await ruleWith("Init seeds `.qfai/assistant/`");
    expect(seeding).toContain(
      "It writes none of `constitution/`, `manifest/`, `catalog/`, `process/` and `steering/`",
    );
    await ruleWith("Init writes no `README.md` into `.qfai/assistant/`");
  });

  it("matches the implementation: the helper copies without removing legacy files", async () => {
    const body = upgradeHelperBody(await readRepo(IMPL));
    expect(body).toBeDefined();
    for (const remover of ["unlink(", "rename(", "rmdir(", "rm("]) {
      expect(body).not.toContain(remover);
    }
    expect(body).toContain("await writeFile(newPath, body,");
    expect(body).toContain("if (await pathExists(newPath))");
    expect(body).toContain("if (!dryRun)");
  });
});
