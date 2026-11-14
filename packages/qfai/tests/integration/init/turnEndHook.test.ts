// QFAI:AC-0001-0244-01
// QFAI:AC-0001-0244-02
// QFAI:AC-0001-0244-03
// QFAI:AC-0001-0244-04
// QFAI:AC-0001-0244-05
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  mergeDocumentationClarityHooks,
  serializeClaudeSettings,
} from "../../../src/core/claudeCodeHooks.js";
import { loadConfig } from "../../../src/core/config.js";
import { readTurnEndChecks, runTurnEndHook } from "../../../src/core/turnEndHook.js";
import { removeTempTree } from "../../helpers/tempTree.js";

let root: string;
let stateDir: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-turn-end-"));
  stateDir = await mkdtemp(path.join(os.tmpdir(), "qfai-turn-end-state-"));
});

afterEach(async () => {
  await removeTempTree(root);
  await removeTempTree(stateDir);
});

/** A project with a config and a tech.md whose Standard commands section holds `items`. */
async function project(items: string[], config = "paths:\n  testsDir: tests\n"): Promise<void> {
  await writeFile(path.join(root, "qfai.config.yaml"), config, "utf-8");
  const contracts = path.join(root, ".qfai", "spec", "03_contract");
  await mkdir(contracts, { recursive: true });
  await writeFile(
    path.join(contracts, "tech.md"),
    ["# Tech", "", "## Standard commands (copy-paste)", "", ...items, "", "## Next", ""].join("\n"),
    "utf-8",
  );
}

/** A script under the project root that prints `text` and exits `code`. */
async function script(name: string, text: string, code: number): Promise<string> {
  await writeFile(
    path.join(root, name),
    `process.stdout.write(${JSON.stringify(text)});process.exit(${code});\n`,
    "utf-8",
  );
  return `node ${name}`;
}

function hook(event: Record<string, unknown>, timeoutMs?: number): Promise<string> {
  return runTurnEndHook(
    { cwd: root, ...event },
    { processDir: root, stateDir, ...(timeoutMs === undefined ? {} : { timeoutMs }) },
  );
}

function parsed(output: string): Record<string, unknown> {
  const value: unknown = JSON.parse(output);
  if (typeof value !== "object" || value === null) throw new Error("not an object");
  return { ...value };
}

