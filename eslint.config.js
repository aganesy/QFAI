import { fileURLToPath } from "node:url";
import path from "node:path";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    files: [
      "packages/qfai/vitest.knobs.ts",
      "packages/qfai/tests/helpers/buildCommand.ts",
      "packages/qfai/tests/helpers/shippedLaneCommands.ts",
      "packages/qfai/tests/unit/buildCommand.test.ts",
      "packages/qfai/tests/unit/shippedLaneCommands.test.ts",
      "packages/qfai/tests/assets/coverageDepthMatrix.test.ts",
      "packages/qfai/tests/assets/retractedClaims.test.ts",
      "packages/qfai/tests/assets/stageEvidenceCounts.test.ts",
      "packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts",
      "packages/qfai/tests/e2e/spec0017RunnerParallelismE2E.test.ts",
      "packages/qfai/tests/integration/spec0017OwnWorkflowScope.test.ts",
      "packages/qfai/tests/integration/shippedWorkflowDetection.test.ts",
      "packages/qfai/tests/integration/scripts/checkAtddAnnotationLedger.test.ts",
    ],
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
  {
    files: ["scripts/**/*.{js,mjs,cjs}"],
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
