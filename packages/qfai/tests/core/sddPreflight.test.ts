import { chmod, mkdtemp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { defaultConfig } from "../../src/core/config.js";
import { runSddPreflight } from "../../src/core/preflight/sddPreflight.js";

const RECORD_NAME = "20261112093000-task-dashboard.md";

/** A record with one settled answer, one unanswered row and a contradiction. */
const RECORD_WITH_OPEN_ROWS = [
  "# Deliberation record: task dashboard",
  "",
  "## Subject",
  "",
  "Settle the dashboard's first release.",
  "",
  "## discussion",
  "",
  "### Interview",
  "",
  "| Background | Option 1 | Option 2 | Option 3 | Option 4 (other) | Chosen option number |",
  "| ---------- | -------- | -------- | -------- | ---------------- | -------------------- |",
  "| Which surface first? | web | mobile | desktop | | 1 |",
  "| Which export format? | CSV | PDF | | | |",
  "| Which surface first, again? | mobile | web | | | 1 |",
  "",
  "### Agent decisions",
  "",
  "| Background | Option 1 | Option 2 | Option 3 | Option 4 (other) | Chosen option number |",
  "| ---------- | -------- | -------- | -------- | ---------------- | -------------------- |",
  "",
].join("\n");

async function withRoot(body: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-preflight-"));
  try {
    await body(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function seedRecord(root: string, name = RECORD_NAME, text = RECORD_WITH_OPEN_ROWS) {
  const recordPath = path.join(root, ".qfai", "deliberation", name);
  await mkdir(path.dirname(recordPath), { recursive: true });
  await writeFile(recordPath, text, "utf-8");
  return recordPath;
}

describe("runSddPreflight", () => {
  // QFAI:EX-0001-0151-02
  it("passes a named record that leaves questions open to SDD unchanged", async () => {
    await withRoot(async (root) => {
      const recordPath = await seedRecord(root);
      const before = await readFile(recordPath, "utf-8");

      const result = await runSddPreflight(root, defaultConfig, {
        recordPath: path.relative(root, recordPath),
      });

      expect(result.status).toBe("ready");
      expect(result.source).toBe("deliberation-record");
      expect(result.selectedInputPath).toBe(recordPath);
      expect(result.blockers).toEqual([]);
      expect(await readFile(recordPath, "utf-8")).toBe(before);

      const summary = await readFile(result.preflightSummaryPath, "utf-8");
      expect(summary).toContain("status: ready");
      expect(summary).toContain("source: deliberation-record");
      expect(summary).toContain(`selected deliberation-record: ${recordPath}`);
      expect(summary).not.toMatch(/REQ/);
    });
  });

  it("reads a bare record name against the deliberation directory", async () => {
    await withRoot(async (root) => {
      const recordPath = await seedRecord(root);

      const result = await runSddPreflight(root, defaultConfig, { recordPath: RECORD_NAME });

      expect(result.status).toBe("ready");
      expect(result.selectedInputPath).toBe(recordPath);
    });
  });

  it("reads the record from the configured deliberation directory", async () => {
    await withRoot(async (root) => {
      const recordPath = path.join(root, "notes", "records", RECORD_NAME);
      await mkdir(path.dirname(recordPath), { recursive: true });
      await writeFile(recordPath, RECORD_WITH_OPEN_ROWS, "utf-8");
      const config = {
        ...defaultConfig,
        paths: { ...defaultConfig.paths, deliberationDir: "notes/records" },
      };

      const result = await runSddPreflight(root, config, { recordPath: RECORD_NAME });

      expect(result.selectedInputPath).toBe(recordPath);
    });
  });

  it("prefers the named record to an imported specification", async () => {
    await withRoot(async (root) => {
      const recordPath = await seedRecord(root);
      const imported = path.join(root, "docs", "imported-spec.md");
      await mkdir(path.dirname(imported), { recursive: true });
      await writeFile(imported, "# Imported specification\n", "utf-8");

      const result = await runSddPreflight(root, defaultConfig, {
        recordPath: RECORD_NAME,
        importPath: imported,
      });

      expect(result.source).toBe("deliberation-record");
      expect(result.selectedInputPath).toBe(recordPath);
    });
  });

  it("stops on a named record that is not a readable file, even with an import", async () => {
    await withRoot(async (root) => {
      const imported = path.join(root, "imported-spec.md");
      await writeFile(imported, "# Imported specification\n", "utf-8");

      const result = await runSddPreflight(root, defaultConfig, {
        recordPath: "20261112093000-missing.md",
        importPath: imported,
      });

      expect(result.status).toBe("blocked");
      expect(result.source).toBeNull();
      expect(result.selectedInputPath).toBeNull();
      expect(result.blockers).toEqual([
        "The deliberation record 20261112093000-missing.md is not a readable file.",
      ]);
    });
  });

  // QFAI:EX-0001-0148-03
  // QFAI:EX-0001-0151-01
  it("blocks, selects no input and names a blocker when no usable source exists", async () => {
    await withRoot(async (root) => {
      const result = await runSddPreflight(root, defaultConfig);

      expect(result.status).toBe("blocked");
      expect(result.source).toBeNull();
      expect(result.selectedInputPath).toBeNull();
      expect(result.blockers).toHaveLength(1);
      expect(result.blockers[0]).toContain(
        "No deliberation record of the run or named in the work order exists",
      );
      expect(result.nextCommands).toEqual(["/qfai-discussion"]);
      expect(await readdir(path.join(root, ".qfai"))).toEqual(["report"]);

      const summary = await readFile(result.preflightSummaryPath, "utf-8");
      expect(summary).toContain("status: blocked");
      expect(summary).toContain("- selected input: (none)");
      for (const guidance of [
        ".qfai/assistant/skill/qfai-sdd/references/sdd-execution-playbook.md#stage-0-source-inventory",
        "--import <path>",
        "Use `/qfai-discussion` only when no deliberation record",
      ]) {
        expect(result.blockers[0]).toContain(guidance);
        expect(summary).toContain(guidance);
      }
    });
  });

  // QFAI:EX-0001-0017-02
  it("lists the records it finds and picks none when none is named", async () => {
    await withRoot(async (root) => {
      await seedRecord(root, "20261112093000-task-dashboard.md");
      await seedRecord(root, "20261110080000-billing.md");

      const result = await runSddPreflight(root, defaultConfig);

      expect(result.status).toBe("blocked");
      expect(result.selectedInputPath).toBeNull();
      expect(result.blockers[0]).toContain("No deliberation record was named.");
      expect(result.blockers[0]).toContain("ask which one");
      expect(result.blockers[0]).toContain(
        "Records found: 20261110080000-billing.md, 20261112093000-task-dashboard.md.",
      );
    });
  });

  it("selects an imported specification when no record is named", async () => {
    await withRoot(async (root) => {
      const imported = path.join(root, "docs", "imported-spec.md");
      await mkdir(path.dirname(imported), { recursive: true });
      await writeFile(imported, "# Imported specification\n", "utf-8");

      const before = await readFile(imported);
      const result = await runSddPreflight(root, defaultConfig, { importPath: imported });

      expect(await readFile(imported)).toEqual(before);
      expect(result.status).toBe("ready");
      expect(result.source).toBe("import-lite");
      expect(result.selectedInputPath).toBe(imported);
      expect(result.blockers).toEqual([]);
      expect(result.nextCommands).toEqual(["/qfai-sdd"]);
      const summary = await readFile(result.preflightSummaryPath, "utf-8");
      expect(summary).toContain("source: import-lite");
    });
  });

  it("stays blocked and names an imported specification that is not a readable file", async () => {
    await withRoot(async (root) => {
      const missing = path.join(root, "docs", "missing.md");
      const result = await runSddPreflight(root, defaultConfig, { importPath: missing });

      expect(result.status).toBe("blocked");
      expect(result.source).toBeNull();
      expect(result.blockers.some((item) => item.includes(missing))).toBe(true);
    });
  });

  it.skipIf(process.platform === "win32" || process.geteuid?.() === 0)(
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

  it("keeps carry-over open questions in the summary a blocked run writes", async () => {
    await withRoot(async (root) => {
      const result = await runSddPreflight(root, defaultConfig, {
        assumptions: ["W-PENDING-PROMOTION: promote in Stage 1"],
      });

      expect(result.status).toBe("blocked");
      expect(result.openQuestions).toEqual(["W-PENDING-PROMOTION: promote in Stage 1"]);

      const summary = await readFile(result.preflightSummaryPath, "utf-8");
      expect(summary).toContain("## Open Questions (Carry-over)");
      expect(summary).toContain("- W-PENDING-PROMOTION: promote in Stage 1");
    });
  });

  it("writes the summary into a run-scoped directory and mirrors it to the latest pointer", async () => {
    await withRoot(async (root) => {
      await seedRecord(root);

      const result = await runSddPreflight(root, defaultConfig, { recordPath: RECORD_NAME });
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
    });
  });

  it("keeps an earlier run's summary readable after a later preflight", async () => {
    await withRoot(async (root) => {
      const first = await runSddPreflight(root, defaultConfig);
      await seedRecord(root);
      const second = await runSddPreflight(root, defaultConfig, { recordPath: RECORD_NAME });

      expect(second.runId).not.toBe(first.runId);

      const firstSummary = await readFile(first.preflightSummaryPath, "utf-8");
      const secondSummary = await readFile(second.preflightSummaryPath, "utf-8");
      expect(firstSummary).toContain("status: blocked");
      expect(secondSummary).toContain("status: ready");

      const latest = await readFile(second.latestPreflightSummaryPath, "utf-8");
      expect(latest).toBe(secondSummary);
    });
  });

  // Run directories are named from the run's START time, so a slow preflight
  // started first can finish last. An unconditional pointer write then left
  // `preflight_summary.md` describing the older run while a newer
  // `preflight/run-*` sat beside it.
  it("does not let an older run overwrite a newer run's latest pointer", async () => {
    await withRoot(async (root) => {
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
    });
  });

  it("reads the pointer's own run id when the newer run directory is gone", async () => {
    await withRoot(async (root) => {
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
    });
  });

  it("still refreshes the pointer when this run is the newest", async () => {
    await withRoot(async (root) => {
      const older = await runSddPreflight(root, defaultConfig, {
        startedAt: new Date("2026-02-16T01:00:00.000Z"),
      });
      const newer = await runSddPreflight(root, defaultConfig, {
        startedAt: new Date("2026-02-16T02:00:00.000Z"),
      });

      const latest = await readFile(newer.latestPreflightSummaryPath, "utf-8");
      expect(latest).toContain(newer.runId);
      expect(latest).not.toContain(older.runId);
    });
  });

  it("keeps preflight runs out of the validate run-log namespace", async () => {
    await withRoot(async (root) => {
      const result = await runSddPreflight(root, defaultConfig);
      const reportRoot = path.join(root, ".qfai", "report");
      const entries = await readdir(reportRoot, { withFileTypes: true });

      // `<outDir>/run-*` belongs to `writeValidateRunLog`; a preflight directory
      // there would become the "newest `run-*`" the Validate Hard Gate reads.
      expect(entries.filter((entry) => entry.name.startsWith("run-"))).toEqual([]);
      expect(result.preflightSummaryPath).toContain(`${path.sep}preflight${path.sep}`);
    });
  });
});
