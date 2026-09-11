const HEX = "0123456789ABCDEF";
const HEX_CODE = /^[0-9A-F]{10,16}$/;
const GLYPH = 32;
const LENGTHS = [14, 12, 16, 13, 11, 15, 10];

export type StampCodeHit = {
  code: string;
  confidence: number;
  where: "side" | "block" | "name";
};

export function extractCodeFromName(name: string): string | null {
  const base = name.replace(/\.[^.]+$/, "").toUpperCase();
  const tagged = base.match(/^LYMARK-\d{8}-([0-9A-F]{10,16})$/);
  if (tagged?.[1]) return tagged[1];
  const matches = base.match(/[0-9A-F]{10,16}/g);
  if (!matches?.length) return null;
  const codes = matches.filter((token) => /[A-F]/.test(token));
  return codes.sort((a, b) => b.length - a.length)[0] ?? null;
}

export function ncc(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < a.length; i += 1) {
    ma += a[i]!;
    mb += b[i]!;
  }
  ma /= a.length;
  mb /= a.length;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i += 1) {
    const xa = a[i]! - ma;
    const xb = b[i]! - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  const den = Math.sqrt(da * db);
  return den === 0 ? 0 : num / den;
}

function pickHex(text: string): string | null {
  const matches = text.toUpperCase().match(/[0-9A-F]{10,16}/g);
  return matches?.sort((a, b) => b.length - a.length)[0] ?? null;
}

let templates: Float32Array[] | null = null;

async function glyphTemplates(): Promise<Float32Array[]> {
  if (templates) return templates;
  if (typeof document !== "undefined" && document.fonts?.load) {
    await document.fonts.load("500 28px IBM Plex Mono").catch(() => undefined);
  }
  const canvas = document.createElement("canvas");
  canvas.width = GLYPH;
  canvas.height = GLYPH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
  const out: Float32Array[] = [];
  for (const ch of HEX) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, GLYPH, GLYPH);
    ctx.fillStyle = "#fff";
    ctx.font = "500 26px 'IBM Plex Mono', ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(ch, GLYPH / 2, GLYPH / 2 + 1);
    out.push(toGray(ctx.getImageData(0, 0, GLYPH, GLYPH)));
  }
  templates = out;
  return out;
}

function toGray(image: ImageData): Float32Array {
  const out = new Float32Array(image.width * image.height);
  const d = image.data;
  for (let i = 0, p = 0; i < d.length; i += 4, p += 1) {
    out[p] = (0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!) / 255;
  }
  return out;
}

function gradient(gray: Float32Array, w: number, h: number): Float32Array {
  const out = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const gx = gray[y * w + x + 1]! - gray[y * w + x - 1]!;
      const gy = gray[(y + 1) * w + x]! - gray[(y - 1) * w + x]!;
      out[y * w + x] = Math.abs(gx) + Math.abs(gy);
    }
  }
  return out;
}

function peakWindow(energy: Float32Array, win: number): { y0: number; y1: number } {
  const h = energy.length;
  const w = Math.max(8, Math.min(win, h));
  let best = -1;
  let at = 0;
  let acc = 0;
  for (let y = 0; y < h; y += 1) {
    acc += energy[y]!;
    if (y >= w) acc -= energy[y - w]!;
    if (y >= w - 1 && acc > best) {
      best = acc;
      at = y - w + 1;
    }
  }
  return { y0: at, y1: Math.min(h, at + w) };
}

function rowEnergy(map: Float32Array, w: number, h: number): Float32Array {
  const row = new Float32Array(h);
  for (let y = 0; y < h; y += 1) {
    let s = 0;
    for (let x = 0; x < w; x += 1) s += map[y * w + x]!;
    row[y] = s;
  }
  return row;
}

