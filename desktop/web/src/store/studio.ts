import { create } from "zustand";

import { clockFromDate, clockNow } from "@/lib/datetime";
import type { Entitlement } from "@/lib/lymark/types";
import { makePhotoCode } from "@/lib/photo-code";
import { readKit, writeKit } from "@/lib/stamp-kit";

export type StudioMode = "photo" | "video" | "batch";
export type StampCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";
export type StampSize = "sm" | "md" | "lg";
export type CodePlacement = "side" | "block";
export type FieldKey = "time" | "date" | "weekday" | "address" | "code" | "brand";
export type LogoAt = "block" | StampCorner;
export type InspectorTab = "marca" | "aparencia" | "dados";
export type AddressSource = "exif" | "device" | "manual" | "demo";

export type MediaPlace = {
  address: string;
  city: string;
  source: AddressSource;
};

/** Rua + cidade/estado num texto só, quebra de linha se não couber. */
export function formatPlace(address: string, city: string): string {
  return [address, city].filter((part) => part.length > 0).join("\n");
}

export function parsePlace(value: string): { address: string; city: string } {
  const nl = value.lastIndexOf("\n");
  if (nl < 0) return { address: value, city: "" };
  return { address: value.slice(0, nl), city: value.slice(nl + 1) };
}

export type MediaItem = {
  id: string;
  kind: "image" | "video";
  url: string;
  name: string;
  width: number;
  height: number;
  gps: { lat: number; lng: number } | null;
  capturedAt: string | null;
  existingCode: string | null;
  place: MediaPlace | null;
};

export type StampFields = {
  time: string;
  date: string;
  weekday: string;
  address: string;
  city: string;
  code: string;
  brandLy: string;
  brandMark: string;
  complement: string;
};

type StudioState = {
  mode: StudioMode;
  inspectorOpen: boolean;
  inspectorTab: InspectorTab;
  media: MediaItem | null;
  batch: MediaItem[];
  batchIndex: number;
  batchDone: number;
  batchBusy: boolean;
  fields: StampFields;
  visible: Record<FieldKey, boolean>;
  corner: StampCorner;
  size: StampSize;
  codePlacement: CodePlacement;
  band: boolean;
  ink: string;
  accent: string;
  colorA: string;
  colorB: string;
  logoUrl: string | null;
  logoScale: number;
  logoAt: LogoAt;
  locating: boolean;
  used: number;
  quota: number;
  entitlement: Entitlement | null;
  billedIds: string[];
  lastSeal: "on" | "off" | null;
  verifyOpen: boolean;
  accountOpen: boolean;
  editing: FieldKey | null;
  lastSaved: string | null;
  reportOpen: boolean;
  canvasZoom: number;
  addressSource: AddressSource;
  setMode: (mode: StudioMode) => void;
  toggleInspector: () => void;
  setInspector: (open: boolean) => void;
  setInspectorTab: (tab: InspectorTab) => void;
  setMedia: (media: MediaItem | null) => void;
  applyCapture: (media: MediaItem, opts?: { regenCode?: boolean }) => void;
  addBatch: (items: MediaItem[]) => void;
  selectBatch: (index: number) => void;
  patchMedia: (id: string, patch: Partial<MediaItem>) => void;
  setPlace: (place: MediaPlace) => void;
  setBatchProgress: (done: number, busy: boolean) => void;
  setField: <K extends keyof StampFields>(key: K, value: StampFields[K]) => void;
  toggleField: (key: FieldKey) => void;
  setCorner: (corner: StampCorner) => void;
  setSize: (size: StampSize) => void;
  setCodePlacement: (placement: CodePlacement) => void;
  setBand: (band: boolean) => void;
  setInk: (ink: string) => void;
  setAccent: (accent: string) => void;
  setColorA: (color: string) => void;
  setColorB: (color: string) => void;
  setLogo: (url: string | null) => void;
  setLogoScale: (scale: number) => void;
  setLogoAt: (at: LogoAt) => void;
  setEditing: (key: FieldKey | null) => void;
  setLocating: (locating: boolean) => void;
  setReportOpen: (open: boolean) => void;
  setVerifyOpen: (open: boolean) => void;
  setAccountOpen: (open: boolean) => void;
  setEntitlement: (entitlement: Entitlement) => void;
  markBilled: (id: string) => void;
  setLastSeal: (seal: "on" | "off" | null) => void;
  syncClock: () => void;
  regenCode: () => void;
  markSaved: (name: string) => void;
  resetCapture: () => void;
  hydrateKit: () => void;
  setCanvasZoom: (zoom: number) => void;
};

