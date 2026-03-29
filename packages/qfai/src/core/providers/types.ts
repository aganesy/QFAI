/**
 * Browser provider types.
 *
 * Provider interface is minimal (DEC-0003). Registration is optional;
 * absence is a valid state with fail-open semantics.
 */

export type ProviderCapability =
  | "screenshot"
  | "viewport"
  | "dom"
  | "interaction"
  | "visual"
  | "accessibility";

export type BrowserProvider = {
  name: string;
  capabilities: ProviderCapability[];
  captureScreenshot?: () => Promise<string>;
  captureViewport?: () => Promise<{ width: number; height: number }>;
  captureDom?: () => Promise<string>;
};

export type ProviderLookupResult =
  | { status: "available"; provider: BrowserProvider }
  | { status: "skipped"; provider: undefined };
