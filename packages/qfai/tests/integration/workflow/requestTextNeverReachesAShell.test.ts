// QFAI:AC-0001-0190-02

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, expect, it } from "vitest";

import { extraction } from "../../helpers/workflowExtraction.js";
import { field, listTree, minimalProject, removeProjects, workflow } from "./workflowProject.js";

afterEach(removeProjects);

const SOURCE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "src",
);

const TEXT =
  "Export it $(touch pwned) `touch pwned`; touch pwned & echo | more > pwned %PATH% ^pwned";

// QFAI:EX-0001-0190-05
it("An extraction carrying the request text is refused, and nothing it holds runs", async () => {
  const root = await minimalProject();
  const planned = workflow(
    root,
    ["plan", "--in", "-"],
    JSON.stringify({ ...extraction(), request: { text: TEXT } }),
  );

  expect({
    status: planned.status,
    reasons: field(planned.json, "reasons"),
    pwned: [...(await listTree(root)), ...(await readdir(process.cwd()))].some((name) =>
      name.endsWith("pwned"),
    ),
  }).toEqual({
    status: 2,
    reasons: [
      { reason: "schema", subject: "request", cause: "unknown: request is not a field here" },
    ],
    pwned: false,
  });
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
      /\b(spawn|spawnSync|execFile|execFileSync)\s*\(/s.test(text);
    if (shellCall) offending.push(path.basename(file));
  }

  expect({ scanned: files.length > 1, offending }).toEqual({ scanned: true, offending: [] });
});
