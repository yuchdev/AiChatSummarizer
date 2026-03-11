# Repository State & README Gap Analysis

## Declared purpose (from README)

The project is described as a browser extension that can:

- Parse AI chat conversations (currently ChatGPT).
- Let users browse conversations in a tree UI with search and selection.
- Summarize selected or full content.
- Export to JSON/Markdown/Text (with SQLite planned).
- Provide parser-debug tooling and tests.

## Current implementation status

## What is already working

1. **Core extension scaffolding is present**
   - MV3 manifest, background script, content script, popup, and UI assets are all wired.  
2. **Parser foundation exists and is fairly rich**
   - The ChatGPT parser can extract structured content parts (text/code/lists/quotes/headings/images), and has selector fallback logic plus stable IDs.  
3. **Viewer/export UI exists**
   - The UI can render stored conversations, search within nodes, select nodes, and export JSON/Markdown/Text directly in the UI layer.  
4. **Build/typecheck pipeline works**
   - Scripts for build/typecheck/test/integration are defined.

## Major gaps versus README purpose

1. **Critical message-contract mismatch breaks end-to-end persistence path**
   - The content extraction path sends `CHAT_EXTRACTED` parser messages.
   - The background service only handles legacy `MessageType` values (e.g., `PARSE_COMPLETE`) and has no `CHAT_EXTRACTED` branch.
   - This means successful parser output is not reliably persisted by background in the new flow, which undermines the main user path (parse → store → view).

2. **Summarization is still placeholder logic**
   - Background `handleSummarize()` explicitly returns a placeholder string.
   - README already states summarization is pending, so this is acknowledged but still core to product purpose.

3. **SQLite export is not implemented**
   - UI export handler shows “SQLite export not yet implemented.”
   - README marks SQLite as “coming soon,” so this is also acknowledged but still a feature gap.

4. **“Comprehensive tests” claim is ahead of reality**
   - Test infrastructure is present, but current unit tests are failing substantially (parser/selectors).
   - Integration suite currently times out waiting for configured web server.

5. **Documentation drift**
   - `IMPLEMENTATION.md` and `DEVELOPER.md` describe parts of the system as placeholder or future work in ways that differ from README phrasing, and include statements now outdated (e.g., automated tests listed as future work despite existing test suites).

## Distance from declared purpose

Overall: **partially implemented, but not yet functionally complete for the headline workflow**.

- **Strong**: project structure, parser architecture, and UI scaffolding.
- **Moderate**: local export formats (JSON/MD/TXT) from UI state.
- **Weak/Critical**: integration glue between parser and background storage in the newer messaging schema; summarization implementation; SQLite export; test reliability.

Estimated completion against README’s implied end-user promise: **~60–70%**.

## Recommended next milestones (highest impact first)

1. **Unify messaging contracts**
   - Add explicit handling of parser schema messages (`CHAT_EXTRACTED`, etc.) in background, or standardize all components on one message model.
2. **Stabilize parser/selectors tests**
   - Align selector constants and parser behavior with fixtures used in `tests/unit`.
3. **Fix integration test startup path**
   - Resolve Playwright `webServer` timeout path for `npm run preview` so integration checks are actionable.
4. **Implement real summarization backend strategy**
   - Add provider abstraction + settings + secure key handling.
5. **Either implement SQLite export or downscope wording**
   - Keep README and UI messaging tightly consistent with actual capability.
6. **Consolidate docs**
   - Add one canonical “current status” section and reduce stale overlap across README/IMPLEMENTATION/DEVELOPER docs.
