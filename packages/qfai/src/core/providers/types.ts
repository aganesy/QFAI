/**
 * Browser provider types.
 *
 * Provider interface is minimal (DEC-0003). Registration is optional;
 * absence is a valid state with fail-open semantics.
 *
 * WS-B: BrowserQaProvider is the canonical interface for 4-phase Browser QA.
 * BrowserProvider is the legacy render-capture provider interface.
 */

import type { SurfaceType } from "../detection/surfaceType.js";
import type {
  BrowserQaInput,
  BrowserQaPhaseResult,
  BrowserQaProvider as CanonicalBrowserQaProvider,
} from "../browserQa/types.js";

export type ProviderCapability =
  | "screenshot"
  | "viewport"
  | "dom"
  | "interaction"
  | "visual"
  | "accessibility";

/** Legacy render-capture provider. */
export type BrowserProvider = {
  name: string;
  capabilities: ProviderCapability[];
  captureScreenshot?: () => Promise<string>;
  captureViewport?: () => Promise<{ width: number; height: number }>;
  captureDom?: () => Promise<string>;
  runInteraction?: () => Promise<void>;
  runVisual?: () => Promise<void>;
  runAccessibility?: () => Promise<void>;
};

/**
 * Canonical Browser QA provider — WS-B.
 * All run* methods are required. If a provider does not support a phase,
 * it must return `{ status: "skipped" }` instead of being optional.
 */
export type { CanonicalBrowserQaProvider as BrowserQaProvider };
export type { BrowserQaInput, BrowserQaPhaseResult };

export type ProviderLookupResult =
  | { status: "available"; provider: BrowserProvider }
  | { status: "skipped"; provider: undefined };
