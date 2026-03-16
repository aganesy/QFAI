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

const KNOWN_PLATFORMS = ["web", "windows", "mobile-ios", "mobile-android", "cross-platform"];

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
          `Unknown platform: ${cliPlatform}. Platform value is kept as-is; only common rules will apply.`,
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
  const configPlatform = config.uiux?.platform;
  if (configPlatform) {
    if (!KNOWN_PLATFORMS.includes(configPlatform)) {
      issues.push(
        issue(
          "QFAI-PLATFORM-001",
          `Unknown platform: ${configPlatform}. Platform value is kept as-is; only common rules will apply.`,
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
    const hasAndroid = await exists(path.join(root, "android"));
    const hasIos = await exists(path.join(root, "ios"));
    const hasWeb = await exists(path.join(root, "web"));
    const hasWindows = await exists(path.join(root, "windows"));
    const hasMacos = await exists(path.join(root, "macos"));
    const hasLinux = await exists(path.join(root, "linux"));
    if (hasAndroid && hasIos) {
      return "cross-platform";
    }
    if (hasAndroid) {
      return "mobile-android";
    }
    if (hasIos) {
      return "mobile-ios";
    }

    const desktopTargets = [hasWeb, hasWindows, hasMacos, hasLinux].filter(Boolean).length;
    if (desktopTargets > 1) {
      return "cross-platform";
    }
    if (hasWindows) {
      return "windows";
    }
    if (hasWeb) {
      return "web";
    }

    return null;
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
            "Cross-platform project detected (Electron). Applying cross-platform rules.",
            "warning",
            "package.json",
            "platformDetection.crossPlatform",
          ),
        );
        return "cross-platform";
      }

      // React Native
      if ("react-native" in deps) {
        const hasAndroid = await exists(path.join(root, "android"));
        const hasIos = await exists(path.join(root, "ios"));
        if (hasAndroid && hasIos) {
          return "cross-platform";
        }
        if (hasAndroid) {
          return "mobile-android";
        }
        if (hasIos) {
          return "mobile-ios";
        }
        return null;
      }
    } catch {
      // ignore parse errors
    }
  }

  return null;
}
