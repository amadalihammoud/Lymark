import type {
  CodePlacement,
  FieldKey,
  LogoAt,
  StampCorner,
  StampSize,
  StudioLogo,
} from "@/store/studio";

export const KIT_KEY = "lymark.kit.v1";

/**
 * Um logotipo no kit: tudo menos os bytes.
 *
 * Os bytes moram no IndexedDB, sob o mesmo `id` (ver `logo-file.ts`). É o
 * que impede um PNG grande de estourar a cota do `localStorage` e levar o
 * kit inteiro junto.
 */
export type KitLogo = Omit<StudioLogo, "url">;

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
  logos: KitLogo[];
  visible: Record<FieldKey, boolean>;
  /**
   * O logotipo único das versões anteriores, com os bytes dentro.
   *
   * Só é LIDO: quem atualiza o encontra gravado, e é daqui que ele migra para
   * a lista e para o IndexedDB. Nunca mais é escrito.
   */
  legacyLogoUrl?: string | null;
};

export const MAX_LOGOS = 2;

function isCorner(v: unknown): v is StampCorner {
  return (
    v === "top-left" ||
    v === "top-right" ||
    v === "bottom-left" ||
    v === "bottom-right"
  );
}

function isLogoAt(v: unknown): v is LogoAt {
  return v === "block" || v === "free" || isCorner(v);
}

function num(v: unknown, min: number, max: number, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function readLogo(v: unknown): KitLogo | null {
  if (typeof v !== "object" || v === null) return null;
  const data = v as Partial<KitLogo>;
  if (typeof data.id !== "string" || !data.id) return null;
  return {
    id: data.id,
    aspect: num(data.aspect, 0.2, 5, 1),
    scale: num(data.scale, 0.5, 2.5, 1),
    at: isLogoAt(data.at) ? data.at : "block",
    x: num(data.x, 0, 1, 0.5),
    y: num(data.y, 0, 1, 0.5),
    width: num(data.width, 0.04, 1, 0.25),
  };
}

export function readKit(): StampKit | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KIT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<StampKit> & {
      logoUrl?: unknown;
      logoAt?: unknown;
      logoScale?: unknown;
    };
    if (!data.brandLy && !data.brandMark) return null;

    const logos: KitLogo[] = [];
    let hasBlock = false;
    for (const item of Array.isArray(data.logos) ? data.logos : []) {
      const logo = readLogo(item);
      if (!logo || logos.length >= MAX_LOGOS) continue;
      // Só um cabe junto ao carimbo; o segundo vira livre em vez de sumir.
      if (logo.at === "block") {
        if (hasBlock) logo.at = "free";
        hasBlock = true;
      }
      logos.push(logo);
    }

    // Migração do logotipo único: vira o primeiro da lista, com a mesma
    // posição e escala — os bytes seguem para o IndexedDB em `hydrateKit`.
    const legacyLogoUrl =
      logos.length === 0 && typeof data.logoUrl === "string" && data.logoUrl
        ? data.logoUrl
        : null;
    if (legacyLogoUrl) {
      logos.push({
        id: `legacy-${Date.now().toString(36)}`,
        aspect: 1,
        scale: num(data.logoScale, 0.5, 2.5, 1),
        at: isLogoAt(data.logoAt) && data.logoAt !== "free" ? data.logoAt : "block",
        x: 0.5,
        y: 0.5,
        width: 0.25,
      });
    }

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
      logos,
      legacyLogoUrl,
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
  // Sem bytes no kit, ele cabe sempre: a cota que o derrubava era o logotipo.
  const { legacyLogoUrl: _legacy, ...slim } = kit;
  try {
    window.localStorage.setItem(KIT_KEY, JSON.stringify(slim));
  } catch {
    /* armazenamento bloqueado */
  }
}
