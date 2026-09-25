import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { defaultConfig } from "../../../../src/core/config.js";
import { executePlannedStep, runStep } from "../../../../src/migration/specToStory/harness.js";
import { step09 } from "../../../../src/migration/specToStory/step09RepointLinks.js";

type RepairOptions = { includeMissing?: boolean; onlyRelative?: ReadonlySet<string> };
type Repair = (
  root: string,
  dryRun: boolean,
  report: (line: string) => void,
  options: RepairOptions,
) => void | Promise<void>;

const repairStub = vi.hoisted(() => {
  const calls: Parameters<Repair>[] = [];
  let implementation: Repair = () => {};
  return {
    calls,
    use(next: Repair) {
      implementation = next;
    },
    async run(...args: Parameters<Repair>) {
      calls.push(args);
      await implementation(...args);
    },
    reset() {
      calls.length = 0;
      implementation = () => {};
    },
  };
});

vi.mock("../../../../src/cli/commands/init.js", () => ({
  repairIntegrationWrappers: repairStub.run,
}));

const context = {
  root: "/project",
  specsDir: "/project/.qfai/spec",
  contractsDir: "/project/.qfai/spec/03_contract",
  config: structuredClone(defaultConfig),
};

beforeEach(() => repairStub.reset());

describe("migration integration-link repointing", () => {
  it("journals each host link and delegates one real writer run", async () => {
    repairStub.use((_root, dryRun, report) => {
      if (!dryRun) return;
      report(
        "autoremediate: integration wrappers — would relink=2, left alone=0, failed=0 (dry-run)",
      );
      report("  would relink .claude/skills/qfai-sdd");
      report("  would relink .github/agents/backend-engineer.agent.md");
    });

    const plan = await step09.plan(context);
    expect(plan.operations).toHaveLength(1);
    expect(plan.operations[0]).toMatchObject({
      kind: "delegate",
      target: ".claude/skills/qfai-sdd",
      targets: [".claude/skills/qfai-sdd", ".github/agents/backend-engineer.agent.md"],
    });
    expect(repairStub.calls[0]).toEqual([
      context.root,
      true,
      expect.any(Function),
      {
        includeMissing: true,
      },
    ]);

    const operation = plan.operations[0];
    if (operation?.kind !== "delegate") throw new Error("Expected a delegated operation.");
    await operation.apply();
    expect(repairStub.calls).toHaveLength(2);
    expect(repairStub.calls[1]).toEqual([
      context.root,
      false,
      expect.any(Function),
      {
        includeMissing: true,
        onlyRelative: new Set([
          ".claude/skills/qfai-sdd",
          ".github/agents/backend-engineer.agent.md",
        ]),
      },
    ]);
  });

  it("returns no operation when every link already points at the current target", async () => {
    repairStub.use((_root, _dryRun, report) => {
      report("autoremediate: integration wrappers — nothing to repair");
    });

    expect((await step09.plan(context)).operations).toEqual([]);
    expect(repairStub.calls).toEqual([
      [
        context.root,
        true,
        expect.any(Function),
        {
          includeMissing: true,
        },
      ],
    ]);
  });

  it("refuses an unreadable integration surface before any write", async () => {
    repairStub.use((_root, _dryRun, report) => {
      report(
        "autoremediate: integration wrappers — skipped: the wrappers could not be inspected (check the permissions and the path)",
      );
    });

    await expect(step09.plan(context)).rejects.toThrow("could not be inspected");
    expect(repairStub.calls).toHaveLength(1);
  });

  it("maps a filesystem inspection failure to exit 2 before any write", async () => {
    repairStub.use(() =>
      Promise.reject(Object.assign(new Error("permission denied"), { code: "EACCES" })),
    );

    let refusal = "";
    const code = await executePlannedStep(step09, context, false, {
      stdout: {
        write: () => {
          throw new Error("A refused step must not print a success report.");
        },
      },
      stderr: { write: (value) => (refusal += value) },
    });
    expect(code).toBe(2);
    expect(refusal).toContain("Cannot inspect integration wrappers");
    expect(repairStub.calls).toHaveLength(1);
  });

  it("reports an occupied wrapper for a person without overwriting it", async () => {
    repairStub.use((_root, _dryRun, report) => {
      report("  left alone .claude/skills/qfai-sdd: a real directory occupies the path");
    });

    let output = "";
    const code = await executePlannedStep(step09, context, true, {
      stdout: { write: (value) => (output += value) },
      stderr: {
        write: (value) => {
          throw new Error(value);
        },
      },
    });
    expect(code).toBe(3);
    expect(output).toContain("## For a person");
    expect(output).toContain("a real directory occupies the path");
    expect(repairStub.calls).toHaveLength(1);
  });

  it("repairs a managed link while reporting a preexisting user-owned wrapper with exit 3", async () => {
    repairStub.use((_root, dryRun, report) => {
      report(
        dryRun ? "  would relink .claude/skills/qfai-sdd" : "  relinked .claude/skills/qfai-sdd",
      );
      report(
        "  left alone .github/agents/backend-engineer.agent.md: a real file occupies the path",
      );
    });

    let output = "";
    const code = await executePlannedStep(step09, context, false, {
      stdout: { write: (value) => (output += value) },
      stderr: {
        write: (value) => {
          throw new Error(value);
        },
      },
    });
    expect(code).toBe(3);
    expect(output).toContain(".claude/skills/qfai-sdd: repoint host integration link");
    expect(output).toContain("left alone .github/agents/backend-engineer.agent.md");
    expect(repairStub.calls).toHaveLength(2);
  });

  it("fails if a planned link becomes occupied before the real writer runs", async () => {
    repairStub.use((_root, dryRun, report) => {
      report(
        dryRun
          ? "  would relink .claude/skills/qfai-sdd"
          : "  left alone .claude/skills/qfai-sdd: a real file occupies the path",
      );
    });

    const plan = await step09.plan(context);
    const operation = plan.operations[0];
    if (operation?.kind !== "delegate") throw new Error("Expected a delegated operation.");
    await expect(operation.apply()).rejects.toThrow("a real file occupies the path");
  });

  it("repoints an old host link after every other trace of the old layout is gone", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-migration-step09-"));
    try {
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
      );
      repairStub.use((_root, dryRun, report) => {
        report(
          dryRun ? "  would relink .claude/skills/qfai-sdd" : "  relinked .claude/skills/qfai-sdd",
        );
      });
      let output = "";
      const io = {
        cwd: root,
        stdout: { write: (value: string) => (output += value) },
        stderr: {
          write: (value: string) => {
            throw new Error(value);
          },
        },
      };
      const operation = "## Operations\n- .claude/skills/qfai-sdd: repoint host integration link";
      expect(await runStep(9, ["--dry-run"], io)).toBe(0);
      expect(output).toContain(operation);
      expect(repairStub.calls.map(([, dryRun]) => dryRun)).toEqual([true]);
      output = "";
      expect(await runStep(9, [], io)).toBe(0);
      expect(output).toContain(operation);
      expect(repairStub.calls.map(([, dryRun]) => dryRun)).toEqual([true, true, false]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports a wrapper for a person after every other trace of the old layout is gone", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "qfai-migration-step09-"));
    try {
      await writeFile(
        path.join(root, "qfai.config.yaml"),
        "paths:\n  specsDir: .qfai/spec\n  contractsDir: .qfai/spec/03_contract\n",
      );
      const leftAlone = "left alone .claude/skills/qfai-sdd: the link names another path";
      repairStub.use((_root, _dryRun, report) => {
        report(`  ${leftAlone}`);
      });
      let output = "";
      const io = {
        cwd: root,
        stdout: { write: (value: string) => (output += value) },
        stderr: {
          write: (value: string) => {
            throw new Error(value);
          },
        },
      };
      expect(await runStep(9, ["--dry-run"], io)).toBe(3);
      expect(output).toContain("## Operations\nnone");
      expect(output).toContain(`## For a person\n- ${leftAlone}`);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not claim a completed repair when the writer reports a real-run failure", async () => {
    repairStub.use((_root, dryRun, report) => {
      report(
        dryRun
          ? "  would relink .claude/skills/qfai-sdd"
          : "  could not relink .claude/skills/qfai-sdd: permission denied",
      );
    });

    const plan = await step09.plan(context);
    const operation = plan.operations[0];
    if (operation?.kind !== "delegate") throw new Error("Expected a delegated operation.");
    await expect(operation.apply()).rejects.toThrow("permission denied");
  });
});
