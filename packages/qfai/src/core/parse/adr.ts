const ADR_ID_RE = /\bADR-\d{4}\b/;

export type ParsedAdr = {
  file: string;
  adrId?: string;
  fields: {
    status?: string;
    context?: string;
    decision?: string;
    consequences?: string;
    related?: string;
  };
};

function extractField(md: string, key: string): string | undefined {
  const pattern = new RegExp(`^\\s*-\\s*${key}:\\s*(.+)\\s*$`, "m");
  return md.match(pattern)?.[1]?.trim();
}

export function parseAdr(md: string, file: string): ParsedAdr {
  const adrId = md.match(ADR_ID_RE)?.[0];
  return {
    file,
    adrId,
    fields: {
      status: extractField(md, "Status"),
      context: extractField(md, "Context"),
      decision: extractField(md, "Decision"),
      consequences: extractField(md, "Consequences"),
      related: extractField(md, "Related"),
    },
  };
}
