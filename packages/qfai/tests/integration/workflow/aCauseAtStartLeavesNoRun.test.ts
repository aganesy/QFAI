// QFAI:SPEC-0018:TC-0018-0176
// QFAI:SPEC-0018:TC-0018-0177
// QFAI:SPEC-0018:TC-0018-0178

import { spawnSync } from "node:child_process";
import { appendFile, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";
import { parseDocument } from "yaml";

import {
  CLI,
  field,
  inbox,
  initProject,
  minimalProject,
  removeProjects,
  START_INPUT,
  workflow,
} from "./workflowProject.js";

afterEach(removeProjects);

const MANIFEST = path.join(".qfai", "assistant", "manifest", "agent-routing.yml");
const VERIFY_SKILL = path.join(".qfai", "assistant", "skills", "qfai-verify");
const VERIFY_TABLE = path.join(VERIFY_SKILL, "references", "orchestrated-mode.md");

// `start` in `root`, and the run directories it left behind.
async function startIn(root: string) {
  const started = workflow(root, ["start", "--in", await inbox(root, null, "start", START_INPUT)]);
  const runs = await readdir(path.join(root, ".qfai", "runs")).catch(() => []);
  return {
    code: field(started.json, "error.code"),
    cause: field(started.json, "error.cause"),
    runs: runs.filter((name) => name.startsWith("run-")),
  };
}

// Drops the first blocking agent of the first phase routed to `skill`.
async function dropBlockingAgent(root: string, skill: string): Promise<void> {
  const file = path.join(root, MANIFEST);
  const document = parseDocument(await readFile(file, "utf8"));
  const routing: unknown = document.toJS();
  const entries = field(routing, "routing");
  const index = Array.isArray(entries)
    ? entries.findIndex((entry) => field(entry, "skill") === skill)
    : -1;
  document.deleteIn(["routing", index, "phases", 0, "blocking_agents", 0]);
  await writeFile(file, document.toString());
}

it("TC-0018-0176 (TDD-0379): A project agent-routing", async () => {
  const root = await minimalProject();
  await dropBlockingAgent(root, "qfai-implement");

  expect(await startIn(root)).toEqual({
    code: "fail-closed",
    cause: "reviewer-missing",
    runs: [],
  });
});

const table = (header: string, cells: string[]) =>
  ["# qfai-verify", "", "## Operations", "", `| ${header} | What |`, "| --- | --- |"]
    .concat(cells.map((cell) => `| ${cell} | stub |`))
    .join("\n");

const BOUNDARIES: [string, (root: string) => Promise<void>][] = [
  [
    "TC-0018-0177 (TDD-0380): plan-differs",
    (root) =>
      appendFile(
        path.join(root, ".qfai", "assistant", "process", "workflows", "feature.yml"),
        "# edited\n",
      ),
  ],
  [
    "TC-0018-0177 (TDD-0381): skill-missing",
    (root) => rm(path.join(root, VERIFY_SKILL), { recursive: true, force: true }),
  ],
  [
    "TC-0018-0177 (TDD-0382): operations-table-missing",
    (root) =>
      writeFile(path.join(root, VERIFY_TABLE), "# qfai-verify\n\nServes the verify stage.\n"),
  ],
  [
    "TC-0018-0177 (TDD-0383): operations-first-column",
    (root) => writeFile(path.join(root, VERIFY_TABLE), table("Mode", ["`verify-full`"])),
  ],
  [
    "TC-0018-0177 (TDD-0384): operations-cell-not-id",
    (root) =>
      writeFile(path.join(root, VERIFY_TABLE), table("Operation", ["`verify-full`, `verify`"])),
  ],
  [
    "TC-0018-0177 (TDD-0385): operations-pair-omitted",
    (root) => writeFile(path.join(root, VERIFY_TABLE), table("Operation", ["`diagnose-only`"])),
  ],
];

for (const [title, breakIt] of BOUNDARIES) {
  it(title, async () => {
    const root = await minimalProject();
    await breakIt(root);

    expect(await startIn(root)).toEqual({
      code: "fail-closed",
      cause: "contract-undeclared",
      runs: [],
    });
  });
}

it("TC-0018-0178 (TDD-0386): A temp project after a qfai init upgrade over a hand-edited manifest that drops a required", async () => {
  const root = await initProject();
  await dropBlockingAgent(root, "qfai-implement");
  const upgrade = spawnSync(process.execPath, [CLI, "init", "--upgrade-assistant-tree", "--yes"], {
    cwd: root,
    encoding: "utf8",
  });
  const started = await startIn(root);

  expect({
    upgraded: upgrade.status,
    code: started.code,
    cause: ["reviewer-missing", "contract-undeclared"].includes(String(started.cause)),
    runs: started.runs,
  }).toEqual({ upgraded: 0, code: "fail-closed", cause: true, runs: [] });
}, 180_000);
