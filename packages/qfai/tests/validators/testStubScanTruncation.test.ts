/**
 * `QFAI-TEST-002` names the states in which a clean stub scan is not evidence.
 * Truncation is one of them: the selection was cut at the file limit and the
 * rest were never opened.
 *
 * The finding has to say something the operator can act on, and that depends on
 * where the selection came from. The ATDD completion gate brings its own globs
 * — the acceptance directories — and does not read
 * `validation.traceability.testFileGlobs` at all, so naming that key as the
 * remedy points at a setting which cannot change the outcome.
 *
 * The limit is 20,000 files, which no fixture can reach, so the collector is
 * replaced rather than fed.
 */

import { describe, expect, it, vi } from "vitest";

import { defaultConfig, type QfaiConfig } from "../../src/core/config.js";
import type * as fsModule from "../../src/core/fs.js";
import { DEFAULT_GLOB_FILE_LIMIT } from "../../src/core/fs.js";

vi.mock("../../src/core/fs.js", async () => {
  const actual = await vi.importActual<typeof fsModule>("../../src/core/fs.js");
  return {
    ...actual,
    collectFilesByGlobs: async () => ({
      files: [],
      truncated: true,
      matchedFileCount: actual.DEFAULT_GLOB_FILE_LIMIT,
      limit: actual.DEFAULT_GLOB_FILE_LIMIT,
    }),
  };
});

const { validateTestTodoStubs } = await import("../../src/core/validators/testTodoStubs.js");

const CONFIG: QfaiConfig = {
  ...defaultConfig,
  validation: {
    ...defaultConfig.validation,
    traceability: {
      ...defaultConfig.validation.traceability,
      testFileGlobs: ["tests/**/*"],
    },
  },
};

describe("QFAI-TEST-002 — a truncated scan names a remedy that applies to it", () => {
  it("sends a caller-supplied selection to the exclude list", async () => {
    const issues = await validateTestTodoStubs("/nowhere", CONFIG, {
      globs: ["tests/e2e/**/*.ts"],
    });
    const truncation = issues.find((i) => i.code === "QFAI-TEST-002");
    // Narrowing `testFileGlobs` cannot shrink a selection the caller supplied,
    // and this is the only key that is applied on both paths.
    expect(truncation?.refs).toEqual(["validation.traceability.testFileExcludeGlobs"]);
    expect(truncation?.suggested_action).toContain("testFileExcludeGlobs");
    expect(truncation?.suggested_action).not.toContain(
      "Narrow `validation.traceability.testFileGlobs`",
    );
  });

  it("sends a configured selection to the glob list", async () => {
    const issues = await validateTestTodoStubs("/nowhere", CONFIG);
    const truncation = issues.find((i) => i.code === "QFAI-TEST-002");
    expect(truncation?.refs).toEqual(["validation.traceability.testFileGlobs"]);
    expect(truncation?.suggested_action).toContain(
      "Narrow `validation.traceability.testFileGlobs`",
    );
  });

  it("counts the files it read rather than claiming a total it never measured", async () => {
    // The collector stops the stream at the limit, so it never learns how many
    // more would have matched. "matched N" asserted a number nothing produced,
    // and N was always the limit.
    const issues = await validateTestTodoStubs("/nowhere", CONFIG);
    const truncation = issues.find((i) => i.code === "QFAI-TEST-002");
    expect(truncation?.message).toContain(`read the first ${DEFAULT_GLOB_FILE_LIMIT} files`);
    expect(truncation?.message).not.toContain("matched");
  });

  it("keeps the two selections apart in the dedupe key `full` runs them under", async () => {
    // `full` runs this validator once per profile. Both states file the same
    // code against the same config file with no line and no column, so the
    // report kept whichever came first unless something else separates them.
    const caller = await validateTestTodoStubs("/nowhere", CONFIG, {
      globs: ["tests/e2e/**/*.ts"],
    });
    const configured = await validateTestTodoStubs("/nowhere", CONFIG);
    const key = (issues: Awaited<ReturnType<typeof validateTestTodoStubs>>): string => {
      const found = issues.find((i) => i.code === "QFAI-TEST-002");
      return [found?.refs?.join(","), found?.message].join("\0");
    };
    expect(key(caller)).not.toEqual(key(configured));
  });
});
