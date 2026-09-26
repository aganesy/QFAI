import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const readRepo = (rel: string): Promise<string> => readFile(path.join(repoRoot, rel), "utf-8");
const flat = (text: string): string => text.replace(/\s+/g, " ");

const CONTRACT = ".qfai/spec/03_contract/cli/qfai-init.md";
const IMPL = "packages/qfai/src/cli/commands/init.ts";

function upgradeHelperBody(source: string): string | undefined {
  const start = source.indexOf("async function runUpgradeAssistantTree(");
  if (start < 0) return undefined;
  const end = source.indexOf("\n}\n", start);
  if (end < 0) return undefined;
  return source.slice(start, end);
}

describe("assistant-tree upgrade preserves adopter files", () => {
  it("copies only relocation-table files and leaves legacy originals", async () => {
    const contract = flat(await readRepo(CONTRACT));
    expect(contract).toContain("A file the relocation table names is copied to its destination");
    expect(contract).toContain("An unrecognised file stays at its legacy path");
    expect(contract).toContain("no legacy path is deleted and no destination is overwritten");
  });

  it("excludes adopter-owned spec files and retired assistant layers", async () => {
    const contract = flat(await readRepo(CONTRACT));
    for (const file of ["product.md", "manifest.md", "tech.md", "structure.md"]) {
      expect(contract).toContain(file);
    }
    expect(contract).toContain("are not copied. Migration step 3 merges them into the spec tree");
    expect(contract).toContain(
      "Init writes no `README.md` or assistant `manifest/`, `catalog/`, `constitution/` or `process/` tree",
    );
    expect(contract).toContain("writes no migration memo");
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
