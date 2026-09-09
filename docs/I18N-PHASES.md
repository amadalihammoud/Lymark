# Lymark i18n phases

The shared catalog lives in `i18n/messages/` (plus `i18n/messages/legal/`).
Portuguese (`pt`) is the source language; English (`en`) disambiguates.

## Phase 1 (this PR)

Eighteen locales added alongside the original twelve:

`hi`, `sw`, `id`, `ms`, `bn`, `ur`, `tr`, `vi`, `ro`, `uk`, `el`, `pl`, `th`, `fa`, `sr`, `am`, `cs`, `he`

RTL set: `ar`, `he`, `ur`, `fa`.

Clerk UI (`@clerk/localizations`): most Phase 1 codes map to a native pack.
**Fallbacks to English localization:** `sw`, `ur`, `am` (not published by Clerk yet).

## Phases 2–4

Not in this PR. Further locale batches will follow the same pattern:

1. Extend `LOCALES` / `LOCALE_NAMES` / `RTL_LOCALES` / calendar maps / Clerk & OG maps.
2. Add `i18n/messages/<code>.json` and `i18n/messages/legal/<code>.json` with key parity to `pt`.
3. Wire static imports in `src/i18n/messages.ts`.
4. Note any Clerk fallbacks in the PR.
