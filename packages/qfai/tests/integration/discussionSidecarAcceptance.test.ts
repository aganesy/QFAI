/**
 * Acceptance of how a discussion pack treats its UI artifacts: a UI-bearing
 * pack owes the current screen sidecar family to `qfai validate`, a pack that
 * is not UI-bearing owes none of it, and the shipped documents offer
 * `prototyping.yaml` only to a pack with a visual surface.
 */

import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { runCanonicalUixValidators } from "../../src/core/validators/uix/canonical.js";

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
});