function xExtent(map: Float32Array, w: number, h: number): { x0: number; x1: number } {
  const col = new Float32Array(w);
  let max = 0;
  for (let x = 0; x < w; x += 1) {
    let s = 0;
    for (let y = 0; y < h; y += 1) s += map[y * w + x]!;
    col[x] = s;
    if (s > max) max = s;
  }
  if (max <= 0) return { x0: 0, x1: w };
  const t = max * 0.22;
  let x0 = 0;
  let x1 = w;
  for (let x = 0; x < w; x += 1) {
    if (col[x]! >= t) {
      x0 = x;
      break;
    }
  }
  for (let x = w - 1; x >= 0; x -= 1) {
    if (col[x]! >= t) {
      x1 = x + 1;
      break;
    }
  }
  const pad = Math.max(2, Math.round((x1 - x0) * 0.04));
  return { x0: Math.max(0, x0 - pad), x1: Math.min(w, x1 + pad) };
}

function resample(src: Float32Array, sw: number, sh: number, dw: number, dh: number): Float32Array {
  const out = new Float32Array(dw * dh);
  for (let y = 0; y < dh; y += 1) {
    const sy = ((y + 0.5) * sh) / dh;
    const y0 = Math.min(sh - 1, Math.max(0, Math.floor(sy)));
    for (let x = 0; x < dw; x += 1) {
      const sx = ((x + 0.5) * sw) / dw;
      const x0 = Math.min(sw - 1, Math.max(0, Math.floor(sx)));
      out[y * dw + x] = src[y0 * sw + x0]!;
    }
  }
  return out;
}

function binarize(src: Float32Array): Float32Array {
  let sum = 0;
  for (let i = 0; i < src.length; i += 1) sum += src[i]!;
  const mean = sum / Math.max(1, src.length);
  const out = new Float32Array(src.length);
  for (let i = 0; i < src.length; i += 1) out[i] = src[i]! >= mean ? 1 : 0;
  return out;
}

function matchGlyph(slice: Float32Array, glyphs: Float32Array[]): { ch: string; score: number } {
  const bin = binarize(slice);
  let best = -1;
  let idx = 0;
  for (let i = 0; i < glyphs.length; i += 1) {
    const score = ncc(bin, glyphs[i]!);
    if (score > best) {
      best = score;
      idx = i;
    }
  }
  return { ch: HEX[idx]!, score: best };
}

function cropRect(
  src: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number,
  w: number,
  h: number,
): Float32Array {
  const out = new Float32Array(w * h);
  for (let yy = 0; yy < h; yy += 1) {
    const sy = Math.min(height - 1, y + yy);
    for (let xx = 0; xx < w; xx += 1) {
      const sx = Math.min(width - 1, x + xx);
      out[yy * w + xx] = src[sy * width + sx]!;
    }
  }
  return out;
}

function tightBand(ink: Float32Array, w: number, h: number): { y0: number; y1: number } {
  const win = Math.max(10, Math.min(28, Math.round(h * 0.22)));
  return peakWindow(rowEnergy(ink, w, h), win);
}

function colBoxes(ink: Float32Array, w: number, h: number): Array<{ x: number; w: number }> {
  const col = new Float32Array(w);
  let max = 0;
  for (let x = 0; x < w; x += 1) {
    let s = 0;
    for (let y = 0; y < h; y += 1) s += ink[y * w + x]!;
    col[x] = s;
    if (s > max) max = s;
  }
  if (max < 0.4) return [];
  const t = max * 0.18;
  const boxes: Array<{ x: number; w: number }> = [];
  let i = 0;
  while (i < w) {
    while (i < w && col[i]! < t) i += 1;
    if (i >= w) break;
    const x0 = i;
    while (i < w && col[i]! >= t) i += 1;
    if (i - x0 >= 2) boxes.push({ x: x0, w: i - x0 });
  }
  return boxes;
}

function readBoxes(
  gray: Float32Array,
  width: number,
  height: number,
  boxes: Array<{ x: number; w: number }>,
  glyphs: Float32Array[],
): { code: string; score: number } | null {
  if (boxes.length < 10 || boxes.length > 16) return null;
  let sum = 0;
  let text = "";
  for (const box of boxes) {
    const slice = resample(cropRect(gray, width, height, box.x, 0, box.w, height), box.w, height, GLYPH, GLYPH);
    const hit = matchGlyph(slice, glyphs);
    text += hit.ch;
    sum += hit.score;
  }
  return { code: text, score: sum / boxes.length };
}

