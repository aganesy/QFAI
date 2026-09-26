/**
 * E2E: asking about the repository starts nothing (spec-0018).
 *
 * The entry's own `status` call on a `qfai init` project answers with no run and writes nothing.
 */
import { access } from "node:fs/promises";
import path from "node:path";

import { afterEach, expect, it } from "vitest";

import {
  field,
  initProject,
  removeProjects,
  treeDigest,
  workflow,
} from "../integration/workflow/workflowProject.js";

afterEach(removeProjects);

// QFAI:SPEC-0018:US-0018-0006
// QFAI:SPEC-0003:US-0003-0029
it("US-0018-0006 (TDD-0460): the entry's status call leaves no run and a byte-identical tree", async () => {
  const root = await initProject();
  const before = await treeDigest(root);

  const status = workflow(root, ["status"]);
  const runs = await access(path.join(root, ".qfai", "runs")).then(
    () => true,
    () => false,
  );

  expect({
    exit: status.status,
    run: field(status.json, "run"),
    mode: field(status.json, "mode"),
    runs,
    unchanged: (await treeDigest(root)) === before,
  }).toEqual({ exit: 0, run: null, mode: "active", runs: false, unchanged: true });
}, 180_000);
