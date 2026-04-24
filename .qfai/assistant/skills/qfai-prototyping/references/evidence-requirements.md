# Evidence Requirements

## Mandatory evidence

For every declared screen in `.qfai/contracts/ui/*.yaml`, collect both:

- screenshot: `.qfai/evidence/prototyping/screenshots/<screen-id>.png`
- HTML snapshot: `.qfai/evidence/prototyping/html/<screen-id>.html`

If either artifact is missing:

- the screen is scored `0`
- the run is incomplete
- rerun is mandatory

Optional evidence is not allowed.

## Capture rules

- Use stable `screen-id` names from the canonical UI contracts.
- Overwrite stale evidence with fresh evidence from the current iteration.
- Do not reuse an older screenshot or HTML snapshot after a fix.
- If capture fails, record the failure in work evidence and stop pretending the screen was evaluated.

## Validate gate expectations

`qfai validate --profile prototyping --fail-on error` must be able to confirm:

- every declared screen has a screenshot file
- every declared screen has an HTML snapshot file
- the file paths follow the canonical directories above
