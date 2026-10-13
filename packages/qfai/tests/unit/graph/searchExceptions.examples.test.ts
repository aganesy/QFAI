import path from "node:path";
import { writeFile } from "node:fs/promises";
import { expect, it, vi } from "vitest";
import { graphCliResult, installedGraphHookResult } from "../../helpers/graphCli.js";
import { codeAnalysisFixture } from "../../helpers/graphAnalysis.js";
const session = "observed-agent-session";
const limitation = "Graph unavailable; inspect the named source scope";

// QFAI:EX-0001-0235-25
// Mutation: packages/qfai/src/core/graph/fallbackState.ts `expiresAt: createdAt + 60000,` -> `expiresAt: createdAt + 60001,` fails "denies an otherwise matching AI fallback at the exact expiry instant"
it("denies an otherwise matching AI fallback at the exact expiry instant", () =>
  checkStoredExpiry(61000));

// QFAI:EX-0001-0235-15
// Mutation: packages/qfai/src/core/graph/fallbackState.ts `expiresAt: createdAt + 60000,` -> `expiresAt: createdAt + 60001,` fails "permits scoped search from the AI judgment without human approval"
it("permits scoped search from the AI judgment without human approval", async () => {
  const fixture = await codeAnalysisFixture();
  let now = 1000;
  const clock = vi.spyOn(Date, "now").mockImplementation(() => now);
  try {
    await writeFile(
      path.join(fixture.root, ".qfai", "tools", "graph-enforcement.json"),
      '{"kind":"graph-enforcement","denyExploration":true}',
    );
    const invoke = async () => {
      const hook = await installedGraphHookResult(fixture.root, {
        tool_name: "Bash",
        tool_input: { command: "rg auth packages/" },
        session_id: session,
        cwd: fixture.root,
      });
      expect(hook.errors).toEqual([]);
      expect(hook.failures).toBe(0);
      return hook.output;
    };
    const denied = await invoke();
    expect(denied).toContain("Observed attempt:");
    const attemptId = /Observed attempt: ([a-f0-9-]{36})/.exec(denied)?.[1];
    expect(attemptId).toBeDefined();
    expect(fixture.calls).toEqual([]);
    const reason = "The graph cannot answer the unresolved legacy caller question.";
    const permitted = await graphCliResult(
      fixture.root,
      [
        "fallback",
        "--attempt-id",
        attemptId ?? "",
        "--question",
        "legacy checkout callers",
        "--reason",
        reason,
      ],
      fixture.run,
    );
    expect(permitted.value).toMatchObject({
      status: "ready",
      permitted: true,
      scope: {
        target: "packages/",
        operation: "rg",
        worktree: fixture.root,
        session,
        reason,
        expiresAt: 61000,
      },
    });
    expect(permitted.failures).toBe(0);
    expect(
      fixture.calls.some(
        (call) => call.args.includes("context") && call.args.includes("legacy checkout callers"),
      ),
    ).toBe(true);
    expect(fixture.calls.some((call) => call.args.includes("graphify"))).toBe(false);
    expect(await invoke()).toBe("");
    now = 60999;
    expect(await invoke()).toBe("");
    now = 61000;
    expect(await invoke()).toContain('"permissionDecision":"deny"');
  } finally {
    clock.mockRestore();
    await fixture.dispose();
  }
});

