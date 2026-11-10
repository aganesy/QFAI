import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  mergeDocumentationClarityHooks,
  serializeClaudeSettings,
} from "../../src/core/claudeCodeHooks.js";
import { loadConfig } from "../../src/core/config.js";
import { readTurnEndChecks, runTurnEndHook } from "../../src/core/turnEndHook.js";

let root: string;
let stateDir: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-turn-end-"));
  stateDir = await mkdtemp(path.join(os.tmpdir(), "qfai-turn-end-state-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
  await rm(stateDir, { recursive: true, force: true });
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
  // QFAI:EX-0001-0241-01
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

  // QFAI:EX-0001-0241-02
  it("blocks a SubagentStop event the same way", async () => {
    const fail = await script("fail.js", "type error\n", 1);
    await project([`- Typecheck: \`${fail}\``, "- Turn-end check: Typecheck"]);
    const output = parsed(await hook({ hook_event_name: "SubagentStop", session_id: "s1" }));
    expect(output.decision).toBe("block");
  });

  // QFAI:EX-0001-0241-03
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

  // QFAI:EX-0001-0241-04
  it("stops a command that runs past its limit", async () => {
    await writeFile(path.join(root, "slow.js"), "setTimeout(() => {}, 10000);\n", "utf-8");
    await project(["- Test: `node slow.js`", "- Turn-end check: Test"]);
    const reason = String(parsed(await hook({ session_id: "s1" }, 500)).reason);
    expect(reason).toContain("did not finish within");
  });

  // QFAI:EX-0001-0241-05
  it("prints nothing when every marked command passes", async () => {
    const pass = await script("pass.js", "clean\n", 0);
    await project([`- Typecheck: \`${pass}\``, "- Turn-end check: Typecheck"]);
    expect(await hook({ session_id: "s1" })).toBe("");
  });

  // QFAI:EX-0001-0241-06
  it("runs nothing without a turn-end item or with an unknown label", async () => {
    const fail = await script("fail.js", "type error\n", 1);
    await project([`- Typecheck: \`${fail}\``]);
    expect(await hook({ session_id: "s1" })).toBe("");
    await project([`- Typecheck: \`${fail}\``, "- Turn-end check: Build"]);
    expect(await hook({ session_id: "s1" })).toBe("");
  });

  // QFAI:EX-0001-0241-07
  it("prints nothing outside a QFAI project", async () => {
    expect(await hook({ session_id: "s1" })).toBe("");
  });

  // QFAI:EX-0001-0241-08
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
    expect(second.systemMessage).toContain("stopped blocking");
  });

  // QFAI:EX-0001-0241-09
  it("blocks again when the failure changes", async () => {
    await script("fail.js", "first error\n", 1);
    await project(["- Typecheck: `node fail.js`", "- Turn-end check: Typecheck"]);
    expect(parsed(await hook({ session_id: "s1" })).decision).toBe("block");
    await script("fail.js", "another error\n", 1);
    const second = parsed(await hook({ session_id: "s1", stop_hook_active: true }));
    expect(second.decision).toBe("block");
    expect(second.reason).toContain("another error");
  });

  // QFAI:EX-0001-0241-10
  it("releases a continued turn that has no session to compare", async () => {
    const fail = await script("fail.js", "type error\n", 1);
    await project([`- Typecheck: \`${fail}\``, "- Turn-end check: Typecheck"]);
    const output = parsed(await hook({ stop_hook_active: true }));
    expect(output.decision).toBeUndefined();
    expect(output.systemMessage).toContain("stopped blocking");
  });

  // QFAI:EX-0001-0241-11
  it("runs nothing when workflow.stopGate is false", async () => {
    const fail = await script("fail.js", "type error\n", 1);
    await project(
      [`- Typecheck: \`${fail}\``, "- Turn-end check: Typecheck"],
      "workflow:\n  stopGate: false\n",
    );
    expect(await hook({ session_id: "s1" })).toBe("");
  });

  // QFAI:EX-0001-0241-12
  it("treats a non-boolean workflow.stopGate as false and reports it", async () => {
    const fail = await script("fail.js", "type error\n", 1);
    await project(
      [`- Typecheck: \`${fail}\``, "- Turn-end check: Typecheck"],
      "workflow:\n  stopGate: maybe\n",
    );
    expect(await hook({ session_id: "s1" })).toBe("");
    const { issues } = await loadConfig(root);
    expect(issues.map((issue) => issue.message)).toContain(
      "workflow.stopGate must be true or false; an absent key means true.",
    );
  });
});

const assetsInit = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
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
  // QFAI:EX-0001-0241-13
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

  // QFAI:EX-0001-0241-14
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
  // QFAI:EX-0001-0241-06
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
