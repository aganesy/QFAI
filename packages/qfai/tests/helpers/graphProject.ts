import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runInit } from "../../src/cli/commands/init.js";
import { captureStdout } from "./stdout.js";
import { graphProcessFixture } from "./graphProcess.js";

export async function graphProject() {
  const root = await mkdtemp(path.join(os.tmpdir(), "qfai-graph-acceptance-"));
  const fixture = graphProcessFixture();
  return {
    root,
    fixture,
    initialize: (dryRun = false) =>
      captureStdout(() => runInit({ dir: root, force: false, dryRun, yes: true }, {}, fixture.run)),
    dispose: () => rm(root, { recursive: true, force: true }),
  };
}
