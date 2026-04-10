import path from "node:path";

import type { BrowserQaScreenContractRef } from "../browserQa/types.js";
import type { RenderCaptureTarget } from "../evidence/types.js";
import { readSafe } from "../validators/utils.js";

export type CanonicalScreenContract = {
  name: string;
  screenId: string;
  route: string;
  primaryTasks: string[];
};

export async function readCanonicalScreenContracts(
  packDir: string | null,
): Promise<CanonicalScreenContract[]> {
  if (!packDir) {
    return [];
  }

  const filePath = path.join(packDir, "uiux", "40_screen_contracts.md");
  const raw = await readSafe(filePath);
  if (!raw) {
    return [];
  }

  return parseCanonicalScreenContracts(raw);
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
  viewport: Pick<RenderCaptureTarget, "viewport" | "width" | "height"> = {
    viewport: "desktop",
    width: 1440,
    height: 900,
  },
): RenderCaptureTarget[] {
  return screens.map((screen) => ({
    targetId: screen.screenId,
    route: screen.route,
    descriptor: screen.name,
    viewport: viewport.viewport,
    ...(viewport.width !== undefined ? { width: viewport.width } : {}),
    ...(viewport.height !== undefined ? { height: viewport.height } : {}),
  }));
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
