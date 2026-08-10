/**
 * Unwalkable canonical damage stopped every profile, not the ones that walk it.
 *
 * `inspectIntegrationSurface` reports paths under `.qfai/assistant/**` that a
 * later `readdir` cannot survive, and the run stops there so a profile
 * validator does not crash into the same `ELOOP` / `ENOTDIR` and take the
 * finding down with it. But only `validateSkillsIntegrity` and
 * `validateAssistantAssets` open that tree, and they run under `verify` /
 * `full` alone — so `discussion`, `sdd`, `atdd` and `tdd` were being stopped
 * for damage none of their validators would have touched, hiding every
 * independent defect in the spec packs, the ledger and the discussion packs
 * until the surface had been repaired and the run repeated.
 */

import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { validateProject } from "../../src/core/validate.js";

async function withDamagedCanonical(task: (root: string) => Promise<boolean>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-surface-scope-"));
  try {
    const skills = path.join(root, ".qfai", "assistant", "skills");
    await mkdir(skills, { recursive: true });
    // Real symlinks need Developer Mode or elevation on Windows; without them
    // the scenario cannot be built at all.
    const canonical = path.join(skills, "qfai-atdd");
    const loop = path.join(skills, "loop");
    try {
      await symlink(loop, canonical, "dir");
      await symlink(canonical, loop, "dir");
    } catch {
      return;
    }
    // Enough of a surface that init counts as having run here.
    await writeFile(
      path.join(root, ".qfai", "assistant", "README.md"),
      [
        "# QFAI assistant tree",
        "",
        "## Canonical entrypoint",
        "",
        "- .qfai/assistant/skills/",
        "",
      ].join("\n"),
      "utf-8",
    );
    // An obligation the ATDD validators own and nothing discharges — a defect
    // that has nothing to do with the assistant tree, and the one the profile
    // was being stopped from reporting.
    const specDir = path.join(root, ".qfai", "specs", "spec-0001");
    await mkdir(specDir, { recursive: true });
    await writeFile(path.join(specDir, "01_Spec.md"), "# 01 Spec\n", "utf-8");
    await writeFile(
      path.join(specDir, "02_User-stories.md"),
      ["# 02 User stories", "", "## US-0001: a story", "- Parent: CAP-0001", ""].join("\n"),
      "utf-8",
    );
    await writeFile(
      path.join(specDir, "06_Test-Cases.md"),
      ["# 06 Test cases", "", "## TC-0001: a case", "- Level: L4", "- US-Refs: US-0001", ""].join(
        "\n",
      ),
      "utf-8",
    );
    await task(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("the short-circuit is scoped to the profiles that walk the damage", () => {
  it("stops `full`, which opens the canonical tree", async () => {
    await withDamagedCanonical(async (root) => {
      const result = await validateProject(root, undefined, { profile: "full" });
      const codes = new Set(result.issues.map((entry) => entry.code));

      expect(codes.has("QFAI-LINK-001")).toBe(true);
      // Nothing else ran: the finding that names the path and the repair is the
      // whole output, rather than a stack trace from somebody else's `readdir`.
      expect([...codes]).toEqual(["QFAI-LINK-001"]);
      return true;
    });
  });

  it("stops `sdd`, whose own validators read the skills directory", async () => {
    // `validateSkillDocReferences`, `validateAutopilotPolicy` and
    // `validateStaleReferences` all `readdir` the configured skills directory,
    // so excluding `sdd` by name left one of them raising `ELOOP` and losing
    // the finding that names the path and the repair.
    await withDamagedCanonical(async (root) => {
      const result = await validateProject(root, undefined, { profile: "sdd" });
      const codes = new Set(result.issues.map((entry) => entry.code));

      expect([...codes]).toEqual(["QFAI-LINK-001"]);
      return true;
    });
  });

  it("lets `atdd` report its own findings, which do not touch that tree", async () => {
    await withDamagedCanonical(async (root) => {
      const result = await validateProject(root, undefined, { profile: "atdd" });
      const codes = new Set(result.issues.map((entry) => entry.code));

      expect(codes.has("QFAI-LINK-001")).toBe(true);
      // The surface is still reported — it is just no longer a reason to say
      // nothing about the spec packs and the ledger.
      expect(codes.size).toBeGreaterThan(1);
      return true;
    });
  });
});
