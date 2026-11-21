---
"@handamade/psi-mcp": patch
---

The HTTP handler answers `GET` and `DELETE` with 405 and takes `POST` only. A stateless server has no session to end and sends nothing of its own. Until now it accepted the `GET` for a standalone event stream and held it open forever, so on a serverless host every connected client's stream ran to the platform's timeout and kept an instance alive. Clients carry on with `POST` alone, as the MCP spec allows.
