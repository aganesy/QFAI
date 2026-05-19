import path from "node:path";

import fg from "fast-glob";
import { parse as parseYaml } from "yaml";

import type { BrowserQaScreenContractRef } from "../browserQa/types.js";
import type { RenderCaptureTarget } from "../evidence/types.js";
import { DEFAULT_RENDER_VIEWPORTS } from "../uiux/renderEvidenceTypes.js";
import { readSafe } from "../validators/utils.js";

export type CanonicalScreenContract = {
  name: string;
  screenId: string;
  route: string;
  primaryTasks: string[];
  sourceRef: string;
};

/**
 * `discussionDirRelative` is the repo-relative discussion directory (e.g.
 * `.qfai/discussion`). It defaults to the stock location so standalone
 * callers / tests don't need to resolve config first, but callers that
 * override `paths.discussionDir` in `qfai.config.yaml` must pass the
 * configured value so the generated `sourceRef` points at the real file
 * instead of a dangling `.qfai/discussion/<pack>/...` path.
 */
export async function readCanonicalScreenContracts(
  packDir: string | null,
  discussionDirRelative = ".qfai/discussion",
): Promise<CanonicalScreenContract[]> {
  if (!packDir) {
    return [];
  }

  const filePath = path.join(packDir, "uiux", "40_screen_contracts.md");
  const raw = await readSafe(filePath);
  if (!raw) {
    return [];
  }

  // Normalise to POSIX separators before concatenation so Windows callers
  // that pass `.qfai\\discussion` still produce valid repo-relative refs.
  const normalisedDiscussionDir = discussionDirRelative.replace(/\\/g, "/");

  return parseCanonicalScreenContracts(raw).map((screen) => ({
    ...screen,
    sourceRef:
      path.posix.join(
        normalisedDiscussionDir,
        path.basename(packDir),
        "uiux",
        "40_screen_contracts.md",
      ) + `#${screen.screenId}`,
  }));
}

export async function readUiContractScreenContracts(
  root: string,
  contractsDirRelative = ".qfai/contracts",
): Promise<CanonicalScreenContract[]> {
  const uiDir = path.join(root, contractsDirRelative, "ui");
  const pattern = path.posix.join(uiDir.replace(/\\/g, "/"), "**/*.yaml");
  const files = await fg(pattern, { absolute: true });
  const screens: CanonicalScreenContract[] = [];

  for (const filePath of files) {
    const raw = await readSafe(filePath);
    if (!raw) {
      continue;
    }

    let parsed: unknown;
    try {
      parsed = parseYaml(raw);
    } catch {
      continue;
    }

    const fileScreens = extractUiScreens(parsed).map((screen) => ({
      ...screen,
      sourceRef: `${path.relative(root, filePath).replace(/\\/g, "/")}#${screen.screenId}`,
    }));

    screens.push(...fileScreens);
  }

  return screens.filter(
    (screen, index, all) =>
      all.findIndex((candidate) => candidate.screenId === screen.screenId) === index,
  );
}

