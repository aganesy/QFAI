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
  target: "node18",
  splitting: false,
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
    options.define["import.meta.url"] = "import_meta_url";
    options.inject ||= [];
    options.inject.push(
      path.resolve(rootDir, "src/build/import-meta-url.inject.js"),
    );
  },
});
