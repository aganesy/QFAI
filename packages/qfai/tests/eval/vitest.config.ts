import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// The routing eval's own configuration. No project of the package's configuration collects the
// runner, so it runs only when a maintainer names this file.
export default defineConfig({
  test: {
    root: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".."),
    include: ["tests/eval/routingEval.run.ts"],
    testTimeout: 0,
  },
});
