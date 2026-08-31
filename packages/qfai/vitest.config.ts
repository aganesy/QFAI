import { defineConfig } from "vitest/config";

import { rootKnobs } from "./vitest.knobs";

// Coverage configuration is centralized here so `vitest run --coverage`
// produces a single coverage-summary.json regardless of which projects
// were exercised. The scanner-coverage CI lane (NFR-0111) reads
// `coverage/coverage-summary.json` and asserts >= 90% statement coverage
// on `src/core/prototyping/designMdViolations.ts`.
//
// The worker and file-parallelism axes live here too, and not on the projects:
// the runner treats them as root-only, so a per-project declaration is inert.
// `vitest.knobs.ts` holds both halves of the set and the measurement behind the
// split.
export default defineConfig({
  test: {
    ...rootKnobs,
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.d.ts", "src/**/__fixtures__/**"],
    },
  },
});
