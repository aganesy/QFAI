// QFAI:AC-0001-0235-05

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { graphProject } from "../../../helpers/graphProject.js";
import { installedGraphHookResult } from "../../../helpers/graphCli.js";
import { inspectInstalledGraphHosts } from "../../../../src/core/graph/hostConfiguration.js";
import {
  inspectGraphHostProtection,
  verifyGraphHostProtection,
  type GraphHostFacts,
} from "../../../../src/core/graph/hosts.js";
import { renderGraphPreparation } from "../../../../src/core/graph/presentation.js";

describe("AC-0001-0235-05", () => {
  it("reports actual configuration separately and binds controlled runtime proof to one host and version", async () => {
    const project = await graphProject();
    try {
      await project.initialize();
      const installed = await inspectInstalledGraphHosts(project.root, () =>
        Promise.resolve({ exitCode: 0, stdout: "1.2.3" }),
      );
      expect(installed.map((host) => host.host)).toEqual(["claude", "codex", "copilot", "vscode"]);
      expect(
        installed.every(
          (host) => host.configuration === "configured" && host.state === "unsupported",
        ),
      ).toBe(true);
      expect(installed.find((host) => host.host === "vscode")?.version).toBeUndefined();
      const facts: GraphHostFacts[] = [
        {
          host: "claude",
          version: "fixture-1",
          configuration: "configured",
          denialEvent: "PreToolUse",
          failureProtocol: "supported",
          trust: "required",
        },
        {
          host: "codex",
          version: "fixture-2",
          configuration: "configured",
          denialEvent: "PreToolUse",
          failureProtocol: "supported",
          trust: "granted",
        },
        {
          host: "copilot",
          version: "fixture-3",
          configuration: "failed",
          denialEvent: "preToolUse",
          failureProtocol: "supported",
          trust: "not-required",
        },
        {
          host: "vscode",
          version: "fixture-4",
          configuration: "configured",
          failureProtocol: "unsupported",
          trust: "unknown",
        },
      ];
      expect(inspectGraphHostProtection(facts).map((host) => host.state)).toEqual([
        "trust-required",
        "configured",
        "failed",
        "unsupported",
      ]);
      const fact = facts[1];
      if (!fact) throw new Error("Missing controlled host fixture");
      const denied = await installedGraphHookResult(project.root, {
        tool_name: "Bash",
        tool_input: { command: "rg checkout packages/" },
      });
      const permitted = await installedGraphHookResult(project.root, {
        tool_name: "Bash",
        tool_input: { command: "cat known.ts" },
      });
      const deniedEffect = path.join(project.root, "denied-effect.txt");
      const permittedEffect = path.join(project.root, "permitted-effect.txt");
      if (!denied.output && denied.failures === 0) await writeFile(deniedEffect, "Executed");
      if (!permitted.output && permitted.failures === 0)
        await writeFile(permittedEffect, "Executed");
      await expect(readFile(deniedEffect)).rejects.toMatchObject({ code: "ENOENT" });
      const permittedEventExecuted = (await readFile(permittedEffect, "utf8")) === "Executed";
      const observed = {
        host: fact.host,
        version: fact.version ?? "",
        events: ["PreToolUse:rg"],
        trustGranted: true,
        deniedDecision: denied.output.includes('"permissionDecision":"deny"')
          ? ("deny" as const)
          : ("missing" as const),
        permittedDecision:
          permitted.output === "" && permitted.failures === 0
            ? ("allow" as const)
            : ("missing" as const),
        deniedSearchExecuted: denied.output === "" && denied.failures === 0,
        permittedEventExecuted,
      };
      const verified = await verifyGraphHostProtection(fact, () => Promise.resolve(observed));
      expect(verified.state).toBe("runtime-verified");
      expect(verified.events).toEqual(["PreToolUse:rg"]);
      expect(
        (
          await verifyGraphHostProtection(fact, () =>
            Promise.resolve({ ...observed, version: "other-version" }),
          )
        ).state,
      ).toBe("failed");
      const output = renderGraphPreparation(
        { runtime: "installed", code: "code-not-ready", documents: "documents-not-ready" },
        installed,
      );
      for (const host of installed) {
        expect(output).toContain(host.host);
        expect(output).toContain(host.state);
      }
      expect(output).toContain("Configuration alone does not verify search protection");
      expect(output).not.toContain("runtime-verified");
    } finally {
      await project.dispose();
    }
  });
});