describe("turn-end hook", () => {
  // QFAI:EX-0001-0244-01
  it("blocks a Stop event on a failing marked command", async () => {
    const fail = await script("fail.js", "type error\n", 1);
    await project([`- Typecheck: \`${fail}\``, "- Turn-end check: Typecheck"]);
    const output = parsed(
      await hook({ hook_event_name: "Stop", session_id: "s1", stop_hook_active: false }),
    );
    expect(output.decision).toBe("block");
    expect(output.reason).toContain("Typecheck");
    expect(output.reason).toContain(fail);
    expect(output.reason).toContain("exit 1");
    expect(output.reason).toContain("type error");
  });

  // QFAI:EX-0001-0244-02
  it("blocks a SubagentStop event the same way", async () => {
    const fail = await script("fail.js", "type error\n", 1);
    await project([`- Typecheck: \`${fail}\``, "- Turn-end check: Typecheck"]);
    const output = parsed(await hook({ hook_event_name: "SubagentStop", session_id: "s1" }));
    expect(output.decision).toBe("block");
    expect(output.reason).toContain("If fixing it is outside your task");
  });

  // QFAI:EX-0001-0244-03
  it("names only the first failing command", async () => {
    const pass = await script("pass.js", "clean\n", 0);
    const fail = await script("fail.js", "type error\n", 2);
    await project([
      `- Lint: \`${pass}\``,
      `- Typecheck: \`${fail}\``,
      "- Turn-end check: Lint, Typecheck",
    ]);
    const reason = String(parsed(await hook({ session_id: "s1" })).reason);
    expect(reason).toContain("Typecheck");
    expect(reason).not.toContain("Lint");
  });

  // QFAI:EX-0001-0244-04
  it("stops a command that runs past its limit", async () => {
    await writeFile(path.join(root, "slow.js"), "setTimeout(() => {}, 10000);\n", "utf-8");
    await project(["- Test: `node slow.js`", "- Turn-end check: Test"]);
    const reason = String(parsed(await hook({ session_id: "s1" }, 500)).reason);
    expect(reason).toContain("did not finish within");
  });

  // QFAI:EX-0001-0244-04
  it("stops what the timed-out command started as well", async () => {
    const marker = path.join(root, "late.txt");
    await writeFile(
      path.join(root, "late.js"),
      `setTimeout(() => require("fs").writeFileSync(${JSON.stringify(marker)}, "late"), 1500);\n`,
      "utf-8",
    );
    await writeFile(
      path.join(root, "parent.js"),
      'require("child_process").spawn(process.execPath, ["late.js"], { stdio: "inherit" });\n',
      "utf-8",
    );
    await project(["- Test: `node parent.js`", "- Turn-end check: Test"]);
    expect(String(parsed(await hook({ session_id: "s1" }, 500)).reason)).toContain(
      "did not finish within",
    );
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await expect(readFile(marker, "utf-8")).rejects.toThrow();
  });

  // QFAI:EX-0001-0244-05
  it("prints nothing when every marked command passes", async () => {
    const pass = await script("pass.js", "clean\n", 0);
    await project([`- Typecheck: \`${pass}\``, "- Turn-end check: Typecheck"]);
    expect(await hook({ session_id: "s1" })).toBe("");
  });

  // QFAI:EX-0001-0244-06
  it("runs nothing without a turn-end item or with an unknown label", async () => {
    const fail = await script("fail.js", "type error\n", 1);
    await project([`- Typecheck: \`${fail}\``]);
    expect(await hook({ session_id: "s1" })).toBe("");
    await project([`- Typecheck: \`${fail}\``, "- Turn-end check: Build"]);
    expect(await hook({ session_id: "s1" })).toBe("");
  });

  // QFAI:EX-0001-0244-07
  it("prints nothing outside a QFAI project", async () => {
    expect(await hook({ session_id: "s1" })).toBe("");
  });

  // QFAI:EX-0001-0244-08
  it("sees the same failure whatever order stdout and stderr arrive in", async () => {
    await writeFile(
      path.join(root, "fail.js"),
      [
        'const fs = require("fs");',
        'const first = !fs.existsSync("seen");',
        'fs.writeFileSync("seen", "");',
        'const out = () => fs.writeSync(1, "type error\\n");',
        'const err = () => fs.writeSync(2, "1 error found\\n");',
        "if (first) { out(); err(); } else { err(); out(); }",
        "process.exitCode = 1;",
        "",
      ].join("\n"),
      "utf-8",
    );
    await project(["- Typecheck: `node fail.js`", "- Turn-end check: Typecheck"]);
    expect(parsed(await hook({ session_id: "s1" })).decision).toBe("block");
    const second = parsed(await hook({ session_id: "s1", stop_hook_active: true }));
    expect(second.decision).toBeUndefined();
    expect(second.systemMessage).toContain("ended anyway");
  });

  // QFAI:EX-0001-0244-08
  it("blocks a new turn on the failure the last turn ended with", async () => {
    const fail = await script("fail.js", "type error\n", 1);
    await project([`- Typecheck: \`${fail}\``, "- Turn-end check: Typecheck"]);
    expect(parsed(await hook({ session_id: "s1" })).decision).toBe("block");
    expect(parsed(await hook({ session_id: "s1", stop_hook_active: false })).decision).toBe(
      "block",
    );
  });

  // QFAI:EX-0001-0244-07
  it("rejects, rather than passes, when tech.md cannot be read", async () => {
    await project(["- Turn-end check: Typecheck"]);
    const tech = path.join(root, ".qfai", "spec", "03_contract", "tech.md");
    await rm(tech);
    await mkdir(tech);
    await expect(hook({ session_id: "s1" })).rejects.toThrow();
  });

  // QFAI:EX-0001-0244-08
  it("releases the turn when the same failure comes back, digits aside", async () => {
    await writeFile(
      path.join(root, "fail.js"),
      "process.stdout.write('type error after ' + Date.now() + ' ms\\n');process.exit(1);\n",
      "utf-8",
    );
    await project(["- Typecheck: `node fail.js`", "- Turn-end check: Typecheck"]);
    expect(parsed(await hook({ session_id: "s1" })).decision).toBe("block");
    const second = parsed(await hook({ session_id: "s1", stop_hook_active: true }));
    expect(second.decision).toBeUndefined();
    expect(second.systemMessage).toContain("Typecheck");
    expect(second.systemMessage).toContain("ended anyway");
  });

  // QFAI:EX-0001-0244-09
  it("blocks again when the failure changes", async () => {
    await script("fail.js", "first error\n", 1);
    await project(["- Typecheck: `node fail.js`", "- Turn-end check: Typecheck"]);
    expect(parsed(await hook({ session_id: "s1" })).decision).toBe("block");
    await script("fail.js", "another error\n", 1);
    const second = parsed(await hook({ session_id: "s1", stop_hook_active: true }));
    expect(second.decision).toBe("block");
    expect(second.reason).toContain("another error");
  });

  // QFAI:EX-0001-0244-10
  it("releases a continued turn that has no session to compare", async () => {
    const fail = await script("fail.js", "type error\n", 1);
    await project([`- Typecheck: \`${fail}\``, "- Turn-end check: Typecheck"]);
    const output = parsed(await hook({ stop_hook_active: true }));
    expect(output.decision).toBeUndefined();
    expect(output.systemMessage).toContain("ended anyway");
  });

  // QFAI:EX-0001-0244-15
  it("lets a continued turn end after three blocks in a row whatever the failure", async () => {
    await writeFile(
      path.join(root, "fail.js"),
      "process.stdout.write('error ' + Math.random().toString(36) + '\\n');process.exit(1);\n",
      "utf-8",
    );
    await project(["- Typecheck: `node fail.js`", "- Turn-end check: Typecheck"]);
    expect(parsed(await hook({ session_id: "s1" })).decision).toBe("block");
    expect(parsed(await hook({ session_id: "s1", stop_hook_active: true })).decision).toBe("block");
    expect(parsed(await hook({ session_id: "s1", stop_hook_active: true })).decision).toBe("block");
    const fourth = parsed(await hook({ session_id: "s1", stop_hook_active: true }));
    expect(fourth.decision).toBeUndefined();
    expect(fourth.systemMessage).toContain("ended anyway");
  });

  // QFAI:EX-0001-0244-16
  it("keeps a subagent's block apart from the main agent's", async () => {
    const fail = await script("fail.js", "type error\n", 1);
    await project([`- Typecheck: \`${fail}\``, "- Turn-end check: Typecheck"]);
    expect(parsed(await hook({ session_id: "s1", hook_event_name: "SubagentStop" })).decision).toBe(
      "block",
    );
    expect(parsed(await hook({ session_id: "s1", hook_event_name: "Stop" })).decision).toBe(
      "block",
    );
  });

  // QFAI:EX-0001-0244-11
  it("runs nothing when workflow.stopGate is false", async () => {
    const fail = await script("fail.js", "type error\n", 1);
    await project(
      [`- Typecheck: \`${fail}\``, "- Turn-end check: Typecheck"],
      "workflow:\n  stopGate: false\n",
    );
    expect(await hook({ session_id: "s1" })).toBe("");
  });

  // QFAI:EX-0001-0244-12
  it("treats a non-boolean workflow.stopGate as false and reports it", async () => {
    const fail = await script("fail.js", "type error\n", 1);
    await project(
      [`- Typecheck: \`${fail}\``, "- Turn-end check: Typecheck"],
      "workflow:\n  stopGate: maybe\n",
    );
    expect(await hook({ session_id: "s1" })).toBe("");
    const { issues } = await loadConfig(root);
    expect(issues.map((issue) => [issue.code, issue.message])).toContainEqual([
      "QFAI-CFG-002",
      "workflow.stopGate must be true or false; an absent key means true.",
    ]);
  });
});

