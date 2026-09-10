import type {
  CodePlacement,
  FieldKey,
  LogoAt,
  StampCorner,
  StampSize,
} from "@/store/studio";

export const KIT_KEY = "lymark.kit.v1";

export type StampKit = {
  brandLy: string;
  brandMark: string;
  complement: string;
  colorA: string;
  colorB: string;
  ink: string;
  accent: string;
  corner: StampCorner;
  size: StampSize;
  codePlacement: CodePlacement;
  band: boolean;
  logoAt: LogoAt;
  logoScale: number;
  logoUrl: string | null;
  visible: Record<FieldKey, boolean>;
};

function isCorner(v: unknown): v is StampCorner {
  return (
    v === "top-left" ||
    v === "top-right" ||
    v === "bottom-left" ||
    v === "bottom-right"
  );
}

export function readKit(): StampKit | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KIT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<StampKit>;
    if (!data.brandLy && !data.brandMark) return null;
    return {
      brandLy: String(data.brandLy ?? "Ly"),
      brandMark: String(data.brandMark ?? "mark"),
      complement: String(data.complement ?? ""),
      colorA: String(data.colorA ?? "#FFFFFF"),
      colorB: String(data.colorB ?? "#F3C218"),
      ink: String(data.ink ?? "#FFFFFF"),
      accent: String(data.accent ?? "#F3C218"),
      corner: isCorner(data.corner) ? data.corner : "bottom-left",
      size: data.size === "sm" || data.size === "lg" ? data.size : "md",
      codePlacement: data.codePlacement === "block" ? "block" : "side",
      band: Boolean(data.band),
      logoAt: data.logoAt === "block" || isCorner(data.logoAt) ? data.logoAt : "block",
      logoScale: Number(data.logoScale) > 0 ? Number(data.logoScale) : 1,
      logoUrl: typeof data.logoUrl === "string" ? data.logoUrl : null,
      visible: {
        time: data.visible?.time !== false,
        date: data.visible?.date !== false,
        weekday: data.visible?.weekday !== false,
        address: data.visible?.address !== false,
        code: data.visible?.code !== false,
        brand: data.visible?.brand !== false,
      },
    };
  } catch {
    return null;
  }
}

export function writeKit(kit: StampKit) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KIT_KEY, JSON.stringify(kit));
  } catch {
    try {
      window.localStorage.setItem(KIT_KEY, JSON.stringify({ ...kit, logoUrl: null }));
    } catch {
      /* quota */
    }
  }
}
