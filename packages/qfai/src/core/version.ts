declare const __QFAI_TOOL_VERSION__: string | undefined;

export async function resolveToolVersion(): Promise<string> {
  if (
    typeof __QFAI_TOOL_VERSION__ === "string" &&
    __QFAI_TOOL_VERSION__.length > 0
  ) {
    return __QFAI_TOOL_VERSION__;
  }
  return "unknown";
}
