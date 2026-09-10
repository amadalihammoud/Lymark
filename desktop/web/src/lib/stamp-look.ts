import type { StampLook } from "@/lib/export-stamp";

export function lookFrom(s: StampLook): StampLook {
  return {
    fields: s.fields,
    visible: s.visible,
    corner: s.corner,
    size: s.size,
    codePlacement: s.codePlacement,
    band: s.band,
    ink: s.ink,
    accent: s.accent,
    colorA: s.colorA,
    colorB: s.colorB,
    logoUrl: s.logoUrl,
    logoScale: s.logoScale,
    logoAt: s.logoAt,
  };
}
