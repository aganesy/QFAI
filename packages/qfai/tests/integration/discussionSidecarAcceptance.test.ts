/**
 * Acceptance of how a discussion pack treats its UI artifacts: a UI-bearing
 * pack owes the current screen sidecar family to `qfai validate`, a pack that
 * is not UI-bearing owes none of it, and the shipped documents offer
 * `prototyping.yaml` only to a pack with a visual surface.
 */

import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { runCanonicalUixValidators } from "../../src/core/validators/uix/canonical.js";
import { getInitAssetsDir } from "../../src/shared/assets.js";
import { removeTempTree } from "../helpers/tempTree.js";

const roots: string[] = [];

async function newPack(context: string): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-sidecar-acceptance-"));
  roots.push(root);
  await writeFile(path.join(root, "01_Context.md"), context, "utf-8");
  return root;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => removeTempTree(root)));
});

const UI_CONTEXT = "# Context\n\n- surface: web\n";

/** A complete, valid `ui_bearing: false` Classification block. */
const NON_UI_CONTEXT = [
  "# Context",
  "",
  "## UI-bearing Classification",
  "",
  "- ui_bearing: false",
  "- primary_surface: non-ui",
  "- secondary_surfaces:",
  "- classification_rationale: Library-only change with no rendered surface.",
  "",
].join("\n");

describe("discussion sidecar acceptance", () => {
  // QFAI:AC-0001-0018-01
  it("raises no error for a pack that is not UI-bearing and has no sidecars", async () => {
    const root = await newPack(NON_UI_CONTEXT);

    const issues = await runCanonicalUixValidators(root, defaultConfig);

    expect(issues.filter((found) => found.severity === "error")).toEqual([]);

    // The same pack read as UI-bearing owes the sidecars, so the silence above
    // comes from the classification and not from the validators being inert.
    const uiRoot = await newPack(UI_CONTEXT);
    const uiIssues = await runCanonicalUixValidators(uiRoot, defaultConfig);
    expect(uiIssues.some((found) => found.code === "QFAI-SIDECAR-001")).toBe(true);
  });

  // QFAI:AC-0001-0019-01
  it("names each missing current sidecar of a UI-bearing pack in an error", async () => {
    const root = await newPack(UI_CONTEXT);
    await mkdir(path.join(root, "uiux"), { recursive: true });

    const issues = await runCanonicalUixValidators(root, defaultConfig);
    const missing = issues.filter((found) => found.code === "QFAI-THREELAYER-002");

    expect(
      missing.map((found) => ({
        file: found.file,
        severity: found.severity,
        message: found.message,
      })),
    ).toEqual(
      ["00_index.md", "40_screen_contracts.md", "50_review_input_bundle.md"].map((name) => ({
        file: `uiux/${name}`,
        severity: "error",
        message: `Required canonical sidecar file missing: uiux/${name}.`,
      })),
    );
  });

  // QFAI:AC-0001-0019-01
  it("reports a legacy evaluation heading in a current sidecar as a legacy-format error", async () => {
    const root = await newPack(UI_CONTEXT);
    await mkdir(path.join(root, "uiux"), { recursive: true });
    await writeFile(
      path.join(root, "uiux", "40_screen_contracts.md"),
      ["# Screen Contracts", "", "## craft", "", "- Legacy axis content."].join("\n"),
      "utf-8",
    );

    const issues = await runCanonicalUixValidators(root, defaultConfig);
    const legacy = issues.filter((found) => found.code === "QFAI-THREELAYER-003");

    expect(legacy).toHaveLength(1);
    expect(legacy[0]?.file).toBe("uiux/40_screen_contracts.md");
    expect(legacy[0]?.severity).toBe("error");
    expect(legacy[0]?.message).toContain(
      "Legacy evaluation headings are not allowed in uiux/40_screen_contracts.md",
    );
  });

  // QFAI:AC-0001-0015-01
  it("offers prototyping.yaml as optional to visual-surface packs and to no cli-only pack", async () => {
    const assistant = path.join(
      getInitAssetsDir(),
      ".qfai",
      "assistant",
      "skill",
      "qfai-discussion",
    );
    const documents = [
      fileURLToPath(new URL("../../README.md", import.meta.url)),
      path.join(assistant, "SKILL.md"),
      path.join(assistant, "references", "discussion-artifact-rules.md"),
    ];
    const sentence =
      "Discussion packs with a visual prototyping surface (`web`, `mobile`, `desktop`, `mixed`) may include `prototyping.yaml` as an optional recommendation artifact; cli-only packs omit it,";

    for (const document of documents) {
      const text = (await readFile(document, "utf-8")).replace(/\s+/g, " ");
      expect(text, document).toContain(sentence);
    }
  });
});
