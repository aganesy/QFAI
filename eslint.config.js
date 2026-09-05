import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * The typed-lint file set, READ from `packages/qfai/tsconfig.tests.json` rather than restated here.
 *
 * The block below re-enables four promise rules that `disableTypeChecked` turns off for `tests/**`,
 * and its comment says the set is 'the set `tsconfig.tests.json` includes'. That sentence was false
 * twice: by one entry at round 14, and by 35 entries when a reviewer measured it again. A list that
 * has to be kept equal to another list is the defect; equality by construction is the fix.
 *
 * The tsconfig carries `//` comments, so it is JSONC. Only line comments appear in it, and no entry
 * contains `//`, which is what makes the strip below safe rather than merely convenient — a path
 * with a protocol in it would break this, and there is a guard test that would catch it.
 */
const TESTS_TSCONFIG = path.join(__dirname, "packages", "qfai", "tsconfig.tests.json");
const TYPED_TEST_FILES = JSON.parse(
  readFileSync(TESTS_TSCONFIG, "utf8").replace(/^\s*\/\/.*$/gm, ""),
).include.map((rel) => `packages/qfai/${rel}`);

export default [
  {
    ignores: ["**/dist/**", "**/node_modules/**", "tmp/**", "**/tmp/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
  },
  // Treat all warnings as errors – zero tolerance
  {
    rules: {
      // Upgrade common warnings to errors
      "no-console": "error",
      "no-debugger": "error",
      "no-warning-comments": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      // Allow number/boolean in template literals (safe & idiomatic)
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true, allowBoolean: true },
      ],
      // Allow defensive null/undefined checks even when TypeScript thinks unnecessary
      "@typescript-eslint/no-unnecessary-condition": [
        "error",
        { allowConstantLoopConditions: true },
      ],
      // Allow void in arrow shorthand (common with .forEach)
      "@typescript-eslint/no-confusing-void-expression": ["error", { ignoreArrowShorthand: true }],
    },
  },
  // Test files & config files outside tsconfig – disable type-checked rules
  {
    files: [
      "**/tests/**/*.ts",
      "packages/qfai/scripts/**/*.ts",
      "packages/qfai/vitest.config.ts",
      "packages/qfai/vitest.workspace.ts",
      // The runner knob set, shared by the two files above. Same category as its two
      // siblings: a runner config file, outside tsconfig's `src/**` include.
      "packages/qfai/vitest.knobs.ts",
      "packages/qfai/tsup.config.ts",
    ],
    ...tseslint.configs.disableTypeChecked,
  },
  // …except the files spec-0017 authored, which ARE type-checked, by `tsconfig.tests.json`.
  //
  // Round 12 measured what the blanket disable cost: `no-floating-promises` is the rule that catches a
  // missing `await` mechanically, and it was off over every file in that change — so six of them passed
  // `tsc -b`, `tsc --noEmit` and `eslint . --max-warnings 0`, and surfaced only as a different test
  // asserting the absence of a warning it had started receiving.
  //
  // Scoped rather than lifted wholesale: the full tests tree reports 212 type errors across 415 files and
  // this stage has no mandate to clean them. The list here is the set `tsconfig.tests.json` includes, where
  // the count is zero. Widening it is a follow-up with a number attached rather than a guess.
  //
  // "The set `tsconfig.tests.json` includes" was false by one entry until round 14: this list held twelve
  // and the tsconfig thirteen, and the missing one — `vitest.knobs.ts` — was type-checked by `tsc` while
  // the four promise rules this block exists to re-enable stayed off over it. A sentence naming the set a
  // future widening will be measured against has to be true of the list beneath it.
  {
    files: TYPED_TEST_FILES,
    languageOptions: {
      parserOptions: {
        project: ["packages/qfai/tsconfig.tests.json"],
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/require-await": "error",
      "@typescript-eslint/no-misused-promises": "error",
    },
  },
  // JS/MJS files – no type-checked rules
  {
    files: ["**/*.{js,mjs,cjs}"],
    ...tseslint.configs.disableTypeChecked,
  },
  // Scripts – allow console
  //
  // Both trees, because the guards live in `assets/` and are DELEGATED to from
  // `scripts/`: the implementation ships so an adopter's CI lane runs the same
  // file, and a console line is how a CI lane reports. Listing only the root
  // tree would have made the shipped copy the one place the rule bites.
  {
    files: ["scripts/**/*.{js,mjs,cjs}", "packages/qfai/assets/scripts/**/*.mjs"],
    rules: {
      "no-console": "off",
    },
  },
  // Asset scripts (shipped to user projects) – CommonJS-compatible Node scripts
  {
    files: ["packages/qfai/assets/scripts/**/*.{js,cjs}"],
    languageOptions: {
      globals: {
        require: "readonly",
        module: "readonly",
        exports: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
      },
      sourceType: "commonjs",
    },
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Prettier must be last to disable conflicting formatting rules
  prettierConfig,
];
