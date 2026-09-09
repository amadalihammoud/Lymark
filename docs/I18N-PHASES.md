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

## Phase 3 (merged)

Fifteen locales:

`da`, `fi`, `sk`, `hr`, `ka`, `mn`, `lo`, `hy`, `lt`, `sq`, `sl`, `ti`, `lv`, `bs`, `rn`

RTL set unchanged: `ar`, `he`, `ur`, `fa`, `ps`. Tigrinya (`ti`) is Ethiopic script and **LTR** — not added to `RTL_LOCALES`.

Clerk UI: `da`, `fi`, `sk`, `hr`, `mn` use native packs.
**Fallbacks to English localization:** `ka`, `lo`, `hy`, `lt`, `sq`, `sl`, `ti`, `lv`, `bs`, `rn`.

## Phase 4 (this PR — final / full coverage)

Thirteen locales:

`et`, `tg`, `mk`, `be`, `tk`, `ky`, `nn`, `lb`, `dz`, `mt`, `is`, `dv`, `ca`

RTL set: `ar`, `he`, `ur`, `fa`, `ps`, `dv` (Divehi / Thaana added). Dzongkha (`dz`) is Tibetan script and **LTR**.

Clerk UI: `be`, `ca`, `is` use native packs.
**Fallbacks to English localization:** `et`, `tg`, `mk`, `tk`, `ky`, `nn`, `lb`, `dz`, `mt`, `dv`.

Catalog total after Phase 4: **73** locales (12 original + 18 + 15 + 15 + 13).
