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
  // SIMPLIFIED: silences one deprecation, and only inside the declaration rollup.
  // The bundler builds that rollup with `baseUrl: compilerOptions.baseUrl || "."`,
  // unconditionally, and TypeScript 6 makes `baseUrl` an error rather than a warning.
  // This package declares neither `baseUrl` nor `paths`, so the option being silenced
  // is the bundler's and not ours, and nothing here relies on what it does.
  // Lift when: the bundler stops injecting it, or the declarations stop coming from it.
  dts: { compilerOptions: { ignoreDeprecations: "6.0" } },
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
