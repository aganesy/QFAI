// QFAI:AC-0001-0235-02

import { describe, expect, it } from "vitest";
import { graphProject } from "../../../helpers/graphProject.js";
import { installedGraphHookResult } from "../../../helpers/graphCli.js";

describe("AC-0001-0235-02", () => {
  it("denies search in executable wrapper and pipeline positions but permits printed literals", async () => {
    const project = await graphProject();
    try {
      await project.initialize();
      for (const command of [
        "env LC_ALL=C grep -R policy .qfai/spec",
        "command rg checkout packages/",
        "bash -lc 'rg checkout packages/'",
        'pwsh -NoProfile -Command "Select-String -Pattern policy -Path docs/*.md"',
        'cmd /d /c "findstr /S policy docs\\*.md"',
        "echo start | rg checkout packages/ | sort",
        "pnpm test; rg checkout packages/",
        "pnpm lint && git grep checkout -- packages/",
      ]) {
        const result = await installedGraphHookResult(project.root, {
          tool_name: "Bash",
          tool_input: { command },
        });
        expect(result.output, command).toContain('"permissionDecision":"deny"');
        expect(result.failures, command).toBe(0);
      }
      for (const command of ["echo 'grep'", 'printf "%s\\n" rg', 'Write-Output "grep | rg"']) {
        const result = await installedGraphHookResult(project.root, {
          tool_name: "Bash",
          tool_input: { command },
        });
        expect(result.output, command).toBe("");
        expect(result.failures, command).toBe(0);
      }
    } finally {
      await project.dispose();
    }
  });
});
