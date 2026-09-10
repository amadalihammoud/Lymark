import { fileStampName } from "@/lib/datetime";
import type {
  FieldKey,
  LogoAt,
  StampCorner,
  StampFields,
  StampSize,
} from "@/store/studio";

const SIZE: Record<StampSize, { clock: number; body: number; code: number; pad: number }> = {
  sm: { clock: 42, body: 13, code: 12, pad: 18 },
  md: { clock: 56, body: 16, code: 15, pad: 24 },
  lg: { clock: 72, body: 20, code: 18, pad: 32 },
};

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width <= max) cur = next;
    else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 2);
}

export type StampLook = {
  fields: StampFields;
  visible: Record<FieldKey, boolean>;
  corner: StampCorner;
  size: StampSize;
  codePlacement: "side" | "block";
  band: boolean;
  ink: string;
  accent: string;
  colorA: string;
  colorB: string;
  logoUrl: string | null;
  logoScale: number;
  logoAt: LogoAt;
};

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("load"));
    el.src = src;
  });
}

function drawStamp(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  look: StampLook,
  logo: HTMLImageElement | null,
) {
  const m = SIZE[look.size];
  const scale = Math.min(w, h) / 1200;
  const clock = m.clock * Math.max(0.85, scale);
  const body = m.body * Math.max(0.85, scale);
  const code = m.code * Math.max(0.85, scale);
  const pad = m.pad * Math.max(0.85, scale);
  const right = look.corner.endsWith("right");
  const top = look.corner.startsWith("top");
  const ink = look.ink;
  const accent = look.accent;

  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 1;
  ctx.textBaseline = "alphabetic";

  const x0 = right ? w - pad : pad;
  const align: CanvasTextAlign = right ? "right" : "left";
  ctx.textAlign = align;

  if (logo && look.logoAt !== "block") {
    const lh = Math.round(body * 2.2 * look.logoScale);
    const lw = Math.round(lh * Math.min(2.4, logo.width / Math.max(1, logo.height)));
    const lx = look.logoAt.endsWith("right") ? w - pad - lw : pad;
    const ly = look.logoAt.startsWith("top") ? pad : h - pad - lh;
    ctx.shadowBlur = 0;
    ctx.drawImage(logo, lx, ly, lw, lh);
    ctx.shadowBlur = 6;
  }

  ctx.font = "500 " + body + "px Barlow, sans-serif";
  const addr = look.visible.address
    ? wrap(ctx, `${look.fields.address}  ${look.fields.city}`, w * 0.55)
    : [];

  let blockH = 0;
  if (look.visible.brand) blockH += body * (look.fields.complement ? 2.2 : 1.3);
  if (look.visible.time) blockH += clock;
  if (look.visible.date) blockH += body * 1.15;
  if (look.visible.weekday) blockH += body * 1.15;
  blockH += addr.length * body * 1.35;
  if (look.visible.code && look.codePlacement === "block") blockH += body * 1.4;

  let cursor = top ? pad + clock : h - pad;
  if (!top) cursor = h - pad - (blockH - clock);

  if (look.band) {
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(15,25,42,0.55)";
    const bw = w * 0.58;
    const bx = right ? w - pad - bw : pad - 12;
    ctx.fillRect(bx, cursor - clock, bw + 12, blockH + 16);
    ctx.shadowBlur = 6;
  }

  if (look.visible.brand) {
    ctx.font = "500 " + body + "px Barlow, sans-serif";
    const brandY = cursor - clock + body;
    if (logo && look.logoAt === "block") {
      const lh = Math.round(body * 1.8 * look.logoScale);
      const lw = Math.round(lh * Math.min(2.4, logo.width / Math.max(1, logo.height)));
      const lx = right ? x0 - lw : x0;
      ctx.shadowBlur = 0;
      ctx.drawImage(logo, lx, brandY - lh + 4, lw, lh);
      ctx.shadowBlur = 6;
    }
    ctx.fillStyle = look.colorA;
    ctx.fillText(look.fields.brandLy, x0, brandY);
    const aw = ctx.measureText(look.fields.brandLy).width;
    ctx.fillStyle = look.colorB;
    ctx.fillText(look.fields.brandMark, right ? x0 : x0 + aw, brandY);
    if (look.fields.complement) {
      ctx.fillStyle = ink;
      ctx.font = "500 " + body * 0.75 + "px Barlow, sans-serif";
      ctx.fillText(look.fields.complement, x0, brandY + body);
    }
    cursor += body * 0.4;
  }

  if (look.visible.time) {
    ctx.font = "400 " + clock + "px 'Pathway Gothic One', sans-serif";
    ctx.fillStyle = ink;
    ctx.fillText(look.fields.time, x0, cursor);
    const tw = ctx.measureText(look.fields.time).width;
    ctx.shadowBlur = 0;
    ctx.fillStyle = accent;
    const barX = right ? x0 - tw - clock * 0.18 : x0 + tw + clock * 0.08;
    ctx.fillRect(barX, cursor - clock * 0.72, 3, clock * 0.72);
    ctx.shadowBlur = 6;
    cursor += body * 0.35;
  }

  ctx.font = "500 " + body + "px Barlow, sans-serif";
  ctx.fillStyle = ink;
  if (look.visible.date) {
    cursor += body * 1.15;
    ctx.fillText(look.fields.date, x0, cursor);
  }
  if (look.visible.weekday) {
    cursor += body * 1.15;
    ctx.fillText(look.fields.weekday, x0, cursor);
  }
  for (const line of addr) {
    cursor += body * 1.3;
    ctx.fillText(line, x0, cursor);
  }

  if (look.visible.code && look.codePlacement === "block") {
    cursor += body * 1.4;
    ctx.font = "500 " + code + "px 'IBM Plex Mono', ui-monospace, monospace";
    if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D).letterSpacing = `${Math.max(0.5, code * 0.12)}px`;
    ctx.fillText(look.fields.code, x0, cursor);
    if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D).letterSpacing = "0px";
  }

  if (look.visible.code && look.codePlacement === "side") {
    ctx.save();
    ctx.font = "500 " + code + "px 'IBM Plex Mono', ui-monospace, monospace";
    if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D).letterSpacing = `${Math.max(0.5, code * 0.12)}px`;
    ctx.fillStyle = ink;
    ctx.textAlign = "center";
    const cx = right ? pad + 8 : w - pad - 8;
    ctx.translate(cx, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(look.fields.code, 0, 0);
    ctx.restore();
  }
}

export async function exportStampedJpeg(
  src: string,
  look: StampLook,
): Promise<{ blob: Blob; filename: string }> {
  const img = await loadImage(src);
  const logo = look.logoUrl ? await loadImage(look.logoUrl).catch(() => null) : null;
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(img, 0, 0);
  drawStamp(ctx, canvas.width, canvas.height, look, logo);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/jpeg", 0.92);
  });
  return { blob, filename: fileStampName(look.fields.code) };
}

export async function exportVideoFrame(
  src: string,
  look: StampLook,
): Promise<{ blob: Blob; filename: string }> {
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.src = src;
  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(new Error("video"));
  });
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 1920;
  canvas.height = video.videoHeight || 1080;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const logo = look.logoUrl ? await loadImage(look.logoUrl).catch(() => null) : null;
  drawStamp(ctx, canvas.width, canvas.height, look, logo);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/jpeg", 0.92);
  });
  return { blob, filename: fileStampName(look.fields.code).replace(".jpg", "-quadro.jpg") };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function shareBlob(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: blob.type });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: "Lymark" });
    return;
  }
  downloadBlob(blob, filename);
}