// QFAI:EX-0001-0235-18
// Mutation: packages/qfai/src/core/graph/localFiles.ts `!value.includes("\0")` -> `true` fails "rejects fallback without a graph limitation reason or complete matching scope"
it("rejects fallback without a graph limitation reason or complete matching scope", async () => {
  const fixture = await codeAnalysisFixture();
  try {
    await writeFile(
      path.join(fixture.root, ".qfai", "tools", "graph-enforcement.json"),
      '{"kind":"graph-enforcement","denyExploration":true}',
    );
    const event = {
      tool_name: "Bash",
      tool_input: { command: "rg auth packages/" },
      session_id: session,
      cwd: fixture.root,
    };
    const denied = await installedGraphHookResult(fixture.root, event);
    const attemptId = /Observed attempt: ([a-f0-9-]{36})/.exec(denied.output)?.[1] ?? "";
    const args = [
      "fallback",
      "--attempt-id",
      attemptId,
      "--question",
      "legacy callers",
      "--reason",
      limitation,
    ];
    for (const invalid of [
      [...args, "--approved", "true"],
      [...args, "--approved-by", "human"],
      [...args.slice(0, 6), ""],
      [...args.slice(0, 6), "   "],
      [...args.slice(0, 6), "invalid\0reason"],
      [...args, "--target", ""],
      [...args, "--operation", ""],
      [...args, "--session", "another-session"],
      [...args, "--expires-at", "2000"],
      [...args, "--worktree", path.resolve("another-worktree")],
      [...args.slice(0, 2), "", ...args.slice(3)],
    ]) {
      expect((await graphCliResult(fixture.root, invalid, fixture.run)).value).toMatchObject({
        status: "failed",
        permitted: false,
      });
    }
    expect(fixture.calls).toEqual([]);
    expect((await installedGraphHookResult(fixture.root, event)).output).toContain("deny");
    expect((await graphCliResult(fixture.root, args, fixture.run)).value).toMatchObject({
      permitted: true,
    });
    expect((await installedGraphHookResult(fixture.root, event)).output).toBe("");
  } finally {
    await fixture.dispose();
  }
});

// QFAI:EX-0001-0235-17
// Mutation: packages/qfai/src/core/graph/fallbackState.ts `path.resolve(event.cwd) !== path.resolve(root)` -> `false` fails "denies AI fallback reuse outside its exact operation path worktree or session"
it("denies AI fallback reuse outside its exact operation path worktree or session", async () => {
  const fixture = await codeAnalysisFixture();
  try {
    await writeFile(
      path.join(fixture.root, ".qfai", "tools", "graph-enforcement.json"),
      '{"kind":"graph-enforcement","denyExploration":true}',
    );
    const event = {
      tool_name: "Bash",
      tool_input: { command: "rg auth packages/" },
      session_id: session,
      cwd: fixture.root,
    };
    const observed = await installedGraphHookResult(fixture.root, event);
    const attemptId = /Observed attempt: ([a-f0-9-]{36})/.exec(observed.output)?.[1];
    const grant = await graphCliResult(
      fixture.root,
      [
        "fallback",
        "--attempt-id",
        attemptId ?? "",
        "--question",
        "legacy callers",
        "--reason",
        limitation,
      ],
      fixture.run,
    );
    expect(grant.value).toMatchObject({ permitted: true });
    for (const input of [
      { ...event, tool_input: { command: "rg auth docs/" } },
      { ...event, tool_input: { command: "grep -R auth packages/" } },
      { ...event, session_id: "another-session" },
      { ...event, cwd: path.resolve("another-worktree") },
      { ...event, tool_input: { command: "rg auth private/ packages/" } },
      { ...event, tool_input: { command: "rg -e auth private/ packages/" } },
      { ...event, tool_input: { command: "rg --glob '*.ts' auth private/ packages/" } },
      { ...event, tool_input: { command: "git -C other-worktree grep auth -- packages/" } },
      {
        ...event,
        tool_name: "PowerShell",
        tool_input: { command: "Select-String -Pattern auth -Path packages/ private/" },
      },
      { ...event, tool_input: { command: "rg auth packages/; grep -R policy docs/" } },
      { ...event, tool_input: { command: "cd ../other-worktree; rg auth packages/" } },
      { ...event, tool_input: { command: "command cd ../other-worktree; rg auth packages/" } },
      {
        ...event,
        tool_input: { command: "QFAI_TEST=value cd ../other-worktree; rg auth packages/" },
      },
      {
        ...event,
        tool_input: { command: "bash -lc 'cd ../other-worktree; rg auth packages/'" },
      },
      { ...event, tool_input: { command: "Set-Location ../other-worktree; rg auth packages/" } },
      {
        ...event,
        tool_name: "exec_command",
        tool_input: { cmd: "rg auth packages/", workdir: path.resolve("other-worktree") },
      },
    ]) {
      const checked = await installedGraphHookResult(fixture.root, input);
      expect(checked.output).toContain('"permissionDecision":"deny"');
    }
    const unscoped = await installedGraphHookResult(fixture.root, {
      ...event,
      tool_input: { command: "rg auth private/ packages/" },
    });
    expect(unscoped.output).toContain("cannot be scoped");
    expect(unscoped.output).not.toContain("fallback --attempt-id");
    expect(unscoped.output).not.toContain("Observed attempt:");
    expect((await installedGraphHookResult(fixture.root, event)).output).toBe("");
    expect(
      (
        await installedGraphHookResult(fixture.root, {
          ...event,
          tool_name: "exec_command",
          tool_input: { cmd: "rg auth packages/", workdir: fixture.root },
        })
      ).output,
    ).toBe("");
    const compound = {
      ...event,
      tool_input: { command: "rg auth packages/; grep -R policy docs/" },
    };
    const remaining = await installedGraphHookResult(fixture.root, compound);
    const secondId = /Observed attempt: ([a-f0-9-]{36})/.exec(remaining.output)?.[1];
    const secondGrant = await graphCliResult(
      fixture.root,
      [
        "fallback",
        "--attempt-id",
        secondId ?? "",
        "--question",
        "legacy rationale",
        "--reason",
        limitation,
      ],
      fixture.run,
    );
    expect(secondGrant.value).toMatchObject({
      permitted: true,
      domain: "documents",
      scope: { operation: "grep", target: "docs/" },
    });
    expect((await installedGraphHookResult(fixture.root, compound)).output).toBe("");
  } finally {
    await fixture.dispose();
  }
});

