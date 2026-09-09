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

## Phase 4 (merged — final / full coverage)

Thirteen locales:

`et`, `tg`, `mk`, `be`, `tk`, `ky`, `nn`, `lb`, `dz`, `mt`, `is`, `dv`, `ca`

RTL set: `ar`, `he`, `ur`, `fa`, `ps`, `dv` (Divehi / Thaana added). Dzongkha (`dz`) is Tibetan script and **LTR**.

Clerk UI: `be`, `ca`, `is` use native packs.
**Fallbacks to English localization:** `et`, `tg`, `mk`, `tk`, `ky`, `nn`, `lb`, `dz`, `mt`, `dv`.

Catalog total after Phase 4: **73** locales (12 original + 18 + 15 + 15 + 13).

## Regional variants

After the full base catalog (Phases 1–4), regional **script/region variants** of existing languages can be added without renaming the base locale (so URLs and `hreflang` stay stable).

### V1 (merged) — Chinese Traditional

- Keep `zh` as **Simplified Chinese** (zh-Hans content). Display name: `中文（简体）`.
- Add `zh-Hant` (**Traditional Chinese**, Taiwan/HK). Display name: `中文（繁體）`.
- Messages: `i18n/messages/zh-Hant.json` + `i18n/messages/legal/zh-Hant.json`.
- Clerk UI: `zhTW`. Open Graph: `zh_TW`.
- Device negotiation: `zh-Hant` / `zh-TW` / `zh-HK` / `zh-MO` → `zh-Hant`; `zh-Hans` / `zh-CN` / `zh-SG` / bare `zh` → `zh`.
- RTL unchanged (Chinese remains LTR).
- Catalog total after V1: **74** locales.

### V2 (merged) — Portuguese (Portugal) + Spanish regional

- Keep `pt` as **Brazilian Portuguese**. Display name: `Português (Brasil)`.
- Add `pt-PT` (**European Portuguese**). Display name: `Português (Portugal)`.
- Keep `es` as the historical default Spanish catalog (mixed LatAm/peninsular wording — left unchanged for URL/`hreflang` stability).
- Add `es-419` (**Latin American Spanish**, LatAm-neutral). Display name: `Español (Latinoamérica)`.
- Add `es-ES` (**Spain / Peninsular Spanish**). Display name: `Español (España)`.
- Messages: `pt-PT` / `es-419` / `es-ES` under `i18n/messages/` + `i18n/messages/legal/`.
- Clerk UI: `ptPT`, `esES` for `es-ES` (and existing `es`), `esMX` for `es-419` (no Clerk `es-419` pack).
- Open Graph: `pt_PT`, `es_LA` (`es-419`), `es_ES`.
- Device negotiation: `pt-PT` → `pt-PT`; other `pt-*` / bare `pt` → `pt`. `es-ES` → `es-ES`; `es-419` / `es-MX` / other LatAm regions → `es-419`; bare `es` → `es`.
- RTL unchanged.
- Catalog total after V2: **77** locales.

### V3 (this PR — final regional variants) — British English + Canadian French

- Keep `en` as the historical default English catalog (US-leaning / shared). Display name: `English`.
- Add `en-GB` (**British English**). Display name: `English (UK)`. Spelling and date wording adapted from `en` (e.g. `1 Jan 2026`, share menu, house number, email).
- Keep `fr` as European French. Display name: `Français`.
- Add `fr-CA` (**Canadian French / Quebec-appropriate**). Display name: `Français (Canada)`. Adapted from `fr` (`courriel`, inspection / preuve de service, etc.).
- Messages: `en-GB` / `fr-CA` under `i18n/messages/` + `i18n/messages/legal/`.
- Clerk UI: `enGB` for `en-GB`; `fr-CA` falls back to `frFR` (Clerk does not publish `frCA`).
- Open Graph: `en_GB`, `fr_CA`.
- Device negotiation: `en-GB` / `en-AU` / `en-UK` → `en-GB`; other `en-*` / bare `en` → `en`. `fr-CA` → `fr-CA`; other `fr-*` / bare `fr` → `fr`.
- RTL unchanged.
- Catalog total after V3: **79** locales.