const assetsInit = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "assets",
  "init",
);
const HOOK_FILES = [
  path.join(assetsInit, ".claude", "settings.json"),
  path.join(assetsInit, ".codex", "hooks.json"),
];

function turnEndEntries(settings: unknown, event: string): Record<string, unknown>[] {
  const hooks: unknown = Reflect.get(Object(settings), "hooks");
  const groups: unknown = Reflect.get(Object(hooks), event);
  if (!Array.isArray(groups)) return [];
  return groups.flatMap((group: unknown) => {
    const entries: unknown = Reflect.get(Object(group), "hooks");
    return Array.isArray(entries)
      ? entries.filter(
          (entry: unknown): entry is Record<string, unknown> =>
            Reflect.get(Object(entry), "statusMessage") === "QFAI turn-end check",
        )
      : [];
  });
}

describe("the turn-end groups qfai init writes", () => {
  // QFAI:EX-0001-0244-13
  it("ships one Stop and one SubagentStop group with a plain guard in both host files", async () => {
    for (const file of HOOK_FILES) {
      const settings: unknown = JSON.parse(await readFile(file, "utf8"));
      for (const event of ["Stop", "SubagentStop"]) {
        const entries = turnEndEntries(settings, event);
        expect(entries).toHaveLength(1);
        const entry = entries[0] ?? {};
        const args: unknown = entry.args;
        const guard = Array.isArray(args) ? String(args[1]) : String(entry.command);
        const body = guard.replace(/^node -e "(.*)"$/, "$1");
        expect(body).toContain("require.resolve('qfai'");
        expect(body).toContain("'hook','turn-end.cjs'");
        expect(body).not.toMatch(/["$`%!\\]/);
      }
    }
  });

  // QFAI:EX-0001-0244-07
  // QFAI:EX-0001-0244-13
  it("runs the package's hook through each shipped guard, and nothing without the package", async () => {
    const pkg = path.join(root, "node_modules", "qfai");
    await mkdir(path.join(pkg, "dist", "hook"), { recursive: true });
    await writeFile(
      path.join(pkg, "package.json"),
      JSON.stringify({ name: "qfai", exports: { ".": { require: "./dist/index.cjs" } } }),
      "utf-8",
    );
    await writeFile(path.join(pkg, "dist", "index.cjs"), "", "utf-8");
    await writeFile(
      path.join(pkg, "dist", "hook", "turn-end.cjs"),
      "const s=require('fs').readFileSync(0,'utf8');process.stdout.write('reached '+s.length);\n",
      "utf-8",
    );
    const empty = await mkdtemp(path.join(os.tmpdir(), "qfai-turn-end-none-"));
    try {
      const [claudeFile, codexFile] = HOOK_FILES;
      const claude = turnEndEntries(JSON.parse(await readFile(claudeFile ?? "", "utf8")), "Stop");
      const codex = turnEndEntries(JSON.parse(await readFile(codexFile ?? "", "utf8")), "Stop");
      const args = claude[0]?.args;
      if (!Array.isArray(args)) throw new Error("no Claude args");
      const guard = String(args[1]);
      for (const [base, expected] of [
        [root, "reached 2"],
        [empty, ""],
      ] as const) {
        const viaArgs = spawnSync(process.execPath, ["-e", guard, base], {
          cwd: empty,
          input: "{}",
          encoding: "utf8",
        });
        expect([viaArgs.status, viaArgs.stdout]).toEqual([0, expected]);
        const viaShell = spawnSync(String(codex[0]?.command), {
          cwd: base,
          input: "{}",
          encoding: "utf8",
          shell: true,
        });
        expect([viaShell.status, viaShell.stdout]).toEqual([0, expected]);
      }
    } finally {
      await removeTempTree(empty);
    }
  });

  // QFAI:EX-0001-0244-14
  it("keeps a project's own Stop group, appends the shipped one, and changes nothing twice", async () => {
    const template = await readFile(HOOK_FILES[0] ?? "", "utf8");
    const own = {
      hooks: {
        Stop: [{ hooks: [{ type: "command", statusMessage: "Project stop", command: "true" }] }],
      },
    };
    const first = mergeDocumentationClarityHooks(JSON.stringify(own), template);
    if (first.outcome !== "merged") throw new Error(first.outcome);
    const stop = Reflect.get(Object(first.settings.hooks), "Stop");
    expect(Array.isArray(stop) ? stop.length : 0).toBe(2);
    expect(turnEndEntries(first.settings, "Stop")).toHaveLength(1);
    const second = mergeDocumentationClarityHooks(
      serializeClaudeSettings(first.settings),
      template,
    );
    expect(second.outcome).toBe("already-present");
  });
});

describe("readTurnEndChecks", () => {
  // QFAI:EX-0001-0244-06
  it("pairs each listed label with its command, in list order", () => {
    const text = [
      "## Standard commands (copy-paste)",
      "",
      "- Lint: `pnpm lint`",
      "- Typecheck: `pnpm check-types`",
      "- Turn-end check: Typecheck, Lint, Build",
      "",
      "## Other",
      "- Build: `pnpm build`",
    ].join("\n");
    expect(readTurnEndChecks(text)).toEqual([
      { label: "Typecheck", command: "pnpm check-types" },
      { label: "Lint", command: "pnpm lint" },
    ]);
  });
});
