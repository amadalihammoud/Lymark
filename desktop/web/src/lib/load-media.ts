import { parseJpegExif } from "@/lib/exif";
import { extractCodeFromName } from "@/lib/read-stamp-code";
import type { MediaItem } from "@/store/studio";

function id() {
  return crypto.randomUUID();
}

function readSize(url: string, kind: "image" | "video"): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    if (kind === "video") {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () =>
        resolve({ width: video.videoWidth || 1920, height: video.videoHeight || 1080 });
      video.onerror = () => reject(new Error("video"));
      video.src = url;
      return;
    }
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("image"));
    img.src = url;
  });
}

export async function fileToMedia(file: File): Promise<MediaItem> {
  const kind = file.type.startsWith("video/") ? "video" : "image";
  const url = URL.createObjectURL(file);
  const size = await readSize(url, kind);
  let gps: MediaItem["gps"] = null;
  let capturedAt: string | null = null;
  if (kind === "image") {
    try {
      const exif = parseJpegExif(new Uint8Array(await file.arrayBuffer()));
      gps = exif.gps;
      capturedAt = exif.capturedAt;
    } catch {
      /* JPEG sem EXIF */
    }
  }
  return {
    id: id(),
    kind,
    url,
    name: file.name,
    ...size,
    gps,
    capturedAt,
    existingCode: extractCodeFromName(file.name),
    place: null,
  };
}

export async function demoMedia(src: string, name: string): Promise<MediaItem> {
  const url = src;
  const size = await readSize(url, "image");
  return {
    id: id(),
    kind: "image",
    url,
    name,
    ...size,
    gps: null,
    capturedAt: null,
    existingCode: null,
    place: null,
  };
}
