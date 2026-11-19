import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { emitText } from "../../src/cli/commands/validate.js";
import { defaultConfig, type QfaiConfig } from "../../src/core/config.js";
import type { Issue, ValidationResult } from "../../src/core/types.js";
import {
  designAuditFindingsShownPerCode,
  validateDesignAudit,
} from "../../src/core/validators/designAudit.js";
import { captureStdout } from "../helpers/stdout.js";

const SCREEN_IDS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7"];

/** Seven screens with no `primary_tasks` key: seven `QFAI-AUD-001` errors. */
const UI_CONTRACT = [
  "screens:",
  ...SCREEN_IDS.flatMap((id) => [`  - id: ${id}`, `    route: /${id}`]),
  "",
].join("\n");

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-audit-display-limit-"));
  const uiDir = path.join(root, defaultConfig.paths.contractsDir, "ui");
  await mkdir(uiDir, { recursive: true });
  await writeFile(path.join(uiDir, "ui-0001-screens.yaml"), UI_CONTRACT, "utf8");
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

function withShownPerCode(maxDuplicateFindingsPerRule: number): QfaiConfig {
  return {
    ...defaultConfig,
    uiux: { ...defaultConfig.uiux, audit: { maxDuplicateFindingsPerRule } },
  };
}

function resultOf(issues: Issue[]): ValidationResult {
  return {
    toolVersion: "0.0.0-test",
    issues,
    counts: {
      info: issues.filter((i) => i.severity === "info").length,
      warning: issues.filter((i) => i.severity === "warning").length,
      error: issues.filter((i) => i.severity === "error").length,
    },
  };
}

// QFAI:AC-0001-0039-01
// QFAI:EX-0001-0039-59
describe("design audit display limit", () => {
  it.each([
    ["unset", defaultConfig],
    ["set to 2", withShownPerCode(2)],
  ])(
    "returns every finding with maxDuplicateFindingsPerRule %s",
    async (_label, config: QfaiConfig) => {
      const issues = await validateDesignAudit(root, config);

      expect(issues.map((item) => item.code)).toEqual(SCREEN_IDS.map(() => "QFAI-AUD-001"));
      expect(issues.every((item) => item.severity === "error")).toBe(true);
      expect(issues.map((item) => item.refs?.[1])).toEqual(SCREEN_IDS);
    },
  );

  it("applies maxDuplicateFindingsPerRule only to the text output of audit groups", async () => {
    const config = withShownPerCode(2);
    const audit = await validateDesignAudit(root, config);
    const other: Issue[] = SCREEN_IDS.map((id) => ({
      code: "QFAI-TEST-030",
      severity: "error",
      category: "canonical",
      message: `other ${id}`,
    }));

    const output = await captureStdout(() => {
      emitText(resultOf([...audit, ...other]), "error", designAuditFindingsShownPerCode(config));
      return Promise.resolve();
    });
    const lines = output.split("\n");

    const auditLines = lines.filter((line) => line.startsWith("[error] QFAI-AUD-001 "));
    expect(auditLines).toHaveLength(3);
    expect(auditLines[2]).toBe("[error] QFAI-AUD-001 and 5 more");
    const otherLines = lines.filter((line) => line.startsWith("[error] QFAI-TEST-030 "));
    expect(otherLines).toHaveLength(6);
    expect(otherLines[5]).toBe("[error] QFAI-TEST-030 and 2 more");
    expect(output).toContain("counts: info=0 warning=0 error=14\n");
  });

  it("prints five audit findings of a code when the key is unset", () => {
    expect(designAuditFindingsShownPerCode(defaultConfig)).toBe(5);
  });
});
