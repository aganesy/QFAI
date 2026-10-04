import { chmod, mkdtemp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { runSddPreflight } from "../../src/core/preflight/sddPreflight.js";

const DISCUSSION_PACK_FILES = [
  "01_Context.md",
  "03_Story-Workshop.md",
  "04_Sources.md",
  "05_Scope.md",
  "06_REQ.md",
  "07_NFR.md",
  "08_Glossary.md",
  "09_Constraints.md",
  "11_OQ-Register.md",
] as const;

describe("runSddPreflight", () => {
  it("returns ready when latest discussion-pack passes readiness checks", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await seedDiscussionPack(root, "20260216010102003");

      const result = await runSddPreflight(root, defaultConfig, {
        assumptions: ["Detailing CAP-0003 is deferred to the next phase"],
      });

      expect(result.status).toBe("ready");
      expect(result.source).toBe("discussion-pack");
      expect(result.importedReqCount).toBe(2);
      expect(result.blockers).toHaveLength(0);
      // A complete pack owes no gap either. Without this the case reads only
      // `status`, and every pack discrepancy now leaves that at `ready` — so a
      // required file the pack does not hold would pass unremarked.
      expect(result.packGaps).toEqual([]);
      expect(result.selectedInputPath).toContain("discussion-20260216010102003");

      const summary = await readFile(result.preflightSummaryPath, "utf-8");
      expect(summary).toContain("status: ready");
      expect(summary).toContain("source: discussion-pack");
      expect(summary).toContain("Imported REQ count: 2");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("returns blocked when discussion-pack is missing", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      const result = await runSddPreflight(root, defaultConfig);

      expect(result.status).toBe("blocked");
      expect(result.source).toBe("discussion-pack");
      expect(result.selectedInputPath).toBeNull();
      expect(result.blockers.some((item) => item.includes("latest discussion-pack"))).toBe(true);
      expect(result.nextCommands).toEqual(["/qfai-discussion"]);

      const summary = await readFile(result.preflightSummaryPath, "utf-8");
      expect(summary).toContain("status: blocked");
      expect(summary).toContain("/qfai-discussion");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("selects an imported specification when no discussion pack exists", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      const imported = path.join(root, "docs", "imported-spec.md");
      await mkdir(path.dirname(imported), { recursive: true });
      await writeFile(imported, "# Imported specification\n", "utf-8");

      const result = await runSddPreflight(root, defaultConfig, { importPath: imported });

      expect(result.status).toBe("ready");
      expect(result.source).toBe("import-lite");
      expect(result.selectedInputPath).toBe(imported);
      expect(result.importedReqCount).toBeNull();
      expect(result.blockers).toEqual([]);
      expect(result.nextCommands).toEqual(["/qfai-sdd"]);
      const summary = await readFile(result.preflightSummaryPath, "utf-8");
      expect(summary).toContain("source: import-lite");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("stays blocked and names an imported specification that is not a readable file", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      const missing = path.join(root, "docs", "missing.md");
      const result = await runSddPreflight(root, defaultConfig, { importPath: missing });

      expect(result.status).toBe("blocked");
      expect(result.source).toBe("discussion-pack");
      expect(result.blockers.some((item) => item.includes(missing))).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("keeps a misnamed discussion pack blocking when an imported specification is given", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await mkdir(path.join(root, ".qfai", "discussion", "discussion-latest"), {
        recursive: true,
      });
      const imported = path.join(root, "docs", "imported-spec.md");
      await mkdir(path.dirname(imported), { recursive: true });
      await writeFile(imported, "# Imported specification\n", "utf-8");

      const result = await runSddPreflight(root, defaultConfig, { importPath: imported });

      expect(result.status).toBe("blocked");
      expect(result.blockers.some((item) => item.includes("discussion-latest"))).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it.skipIf(process.platform === "win32" || process.getuid?.() === 0)(
    "stays blocked on an imported specification this process cannot read",
    async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
      const imported = path.join(root, "imported-spec.md");
      try {
        await writeFile(imported, "# Imported specification\n", "utf-8");
        await chmod(imported, 0o000);

        const result = await runSddPreflight(root, defaultConfig, { importPath: imported });

        expect(result.status).toBe("blocked");
        expect(result.blockers.some((item) => item.includes(imported))).toBe(true);
      } finally {
        await chmod(imported, 0o600);
        await rm(root, { recursive: true, force: true });
      }
    },
  );

  it.each([
    ["02_Inception-Deck.md", "01_Context.md"],
    ["10_Policy.md", "09_Constraints.md"],
    ["13_Deferred.md", "11_OQ-Register.md"],
  ])("lists %s left in the pack as a gap naming %s", async (legacy, target) => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await seedDiscussionPack(root, "20260216010102004");
      await writeFile(
        path.join(root, ".qfai", "discussion", "discussion-20260216010102004", legacy),
        `# ${legacy}\n`,
        "utf-8",
      );

      const result = await runSddPreflight(root, defaultConfig);

      expect(result.status).toBe("ready");
      expect(result.packGaps).toContain(
        `Files whose content has moved and that the pack still holds: ${legacy} → ${target}`,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("keeps carry-over open questions in the summary a blocked run writes", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      const result = await runSddPreflight(root, defaultConfig, {
        assumptions: ["W-PENDING-PROMOTION: promote in Stage 1"],
      });

      expect(result.status).toBe("blocked");
      expect(result.openQuestions).toEqual(["W-PENDING-PROMOTION: promote in Stage 1"]);

      const summary = await readFile(result.preflightSummaryPath, "utf-8");
      expect(summary).toContain("## Open Questions (Carry-over)");
      expect(summary).toContain("- W-PENDING-PROMOTION: promote in Stage 1");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("lists a Story Workshop with no Mermaid diagram as a gap, and continues", async () => {
    // `QFAI-DPACK-008` reports this at `error`, but `validate --profile sdd`
    // does not run the discussion validator — so Stage 0 is the only place a
    // pack with no flow is named before Stage 1. Named, not stopped: the pack
    // is non-normative reference material.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await seedDiscussionPack(root, "20260216010203031", {
        "03_Story-Workshop.md": [
          "# 03 Story Workshop",
          "",
          "The user opens the dashboard, checks the day's schedule, and then moves on to the detail screen.",
          "This section meets the minimum length but does not carry the flow as a diagram.",
        ].join("\n"),
      });

      const result = await runSddPreflight(root, defaultConfig);

      expect(result.status).toBe("ready");
      expect(result.blockers).toEqual([]);
      expect(result.packGaps.some((item) => item.includes("Mermaid"))).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("continues on a pack missing a required file, and names the file once", async () => {
    // The approved restatement of the usable-source criterion: a pack that
    // exists but is incomplete does not stop SDD. The missing file is a gap,
    // and naming its missing diagram as well would report one defect twice.
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await seedDiscussionPack(root, "20260216010203032");
      await rm(
        path.join(
          root,
          ".qfai",
          "discussion",
          "discussion-20260216010203032",
          "03_Story-Workshop.md",
        ),
        { force: true },
      );

      const result = await runSddPreflight(root, defaultConfig);

      expect(result.status).toBe("ready");
      expect(result.source).toBe("discussion-pack");
      expect(result.blockers).toEqual([]);
      expect(result.packGaps.some((item) => item.includes("Missing required files"))).toBe(true);
      expect(result.packGaps.some((item) => item.includes("Mermaid"))).toBe(false);

      const summary = await readFile(result.preflightSummaryPath, "utf-8");
      expect(summary).toContain("## Pack Gaps");
      expect(summary).toContain("03_Story-Workshop.md");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("lists a deferred OQ that names no reopening point as a gap", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await seedDiscussionPack(root, "20260216010203030", {
        "11_OQ-Register.md": [
          "# 11 OQ Register",
          "",
          "| OQ-ID   | Question                   | Disposition | Gate       | Rationale                          | Resolution | Next-Decision-Point |",
          "| ------- | -------------------------- | ----------- | ---------- | ---------------------------------- | ---------- | ------------------- |",
          "| OQ-0007 | How should contract versioning be decided | deferred | discussion | Does not affect starting implementation, so it is deferred | Ship unversioned contracts for now | TBD |",
          "",
          "Note: an OQ marked deferred names the next point at which it is decided.",
        ].join("\n"),
      });

      const result = await runSddPreflight(root, defaultConfig);

      expect(result.status).toBe("ready");
      expect(
        result.packGaps.some((item) => item.includes("lack a Resolution or a Next-Decision-Point")),
      ).toBe(true);
      expect(result.packGaps.some((item) => item.includes("OQ-0007"))).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("counts REQ intake rows, not REQ references inside a description", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await seedDiscussionPack(root, "20260216010203031", {
        "06_REQ.md": [
          "# 06 REQ",
          "",
          "| REQ-ID   | Title            | Description                              | Source   | Priority | Status |",
          "| -------- | ---------------- | ---------------------------------------- | -------- | -------- | ------ |",
          "| REQ-0001 | Save requirement set   | Requirement sets can be saved for audit purposes       | SRC-0001 | must     | draft  |",
          "| REQ-0002 | Reload requirement set | Depends on REQ-0001 and reloads the saved content      | SRC-0001 | must     | draft  |",
          "",
          "Note: data confirming that cross-references in Description do not inflate the intake count.",
        ].join("\n"),
      });

      const result = await runSddPreflight(root, defaultConfig);

      expect(result.status).toBe("ready");
      expect(result.importedReqCount).toBe(2);

      const summary = await readFile(result.preflightSummaryPath, "utf-8");
      expect(summary).toContain("Imported REQ count: 2");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("continues on a pack carrying a blocking OQ, and lists it", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await seedDiscussionPack(root, "20260216010203004", {
        "11_OQ-Register.md": [
          "# 11 OQ Register",
          "",
          "### OQ-0009: architecture decision pending",
          "- Disposition: open",
          "- Gate: sdd",
          "- Reason: database migration strategy is under discussion",
          "",
          "Note: test data confirming that this OQ does not stop the v1.4.36 preflight.",
        ].join("\n"),
      });

      const result = await runSddPreflight(root, defaultConfig);

      expect(result.status).toBe("ready");
      expect(result.packGaps.some((item) => item.includes("OQ-0009"))).toBe(true);

      const summary = await readFile(result.preflightSummaryPath, "utf-8");
      expect(summary).toContain("Blocking OQ");
      expect(summary).toContain("OQ-0009");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("ignores unscoped disposition guidance lines in OQ register", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await seedDiscussionPack(root, "20260216010203005", {
        "11_OQ-Register.md": [
          "# 11 OQ Register",
          "",
          "Operating rule: set `- Disposition: open` on unresolved items.",
          "",
          "### OQ-0010: rollout memo refinement",
          "- Disposition: deferred",
          "- Gate: discussion",
          "- Resolution: keep the current rollout memo.",
          "- Next-Decision-Point: before the rollout starts.",
          "- Reason: supporting information before implementation starts, so it can be deferred in this phase.",
          "",
        ].join("\n"),
      });

      const result = await runSddPreflight(root, defaultConfig);

      expect(result.status).toBe("ready");
      expect(result.blockers).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not block when latest non-ui discussion pack omits prototyping.yaml", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260216010203016");
      await mkdir(packDir, { recursive: true });

      for (const fileName of DISCUSSION_PACK_FILES) {
        const content =
          fileName === "01_Context.md"
            ? [
                "# 01_Context.md",
                "",
                "## UI-bearing Classification",
                "",
                "- ui_bearing: false",
                "- primary_surface: non-ui",
                "- secondary_surfaces:",
                "- classification_rationale: This pack documents a non-UI workflow.",
                "",
                "Note: a non-ui latest discussion pack does not need prototyping.yaml.",
              ].join("\n")
            : defaultDiscussionPackContent(fileName);
        await writeFile(path.join(packDir, fileName), `${content}\n`, "utf-8");
      }

      const result = await runSddPreflight(root, defaultConfig);

      expect(result.status).toBe("ready");
      expect(result.blockers).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // The skill path has to reach the same verdict this function does. `/qfai-sdd`
  // Stage 0 once said to STOP on a `prototyping.yaml` that does not parse, while
  // this preflight answers `ready` for the very same input — so whether SDD could
  // proceed depended on which entry point you came in through, and a project
  // carrying an old-format file could not run the skill at all. Assert both
  // halves in one place: the runtime verdict, and the shipped prose that
  // describes it.
  it("agrees with the shipped Stage 0 playbook that a malformed file is not a blocker", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await seedDiscussionPack(root, "20260216010203099");
      await writeFile(
        path.join(root, ".qfai", "discussion", "discussion-20260216010203099", "prototyping.yaml"),
        "prototyping: invalid\n",
        "utf-8",
      );

      const result = await runSddPreflight(root, defaultConfig);
      expect(result.status).toBe("ready");
      expect(result.blockers).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }

    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const playbookRel = "assistant/skill/qfai-sdd/references/sdd-execution-playbook.md";
    for (const tree of ["packages/qfai/assets/init/.qfai", ".qfai"]) {
      const playbook = (await readFile(path.join(repoRoot, tree, playbookRel), "utf-8")).replace(
        /\s*\n\s*/g,
        " ",
      );
      expect(playbook, `${tree} Stage 0 still stops where this preflight continues`).not.toContain(
        "Stop if `prototyping.yaml` is present in the latest UI-bearing pack",
      );
      expect(playbook).toContain("A pack discrepancy does not itself block SDD.");
    }
  });

  // W-4.10: non-object namespaced block blocks preflight
  it("does not block when prototyping.yaml has scalar namespaced block", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await seedDiscussionPack(root, "20260216010203014");
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260216010203014");
      await writeFile(path.join(packDir, "prototyping.yaml"), "prototyping: invalid\n", "utf-8");

      const result = await runSddPreflight(root, defaultConfig);

      expect(result.status).toBe("ready");
      expect(result.blockers).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not block when prototyping.yaml has null namespaced block", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await seedDiscussionPack(root, "20260216010203015");
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260216010203015");
      await writeFile(path.join(packDir, "prototyping.yaml"), "prototyping: null\n", "utf-8");

      const result = await runSddPreflight(root, defaultConfig);

      expect(result.status).toBe("ready");
      expect(result.blockers).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not block when prototyping.yaml has valid namespaced schema", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await seedDiscussionPack(root, "20260216010203012");

      const result = await runSddPreflight(root, defaultConfig);

      expect(result.status).toBe("ready");
      expect(result.blockers).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not block when contradictory non-ui classification omits prototyping.yaml", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260216010203020");
      await mkdir(packDir, { recursive: true });

      for (const fileName of DISCUSSION_PACK_FILES) {
        const content =
          fileName === "01_Context.md"
            ? [
                "# 01_Context.md",
                "",
                "## UI-bearing Classification",
                "",
                "- ui_bearing: false",
                "- primary_surface: non-ui",
                "- secondary_surfaces:",
                "  - web",
                "- classification_rationale: Contradictory classification.",
                "",
              ].join("\n")
            : defaultDiscussionPackContent(fileName);
        await writeFile(path.join(packDir, fileName), `${content}\n`, "utf-8");
      }
      // Do NOT write prototyping.yaml

      const result = await runSddPreflight(root, defaultConfig);

      expect(result.status).toBe("ready");
      expect(result.blockers).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not block when classification is missing and prototyping.yaml is absent", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      const packDir = path.join(root, ".qfai", "discussion", "discussion-20260216010203021");
      await mkdir(packDir, { recursive: true });

      for (const fileName of DISCUSSION_PACK_FILES) {
        const content =
          fileName === "01_Context.md"
            ? [
                "# 01_Context.md",
                "",
                "This context file has no classification block at all.",
                "The validator should treat this as prototyping-required.",
                "",
              ].join("\n")
            : defaultDiscussionPackContent(fileName);
        await writeFile(path.join(packDir, fileName), `${content}\n`, "utf-8");
      }
      // Do NOT write prototyping.yaml

      const result = await runSddPreflight(root, defaultConfig);

      expect(result.status).toBe("ready");
      expect(result.blockers).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("returns blocked with dangerous naming details when canonical pack is missing", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await mkdir(path.join(root, ".qfai", "discussion", "discussion-latest"), {
        recursive: true,
      });

      const result = await runSddPreflight(root, defaultConfig);

      expect(result.status).toBe("blocked");
      expect(result.selectedInputPath).toBeNull();
      expect(result.blockers.some((item) => item.includes("latest discussion-pack"))).toBe(true);
      expect(result.blockers.some((item) => item.includes("discussion-latest"))).toBe(true);

      const summary = await readFile(result.preflightSummaryPath, "utf-8");
      expect(summary).toContain("status: blocked");
      expect(summary).toContain("discussion-latest");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("writes the summary into a run-scoped directory and mirrors it to the latest pointer", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await seedDiscussionPack(root, "20260216010102010");

      const result = await runSddPreflight(root, defaultConfig);
      const reportRoot = path.join(root, ".qfai", "report");

      expect(result.runId).toMatch(/^run-\d{17}$/);
      expect(result.preflightSummaryPath).toBe(
        path.join(reportRoot, "preflight", result.runId, "preflight_summary.md"),
      );
      expect(result.latestPreflightSummaryPath).toBe(path.join(reportRoot, "preflight_summary.md"));

      const runScoped = await readFile(result.preflightSummaryPath, "utf-8");
      const latest = await readFile(result.latestPreflightSummaryPath, "utf-8");
      expect(runScoped).toContain(`run id: ${result.runId}`);
      expect(latest).toBe(runScoped);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("keeps an earlier run's summary readable after a later preflight", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      const first = await runSddPreflight(root, defaultConfig);
      await seedDiscussionPack(root, "20260216010102011");
      const second = await runSddPreflight(root, defaultConfig);

      expect(second.runId).not.toBe(first.runId);

      const firstSummary = await readFile(first.preflightSummaryPath, "utf-8");
      const secondSummary = await readFile(second.preflightSummaryPath, "utf-8");
      expect(firstSummary).toContain("status: blocked");
      expect(secondSummary).toContain("status: ready");

      const latest = await readFile(second.latestPreflightSummaryPath, "utf-8");
      expect(latest).toBe(secondSummary);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  // Run directories are named from the run's START time, so a slow preflight
  // started first can finish last. An unconditional pointer write then left
  // `preflight_summary.md` describing the older run while a newer
  // `preflight/run-*` sat beside it.
  it("does not let an older run overwrite a newer run's latest pointer", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await seedDiscussionPack(root, "20260216010102013");

      // The newer run publishes first; the older one finishes after it.
      const newer = await runSddPreflight(root, defaultConfig, {
        startedAt: new Date("2026-02-16T02:00:00.000Z"),
      });
      const older = await runSddPreflight(root, defaultConfig, {
        startedAt: new Date("2026-02-16T01:00:00.000Z"),
      });

      expect(older.runId < newer.runId).toBe(true);

      // The older run still owns its own run-scoped evidence...
      const olderSummary = await readFile(older.preflightSummaryPath, "utf-8");
      expect(olderSummary).toContain(older.runId);

      // ...but the pointer keeps naming the newest run.
      const latest = await readFile(newer.latestPreflightSummaryPath, "utf-8");
      expect(latest).toContain(newer.runId);
      expect(latest).not.toContain(older.runId);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reads the pointer's own run id when the newer run directory is gone", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await seedDiscussionPack(root, "20260216010102014");

      const newer = await runSddPreflight(root, defaultConfig, {
        startedAt: new Date("2026-02-16T02:00:00.000Z"),
      });
      // Prune the newer run's directory, leaving only the pointer it wrote —
      // the second guard is the only thing left to notice it.
      await rm(path.dirname(newer.preflightSummaryPath), { recursive: true, force: true });

      const older = await runSddPreflight(root, defaultConfig, {
        startedAt: new Date("2026-02-16T01:00:00.000Z"),
      });

      const latest = await readFile(older.latestPreflightSummaryPath, "utf-8");
      expect(latest).toContain(newer.runId);
      expect(latest).not.toContain(older.runId);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("still refreshes the pointer when this run is the newest", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await seedDiscussionPack(root, "20260216010102015");

      const older = await runSddPreflight(root, defaultConfig, {
        startedAt: new Date("2026-02-16T01:00:00.000Z"),
      });
      const newer = await runSddPreflight(root, defaultConfig, {
        startedAt: new Date("2026-02-16T02:00:00.000Z"),
      });

      const latest = await readFile(newer.latestPreflightSummaryPath, "utf-8");
      expect(latest).toContain(newer.runId);
      expect(latest).not.toContain(older.runId);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("keeps preflight runs out of the validate run-log namespace", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
    try {
      await seedDiscussionPack(root, "20260216010102012");

      const result = await runSddPreflight(root, defaultConfig);
      const reportRoot = path.join(root, ".qfai", "report");
      const entries = await readdir(reportRoot, { withFileTypes: true });

      // `<outDir>/run-*` belongs to `writeValidateRunLog`; a preflight directory
      // there would become the "newest `run-*`" the Validate Hard Gate reads.
      expect(entries.filter((entry) => entry.name.startsWith("run-"))).toEqual([]);
      expect(result.preflightSummaryPath).toContain(`${path.sep}preflight${path.sep}`);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

async function seedDiscussionPack(
  root: string,
  timestamp: string,
  overrides: Partial<Record<(typeof DISCUSSION_PACK_FILES)[number], string>> = {},
): Promise<void> {
  const discussionDir = path.join(root, ".qfai", "discussion", `discussion-${timestamp}`);
  await mkdir(discussionDir, { recursive: true });

  for (const fileName of DISCUSSION_PACK_FILES) {
    const content = overrides[fileName] ?? defaultDiscussionPackContent(fileName);
    await writeFile(path.join(discussionDir, fileName), `${content}\n`, "utf-8");
  }

  // Required side artifact
  await writeFile(
    path.join(discussionDir, "prototyping.yaml"),
    [
      "prototyping:",
      "  recommended_mode: full-harness",
      "  rationale: UI validation is recommended.",
      "  allowed_modes:",
      "    - full-harness",
      "  surface: web",
    ].join("\n"),
    "utf-8",
  );
}

function defaultDiscussionPackContent(fileName: (typeof DISCUSSION_PACK_FILES)[number]): string {
  switch (fileName) {
    case "03_Story-Workshop.md":
      return [
        "# 03 Story Workshop",
        "",
        "```mermaid",
        "sequenceDiagram",
        "  participant U as User",
        "  participant S as System",
        "  U->>S: request",
        "```",
        "",
        "Note: test data for a Story Workshop that contains a Mermaid diagram.",
      ].join("\n");
    case "06_REQ.md":
      return [
        "# 06 REQ",
        "",
        "- REQ-0001: The user can save a requirement set. Audit compliance is the background need.",
        "- REQ-0002: The system can reload a saved requirement set, including an integrity check on reload.",
        "",
        "Note: the description keeps enough characters to pass the minimum-content check.",
      ].join("\n");
    case "11_OQ-Register.md":
      return [
        "# 11 OQ Register",
        "",
        "### OQ-0001: contract versioning policy",
        "- Disposition: deferred",
        "- Gate: discussion",
        "- Resolution: ship without contract versioning for now.",
        "- Next-Decision-Point: the next cycle review, or the first breaking contract change.",
        "- Reason: it does not affect starting the v1.4.36 implementation at this stage, so it is deferred.",
        "",
        "Note: this does not meet the blocking condition (Disposition=open).",
      ].join("\n");
    default:
      return [
        `# ${fileName}`,
        "",
        "This file is dummy body text for preflight tests.",
        "It describes the spec intent and constraints to meet the minimum 100-character requirement.",
        "It includes real sentences, not only template placeholders, to avoid the validator's incomplete verdict.",
        ...requiredSections(fileName),
      ].join("\n");
  }
}

/** The sections readiness requires of a context or constraints file. */
function requiredSections(fileName: (typeof DISCUSSION_PACK_FILES)[number]): string[] {
  if (fileName === "01_Context.md") return ["", "## Inception Deck", "", "Why we are here."];
  if (fileName !== "09_Constraints.md") return [];
  return [
    "Security Policy",
    "Compliance Policy",
    "Development Policy",
    "Operational Policy",
  ].flatMap((section) => ["", `## ${section}`, "", "None."]);
}
