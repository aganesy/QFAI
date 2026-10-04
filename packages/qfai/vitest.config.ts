import { defineConfig } from "vitest/config";

import { rootKnobs } from "./vitest.knobs";
import projects from "./vitest.workspace";

// The worker and file-parallelism axes live here, and not on the projects:
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
  },
});
