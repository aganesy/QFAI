import type { QfaiConfig } from "../config.js";
import { ProviderRegistry } from "../providers/registry.js";
import type { RenderCaptureAdapter } from "../evidence/types.js";
import { createPlaywrightRenderAdapter } from "../evidence/playwrightRenderAdapter.js";
import { createPlaywrightBrowserQaProvider } from "../providers/playwrightBrowserQaProvider.js";

export type ResolvedPrototypingProviders = {
  registry: ProviderRegistry;
  browserProviderId?: string;
  renderProviderId?: string;
  renderAdapter?: RenderCaptureAdapter;
  providerIds: string[];
};

export function resolvePrototypingExecutionTargetUrl(input: {
  requestTargetUrl?: string;
  config: QfaiConfig;
}): string | undefined {
  return (
    input.requestTargetUrl ??
    input.config.prototyping?.execution?.targetUrl ??
    process.env.QFAI_PROTOTYPING_TARGET_URL
  );
}

export function resolvePrototypingProviders(input: {
  config: QfaiConfig;
  browserProviderId?: string;
  renderProviderId?: string;
  targetUrl?: string;
}): ResolvedPrototypingProviders {
  const registry = new ProviderRegistry();
  const browserProviderId =
    input.browserProviderId ?? input.config.prototyping?.execution?.browserProvider ?? undefined;
  const renderProviderId =
    input.renderProviderId ?? input.config.prototyping?.execution?.renderProvider ?? undefined;

  const providerIds = new Set<string>();
  const playwrightBrowserProvider = createPlaywrightBrowserQaProvider();
  registry.registerQaProvider(playwrightBrowserProvider);
  providerIds.add(playwrightBrowserProvider.providerId);

  let renderAdapter: RenderCaptureAdapter | undefined;
  if (!renderProviderId || renderProviderId === "playwright") {
    renderAdapter = createPlaywrightRenderAdapter({
      ...(input.targetUrl !== undefined ? { targetUrl: input.targetUrl } : {}),
    });
    providerIds.add("playwright");
  }

  return {
    registry,
    ...(browserProviderId ? { browserProviderId } : {}),
    ...(renderProviderId ? { renderProviderId } : {}),
    ...(renderAdapter ? { renderAdapter } : {}),
    providerIds: Array.from(providerIds).sort((left, right) => left.localeCompare(right)),
  };
}
