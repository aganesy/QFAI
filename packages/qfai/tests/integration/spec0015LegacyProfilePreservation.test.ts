// QFAI:SPEC-0015:TC-0015-0007
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isMap, parse, parseDocument } from "yaml";

import { runInit } from "../../src/cli/commands/init.js";
import {
  hashAssistantAssetText,
  readAssistantAssetsLock,
  writeAssistantAssetsLock,
} from "../../src/core/assistantAssetProvenance.js";
import { captureStdout } from "../helpers/stdout.js";
import { removeTempTree } from "../helpers/tempTree.js";

const CATALOG_KEY = "catalog/review-gate.rules.yml";

function mapping(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${name} is not a mapping`);
  }
  return Object.fromEntries(Object.entries(value));
}

async function init(root: string, force: boolean): Promise<void> {
  await captureStdout(async () => {
    await runInit({ dir: root, force, dryRun: false, yes: true });
  });
}

describe("TC-0015-0007: legacy profile preservation", () => {
  it("preserves adopter profile bytes and refreshes only a recorded older catalog", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-legacy-profile-"));
    try {
      await init(root, false);
      const assistant = path.join(root, ".qfai", "assistant");
      const profilesPath = path.join(assistant, "manifest", "review-profiles.yml");
      const catalogPath = path.join(assistant, "catalog", "review-gate.rules.yml");
      const currentCatalog = await readFile(catalogPath, "utf8");

      const profiles = parseDocument(await readFile(profilesPath, "utf8"));
      const profile = profiles.getIn(["optional_modes", "pattern-doubler"], true);
      if (!isMap(profile)) throw new Error("pattern-doubler profile is not a mapping");
      profile.set("default_target", "2x current ID-bearing items");
      profile.set("description", "Adopter-specific review guidance.");
      const adopterProfiles = profiles.toString({ lineWidth: 0 });
      await writeFile(profilesPath, adopterProfiles, "utf8");

      await init(root, false);
      expect(await readFile(profilesPath, "utf8")).toBe(adopterProfiles);
      expect(await readFile(catalogPath, "utf8")).toBe(currentCatalog);

      const oldCatalogDocument = parseDocument(currentCatalog);
      oldCatalogDocument.deleteIn(["optional_review_modes", "pattern-doubler"]);
      const olderCatalog = oldCatalogDocument.toString({ lineWidth: 0 });
      await writeFile(catalogPath, olderCatalog, "utf8");
      const receipt = await readAssistantAssetsLock(assistant);
      if (receipt === null) throw new Error("init wrote no asset receipt");
      receipt.files[CATALOG_KEY] = hashAssistantAssetText(olderCatalog);
      await writeAssistantAssetsLock(assistant, receipt);

      await init(root, false);
      expect(await readFile(catalogPath, "utf8")).toBe(olderCatalog);
      expect(await readFile(profilesPath, "utf8")).toBe(adopterProfiles);

      await init(root, true);
      expect(await readFile(catalogPath, "utf8")).toBe(currentCatalog);
      expect(await readFile(profilesPath, "utf8")).toBe(adopterProfiles);
      const refreshed = mapping(parse(currentCatalog), "review-gate rules");
      const modes = mapping(refreshed.optional_review_modes, "optional review modes");
      const bound = mapping(modes["pattern-doubler"], "pattern-doubler bound");
      expect(bound.numeric_targets).toBe("ignored");
      expect(bound.missing_mandatory_pairing).toBe("required");
      expect(bound.preserved_manifest_precedence).toContain("default_target");
      expect(bound.preserved_manifest_precedence).toContain(
        "Independently required gates and product obligations still apply",
      );
      expect(mapping(refreshed.required, "required obligations").spec).toEqual(
        expect.arrayContaining(["UserStories", "AcceptanceCriteria", "Examples", "TestCases"]),
      );
      expect(mapping(refreshed.quality_gates, "quality gates").defaults).toEqual(
        expect.arrayContaining([
          { id: "completion-reviewer", role: "Completion Reviewer" },
          { id: "qa-gatekeeper", role: "QA Gatekeeper" },
        ]),
      );

      const refreshedReceipt = await readAssistantAssetsLock(assistant);
      expect(refreshedReceipt?.files[CATALOG_KEY]).toBe(hashAssistantAssetText(currentCatalog));
      await writeFile(catalogPath, olderCatalog, "utf8");
      await init(root, true);
      expect(await readFile(catalogPath, "utf8")).toBe(olderCatalog);
      expect(await readFile(profilesPath, "utf8")).toBe(adopterProfiles);
    } finally {
      await removeTempTree(root);
    }
  });
});