const DEMO_PLACE: MediaPlace = {
  address: "R. da Consolação, 2100 — Consolação",
  city: "São Paulo — SP",
  source: "demo",
};

const DEMO_FIELDS: StampFields = {
  time: "07:42",
  date: "10 set. 2026",
  weekday: "Qui",
  address: DEMO_PLACE.address,
  city: DEMO_PLACE.city,
  code: "9A26F4C1E08B3D",
  brandLy: "Ly",
  brandMark: "mark",
  complement: "Vistoria e campo",
};

const DEMO_MEDIA: MediaItem = {
  id: "demo",
  kind: "image",
  url: `${import.meta.env.BASE_URL}demo-obra.jpg`,
  name: "obra-demo.jpg",
  width: 1600,
  height: 1200,
  gps: null,
  capturedAt: null,
  existingCode: null,
  place: DEMO_PLACE,
};

function clockOf(item: MediaItem): Pick<StampFields, "time" | "date" | "weekday"> | null {
  if (!item.capturedAt) return null;
  const date = new Date(item.capturedAt);
  if (Number.isNaN(date.getTime())) return null;
  return clockFromDate(date);
}

function applyItemFields(
  current: StampFields,
  item: MediaItem,
  addressSource: AddressSource,
  regen: boolean,
): { fields: StampFields; addressSource: AddressSource } {
  const clock = clockOf(item);
  let address = current.address;
  let city = current.city;
  let source = addressSource;
  if (item.place) {
    address = item.place.address;
    city = item.place.city;
    source = item.place.source;
  } else if (item.gps) {
    address = `${item.gps.lat.toFixed(5)}, ${item.gps.lng.toFixed(5)}`;
    city = "";
    source = "exif";
  } else if (item.id === "demo") {
    address = DEMO_PLACE.address;
    city = DEMO_PLACE.city;
    source = "demo";
  } else if (source === "demo") {
    address = "";
    city = "";
    source = "manual";
  }
  return {
    addressSource: source,
    fields: {
      ...current,
      ...(clock ?? {}),
      address,
      city,
      code: regen ? makePhotoCode() : current.code,
    },
  };
}

