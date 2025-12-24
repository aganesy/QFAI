import { access } from "node:fs/promises";
import path from "node:path";

import { loadConfig, resolvePath } from "@qfai/core";

import { collectFiles } from "../lib/scan.js";
import { info } from "../lib/logger.js";

export type StatusOptions = {
  root: string;
};

export async function runStatus(options: StatusOptions): Promise<void> {
  const root = path.resolve(options.root);
  const config = await loadConfig(root);

  const checks = [
    {
      label: "config",
      path: path.join(root, "qfai.config.json"),
      required: false,
    },
    {
      label: "steering",
      path: resolvePath(root, config, "steeringDir"),
      required: true,
      extensions: [".md"],
    },
    {
      label: "specs",
      path: resolvePath(root, config, "specsDir"),
      required: true,
      extensions: [".md"],
    },
    {
      label: "scenarios",
      path: resolvePath(root, config, "scenariosDir"),
      required: true,
      extensions: [".md"],
    },
    {
      label: "rules",
      path: resolvePath(root, config, "rulesDir"),
      required: false,
      extensions: [".md"],
    },
    {
      label: "ui",
      path: resolvePath(root, config, "uiContractsDir"),
      required: true,
      extensions: [".yaml", ".yml"],
    },
    {
      label: "api",
      path: resolvePath(root, config, "apiContractsDir"),
      required: true,
      extensions: [".yaml", ".yml", ".json"],
    },
    {
      label: "data",
      path: resolvePath(root, config, "dataContractsDir"),
      required: true,
      extensions: [".sql"],
    },
  ];

  const missing: string[] = [];

  info("qfai status");
  for (const check of checks) {
    if (check.label === "config") {
      const exists = await fileExists(check.path);
      info(`- ${check.label}: ${exists ? "present" : "missing"}`);
      if (!exists && check.required) {
        missing.push(check.path);
      }
      continue;
    }

    const files = await collectFiles(check.path, check.extensions ?? []);
    info(`- ${check.label}: ${files.length} files`);
    if (check.required && files.length === 0) {
      missing.push(check.path);
    }
  }

  if (missing.length > 0) {
    info("missing targets:");
    for (const entry of missing) {
      info(`- ${entry}`);
    }
  }
}

async function fileExists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}
