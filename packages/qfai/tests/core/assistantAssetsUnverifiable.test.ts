import { cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Type-only, so it is erased before `vi.mock` replaces the runtime module.
import type * as AssetsModule from "../../src/shared/assets.js";

/**
 * Separate file because `vi.mock` is hoisted above the imports: the sibling
 * `assistantAssetProvenance.test.ts` needs the real `getInitAssetsDir()` for
 * every one of its cases, and one truncated install has to stand alone.
 *
 * What it pins is the fail-open half of the provenance check. `qfai init`
 * refuses to sync from an install whose governed layers it cannot read —
 * otherwise `--force` treats every rule the lock names as withdrawn and deletes
 * it — but `validate` caught the same throw and returned no findings, so the
 * identical install passed with its provenance never compared.
 */
const truncatedInstall = await mkdtemp(path.join(os.tmpdir(), "qfai-truncated-install-"));

vi.mock("../../src/shared/assets.js", async (importOriginal) => {
  const actual = await importOriginal<typeof AssetsModule>();
  return { ...actual, getInitAssetsDir: () => truncatedInstall };
});

const { defaultConfig } = await import("../../src/core/config.js");
const { validateAssistantAssets } = await import("../../src/core/validators/assistantAssets.js");
const { newRuleSeverity, RULE_PROMOTIONS } = await import("../../src/core/sunset.js");
const { resolveToolVersion } = await import("../../src/core/version.js");

/**
 * `QFAI-ASSETS-007` ships behind `RULE_PROMOTIONS.assistantAssetProvenance`
 * with the rest of the family, so the severity follows the pin rather than a
 * literal written here.
 */
async function expectedProvenanceSeverity(): Promise<"warning" | "error"> {
  return newRuleSeverity(
    await resolveToolVersion(),
    RULE_PROMOTIONS.assistantAssetProvenance.promoteAt,
  );
}
const { getInitAssetsDir: realInitAssetsDir } = await vi.importActual<typeof AssetsModule>(
  "../../src/shared/assets.js",
);

const projectRoots: string[] = [];

beforeAll(async () => {
  // `constitution/` extracted, `catalog/` not — the shape a partial unpack or a
  // library consumer without the package assets leaves behind.
  const assistant = path.join(truncatedInstall, ".qfai", "assistant");
  await mkdir(assistant, { recursive: true });
  await cp(
    path.join(realInitAssetsDir(), ".qfai", "assistant", "constitution"),
    path.join(assistant, "constitution"),
    { recursive: true },
  );
});

afterAll(async () => {
  await rm(truncatedInstall, { recursive: true, force: true });
  while (projectRoots.length > 0) {
    const root = projectRoots.pop();
    if (root) {
      await rm(root, { recursive: true, force: true });
    }
  }
});

describe("assistant asset provenance against an unreadable install", () => {
  it("reports that provenance could not be verified instead of passing", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-truncated-project-"));
    projectRoots.push(root);
    const assistant = path.join(root, ".qfai", "assistant");
    await mkdir(path.join(assistant, "catalog"), { recursive: true });
    await cp(
      path.join(realInitAssetsDir(), ".qfai", "assistant", "constitution"),
      path.join(assistant, "constitution"),
      { recursive: true },
    );

    const issues = await validateAssistantAssets(root, defaultConfig);
    const unverifiable = issues.filter((found) => found.code === "QFAI-ASSETS-007");
    expect(unverifiable).toHaveLength(1);
    expect(unverifiable[0]?.severity).toBe(await expectedProvenanceSeverity());
    expect(unverifiable[0]?.rule).toBe("assistantAssets.unverifiableProvenance");
    // The three provenance verdicts are unreachable without a shipped set, so
    // none of them may be claimed either way.
    for (const code of ["QFAI-ASSETS-003", "QFAI-ASSETS-004", "QFAI-ASSETS-005"]) {
      expect(issues.map((found) => found.code)).not.toContain(code);
    }
  });
});
