import { defineWorkspace } from "vitest/config";

import { SETUP_FILES, projectKnobs } from "./vitest.knobs";

/**
 * The runner projects, each declaring the project-scoped half of the knob set.
 *
 * The worker and file-parallelism axes are NOT here: the runner reads those only from the
 * root configuration, so declaring them per project type-checks, runs, warns about
 * nothing and has no effect. `vitest.knobs.ts` carries both halves and the measurement
 * that established the split.
 *
 * Two shapes in this file are load-bearing for a sibling row and should not be
 * rearranged casually: every project's `name` is a string literal, and its `include`
 * follows the name. A slice-surface row reads both from this file as text.
 */
export default defineWorkspace([
  {
    test: {
      ...projectKnobs,
      setupFiles: SETUP_FILES,
      name: "core",
      include: ["tests/core/**/*.test.ts"],
    },
  },
  {
    test: {
      ...projectKnobs,
      setupFiles: SETUP_FILES,
      name: "unit",
      include: ["tests/unit/**/*.test.ts"],
    },
  },
  {
    test: {
      ...projectKnobs,
      setupFiles: SETUP_FILES,
      name: "validators",
      include: ["tests/validators/**/*.test.ts"],
    },
  },
  {
    test: {
      ...projectKnobs,
      setupFiles: SETUP_FILES,
      name: "integration",
      include: [
        "tests/integration/**/*.test.ts",
        "tests/detection/**/*.test.ts",
        "tests/skill/**/*.test.ts",
        "tests/codex/**/*.test.ts",
      ],
    },
  },
  {
    test: {
      ...projectKnobs,
      setupFiles: SETUP_FILES,
      name: "e2e",
      include: ["tests/e2e/**/*.test.ts", "tests/assets/**/*.test.ts"],
    },
  },
  {
    test: {
      ...projectKnobs,
      setupFiles: SETUP_FILES,
      name: "cli",
      include: ["tests/cli/**/*.test.ts"],
    },
  },
  {
    test: {
      ...projectKnobs,
      setupFiles: SETUP_FILES,
      name: "scripts",
      include: ["tests/scripts/**/*.test.ts"],
    },
  },
]);
