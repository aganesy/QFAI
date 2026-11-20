import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { defaultConfig, type QfaiConfig } from "../../src/core/config.js";
import { validateDesignAudit } from "../../src/core/validators/designAudit.js";

let root: string;
let outside: string | undefined;

const contractsDir = defaultConfig.paths.contractsDir;
const SCREEN =
  "screens:\n  - id: home\n    route: /\n    primary_tasks:\n      - { id: browse, label: Browse, acceptance: done }\n";
const MOCK = `<div style="color: #ff0000">${'<span style="color: #00ff00"></span>'.repeat(6)}</div>\n`;
const TOKENS = "primitive:\n  color:\n    base:\n      $value: '#ffffff'\n";

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "qfai-token-drift-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
  if (outside) await rm(outside, { recursive: true, force: true });
  outside = undefined;
});

async function put(relative: string, body: string): Promise<void> {
  const file = path.join(root, relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body, "utf8");
}

function withTokensDir(designTokensDir: string): QfaiConfig {
  return { ...defaultConfig, uiux: { ...defaultConfig.uiux, designTokensDir } };
}

async function driftFindings(config: QfaiConfig): Promise<string[]> {
  const issues = await validateDesignAudit(root, config);
  return issues.filter((item) => item.code === "QFAI-AUD-004").map((item) => item.severity);
}

describe("token drift", () => {
  // QFAI:AC-0001-0039-01
  // QFAI:EX-0001-0039-11
  it("reads design tokens only from uiux.designTokensDir", async () => {
    await put(`${contractsDir}/ui/ui-0001-home.yaml`, SCREEN);
    await put(`${contractsDir}/ui/home.html`, MOCK);
    await put(`${contractsDir}/design/tokens.yaml`, TOKENS);

    expect(await driftFindings(defaultConfig)).toEqual([]);
    expect(await driftFindings(withTokensDir("tokens"))).toEqual([]);

    await put("tokens/tokens.yaml", TOKENS);
    expect(await driftFindings(withTokensDir("tokens"))).toEqual(["error"]);
  });

  it("audits the mocks under an absolute paths.contractsDir", async () => {
    outside = await mkdtemp(path.join(os.tmpdir(), "qfai-token-drift-contracts-"));
    await mkdir(path.join(outside, "ui"), { recursive: true });
    await writeFile(path.join(outside, "ui", "ui-0001-home.yaml"), SCREEN, "utf8");
    await writeFile(path.join(outside, "ui", "home.html"), MOCK, "utf8");
    await put("tokens/tokens.yaml", TOKENS);
    const config = withTokensDir("tokens");

    expect(
      await driftFindings({ ...config, paths: { ...config.paths, contractsDir: outside } }),
    ).toEqual(["error"]);
  });
});
