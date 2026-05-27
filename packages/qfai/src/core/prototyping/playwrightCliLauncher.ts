/**
 * Legacy module — kept as a thin re-export during the deprecation window.
 *
 * The canonical module is `playwrightLauncher.ts`. This file exists so
 * external imports of `resolvePlaywrightCliLauncher` and the legacy type
 * names continue to compile until the sunset (1.10.0).
 *
 * @deprecated Import from `./playwrightLauncher.js` instead.
 */
export {
  getProbeOrder,
  // reason: this module IS the deprecation shim; re-exporting the deprecated
  // symbol is intentional so legacy importers keep compiling until sunset.
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  resolvePlaywrightCliLauncher,
  resolvePlaywrightLauncher,
  type PlaywrightLauncherAttempt as PlaywrightCliLauncherAttempt,
  type PlaywrightLauncherCandidate as PlaywrightCliLauncherCandidate,
  type PlaywrightLauncherOrigin as PlaywrightCliLauncherOrigin,
  type PlaywrightLauncherProbe as PlaywrightCliLauncherProbe,
  type PlaywrightLauncherResolution as PlaywrightCliLauncherResolution,
  type PlaywrightLauncherStage,
} from "./playwrightLauncher.js";
