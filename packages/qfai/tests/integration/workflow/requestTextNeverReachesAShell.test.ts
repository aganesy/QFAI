// QFAI:AC-0001-0197-02
// QFAI:EX-0001-0197-05

import { mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, expect, it } from "vitest";

import {
  field,
  inbox,
  minimalProject,
  removeProjects,
  START_INPUT,
  startRun,
  workflow,
} from "./workflowProject.js";

afterEach(removeProjects);

const SOURCE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "src",
);

async function namesUnder(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries.map((entry) => entry.name);
}

it("Built CLI start with the request of EX-0018-0086, on the Linux and the Windows job", async () => {
  const root = await minimalProject();
  const text =
    "Export it $(touch pwned) `touch pwned`; touch pwned & echo | more > pwned %PATH% ^pwned";
  const runId = await startRun(root, { ...START_INPUT, request: { text } });
  const privateCopy: unknown = JSON.parse(
    await readFile(path.join(root, ".qfai", "run", runId, "request.private.json"), "utf8"),
  );

  expect({
    text: field(privateCopy, "request.text"),
    pwned: [...(await namesUnder(root)), ...(await readdir(process.cwd()))].includes("pwned"),
  }).toEqual({ text, pwned: false });
});

// `start` naming `inPath`, and the run directories it left behind.
async function startNaming(root: string, inPath: string) {
  const started = workflow(root, ["start", "--in", inPath]);
  const runs = (await readdir(path.join(root, ".qfai", "run")).catch(() => [])).filter((name) =>
    name.startsWith("run-"),
  );
  return {
    code: field(started.json, "error.code"),
    reasons: field(started.json, "error.reasons"),
    runs,
  };
}

const IN_PATH_REFUSED = {
  code: "invalid-input",
  reasons: [{ reason: "in-path", subject: "--in" }],
  runs: [],
};

it("outside-runs", async () => {
  const root = await minimalProject();
  await writeFile(path.join(root, "start.json"), JSON.stringify(START_INPUT));

  expect(await startNaming(root, "start.json")).toEqual(IN_PATH_REFUSED);
});

it("dotdot-escape", async () => {
  const root = await minimalProject();
  await inbox(root, null, "start", START_INPUT);
  await writeFile(path.join(root, "start.json"), JSON.stringify(START_INPUT));

  expect(await startNaming(root, ".qfai/run/inbox/../../../start.json")).toEqual(IN_PATH_REFUSED);
});

it("link-escape", async () => {
  const root = await minimalProject();
  const outside = await mkdtemp(path.join(os.tmpdir(), "qfai-outside-"));
  await writeFile(path.join(outside, "start.json"), JSON.stringify(START_INPUT));
  await mkdir(path.join(root, ".qfai", "run", "inbox"), { recursive: true });
  await symlink(outside, path.join(root, ".qfai", "run", "inbox", "linked"), "junction");
  const refused = await startNaming(root, ".qfai/run/inbox/linked/start.json");
  await rm(outside, { recursive: true, force: true });

  expect(refused).toEqual(IN_PATH_REFUSED);
});

it("directory", async () => {
  const root = await minimalProject();
  await mkdir(path.join(root, ".qfai", "run", "inbox", "start.json"), { recursive: true });

  expect(await startNaming(root, ".qfai/run/inbox/start.json")).toEqual(IN_PATH_REFUSED);
});

it("Scan the sources under core/workflow/ and the workflow command", async () => {
  const files = [
    ...(await readdir(path.join(SOURCE_ROOT, "core", "workflow"))).map((name) =>
      path.join(SOURCE_ROOT, "core", "workflow", name),
    ),
    path.join(SOURCE_ROOT, "cli", "commands", "workflow.ts"),
  ];
  const offending: string[] = [];
  for (const file of files) {
    const text = await readFile(file, "utf8");
    const shellCall =
      /(?<![.\w])exec(Sync)?\s*\(/.test(text) ||
      /\b(spawn|spawnSync|execFile|execFileSync)\s*\([^)]*shell\s*:/s.test(text);
    if (shellCall) offending.push(path.basename(file));
  }

  expect({ scanned: files.length > 1, offending }).toEqual({ scanned: true, offending: [] });
});
