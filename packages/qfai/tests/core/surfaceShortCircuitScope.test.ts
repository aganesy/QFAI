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

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { validateProject } from "../../src/core/validate.js";

async function withDamagedCanonical(task: (root: string) => Promise<boolean>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-surface-scope-"));
  try {
    // A regular file where the skills **directory** belongs: the one shape a
    // later `readdir` cannot survive. A leaf replaced by a file is not — `stat`
    // succeeds on it and the parent listing skips it — and neither is a
    // symlink, cycle or not, which `withFileTypes` lists and never descends
    // into.
    await mkdir(path.join(root, ".qfai", "assistant"), { recursive: true });
    await writeFile(path.join(root, ".qfai", "assistant", "skills"), "not a directory\n", "utf-8");
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

describe("the short-circuit follows the configured skills directory", () => {
  it.skipIf(process.platform === "win32")(
    "does not stop `full` for damage outside the tree it walks",
    async () => {
      // `validateSkillsIntegrity` and `validateAssistantAssets` open the tree the
      // configuration names. A project that moved `paths.skillsDir` has its old
      // canonical walked by nobody, so pinning `.qfai/assistant` stopped `full`
      // for damage sitting outside every walk it performs.
      const root = await mkdtemp(path.join(os.tmpdir(), "qfai-surface-scope-"));
      try {
        const moved = path.join(root, "assistant-tree", "skills");
        await mkdir(moved, { recursive: true });
        await writeFile(
          path.join(root, "qfai.config.yaml"),
          ["paths:", "  skillsDir: assistant-tree/skills", ""].join("\n"),
          "utf-8",
        );
        // The abandoned default location holds the damage.
        const stale = path.join(root, ".qfai", "assistant", "skills");
        await mkdir(path.dirname(stale), { recursive: true });
        await writeFile(stale, "not a directory\n", "utf-8");
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

        const result = await validateProject(root, undefined, { profile: "full" });
        const codes = new Set(result.issues.map((entry) => entry.code));

        // The surface finding is still reported; it is just no longer a reason to
        // say nothing about everything else.
        expect(codes.has("QFAI-LINK-001")).toBe(true);
        expect(codes.size).toBeGreaterThan(1);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  );
});

describe("the short-circuit does not reach a sibling of the skills directory", () => {
  // POSIX only: the ENOTDIR shape, which Windows folds into ENOENT.
  it.skipIf(process.platform === "win32")(
    "lets `full` run when only the agents tree is a regular file",
    async () => {
      // `validateSkillsIntegrity` and `validateAssistantAssets` walk the skills
      // directory, not its parent, and a missing agent is an ordinary finding
      // rather than an exception — so damage confined to the sibling stops
      // nothing, and the spec packs and ledger are still reported.
      const root = await mkdtemp(path.join(os.tmpdir(), "qfai-surface-scope-"));
      try {
        await mkdir(path.join(root, ".qfai", "assistant", "skills"), { recursive: true });
        await writeFile(
          path.join(root, ".qfai", "assistant", "agents"),
          "not a directory\n",
          "utf-8",
        );
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

        const result = await validateProject(root, undefined, { profile: "full" });
        const codes = new Set(result.issues.map((entry) => entry.code));

        expect(codes.has("QFAI-LINK-001")).toBe(true);
        expect(codes.size).toBeGreaterThan(1);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  );
});

describe("the agents tree is walked by the profiles that read it", () => {
  it("stops `full` when a canonical agent is not a regular file", async () => {
    // `validateAgentDefinition` opens the agent pathname directly, so a
    // directory gives it `EISDIR` and a FIFO blocks it — either way taking the
    // repairable finding down with the run.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-surface-agents-"));
    try {
      await mkdir(path.join(root, ".qfai", "assistant", "skills"), { recursive: true });
      const agents = path.join(root, ".qfai", "assistant", "agents");
      await mkdir(agents, { recursive: true });
      await writeFile(path.join(agents, "README.md"), "# readme\n", "utf-8");
      // The document the roster names, replaced by a directory.
      await mkdir(path.join(agents, "completion-reviewer.md"), { recursive: true });
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

      const result = await validateProject(root, undefined, { profile: "full" });
      const codes = new Set(result.issues.map((entry) => entry.code));

      expect([...codes]).toEqual(["QFAI-LINK-001"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("the short-circuit is scoped to the profiles that walk the damage", () => {
  // POSIX only: the scenario is the ENOTDIR shape, and Windows folds that
  // errno into ENOENT, which reads as absence. CI runs the ubuntu lane.
  it.skipIf(process.platform === "win32")(
    "stops `full`, which opens the canonical tree",
    async () => {
      await withDamagedCanonical(async (root) => {
        const result = await validateProject(root, undefined, { profile: "full" });
        const codes = new Set(result.issues.map((entry) => entry.code));

        expect(codes.has("QFAI-LINK-001")).toBe(true);
        // Nothing else ran: the finding that names the path and the repair is the
        // whole output, rather than a stack trace from somebody else's `readdir`.
        expect([...codes]).toEqual(["QFAI-LINK-001"]);
        return true;
      });
    },
  );

  it.skipIf(process.platform === "win32")(
    "stops `sdd`, whose own validators read the skills directory",
    async () => {
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
    },
  );

  it.skipIf(process.platform === "win32")(
    "stops `prototyping`, whose agent-definition validator reads the skills tree",
    async () => {
      // `validateAgentDefinition` gained `QFAI-AGENT-019` / `QFAI-AGENT-015`,
      // which read every routed skill's `SKILL.md` and `readdir` the configured
      // skills directory. Listing only the agents tree for this profile left
      // that read raising `ENOTDIR` — or blocking forever on a FIFO — with the
      // finding that names the path already in hand.
      await withDamagedCanonical(async (root) => {
        const result = await validateProject(root, undefined, { profile: "prototyping" });
        const codes = new Set(result.issues.map((entry) => entry.code));

        expect([...codes]).toEqual(["QFAI-LINK-001"]);
        return true;
      });
    },
  );

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
