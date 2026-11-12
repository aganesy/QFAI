/**
 * `qfai sdd preflight` — the CLI entry point for the /qfai-sdd Stage 0 gate.
 *
 * These cases pin the entry point (exit code, both output formats), the
 * source it selects, and the template ↔ output agreement that keeps the
 * shipped form from drifting away from the writer.
 */

import { mkdtemp, mkdir, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { runSddPreflightCommand } from "../../../src/cli/commands/sddPreflight.js";
import { resolveToolPackageDir } from "../../../src/core/version.js";

const RECORD_NAME = "20261112093000-task-dashboard.md";
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await rm(dir, { recursive: true, force: true });
  }
});

async function newTempRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-sdd-preflight-cli-"));
  tempDirs.push(root);
  return root;
}

async function seedRecord(root: string, name = RECORD_NAME): Promise<string> {
  const recordPath = path.join(root, ".qfai", "deliberation", name);
  await mkdir(path.dirname(recordPath), { recursive: true });
  await writeFile(
    recordPath,
    [
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
      "",
      "### Agent decisions",
      "",
      "| Background | Option 1 | Option 2 | Option 3 | Option 4 (other) | Chosen option number |",
      "| ---------- | -------- | -------- | -------- | ---------------- | -------------------- |",
      "",
    ].join("\n"),
    "utf-8",
  );
  return recordPath;
}

type Sinks = {
  out: string[];
  err: string[];
  write: (message: string) => void;
  writeErr: (message: string) => void;
};

function newSinks(): Sinks {
  const out: string[] = [];
  const err: string[] = [];
  return {
    out,
    err,
    write: (message: string) => out.push(message),
    writeErr: (message: string) => err.push(message),
  };
}

