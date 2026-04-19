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
      "packages/qfai/vitest.config.ts",
      "packages/qfai/vitest.workspace.ts",
      "packages/qfai/tsup.config.ts",
    ],
    ...tseslint.configs.disableTypeChecked,
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