export function parseCanonicalScreenContracts(content: string): CanonicalScreenContract[] {
  const screens: CanonicalScreenContract[] = [];
  const lines = content.split(/\r?\n/);
  let current: CanonicalScreenContract | null = null;
  let inPrimaryTasks = false;

  for (const line of lines) {
    const headingMatch = /^###\s+Screen:\s*(.+)$/.exec(line);
    if (headingMatch?.[1]) {
      if (current?.screenId && current.route) {
        screens.push(current);
      }
      const name = headingMatch[1].trim();
      current = {
        name,
        screenId: slugifyScreenId(name),
        route: "",
        primaryTasks: [],
        sourceRef: "",
      };
      inPrimaryTasks = false;
      continue;
    }

    if (!current) {
      continue;
    }

    const fieldMatch = /^\s*-\s+([\w_]+):\s*(.*)$/.exec(line);
    if (fieldMatch) {
      const key = fieldMatch[1];
      const value = (fieldMatch[2] ?? "").trim();
      if (key === "screen_id" && value) {
        current.screenId = value;
      } else if (key === "route" && value) {
        current.route = value;
      }
      inPrimaryTasks = key === "primary_tasks" && value.length === 0;
      continue;
    }

    if (inPrimaryTasks) {
      const primaryTaskMatch = /^\s{2,}-\s+(.+)$/.exec(line);
      if (primaryTaskMatch?.[1]) {
        current.primaryTasks.push(primaryTaskMatch[1].trim());
      } else if (line.trim() !== "") {
        inPrimaryTasks = false;
      }
    }
  }

  if (current?.screenId && current.route) {
    screens.push(current);
  }

  return screens.filter((screen, index, all) => {
    return all.findIndex((candidate) => candidate.screenId === screen.screenId) === index;
  });
}

export function buildScreenRenderTargets(
  screens: CanonicalScreenContract[],
  viewports: Array<Pick<RenderCaptureTarget, "viewport" | "width" | "height">> = [
    { viewport: DEFAULT_RENDER_VIEWPORTS[0], width: 1440, height: 900 },
    { viewport: DEFAULT_RENDER_VIEWPORTS[1], width: 390, height: 844 },
  ],
): RenderCaptureTarget[] {
  return screens.flatMap((screen) =>
    viewports.map((viewport) => ({
      targetId: `${screen.screenId}-${viewport.viewport}`,
      route: screen.route,
      descriptor: screen.name,
      viewport: viewport.viewport,
      ...(viewport.width !== undefined ? { width: viewport.width } : {}),
      ...(viewport.height !== undefined ? { height: viewport.height } : {}),
    })),
  );
}

export function toBrowserQaScreenContracts(
  screens: CanonicalScreenContract[],
): BrowserQaScreenContractRef[] {
  return screens.map((screen) => ({
    screen_id: screen.screenId,
    route: screen.route,
    ...(screen.primaryTasks.length > 0 ? { primary_tasks: [...screen.primaryTasks] } : {}),
  }));
}

function slugifyScreenId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Extract the canonical screen records from a parsed UI contract YAML
 * value. Returns each record with `sourceRef` left as an empty string;
 * callers are responsible for attaching a real `sourceRef` (typically
 * `<rel-path>#<screenId>`).
 *
 * Exported so per-spec readers in CLI command layers (e.g. the per-(spec
 * x screen) certify gate in `prototypingCertify.ts`) reuse the same
 * shape parser as the project-wide `readUiContractScreenContracts`
 * function. Pre-export the same id/route/title/primary_tasks extraction
 * logic was duplicated at two call sites; any future schema additions
 * (e.g. a new `elements:` block surfacing to the canonical contract)
 * would not have propagated to the CLI reader. Single SSOT now.
 */
export function extractUiScreens(parsed: unknown): CanonicalScreenContract[] {
  if (!parsed || typeof parsed !== "object") {
    return [];
  }

  const screens = (parsed as Record<string, unknown>).screens;
  if (!Array.isArray(screens)) {
    return [];
  }

  return screens.flatMap((screen) => {
    if (!screen || typeof screen !== "object") {
      return [];
    }

    const record = screen as Record<string, unknown>;
    const screenId = typeof record.id === "string" ? record.id.trim() : "";
    const route = typeof record.route === "string" ? record.route.trim() : "";
    if (!screenId || !route) {
      return [];
    }

    const name =
      typeof record.title === "string" && record.title.trim().length > 0
        ? record.title.trim()
        : screenId;
    const primaryTasks = Array.isArray(record.primary_tasks)
      ? record.primary_tasks
          .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
          .map((entry) => entry.trim())
      : [];

    return [
      {
        name,
        screenId,
        route,
        primaryTasks,
        sourceRef: "",
      },
    ];
  });
}
