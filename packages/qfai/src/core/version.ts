declare const __QFAI_TOOL_VERSION__: string | undefined;

export async function resolveToolVersion(): Promise<string> {
  const injected =
    typeof __QFAI_TOOL_VERSION__ === "string" ? __QFAI_TOOL_VERSION__ : "";
  return injected.length > 0 ? injected : "0.0.0-dev";
}
