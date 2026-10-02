---
category: specialties
update-frequency: occasional
dependencies: [00_universal/quality.md]
version: 1.0.0
---

# Perspectives for Quality Evaluation

Checkpoints for deciding whether a release can go ahead.

## Main Perspectives

- **Correctness**: Does it meet the specification, and does it cover boundary values and exceptions?
- **Safety**: Are authentication/authorization, input validation and the protection of secrets in place?
- **Performance**: Is there any needless waiting, N+1 querying or oversized response?
- **Availability/operations**: Are logging, monitoring and error recovery adequate? Can behaviour be switched through configuration?
- **Readability/maintainability**: Are responsibilities clear, and are the tests and documentation complete?

## Report Template

- List concerns in the order critical / high / medium / low, and give the grounds and the location.
- State gaps in test coverage and a lack of reproducibility as risks.
