# Lymark i18n phases

The shared catalog lives in `i18n/messages/` (plus `i18n/messages/legal/`).
Portuguese (`pt`) is the source language; English (`en`) disambiguates.

## Phase 1 (merged)

Eighteen locales added alongside the original twelve:

`hi`, `sw`, `id`, `ms`, `bn`, `ur`, `tr`, `vi`, `ro`, `uk`, `el`, `pl`, `th`, `fa`, `sr`, `am`, `cs`, `he`

RTL set after Phase 1: `ar`, `he`, `ur`, `fa`.

Clerk UI (`@clerk/localizations`): most Phase 1 codes map to a native pack.
**Fallbacks to English localization:** `sw`, `ur`, `am` (not published by Clerk yet).

## Phase 2 (merged)

Fifteen locales:

`my`, `uz`, `ne`, `hu`, `kk`, `ps`, `so`, `sv`, `az`, `mg`, `si`, `km`, `rw`, `ht`, `bg`

RTL set: `ar`, `he`, `ur`, `fa`, `ps` (Pashto added).

Clerk UI: `hu`, `kk`, `sv`, `bg` use native packs.
**Fallbacks to English localization:** `my`, `uz`, `ne`, `ps`, `so`, `az`, `mg`, `si`, `km`, `rw`, `ht`.

## Phase 3 (this PR)

Fifteen locales:

`da`, `fi`, `sk`, `hr`, `ka`, `mn`, `lo`, `hy`, `lt`, `sq`, `sl`, `ti`, `lv`, `bs`, `rn`

RTL set unchanged: `ar`, `he`, `ur`, `fa`, `ps`. Tigrinya (`ti`) is Ethiopic script and **LTR** — not added to `RTL_LOCALES`.

Clerk UI: `da`, `fi`, `sk`, `hr`, `mn` use native packs.
**Fallbacks to English localization:** `ka`, `lo`, `hy`, `lt`, `sq`, `sl`, `ti`, `lv`, `bs`, `rn`.

## Phase 4

Not in this PR. Further locale batches will follow the same pattern:

1. Extend `LOCALES` / `LOCALE_NAMES` / `RTL_LOCALES` / calendar maps / Clerk & OG maps.
2. Add `i18n/messages/<code>.json` and `i18n/messages/legal/<code>.json` with key parity to `pt`.
3. Wire static imports in `src/i18n/messages.ts`.
4. Note any Clerk fallbacks in the PR.
