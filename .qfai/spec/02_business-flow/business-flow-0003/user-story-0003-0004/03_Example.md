# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                              | Expected                                                                                                  |
| --------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| EX-0003-0004-01 | AC-0003-0004-01 | `qfai.config.yaml` configures deprecated `paths.promptsDir: .qfai/assistant/legacy-prompts`, when `qfai doctor --format json` runs | `paths.promptsDirDeprecated` is a `warning`, names the legacy path, and advises migration to `skillsDir`. |
| EX-0003-0004-02 | AC-0003-0004-01 | `qfai doctor --format json` with the default `paths.promptsDir` directory holding a file other than `.gitkeep`                     | `paths.promptsDirDeprecated` is a `warning` naming the legacy path                                        |
| EX-0003-0004-03 | AC-0003-0004-01 | `qfai doctor --format json` with the default `paths.promptsDir` directory holding only `.gitkeep`                                  | No `paths.promptsDirDeprecated` warning                                                                   |
| EX-0003-0004-04 | AC-0003-0004-01 | `qfai doctor --format json` with the default `paths.promptsDir` directory absent                                                   | No `paths.promptsDirDeprecated` warning                                                                   |
