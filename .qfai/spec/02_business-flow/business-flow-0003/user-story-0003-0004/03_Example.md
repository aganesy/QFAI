# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                                                   | Expected                                                                                                       |
| --------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| EX-0003-0004-01 | AC-0003-0004-01 | Given `qfai.config.yaml` configures deprecated `paths.promptsDir: .qfai/assistant/legacy-prompts` When `qfai doctor --format json` runs | Then `paths.promptsDirDeprecated` is a `warning`, names the legacy path, and advises migration to `skillsDir`. |
