---
name: Expo test server binding
description: Accepted host values when starting Expo's local development server for a separate test port.
---
Use `--host localhost`, `--host lan`, or `--host tunnel` with Expo CLI. Passing an interface address such as `0.0.0.0` to `--host` is rejected.

**Why:** Expo CLI validates its host mode against those named options; an extra local test server failed to start when given a raw bind address.

**How to apply:** For isolated browser checks on a second port, start Expo with `--host localhost`; do not use the server's IP as the `--host` value.