function scanLine(
  gray: Float32Array,
  width: number,
  height: number,
  glyphs: Float32Array[],
): { code: string; score: number } | null {
  if (width < 40 || height < 6) return null;
  const scale = Math.max(3, Math.ceil(GLYPH / height));
  const sw = width * scale;
  const big = resample(gray, width, height, sw, GLYPH);
  const hits: Array<{ x: number; ch: string; score: number }> = [];
  const win = GLYPH;
  const step = Math.max(2, Math.round(win * 0.12));
  for (let x = 0; x <= sw - win; x += step) {
    const cell = cropRect(big, sw, GLYPH, x, 0, win, GLYPH);
    const hit = matchGlyph(cell, glyphs);
    if (hit.score >= 0.48) hits.push({ x, ch: hit.ch, score: hit.score });
  }
  if (hits.length < 8) return null;
  const picked: Array<{ ch: string; score: number; x: number }> = [];
  let last = -win;
  for (const hit of hits) {
    if (hit.x < last + win * 0.55) {
      const prev = picked[picked.length - 1];
      if (prev && hit.score > prev.score) {
        picked[picked.length - 1] = hit;
        last = hit.x;
      }
      continue;
    }
    picked.push(hit);
    last = hit.x;
  }
  if (picked.length < 10 || picked.length > 16) return null;
  const score = picked.reduce((s, p) => s + p.score, 0) / picked.length;
  return { code: picked.map((p) => p.ch).join(""), score };
}

function readEqual(
  gray: Float32Array,
  width: number,
  height: number,
  glyphs: Float32Array[],
): { code: string; score: number } | null {
  if (width < 40 || height < 6) return null;
  const scaledW = Math.max(GLYPH * 12, width * 3);
  const scaled = resample(gray, width, height, scaledW, GLYPH);
  let best: { code: string; score: number } | null = null;
  for (const len of LENGTHS) {
    const charW = scaledW / len;
    if (charW < 8) continue;
    let sum = 0;
    let text = "";
    for (let i = 0; i < len; i += 1) {
      const x0 = Math.round(i * charW + charW * 0.12);
      const cw = Math.max(8, Math.round(charW * 0.76));
      const col = resample(cropRect(scaled, scaledW, GLYPH, x0, 0, cw, GLYPH), cw, GLYPH, GLYPH, GLYPH);
      const hit = matchGlyph(col, glyphs);
      text += hit.ch;
      sum += hit.score;
    }
    const score = sum / len;
    if (!best || score > best.score) best = { code: text, score };
  }
  return best;
}

function readPolarity(
  gray: Float32Array,
  width: number,
  height: number,
  invertPolarity: boolean,
  glyphs: Float32Array[],
): { code: string; score: number } | null {
  const src = invertPolarity
    ? Float32Array.from(gray, (v) => 1 - v)
    : gray;
  const mag = gradient(src, width, height);
  const band = tightBand(mag, width, height);
  const bh = band.y1 - band.y0;
  if (bh < 6) return null;
  const lineGray = cropRect(src, width, height, 0, band.y0, width, bh);
  const lineMag = cropRect(mag, width, height, 0, band.y0, width, bh);
  const span = xExtent(lineMag, width, bh);
  const lw = span.x1 - span.x0;
  if (lw < 40) return null;
  const cropped = cropRect(lineGray, width, bh, span.x0, 0, lw, bh);
  const scanned = scanLine(cropped, lw, bh, glyphs);
  if (scanned) return scanned;
  const boxes = colBoxes(cropRect(lineMag, width, bh, span.x0, 0, lw, bh), lw, bh);
  const fromBoxes = readBoxes(cropped, lw, bh, boxes, glyphs);
  const fromEqual = readEqual(cropped, lw, bh, glyphs);
  if (fromBoxes && fromEqual) return fromBoxes.score >= fromEqual.score ? fromBoxes : fromEqual;
  return fromBoxes ?? fromEqual;
}

type ImageLike = ImageBitmap | HTMLImageElement | HTMLCanvasElement;

function dim(img: ImageLike): { w: number; h: number } {
  if ("naturalWidth" in img && img.naturalWidth) {
    return { w: img.naturalWidth, h: img.naturalHeight };
  }
  return { w: img.width, h: img.height };
}

