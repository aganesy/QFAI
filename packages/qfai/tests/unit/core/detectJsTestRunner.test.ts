/**
 * The JS/TS runner `qfai atdd scaffold` reads from a `package.json`, and how
 * it fits the dialect the configured globs chose.
 */

import { describe, expect, it } from "vitest";

import {
  applyJsRunner,
  detectJsTestRunner,
  readPackageModuleType,
  resolveScaffoldDialect,
} from "../../../src/core/atdd/scaffoldDialect.js";

describe("detectJsTestRunner", () => {
  it.each([
    ["node --test", "node:test"],
    ["node --import tsx --test src/", "node:test"],
    ["node --watch --test", "node:test"],
    ["node.exe --test", "node:test"],
    ["cross-env X=1 node --test", "node:test"],
    ["/usr/bin/node --test", "node:test"],
    ['"C:\\Program Files\\nodejs\\node.exe" --test', "node:test"],
    ["node build.mjs --test", "none"],
    ["echo --test", "none"],
    ["node --test-reporter spec build.mjs", "none"],
    ["node --test-reporter spec --test", "node:test"],
    ["node -- --test", "none"],
    ["vitest run", "vitest"],
    ["npx vitest --run", "vitest"],
    ["npx --yes vitest run", "vitest"],
    ["pnpm exec vitest run", "vitest"],
    ["pnpm dlx vitest", "vitest"],
    ["pnpm vitest run", "vitest"],
    ["yarn vitest", "vitest"],
    ["yarn dlx vitest", "vitest"],
    ["npm exec -- vitest", "vitest"],
    ["bunx vitest", "vitest"],
    ["cross-env CI=1 vitest run", "vitest"],
    ["CI=1 vitest", "vitest"],
    ["tsc --noEmit && vitest run", "vitest"],
    ["./node_modules/.bin/vitest run", "vitest"],
    ["node_modules\\.bin\\vitest run", "vitest"],
    ["echo $(vitest)", "vitest"],
    ['NODE_OPTIONS="--experimental-vm-modules --no-warnings" vitest run', "vitest"],
    ["NODE_OPTIONS='--no-warnings' vitest", "vitest"],
    ["env CI=1 vitest", "vitest"],
    ["dotenv -e .env -- vitest", "vitest"],
    ["env-cmd -f .env vitest", "vitest"],
    ["time vitest run", "vitest"],
    ['sh -c "tsc && vitest run"', "vitest"],
    ['concurrently "tsc -w" "vitest"', "vitest"],
    ['run-p "vitest run"', "vitest"],
    ["npx -p vitest@3 vitest run", "vitest"],
    ["bun run vitest", "vitest"],
    ["bun vitest", "vitest"],
    ["pnpm --filter web exec vitest", "vitest"],
    ["pnpm -w vitest", "vitest"],
    ['echo "vitest run"', "none"],
    ['sh -c "echo vitest"', "none"],
    ["echo vitest", "none"],
    ["eslint --rule vitest", "none"],
    ["npm run vitest", "none"],
    ["tsc vitest.config.ts", "none"],
  ])("reads the script %j as %s", (script, runner) => {
    expect(detectJsTestRunner({ scripts: { test: script } })).toBe(runner);
  });

  it.each([
    [{ devDependencies: { vitest: "^3.0.0", jest: "^29.0.0" } }, "vitest"],
    [{ dependencies: { jest: "^29.0.0" }, scripts: { test: "node --test" } }, "node:test"],
    [{ devDependencies: { jest: "^29.0.0" } }, "jest"],
    [{ scripts: { lint: "echo vitest", test: "node --test" } }, "node:test"],
    [{ dependencies: ["vitest"] }, "none"],
    [["vitest"], "none"],
    ["vitest", "none"],
    [null, "none"],
  ])("reads the manifest %j as %s", (manifest, runner) => {
    expect(detectJsTestRunner(manifest)).toBe(runner);
  });
});

describe("applyJsRunner", () => {
  it("leaves a Python dialect as it is whatever the JS/TS runner", () => {
    const resolution = resolveScaffoldDialect(["tests/**/test_*.py"]);
    if (resolution.outcome !== "resolved") throw new Error(resolution.outcome);
    const applied = applyJsRunner(resolution.dialect, "none", "commonjs");
    if (applied.outcome !== "resolved") throw new Error(applied.outcome);
    expect(applied.dialect.runner).toBe("pytest (unittest-compatible)");
  });

  it("keeps the JS/TS file name and takes the node:test body", () => {
    const resolution = resolveScaffoldDialect(["tests/**/*.test.mjs"]);
    if (resolution.outcome !== "resolved") throw new Error(resolution.outcome);
    const applied = applyJsRunner(resolution.dialect, "node:test", "commonjs");
    if (applied.outcome !== "resolved") throw new Error(applied.outcome);
    expect(applied.dialect.fileName("BF-0001")).toBe("BF-0001.test.mjs");
    expect(applied.dialect.buildBody("BF-0001")[0]).toBe(
      'import { describe, it } from "node:test";',
    );
  });

  it.each([
    ["cjs", "module", "require"],
    ["cts", "module", "require"],
    ["js", "commonjs", "require"],
    ["js", "unset", "require"],
    ["js", "module", "import"],
    ["mjs", "commonjs", "import"],
    ["ts", "commonjs", "require"],
    ["ts", "unset", "import"],
    ["ts", "module", "import"],
    ["mts", "commonjs", "import"],
  ] as const)(
    "loads node:test in a .%s file of a %s package with %s",
    (extension, packageType, loads) => {
      const resolution = resolveScaffoldDialect([`tests/**/*.test.${extension}`]);
      if (resolution.outcome !== "resolved") throw new Error(resolution.outcome);
      const applied = applyJsRunner(resolution.dialect, "node:test", packageType);
      if (applied.outcome !== "resolved") throw new Error(applied.outcome);
      expect(applied.dialect.buildBody("BF-0001")[0]).toBe(
        loads === "require"
          ? 'const { describe, it } = require("node:test");'
          : 'import { describe, it } from "node:test";',
      );
    },
  );

  it("keeps the vitest import in a CommonJS file", () => {
    const resolution = resolveScaffoldDialect(["tests/**/*.test.cjs"]);
    if (resolution.outcome !== "resolved") throw new Error(resolution.outcome);
    const applied = applyJsRunner(resolution.dialect, "vitest", "commonjs");
    if (applied.outcome !== "resolved") throw new Error(applied.outcome);
    expect(applied.dialect.buildBody("BF-0001")[0]).toBe('import { describe, it } from "vitest";');
  });

  it.each([
    [{ type: "module" }, "module"],
    [{ type: "commonjs" }, "commonjs"],
    [{}, "unset"],
    [{ type: "esm" }, "unset"],
    [["module"], "unset"],
    [null, "unset"],
  ])("reads the package type of %j as %s", (manifest, packageType) => {
    expect(readPackageModuleType(manifest)).toBe(packageType);
  });

  it.each(["jest", "none"] as const)("refuses a JS/TS dialect for %s", (runner) => {
    const resolution = resolveScaffoldDialect(["tests/**/*.test.ts"]);
    if (resolution.outcome !== "resolved") throw new Error(resolution.outcome);
    expect(applyJsRunner(resolution.dialect, runner, "commonjs")).toEqual({
      outcome: "unsupported-runner",
      runner,
    });
  });
});
