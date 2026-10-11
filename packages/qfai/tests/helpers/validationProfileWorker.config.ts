import path from "node:path";

import { defineConfig } from "vitest/config";

import { projectKnobs, SETUP_FILES } from "../../vitest.knobs.js";

const checkpoint = process.env.QFAI_VALIDATION_PROFILE_CHECKPOINT;
if (!checkpoint) throw new Error("The profiling controller did not supply a checkpoint path");

/** One private test file in one terminable Node process; normal projects are unchanged. */
export default defineConfig({
  root: path.resolve(import.meta.dirname, "../.."),
  server: {
    fs: {
      allow: [
        path.resolve(import.meta.dirname, "../../../.."),
        path.join(path.dirname(checkpoint), "baseline-source"),
      ],
    },
  },
  test: {
    ...projectKnobs,
    setupFiles: SETUP_FILES,
    include: ["tests/helpers/validationProfileWorker.test.ts"],
    pool: "threads",
    maxWorkers: 1,
    fileParallelism: false,
  },
});
