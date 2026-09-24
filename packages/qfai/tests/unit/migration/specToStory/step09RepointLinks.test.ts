import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MigrationContext } from "../../../../src/migration/specToStory/harness.js";
import { executePlannedStep } from "../../../../src/migration/specToStory/harness.js";
import { step09 } from "../../../../src/migration/specToStory/step09RepointLinks.js";

const repair = vi.hoisted(() => vi.fn());

vi.mock("../../../../src/cli/commands/init.js", () => ({
  repairIntegrationWrappers: repair,
}));

const context = {
  root: "/project",
  specsDir: "/project/.qfai/spec",
  contractsDir: "/project/.qfai/spec/03_contract",
  config: {} as MigrationContext["config"],
};

beforeEach(() => repair.mockReset());

describe("migration integration-link repointing", () => {
  it("journals each host link and delegates one real writer run", async () => {
    repair.mockImplementation((_root: string, dryRun: boolean, report: (line: string) => void) => {
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
    expect(repair).toHaveBeenCalledWith(context.root, true, expect.any(Function), {
      includeMissing: true,
    });

    const operation = plan.operations[0];
    if (operation?.kind !== "delegate") throw new Error("Expected a delegated operation.");
    await operation.apply();
    expect(repair).toHaveBeenCalledTimes(2);
    expect(repair).toHaveBeenLastCalledWith(context.root, false, expect.any(Function), {
      includeMissing: true,
      onlyRelative: new Set([
        ".claude/skills/qfai-sdd",
        ".github/agents/backend-engineer.agent.md",
      ]),
    });
  });

  it("returns no operation when every link already points at the current target", async () => {
    repair.mockImplementation((_root: string, _dryRun: boolean, report: (line: string) => void) => {
      report("autoremediate: integration wrappers — nothing to repair");
    });

    expect((await step09.plan(context)).operations).toEqual([]);
    expect(repair).toHaveBeenCalledOnce();
    expect(repair).toHaveBeenCalledWith(context.root, true, expect.any(Function), {
      includeMissing: true,
    });
  });

  it("refuses an unreadable integration surface before any write", async () => {
    repair.mockImplementation((_root: string, _dryRun: boolean, report: (line: string) => void) => {
      report(
        "autoremediate: integration wrappers — skipped: the wrappers could not be inspected (check the permissions and the path)",
      );
    });

    await expect(step09.plan(context)).rejects.toThrow("could not be inspected");
    expect(repair).toHaveBeenCalledOnce();
  });

  it("maps a filesystem inspection failure to exit 2 before any write", async () => {
    repair.mockRejectedValue(Object.assign(new Error("permission denied"), { code: "EACCES" }));

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
    expect(repair).toHaveBeenCalledOnce();
  });

  it("reports an occupied wrapper for a person without overwriting it", async () => {
    repair.mockImplementation((_root: string, _dryRun: boolean, report: (line: string) => void) => {
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
    expect(repair).toHaveBeenCalledOnce();
  });

  it("repairs a managed link while reporting a preexisting user-owned wrapper with exit 3", async () => {
    repair.mockImplementation((_root: string, dryRun: boolean, report: (line: string) => void) => {
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
    expect(repair).toHaveBeenCalledTimes(2);
  });

  it("fails if a planned link becomes occupied before the real writer runs", async () => {
    repair.mockImplementation((_root: string, dryRun: boolean, report: (line: string) => void) => {
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

  it("does not claim a completed repair when the writer reports a real-run failure", async () => {
    repair.mockImplementation((_root: string, dryRun: boolean, report: (line: string) => void) => {
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
