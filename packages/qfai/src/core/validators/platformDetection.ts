import { readFile } from "node:fs/promises";
import path from "node:path";

import type { QfaiConfig } from "../config.js";
import type { Issue } from "../types.js";
import { exists, issue } from "./utils.js";

export type PlatformDetectionResult = {
  platform: string;
  source: "cli" | "config" | "inference" | "fallback";
  issues: Issue[];
};

const KNOWN_PLATFORMS = ["web", "windows", "mobile-ios", "mobile-android"];

export async function detectPlatform(
  root: string,
  config: QfaiConfig,
  cliPlatform?: string,
): Promise<PlatformDetectionResult> {
  const issues: Issue[] = [];

  // Priority 1: CLI argument
  if (cliPlatform) {
    if (!KNOWN_PLATFORMS.includes(cliPlatform)) {
      issues.push(
        issue(
          "QFAI-PLATFORM-001",
          `Unknown platform: ${cliPlatform}. Falling back to common rules.`,
          "warning",
          undefined,
          "platformDetection.unknownPlatform",
        ),
      );
      return { platform: cliPlatform, source: "cli", issues };
    }
    return { platform: cliPlatform, source: "cli", issues };
  }

  // Priority 2: Config file uiux.platform
  const configPlatform = (config as QfaiConfigWithUiux).uiux?.platform;
  if (configPlatform) {
    if (!KNOWN_PLATFORMS.includes(configPlatform)) {
      issues.push(
        issue(
          "QFAI-PLATFORM-001",
          `Unknown platform: ${configPlatform}. Falling back to common rules.`,
          "warning",
          undefined,
          "platformDetection.unknownPlatform",
        ),
      );
    }
    return { platform: configPlatform, source: "config", issues };
  }

  // Priority 3: Inference from project files
  const inferred = await inferPlatform(root, issues);
  if (inferred) {
    return { platform: inferred, source: "inference", issues };
  }

  // Priority 4: Common fallback
  return { platform: "web", source: "fallback", issues };
}

async function inferPlatform(root: string, issues: Issue[]): Promise<string | null> {
  // Check for Flutter
  if (await exists(path.join(root, "pubspec.yaml"))) {
    return "mobile-ios";
  }

  // Check for package.json dependencies
  const pkgJsonPath = path.join(root, "package.json");
  if (await exists(pkgJsonPath)) {
    try {
      const raw = await readFile(pkgJsonPath, "utf-8");
      const pkg = JSON.parse(raw) as Record<string, unknown>;
      const deps = {
        ...(typeof pkg.dependencies === "object" && pkg.dependencies !== null
          ? (pkg.dependencies as Record<string, unknown>)
          : {}),
        ...(typeof pkg.devDependencies === "object" && pkg.devDependencies !== null
          ? (pkg.devDependencies as Record<string, unknown>)
          : {}),
      };

      // Electron = cross-platform
      if ("electron" in deps) {
        issues.push(
          issue(
            "QFAI-PLATFORM-002",
            "Cross-platform project detected (Electron). Merging common + web + windows rules.",
            "warning",
            "package.json",
            "platformDetection.crossPlatform",
          ),
        );
        return "web";
      }

      // React Native
      if ("react-native" in deps) {
        return "mobile-ios";
      }
    } catch {
      // ignore parse errors
    }
  }

  return null;
}

type QfaiConfigWithUiux = QfaiConfig & {
  uiux?: {
    platform?: string;
    designTokensDir?: string;
    htmlMockTimeout?: number;
  };
};
