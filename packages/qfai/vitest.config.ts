import { defineConfig } from "vitest/config";

import { rootKnobs } from "./vitest.knobs";
import projects from "./vitest.workspace";

// Coverage configuration is centralized here so `vitest run --coverage`
// produces a single coverage-summary.json regardless of which projects
// were exercised.
//
// The worker and file-parallelism axes live here too, and not on the projects:
// the runner treats them as root-only, so a per-project declaration is inert.
// `vitest.knobs.ts` holds both halves of the set and the measurement behind the
// split.
//
// The projects come from `vitest.workspace.ts`, imported rather than discovered:
// the runner reads the set from `projects` and no longer looks for a file by name.
export default defineConfig({
  test: {
    ...rootKnobs,
    projects,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.d.ts", "src/**/__fixtures__/**"],
    },
  },
});