// QFAI:EX-0001-0235-16
// Mutation: packages/qfai/src/core/graph/fallbackState.ts `expiresAt: createdAt + 60000,` -> `expiresAt: createdAt + 60001,` fails "denies a matching AI-decided search after expiry"
it("denies a matching AI-decided search after expiry", () => checkStoredExpiry(61001));

async function checkStoredExpiry(expiredAt: number): Promise<void> {
  const fixture = await codeAnalysisFixture();
  let now = 1000;
  const clock = vi.spyOn(Date, "now").mockImplementation(() => now);
  try {
    await writeFile(
      path.join(fixture.root, ".qfai", "tools", "graph-enforcement.json"),
      '{"kind":"graph-enforcement","denyExploration":true}',
    );
    const event = {
      tool_name: "Bash",
      tool_input: { command: "rg auth packages/" },
      session_id: session,
      cwd: fixture.root,
    };
    const observed = await installedGraphHookResult(fixture.root, event);
    const attemptId = /Observed attempt: ([a-f0-9-]{36})/.exec(observed.output)?.[1];
    const grant = await graphCliResult(
      fixture.root,
      [
        "fallback",
        "--attempt-id",
        attemptId ?? "",
        "--question",
        "legacy callers",
        "--reason",
        limitation,
      ],
      fixture.run,
    );
    expect(grant.value).toMatchObject({ permitted: true, scope: { expiresAt: 61000 } });
    now = 60999;
    expect((await installedGraphHookResult(fixture.root, event)).output).toBe("");
    now = expiredAt;
    const denied = await installedGraphHookResult(fixture.root, event);
    expect(denied.output).toContain('"permissionDecision":"deny"');
    expect(denied.output).toContain("rg");
    expect(denied.failures).toBe(0);
  } finally {
    clock.mockRestore();
    await fixture.dispose();
  }
}
