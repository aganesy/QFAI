# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                         | Expected                                                                                                       |
| --------------- | --------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| EX-0001-0190-01 | AC-0001-0190-01 | Research conclusion: "Use deprecated API method X" flagged as high-risk       | HITL gate triggers; developer sees: diff showing deprecated API usage + citations from 2020 docs               |
| EX-0001-0190-02 | AC-0001-0190-02 | Research conclusion: "Import well-known utility from npm" flagged as low-risk | HITL gate auto-approves; code applied without blocking                                                         |
| EX-0001-0190-03 | AC-0001-0190-03 | Developer uses --yolo flag with security-critical HITL gate                   | Gate still triggers; --yolo flag ignored for security-critical gates; log: "--yolo bypassed for security gate" |
