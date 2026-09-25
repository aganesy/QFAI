// QFAI:EX-0001-0199-01

import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import { field, minimalProject, removeProjects, treeDigest, workflow } from "./workflowProject.js";

afterEach(removeProjects);

const modes: [string, string][] = [
  ["off", "off"],
  ["shadow", "shadow"],
];

for (const [title, mode] of modes) {
  it(title, async () => {
    const root = await minimalProject(`workflow:\n  mode: ${mode}\n`);
    const runs = path.join(root, ".qfai", "run");
    await mkdir(path.join(runs, "inbox"), { recursive: true });
    await writeFile(path.join(runs, "inbox", "start.json"), "{ not json");
    const before = await treeDigest(root);

    const started = workflow(root, ["start", "--in", ".qfai/run/inbox/start.json"]);

    expect({
      exit: started.status,
      ok: field(started.json, "ok"),
      mode: field(started.json, "mode"),
      run: field(started.json, "run"),
      entries: (await readdir(runs)).sort(),
      unchanged: (await treeDigest(root)) === before,
    }).toEqual({ exit: 0, ok: true, mode, run: null, entries: ["inbox"], unchanged: true });
  });
}
