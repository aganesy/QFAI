import path from "node:path";

import { defineConfig } from "vitest/config";

import { projectKnobs, SETUP_FILES } from "../../vitest.knobs.js";

/** One private test file in one terminable Node process; normal projects are unchanged. */
export default defineConfig({
  root: path.resolve(import.meta.dirname, "../.."),
  test: {
    ...projectKnobs,
    setupFiles: SETUP_FILES,
    include: ["tests/helpers/validationProfileWorker.test.ts"],
    pool: "threads",
    maxWorkers: 1,
    fileParallelism: false,
  },
});
