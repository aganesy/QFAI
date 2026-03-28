# 07 Non-Functional Requirements

## NFR Registry

| NFR-ID   | Category        | Title                    | Description                                                                  | Verification Method                                         | Source   | Priority |
| -------- | --------------- | ------------------------ | ---------------------------------------------------------------------------- | ----------------------------------------------------------- | -------- | -------- |
| NFR-0001 | maintainability | Template Clarity         | SKILL.md instructions unambiguous enough to prevent generic fallback         | Manual review of 5 sample runs                              | SRC-0001 | must     |
| NFR-0002 | maintainability | Sidecar Schema Stability | Sidecar YAML schemas backward-compatible with future validators              | Schema versioning present                                   | SRC-0001 | must     |
| NFR-0003 | usability       | Authoring Friction       | Adding sidecar does not increase discussion authoring time by >30%           | Comparison of UI-bearing vs non-UI authoring time           | SRC-0001 | should   |
| NFR-0004 | reliability     | Init Asset Integrity     | All init assets pass verify-pack after changes                               | qfai validate --fail-on error                               | SRC-0005 | must     |
| NFR-0005 | maintainability | Core/Sidecar Separation  | Core 15-file pack and uiux/ sidecar have clear responsibility boundary       | No duplicate content between core and sidecar               | SRC-0001 | must     |
