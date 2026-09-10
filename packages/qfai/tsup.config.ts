import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "tsup";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const pkgPath = path.resolve(rootDir, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
  version?: string;
};
const toolVersion = pkg.version ?? "unknown";

export default defineConfig({
  tsconfig: "tsconfig.build.json",
  entry: {
    index: "src/index.ts",
    "cli/index": "src/cli/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "node20",
  splitting: false,
  // Neither is a dependency of this package: each is loaded through a dynamic
  // import only when the command that needs it runs, and resolved from the
  // project's own `node_modules`. Bundling either is wrong in the same way —
  // the engine ships a data file beside its entry point, so an inlined copy
  // looks for that file next to `dist/` and fails on the first use.
  external: ["playwright", "@electric-sql/pglite"],
  outExtension({ format }) {
    return { js: format === "esm" ? ".mjs" : ".cjs" };
  },
  define: {
    __QFAI_TOOL_VERSION__: JSON.stringify(toolVersion),
  },
  esbuildOptions(options, context) {
    if (context.format !== "cjs") {
      return;
    }
    options.define ||= {};
    options.define["import.meta.url"] = "__filename";
  },
});