function drawSource(img: ImageLike, maxSide = 2400): HTMLCanvasElement {
  const { w, h } = dim(img);
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function slice(
  src: HTMLCanvasElement,
  x: number,
  y: number,
  w: number,
  h: number,
  rotate: 0 | 90 | -90,
): HTMLCanvasElement {
  const sx = Math.max(0, Math.floor(x));
  const sy = Math.max(0, Math.floor(y));
  const sw = Math.max(1, Math.min(src.width - sx, Math.floor(w)));
  const sh = Math.max(1, Math.min(src.height - sy, Math.floor(h)));
  const out = document.createElement("canvas");
  if (rotate === 0) {
    out.width = sw;
    out.height = sh;
    const ctx = out.getContext("2d");
    if (ctx) ctx.drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh);
    return out;
  }
  out.width = sh;
  out.height = sw;
  const ctx = out.getContext("2d");
  if (!ctx) return out;
  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate((rotate * Math.PI) / 180);
  ctx.drawImage(src, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh);
  return out;
}

function canvasGray(canvas: HTMLCanvasElement): { data: Float32Array; w: number; h: number } {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { data: new Float32Array(0), w: 0, h: 0 };
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { data: toGray(image), w: canvas.width, h: canvas.height };
}

function consider(
  canvas: HTMLCanvasElement,
  where: "side" | "block",
  glyphs: Float32Array[],
  best: StampCodeHit | null,
): StampCodeHit | null {
  let { data, w, h } = canvasGray(canvas);
  if (!w || !h) return best;
  if (where === "side" && w > 160) {
    const nw = Math.round(w * 0.34);
    const x0 = Math.round((w - nw) / 2);
    data = cropRect(data, w, h, x0, 0, nw, h);
    w = nw;
  }
  let current = best;
  for (const invertPolarity of [false, true]) {
    const hit = readPolarity(data, w, h, invertPolarity, glyphs);
    if (!hit || !HEX_CODE.test(hit.code)) continue;
    if (!current || hit.score > current.confidence) {
      current = { code: hit.code, confidence: hit.score, where };
    }
  }
  return current;
}

export async function readStampCode(img: ImageLike): Promise<StampCodeHit | null> {
  const glyphs = await glyphTemplates();
  if (!glyphs.length) return null;
  const src = drawSource(img);
  const w = src.width;
  const h = src.height;
  const rois: Array<{ canvas: HTMLCanvasElement; where: "side" | "block" }> = [];
  const colW = Math.max(28, Math.round(w * 0.03));
  for (const frac of [0.02, 0.03, 0.042]) {
    const cx = Math.round(w * frac);
    const xL = Math.max(0, cx - Math.round(colW / 2));
    const xR = Math.max(0, w - cx - Math.round(colW / 2));
    const y = h * 0.16;
    const bh = h * 0.68;
    rois.push({ canvas: slice(src, xL, y, colW, bh, 90), where: "side" });
    rois.push({ canvas: slice(src, xL, y, colW, bh, -90), where: "side" });
    rois.push({ canvas: slice(src, xR, y, colW, bh, 90), where: "side" });
    rois.push({ canvas: slice(src, xR, y, colW, bh, -90), where: "side" });
  }
  const cw = Math.round(w * 0.38);
  const ch = Math.round(h * 0.42);
  rois.push({ canvas: slice(src, 0, 0, cw, ch, 0), where: "block" });
  rois.push({ canvas: slice(src, w - cw, 0, cw, ch, 0), where: "block" });
  rois.push({ canvas: slice(src, 0, h - ch, cw, ch, 0), where: "block" });
  rois.push({ canvas: slice(src, w - cw, h - ch, cw, ch, 0), where: "block" });

  let best: StampCodeHit | null = null;
  for (const roi of rois) best = consider(roi.canvas, roi.where, glyphs, best);
  if (best && best.confidence >= 0.58) return best;
  return null;
}

export async function readStampCodeFromUrl(url: string): Promise<StampCodeHit | null> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("image"));
    el.src = url;
  });
  return readStampCode(img);
}

export async function readStampCodeFromBlob(blob: Blob): Promise<StampCodeHit | null> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(blob);
    try {
      return await readStampCode(bitmap);
    } finally {
      bitmap.close();
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    return await readStampCodeFromUrl(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export { pickHex };