export const useStudio = create<StudioState>()((set, get) => ({
  mode: "photo",
  inspectorOpen: true,
  inspectorTab: "aparencia",
  media: DEMO_MEDIA,
  batch: [],
  batchIndex: 0,
  batchDone: 0,
  batchBusy: false,
  fields: DEMO_FIELDS,
  visible: {
    time: true,
    date: true,
    weekday: true,
    address: true,
    code: true,
    brand: true,
  },
  corner: "bottom-left",
  size: "md",
  codePlacement: "side",
  band: false,
  ink: "#FFFFFF",
  accent: "#F3C218",
  colorA: "#FFFFFF",
  colorB: "#F3C218",
  logoUrl: null,
  logoScale: 1,
  logoAt: "block",
  locating: false,
  used: 0,
  quota: 12,
  entitlement: null,
  billedIds: [],
  lastSeal: null,
  verifyOpen: false,
  accountOpen: false,
  editing: null,
  lastSaved: null,
  reportOpen: false,
  canvasZoom: 1,
  addressSource: "demo",
  setMode: (mode) => set({ mode }),
  toggleInspector: () => set({ inspectorOpen: !get().inspectorOpen }),
  setInspector: (inspectorOpen) => set({ inspectorOpen }),
  setInspectorTab: (inspectorTab) => set({ inspectorTab, inspectorOpen: true }),
  setMedia: (media) => {
    if (!media) {
      set({ media: null, lastSaved: null });
      return;
    }
    get().applyCapture(media, { regenCode: true });
  },
  applyCapture: (media, opts) => {
    const regen = opts?.regenCode !== false;
    const next = applyItemFields(get().fields, media, get().addressSource, regen);
    set({
      media,
      lastSaved: null,
      fields: next.fields,
      addressSource: next.addressSource,
    });
  },
  addBatch: (items) => {
    const batch = [...get().batch, ...items];
    const media = get().media;
    const had = Boolean(media && media.id !== "demo" && get().batch.length);
    set({
      batch,
      batchIndex: had ? get().batchIndex : 0,
      mode: "batch",
    });
    if (!had && items[0]) get().applyCapture(items[0], { regenCode: true });
  },
  selectBatch: (index) => {
    const item = get().batch[index];
    if (!item) return;
    const next = applyItemFields(get().fields, item, get().addressSource, false);
    set({
      batchIndex: index,
      media: item,
      fields: next.fields,
      addressSource: next.addressSource,
    });
  },
  patchMedia: (id, patch) => {
    const batch = get().batch.map((item) => (item.id === id ? { ...item, ...patch } : item));
    const current = get().media;
    const media = current?.id === id ? { ...current, ...patch } : current;
    if (media?.id === id && patch.place) {
      set({
        batch,
        media,
        fields: {
          ...get().fields,
          address: patch.place.address,
          city: patch.place.city,
        },
        addressSource: patch.place.source,
      });
      return;
    }
    set({ batch, media });
  },
  setPlace: (place) => {
    const media = get().media;
    const next = media ? { ...media, place } : media;
    set({
      fields: { ...get().fields, address: place.address, city: place.city },
      addressSource: place.source,
      media: next,
      batch: media
        ? get().batch.map((item) => (item.id === media.id ? { ...item, place } : item))
        : get().batch,
    });
  },
  setBatchProgress: (batchDone, batchBusy) => set({ batchDone, batchBusy }),
  setField: (key, value) => {
    const fields = { ...get().fields, [key]: value };
    if (key !== "address" && key !== "city") {
      set({ fields });
      return;
    }
    get().setPlace({
      address: key === "address" ? String(value) : fields.address,
      city: key === "city" ? String(value) : fields.city,
      source: "manual",
    });
  },
  toggleField: (key) =>
    set({ visible: { ...get().visible, [key]: !get().visible[key] } }),
  setCorner: (corner) => set({ corner }),
  setSize: (size) => set({ size }),
  setCodePlacement: (codePlacement) => set({ codePlacement }),
  setBand: (band) => set({ band }),
  setInk: (ink) => set({ ink }),
  setAccent: (accent) => set({ accent }),
  setColorA: (colorA) => set({ colorA }),
  setColorB: (colorB) => set({ colorB }),
  setLogo: (logoUrl) => set({ logoUrl }),
  setLogoScale: (logoScale) => set({ logoScale }),
  setLogoAt: (logoAt) => set({ logoAt }),
  setEditing: (editing) => set({ editing }),
  setLocating: (locating) => set({ locating }),
  setReportOpen: (reportOpen) => set({ reportOpen }),
  setVerifyOpen: (verifyOpen) => set({ verifyOpen }),
  setAccountOpen: (accountOpen) => set({ accountOpen }),
  setEntitlement: (entitlement) =>
    set({
      entitlement,
      used: entitlement.used,
      quota: entitlement.quota ?? 0,
    }),
  markBilled: (id) => {
    const billedIds = get().billedIds;
    if (billedIds.includes(id)) return;
    set({ billedIds: [...billedIds, id] });
  },
  setLastSeal: (lastSeal) => set({ lastSeal }),
  syncClock: () => set({ fields: { ...get().fields, ...clockNow() } }),
  regenCode: () => set({ fields: { ...get().fields, code: makePhotoCode() } }),
  markSaved: (name) => set({ lastSaved: name }),
  resetCapture: () =>
    set({
      media: null,
      lastSaved: null,
      editing: null,
      fields: { ...get().fields, ...clockNow(), code: makePhotoCode() },
    }),
  hydrateKit: () => {
    const kit = readKit();
    if (!kit) return;
    set({
      fields: {
        ...get().fields,
        brandLy: kit.brandLy,
        brandMark: kit.brandMark,
        complement: kit.complement,
      },
      colorA: kit.colorA,
      colorB: kit.colorB,
      ink: kit.ink,
      accent: kit.accent,
      corner: kit.corner,
      size: kit.size,
      codePlacement: kit.codePlacement,
      band: kit.band,
      logoAt: kit.logoAt,
      logoScale: kit.logoScale,
      logoUrl: kit.logoUrl,
      visible: kit.visible,
    });
  },
  setCanvasZoom: (canvasZoom) => set({ canvasZoom }),
}));

if (typeof window !== "undefined") {
  let t: number | undefined;
  useStudio.subscribe((s) => {
    window.clearTimeout(t);
    t = window.setTimeout(() => {
      writeKit({
        brandLy: s.fields.brandLy,
        brandMark: s.fields.brandMark,
        complement: s.fields.complement,
        colorA: s.colorA,
        colorB: s.colorB,
        ink: s.ink,
        accent: s.accent,
        corner: s.corner,
        size: s.size,
        codePlacement: s.codePlacement,
        band: s.band,
        logoAt: s.logoAt,
        logoScale: s.logoScale,
        logoUrl: s.logoUrl,
        visible: s.visible,
      });
    }, 200);
  });
}
