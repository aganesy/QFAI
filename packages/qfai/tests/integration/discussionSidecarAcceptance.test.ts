/**
 * Acceptance of how a discussion pack treats its UI artifacts: a UI-bearing
 * pack owes the current screen sidecar family to `qfai validate`, a pack that
 * is not UI-bearing owes none of it, and the shipped documents offer
 * `prototyping.yaml` only to a pack with a visual surface.
 */

import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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

const SIDECAR_TEMPLATES = path.join(
  getInitAssetsDir(),
  ".qfai",
  "assistant",
  "skill",
  "qfai-discussion",
  "templates",
  "uiux",
);

/** A UI-bearing pack carrying the three sidecars exactly as the package ships them. */
async function packWithShippedSidecars(): Promise<string> {
  const root = await newPack(UI_CONTEXT);
  await mkdir(path.join(root, "uiux"), { recursive: true });
  for (const name of ["00_index.md", "40_screen_contracts.md", "50_review_input_bundle.md"]) {
    await copyFile(path.join(SIDECAR_TEMPLATES, name), path.join(root, "uiux", name));
  }
  return root;
}

describe("shipped UI sidecars", () => {
  // QFAI:AC-0001-0085-01
  it("ships a screen-contract sidecar that records screen-level contracts and satisfies the validators", async () => {
    const root = await packWithShippedSidecars();
    const sidecar = await readFile(path.join(root, "uiux", "40_screen_contracts.md"), "utf-8");
    expect(sidecar).toMatch(/^### Screen: /m);
    expect(sidecar).toMatch(/^- screen_id: /m);
    expect(sidecar).toMatch(/^- route: /m);

    const issues = await runCanonicalUixValidators(root, defaultConfig);
    expect(issues.filter((found) => found.file === "uiux/40_screen_contracts.md")).toEqual([]);

    await rm(path.join(root, "uiux", "40_screen_contracts.md"));
    const without = await runCanonicalUixValidators(root, defaultConfig);
    expect(
      without.filter((found) => found.code === "QFAI-THREELAYER-002").map((found) => found.file),
    ).toEqual(["uiux/40_screen_contracts.md"]);
  });

  // QFAI:AC-0001-0086-01
  it("ships a review input bundle that documents best-of-history handling, and warns for one that does not", async () => {
    const root = await packWithShippedSidecars();
    const bundlePath = path.join(root, "uiux", "50_review_input_bundle.md");
    expect(await readFile(bundlePath, "utf-8")).toMatch(/best-of-history/i);

    const issues = await runCanonicalUixValidators(root, defaultConfig);
    expect(issues.filter((found) => found.file === "uiux/50_review_input_bundle.md")).toEqual([]);

    await writeFile(
      bundlePath,
      "# Review Input Bundle\n\nEvery sidecar is listed here.\n",
      "utf-8",
    );
    const silent = await runCanonicalUixValidators(root, defaultConfig);
    const direction = silent.filter((found) => found.code === "QFAI-DIRECTION-001");
    expect(direction.map((found) => [found.file, found.severity])).toEqual([
      ["uiux/50_review_input_bundle.md", "warning"],
    ]);
  });
});
