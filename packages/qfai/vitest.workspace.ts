import { defineWorkspace } from "vitest/config";

const shared = { testTimeout: 15_000 };

export default defineWorkspace([
  {
    test: {
      ...shared,
      name: "core",
      include: ["tests/core/**/*.test.ts"],
    },
  },
  {
    test: {
      ...shared,
      name: "validators",
      include: ["tests/validators/**/*.test.ts"],
    },
  },
  {
    test: {
      ...shared,
      name: "integration",
      include: [
        "tests/integration/**/*.test.ts",
        "tests/detection/**/*.test.ts",
        "tests/skill/**/*.test.ts",
        "tests/review/**/*.test.ts",
        "tests/codex/**/*.test.ts",
      ],
    },
  },
  {
    test: {
      ...shared,
      name: "compatibility",
      include: ["tests/compatibility/**/*.test.ts"],
    },
  },
  {
    test: {
      ...shared,
      name: "e2e",
      include: ["tests/e2e/**/*.test.ts", "tests/assets/**/*.test.ts"],
    },
  },
  {
    test: {
      ...shared,
      name: "cli",
      include: ["tests/cli/**/*.test.ts"],
    },
  },
]);
