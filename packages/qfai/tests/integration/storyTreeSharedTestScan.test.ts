import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadConfig } from "../../src/core/config.js";
import type { ValidationProfile } from "../../src/core/types.js";
import { validateProject } from "../../src/core/validate.js";
import type * as StoryObligations from "../../src/core/validators/storyTreeObligations.js";
import { recordAssistantVersion } from "../helpers/assistantVersion.js";

const reads = vi.hoisted(() => ({ count: 0 }));

vi.mock("../../src/core/validators/storyTreeObligations.js", async (importOriginal) => {
  const original = await importOriginal<typeof StoryObligations>();
  return {
    ...original,
    readStoryTests: async (...args: Parameters<typeof original.readStoryTests>) => {
      reads.count += 1;
      return original.readStoryTests(...args);
    },
  };
});

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-shared-story-scan-"));
  await writeFile(
    path.join(root, "qfai.config.yaml"),
    JSON.stringify({ validation: { traceability: { testFileGlobs: ["tests/**/*.test.ts"] } } }),
    "utf8",
  );
  await mkdir(path.join(root, "tests", "unit"), { recursive: true });
  // A business-flow annotation in a unit test is misplaced, so the ATDD pass
  // reports it from the shared read.
  await writeFile(
    path.join(root, "tests", "unit", "a.test.ts"),
    `// ${["QFAI", "BF-0001"].join(":")}\n`,
    "utf8",
  );
  await recordAssistantVersion(root);
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("story-tree test scan per validate run", () => {
  const profiles: ValidationProfile[] = ["atdd", "tdd", "verify", "full"];
  for (const profile of profiles) {
    it(`reads the selected test files once in the ${profile} profile`, async () => {
      reads.count = 0;
      const result = await validateProject(root, await loadConfig(root), { profile });

      expect(result.profileValidatorsRan).toBe(true);
      expect(reads.count).toBe(1);
      if (profile !== "tdd") {
        const misplaced = result.issues.filter((finding) => finding.code === "QFAI-STORY-007");
        expect(misplaced.map((finding) => finding.file)).toEqual(["tests/unit/a.test.ts"]);
      }
    });
  }
});