describe("qfai sdd preflight", () => {
  // QFAI:EX-0001-0148-03
  it("exits 1, selects no input and names a blocker when no usable source exists", async () => {
    const root = await newTempRoot();
    const sinks = newSinks();

    const exitCode = await runSddPreflightCommand({
      root,
      write: sinks.write,
      writeErr: sinks.writeErr,
    });

    expect(exitCode).toBe(1);
    expect(sinks.err.join("\n")).toContain("blocked");
    const stdout = sinks.out.join("\n");
    expect(stdout).toContain("status: blocked (source: none)");
    expect(stdout).toContain("selected input: (none)");
    expect(stdout).not.toMatch(/REQ/);

    const summary = await readFile(path.join(root, ".qfai", "report", "preflight_summary.md"), {
      encoding: "utf-8",
    });
    expect(summary).toContain("status: blocked");
    for (const guidance of [
      ".qfai/assistant/skill/qfai-sdd/references/sdd-execution-playbook.md#stage-0-source-inventory",
      "--import <path>",
      "Use `/qfai-discussion` only when no deliberation record",
    ]) {
      expect(stdout).toContain(guidance);
      expect(summary).toContain(guidance);
    }
  });

  // QFAI:EX-0001-0151-02
  it("exits 0 on the record --record names and leaves the record unchanged", async () => {
    const root = await newTempRoot();
    const recordPath = await seedRecord(root);
    const before = await readFile(recordPath, "utf-8");
    const sinks = newSinks();

    const exitCode = await runSddPreflightCommand({
      root,
      recordPath: path.join(".qfai", "deliberation", RECORD_NAME),
      write: sinks.write,
      writeErr: sinks.writeErr,
    });

    expect(exitCode).toBe(0);
    const stdout = sinks.out.join("\n");
    expect(stdout).toContain("status: ready (source: deliberation-record)");
    expect(stdout).toContain(`selected deliberation-record: .qfai/deliberation/${RECORD_NAME}`);
    expect(stdout).not.toContain("next commands:");
    expect(sinks.err).toEqual([]);
    expect(await readFile(recordPath, "utf-8")).toBe(before);
  });

  it("emits the machine-readable result under --format json", async () => {
    const root = await newTempRoot();
    const recordPath = await seedRecord(root);
    const sinks = newSinks();

    const exitCode = await runSddPreflightCommand({
      root,
      format: "json",
      recordPath: RECORD_NAME,
      write: sinks.write,
      writeErr: sinks.writeErr,
    });

    expect(exitCode).toBe(0);
    const parsed: unknown = JSON.parse(sinks.out.join("\n"));
    expect(parsed).toMatchObject({
      status: "ready",
      source: "deliberation-record",
      selectedInputPath: recordPath,
      blockers: [],
      openQuestions: [],
      nextCommands: [],
    });
  });

  // QFAI:EX-0001-0017-02
  it("lists two records and picks neither when none is named", async () => {
    const root = await newTempRoot();
    await seedRecord(root, "20261110080000-billing.md");
    await seedRecord(root);
    const sinks = newSinks();

    const exitCode = await runSddPreflightCommand({
      root,
      format: "json",
      write: sinks.write,
      writeErr: sinks.writeErr,
    });

    expect(exitCode).toBe(1);
    const parsed: unknown = JSON.parse(sinks.out.join("\n"));
    expect(parsed).toMatchObject({
      status: "blocked",
      source: null,
      selectedInputPath: null,
      nextCommands: ["qfai sdd preflight --record <path>"],
    });
    const stdout = sinks.out.join("\n");
    expect(stdout).toContain("ask which one");
    expect(stdout).toContain(`Records found: 20261110080000-billing.md, ${RECORD_NAME}.`);
  });

  // AC-0001-0148-01 / EX-0001-0148-03: source selection preserves the existing purpose.
  it.each(["text", "json"] as const)(
    "uses an existing story without regenerating its inputs in %s output",
    async (format) => {
      const root = await newTempRoot();
      const inputs = [
        {
          relative: path.join(".qfai", "spec", "01_policy", "objective.md"),
          content: "# Objective\n\nKeep the existing service available.\n",
        },
        {
          relative: path.join(".qfai", "spec", "02_business-flow", "existing-story.md"),
          content: "# Existing story\r\n\r\nCustomers can find an available service.\r\n",
        },
      ] as const;
      for (const input of inputs) {
        const file = path.join(root, input.relative);
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, input.content, "utf-8");
      }
      const before = await Promise.all(
        inputs.map((input) => readFile(path.join(root, input.relative))),
      );

      const imported = newSinks();
      expect(
        await runSddPreflightCommand({
          root,
          format,
          importPath: inputs[1].relative,
          write: imported.write,
          writeErr: imported.writeErr,
        }),
      ).toBe(0);
      expect(imported.err).toEqual([]);
      if (format === "json") {
        const parsed: unknown = JSON.parse(imported.out.join("\n"));
        expect(parsed).toMatchObject({
          status: "ready",
          source: "import-lite",
          selectedInputPath: path.join(root, inputs[1].relative),
          blockers: [],
          nextCommands: [],
        });
      } else {
        expect(imported.out.join("\n")).toContain("status: ready (source: import-lite)");
        expect(imported.out.join("\n")).not.toContain("next commands:");
      }
      const summary = await readFile(
        path.join(root, ".qfai", "report", "preflight_summary.md"),
        "utf-8",
      );
      expect(summary).toContain("source: import-lite");
      expect(
        await Promise.all(inputs.map((input) => readFile(path.join(root, input.relative)))),
      ).toEqual(before);
      await expect(stat(path.join(root, ".qfai", "deliberation"))).rejects.toThrow();
    },
  );

  it("tells the SDD steps to name the record before running preflight", async () => {
    for (const tree of ["packages/qfai/assets/init/.qfai", ".qfai"]) {
      const step = (
        await readFile(path.join(repoRoot, tree, "assistant/step/sdd-triage/STEP.md"), "utf-8")
      ).replace(/\s+/g, " ");
      expect(step, tree).toContain("`npx qfai sdd preflight --record <path>`");
      expect(step, tree).toContain("use its `selectedInputPath`");
    }
  });

  it("stops instead of falling back to defaults when qfai.config.yaml is broken", async () => {
    const root = await newTempRoot();
    await seedRecord(root);
    await writeFile(path.join(root, "qfai.config.yaml"), "paths: [not, a, mapping\n", "utf-8");

    const sinks = newSinks();
    const exitCode = await runSddPreflightCommand({
      root,
      recordPath: RECORD_NAME,
      write: sinks.write,
      writeErr: sinks.writeErr,
    });

    expect(exitCode).toBe(1);
    expect(sinks.err.join("\n")).toContain("qfai.config.yaml");
    expect(sinks.out).toEqual([]);
    await expect(
      readFile(path.join(root, ".qfai", "report", "preflight_summary.md"), { encoding: "utf-8" }),
    ).rejects.toThrow();
  });

  it("records --assume carry-over and preserves it on the Stage 1 re-run", async () => {
    const root = await newTempRoot();
    await seedRecord(root);
    const summaryPath = path.join(root, ".qfai", "report", "preflight_summary.md");

    const first = newSinks();
    expect(
      await runSddPreflightCommand({
        root,
        recordPath: RECORD_NAME,
        assumptions: ["OQ-0001 carried over to the next phase"],
        write: first.write,
        writeErr: first.writeErr,
      }),
    ).toBe(0);
    expect(await readFile(summaryPath, { encoding: "utf-8" })).toContain(
      "- OQ-0001 carried over to the next phase",
    );

    // The Stage 1 re-run passes no --assume; the carry-over recorded in
    // Stage 0 must not become `- none`.
    const second = newSinks();
    expect(
      await runSddPreflightCommand({
        root,
        recordPath: RECORD_NAME,
        write: second.write,
        writeErr: second.writeErr,
      }),
    ).toBe(0);
    const summary = await readFile(summaryPath, { encoding: "utf-8" });
    const carryOver = summary.slice(summary.indexOf("## Open Questions (Carry-over)"));
    expect(carryOver).toContain("- OQ-0001 carried over to the next phase");
    expect(carryOver).not.toContain("- none");
  });

  it("keeps --assume carry-over across a blocked re-run", async () => {
    // A blocked Stage 0 must not eat the decision Stage 1 still has to
    // promote: the blocked summary carries the section, so the flagless
    // re-run reads it back instead of writing `- none`.
    const root = await newTempRoot();
    const summaryPath = path.join(root, ".qfai", "report", "preflight_summary.md");

    const first = newSinks();
    expect(
      await runSddPreflightCommand({
        root,
        assumptions: ["W-PENDING-PROMOTION to be promoted in Stage 1"],
        write: first.write,
        writeErr: first.writeErr,
      }),
    ).toBe(1);
    expect(await readFile(summaryPath, { encoding: "utf-8" })).toContain(
      "- W-PENDING-PROMOTION to be promoted in Stage 1",
    );

    const second = newSinks();
    expect(
      await runSddPreflightCommand({ root, write: second.write, writeErr: second.writeErr }),
    ).toBe(1);
    const summary = await readFile(summaryPath, { encoding: "utf-8" });
    expect(summary).toContain("- W-PENDING-PROMOTION to be promoted in Stage 1");
    expect(summary).not.toContain("- none");
  });

  it("reports the blockers without failing under --fail-on never", async () => {
    const root = await newTempRoot();
    const sinks = newSinks();

    const exitCode = await runSddPreflightCommand({
      root,
      failOn: "never",
      write: sinks.write,
      writeErr: sinks.writeErr,
    });

    expect(exitCode).toBe(0);
    expect(sinks.out.join("\n")).toContain("status: blocked");
  });

  it("keeps the shipped template's sections equal to the sections it writes", async () => {
    // The drift this case exists for: the template is a form an agent fills
    // in, the command is the writer, and nothing held the two together.
    const template = await readFile(
      path.join(
        repoRoot,
        "packages/qfai/assets/init/.qfai/assistant/skill/qfai-sdd/templates/report/preflight_summary.md",
      ),
      { encoding: "utf-8" },
    );

    const blockedRoot = await newTempRoot();
    const blockedSinks = newSinks();
    await runSddPreflightCommand({
      root: blockedRoot,
      write: blockedSinks.write,
      writeErr: blockedSinks.writeErr,
    });
    const blocked = await readFile(
      path.join(blockedRoot, ".qfai", "report", "preflight_summary.md"),
      { encoding: "utf-8" },
    );

    const readyRoot = await newTempRoot();
    await seedRecord(readyRoot);
    const readySinks = newSinks();
    await runSddPreflightCommand({
      root: readyRoot,
      recordPath: RECORD_NAME,
      write: readySinks.write,
      writeErr: readySinks.writeErr,
    });
    const ready = await readFile(path.join(readyRoot, ".qfai", "report", "preflight_summary.md"), {
      encoding: "utf-8",
    });

    const emitted = new Set([...headings(blocked), ...headings(ready)]);
    expect([...headings(template)].sort()).toEqual([...emitted].sort());
  });

  it("stops without writing when the running copy is not the one the project declares", async (ctx) => {
    // The project's `node_modules` is a link to another checkout's, whose `qfai`
    // is the running package: the case `qfai validate` reports as QFAI-TOOL-002.
    const root = await newTempRoot();
    const packageDir = String(await resolveToolPackageDir());
    const otherModules = path.join(root, "other", "node_modules");
    const project = path.join(root, "project");
    await mkdir(otherModules, { recursive: true });
    await mkdir(project, { recursive: true });
    try {
      await symlink(packageDir, path.join(otherModules, "qfai"), "junction");
      await symlink(otherModules, path.join(project, "node_modules"), "junction");
    } catch {
      // A host without link permission cannot exercise this case.
      ctx.skip();
    }
    await writeFile(
      path.join(project, "package.json"),
      JSON.stringify({ name: "p", devDependencies: { qfai: "workspace:*" } }),
      "utf-8",
    );
    const sinks = newSinks();

    const exitCode = await runSddPreflightCommand({
      root: project,
      write: sinks.write,
      writeErr: sinks.writeErr,
    });

    expect(exitCode).toBe(1);
    expect(sinks.err.join("\n")).toContain("QFAI-TOOL-002");
    await expect(
      stat(path.join(project, ".qfai", "report", "preflight_summary.md")),
    ).rejects.toThrow();
  });
});

function headings(markdown: string): Set<string> {
  const found = new Set<string>();
  for (const line of markdown.split(/\r?\n/)) {
    if (line.startsWith("## ")) {
      found.add(line.slice(3).trim());
    }
  }
  return found;
}
