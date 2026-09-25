# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                                              | Expected                                                                                                                                                                                                                                                                    |
| --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-0001-0142-01 | AC-0001-0142-01 | Given inputs `"abc"` (unparseable) vs `1` / `"1"` / `"01"` / `"0001"` (normalisable), When iterate validates each, | Then `"abc"` surfaces `primarySpecId must be a 4-digit zero-padded string (e.g. "0001"); received abc`. The SHOULD-shipped normaliser accepts `1` / `"1"` / `"01"` / `"0001"` and normalises internally to the canonical `0001` form; for those inputs no error is emitted. |
