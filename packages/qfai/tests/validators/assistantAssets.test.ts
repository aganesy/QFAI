/** The current init tree regenerates the singular skill and agent layers. */
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { collectRegeneratedAssistantFiles } from "../../src/core/assistantAssetProvenance.js";
import { defaultConfig } from "../../src/core/config.js";
import {
  NAMED_STALE_FILES,
  validateAssistantAssets,
} from "../../src/core/validators/assistantAssets.js";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const shippedAssistantDir = path.join(packageRoot, "assets", "init", ".qfai", "assistant");
const tempDirs: string[] = [];

async function newRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-assistant-assets-"));
  tempDirs.push(root);
  await mkdir(path.join(root, ".qfai", "assistant"), { recursive: true });
  return root;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});
/**
 * QFAI-ASSETS-009 — the layers `qfai init --force` regenerates.
 *
 * `skill/**` and `agent/**` are copied once and refreshed only by an explicit
 * `--force`, so an upgraded project keeps running the skill bodies it
 * initialised with and nothing said so. The shipped trees themselves are driven
 * here rather than a fixture: a fixture would still pass if the check stopped
 * reading the directories the release actually ships.
 */
describe("validateAssistantAssets — regenerated assistant layers", () => {
  async function staleFindings(root: string) {
    const issues = await validateAssistantAssets(root, defaultConfig);
    return issues.filter((found) => found.code === "QFAI-ASSETS-009");
  }

  /** The project's copy of a layer, exactly as `qfai init` would leave it. */
  async function seedLayer(root: string, layer: "skill" | "agent"): Promise<void> {
    await cp(path.join(shippedAssistantDir, layer), path.join(root, ".qfai", "assistant", layer), {
      recursive: true,
    });
  }

  /** A file inside the project's copy of a layer, by its path under that layer. */
  function layerFile(root: string, layer: "skill" | "agent", relative: string): string {
    return path.join(root, ".qfai", "assistant", layer, ...relative.split("/"));
  }

  /** The paths the release ships under one layer, in the walk's own order. */
  async function shippedUnder(layer: "skill" | "agent"): Promise<string[]> {
    return (await collectRegeneratedAssistantFiles(shippedAssistantDir, layer)).map((relative) =>
      relative.slice(layer.length + 1),
    );
  }

  it("says nothing about a project holding exactly what the release ships", async () => {
    const root = await newRoot();
    await seedLayer(root, "skill");
    await seedLayer(root, "agent");

    expect(await staleFindings(root)).toHaveLength(0);
  });

  it("reports one finding for the layer, naming the count and the remedy's cost", async () => {
    const root = await newRoot();
    await seedLayer(root, "skill");
    await seedLayer(root, "agent");
    const [first] = await shippedUnder("skill");
    expect(first, "the release must ship skills for this case to be about anything").toBeDefined();
    await writeFile(layerFile(root, "skill", first ?? ""), "behind the release\n", "utf-8");

    const findings = await staleFindings(root);

    expect(findings).toHaveLength(1);
    const [finding] = findings;
    expect(finding?.rule).toBe("assistantAssets.staleRegeneratedLayer");
    expect(finding?.file).toContain(path.join("assistant", "skill"));
    expect(finding?.message).toContain("differs from the installed release in 1 of the");
    expect(finding?.message).toContain(first ?? "");
    // The hint has to say the layer is overwritten. `QFAI-ASSETS-004` can offer
    // `--force` as a plain refresh because a diverged file is left alone; this
    // layer has no such exemption, and a hint that quietly destroys work is
    // worse than the staleness it clears.
    expect(finding?.suggested_action).toContain("qfai init --force");
    expect(finding?.suggested_action).toContain(
      "overwrites every file in that layer, local edits included",
    );
  });

  it("stays at one finding per layer when the whole tree is behind", async () => {
    const root = await newRoot();
    await seedLayer(root, "skill");
    await seedLayer(root, "agent");
    const shipped = await shippedUnder("skill");
    expect(
      shipped.length,
      "the burying this case is about needs many files to bury with",
    ).toBeGreaterThan(NAMED_STALE_FILES);
    for (const relative of shipped) {
      await writeFile(layerFile(root, "skill", relative), "behind the release\n", "utf-8");
    }

    const findings = await staleFindings(root);

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain(
      `differs from the installed release in ${String(shipped.length)} of the ${String(shipped.length)} files`,
    );
    // Named up to a cap and then counted. Listing all of them would be the
    // per-file finding this rule exists to avoid, printed inside one message.
    expect(findings[0]?.message).toContain(
      `and ${String(shipped.length - NAMED_STALE_FILES)} more`,
    );
  });

  it("reports only the layer that is behind", async () => {
    const root = await newRoot();
    await seedLayer(root, "skill");
    await seedLayer(root, "agent");
    const [first] = await shippedUnder("agent");
    await writeFile(layerFile(root, "agent", first ?? ""), "behind the release\n", "utf-8");

    const findings = await staleFindings(root);

    expect(findings.map((found) => path.basename(found.file ?? ""))).toEqual(["agent"]);
  });

  it("says nothing about a project that has no such layer", async () => {
    // Never ran `init` here, or still on the pre-recut layout. It is not behind
    // the release; it has nothing to be behind with, and naming every shipped
    // file at it would be noise rather than governance.
    const root = await newRoot();

    expect(await staleFindings(root)).toHaveLength(0);
  });

  it("leaves a file the release does not ship alone", async () => {
    // `--force` copies, it does not prune, so reporting this would name
    // something the remedy cannot clear.
    const root = await newRoot();
    await seedLayer(root, "skill");
    await seedLayer(root, "agent");
    await writeFile(layerFile(root, "agent", "project-only.md"), "ours\n", "utf-8");

    expect(await staleFindings(root)).toHaveLength(0);
  });

  it("reports at error", async () => {
    const root = await newRoot();
    await seedLayer(root, "skill");
    await seedLayer(root, "agent");
    const [first] = await shippedUnder("skill");
    await writeFile(layerFile(root, "skill", first ?? ""), "behind the release\n", "utf-8");

    const [finding] = await staleFindings(root);

    expect(finding?.severity).toBe("error");
  });
});
