export type GpsPoint = { lat: number; lng: number };

export type JpegExif = {
  gps: GpsPoint | null;
  capturedAt: string | null;
};

const TYPE_SIZE: Record<number, number> = {
  1: 1,
  2: 1,
  3: 2,
  4: 4,
  5: 8,
  7: 1,
};

function markerAt(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0);
}

function findExifTiff(bytes: Uint8Array): { start: number; length: number } | null {
  if (bytes.length < 4 || markerAt(bytes, 0) !== 0xffd8) return null;
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    const marker = markerAt(bytes, offset);
    if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) return null;
    const length = markerAt(bytes, offset + 2);
    if (length < 2 || offset + 2 + length > bytes.length) return null;
    if (marker === 0xffe1) {
      const payload = bytes.subarray(offset + 4, offset + 2 + length);
      if (
        payload.length > 8 &&
        payload[0] === 0x45 &&
        payload[1] === 0x78 &&
        payload[2] === 0x69 &&
        payload[3] === 0x66 &&
        payload[4] === 0 &&
        payload[5] === 0
      ) {
        return { start: offset + 10, length: payload.length - 6 };
      }
    }
    offset += 2 + length;
  }
  return null;
}

function u16(view: DataView, offset: number, le: boolean): number {
  return view.getUint16(offset, le);
}

function u32(view: DataView, offset: number, le: boolean): number {
  return view.getUint32(offset, le);
}

function readAscii(view: DataView, offset: number, count: number): string {
  let out = "";
  for (let i = 0; i < count; i += 1) {
    const code = view.getUint8(offset + i);
    if (code === 0) break;
    out += String.fromCharCode(code);
  }
  return out;
}

function rational(view: DataView, offset: number, le: boolean): number {
  const num = u32(view, offset, le);
  const den = u32(view, offset + 4, le);
  if (!den) return 0;
  return num / den;
}

function dmsToDec(view: DataView, offset: number, le: boolean, ref: string): number {
  const deg = rational(view, offset, le);
  const min = rational(view, offset + 8, le);
  const sec = rational(view, offset + 16, le);
  const abs = deg + min / 60 + sec / 3600;
  return ref === "S" || ref === "W" ? -abs : abs;
}

function exifDateToIso(raw: string): string | null {
  const match = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(raw.trim());
  if (!match) return null;
  const [, y, mo, d, h, mi, s] = match;
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return iso;
}

type Entry = { tag: number; type: number; count: number; inline: number; data: number };

function readIfd(view: DataView, tiffStart: number, ifdRel: number, le: boolean): Entry[] {
  const ifd = tiffStart + ifdRel;
  if (ifd + 2 > view.byteLength) return [];
  const n = u16(view, ifd, le);
  const entries: Entry[] = [];
  for (let i = 0; i < n; i += 1) {
    const at = ifd + 2 + i * 12;
    if (at + 12 > view.byteLength) break;
    const tag = u16(view, at, le);
    const type = u16(view, at + 2, le);
    const count = u32(view, at + 4, le);
    const inline = u32(view, at + 8, le);
    const unit = TYPE_SIZE[type] ?? 1;
    const bytes = unit * count;
    const data = bytes <= 4 ? at + 8 : tiffStart + inline;
    entries.push({ tag, type, count, inline, data });
  }
  return entries;
}

function asciiEntry(view: DataView, entry: Entry): string {
  const count = Math.min(entry.count, Math.max(0, view.byteLength - entry.data));
  return readAscii(view, entry.data, count);
}

export function parseJpegExif(bytes: Uint8Array): JpegExif {
  const tiff = findExifTiff(bytes);
  if (!tiff) return { gps: null, capturedAt: null };
  const view = new DataView(bytes.buffer, bytes.byteOffset + tiff.start, tiff.length);
  if (view.byteLength < 8) return { gps: null, capturedAt: null };
  const b0 = view.getUint8(0);
  const b1 = view.getUint8(1);
  const le = b0 === 0x49 && b1 === 0x49;
  const be = b0 === 0x4d && b1 === 0x4d;
  if (!le && !be) return { gps: null, capturedAt: null };
  if (u16(view, 2, le) !== 0x002a) return { gps: null, capturedAt: null };
  const ifd0 = u32(view, 4, le);
  const entries = readIfd(view, 0, ifd0, le);

  let capturedAt: string | null = null;
  let gpsRel: number | null = null;
  let exifRel: number | null = null;

  for (const entry of entries) {
    if (entry.tag === 0x0132 && entry.type === 2) {
      capturedAt = exifDateToIso(asciiEntry(view, entry));
    }
    if (entry.tag === 0x8825 && entry.type === 4) gpsRel = entry.inline;
    if (entry.tag === 0x8769 && entry.type === 4) exifRel = entry.inline;
  }

  if (exifRel != null) {
    for (const entry of readIfd(view, 0, exifRel, le)) {
      if ((entry.tag === 0x9003 || entry.tag === 0x9004) && entry.type === 2) {
        const iso = exifDateToIso(asciiEntry(view, entry));
        if (iso) {
          capturedAt = iso;
          if (entry.tag === 0x9003) break;
        }
      }
    }
  }

  let gps: GpsPoint | null = null;
  if (gpsRel != null) {
    let latRef = "N";
    let lngRef = "E";
    let latOff: number | null = null;
    let lngOff: number | null = null;
    for (const entry of readIfd(view, 0, gpsRel, le)) {
      if (entry.tag === 0x0001) latRef = asciiEntry(view, entry).slice(0, 1) || "N";
      if (entry.tag === 0x0003) lngRef = asciiEntry(view, entry).slice(0, 1) || "E";
      if (entry.tag === 0x0002 && entry.type === 5 && entry.count >= 3) latOff = entry.data;
      if (entry.tag === 0x0004 && entry.type === 5 && entry.count >= 3) lngOff = entry.data;
    }
    if (latOff != null && lngOff != null && latOff + 24 <= view.byteLength && lngOff + 24 <= view.byteLength) {
      gps = {
        lat: dmsToDec(view, latOff, le, latRef),
        lng: dmsToDec(view, lngOff, le, lngRef),
      };
      if (!Number.isFinite(gps.lat) || !Number.isFinite(gps.lng)) gps = null;
    }
  }

  return { gps, capturedAt };
}

function toDms(dec: number): Array<[number, number]> {
  const abs = Math.abs(dec);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = (minFloat - min) * 60;
  return [
    [deg, 1],
    [min, 1],
    [Math.round(sec * 10000), 10000],
  ];
}

function padDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${y}:${m}:${day} ${h}:${mi}:${s}`;
}

/** TIFF payload used by tests and injectExif. */
export function encodeExifTiff(gps: GpsPoint, capturedAt?: Date): Uint8Array {
  const datetime = padDate(capturedAt ?? new Date());
  const buf = new Uint8Array(256);
  const view = new DataView(buf.buffer);
  const le = true;
  view.setUint8(0, 0x49);
  view.setUint8(1, 0x49);
  view.setUint16(2, 0x002a, le);
  view.setUint32(4, 8, le);

  const ifd0 = 8;
  view.setUint16(ifd0, 2, le);
  // DateTime 0x0132 ASCII count 20 → offset 0x26
  const dateOff = 0x26;
  view.setUint16(ifd0 + 2, 0x0132, le);
  view.setUint16(ifd0 + 4, 2, le);
  view.setUint32(ifd0 + 6, 20, le);
  view.setUint32(ifd0 + 10, dateOff, le);
  // GPSOffset 0x8825 LONG → GPS IFD at 0x3A
  const gpsIfd = 0x3a;
  view.setUint16(ifd0 + 14, 0x8825, le);
  view.setUint16(ifd0 + 16, 4, le);
  view.setUint32(ifd0 + 18, 1, le);
  view.setUint32(ifd0 + 22, gpsIfd, le);
  view.setUint32(ifd0 + 26, 0, le);

  for (let i = 0; i < 19; i += 1) view.setUint8(dateOff + i, datetime.charCodeAt(i));
  view.setUint8(dateOff + 19, 0);

  const latOff = 0x78;
  const lngOff = 0x90;
  const latRef = gps.lat < 0 ? 0x53 : 0x4e;
  const lngRef = gps.lng < 0 ? 0x57 : 0x45;

  view.setUint16(gpsIfd, 4, le);
  // GPSLatitudeRef ASCII 2 — inline
  view.setUint16(gpsIfd + 2, 0x0001, le);
  view.setUint16(gpsIfd + 4, 2, le);
  view.setUint32(gpsIfd + 6, 2, le);
  view.setUint8(gpsIfd + 10, latRef);
  view.setUint8(gpsIfd + 11, 0);
  // GPSLatitude RATIONAL[3]
  view.setUint16(gpsIfd + 14, 0x0002, le);
  view.setUint16(gpsIfd + 16, 5, le);
  view.setUint32(gpsIfd + 18, 3, le);
  view.setUint32(gpsIfd + 22, latOff, le);
  // GPSLongitudeRef ASCII 2 — inline
  view.setUint16(gpsIfd + 26, 0x0003, le);
  view.setUint16(gpsIfd + 28, 2, le);
  view.setUint32(gpsIfd + 30, 2, le);
  view.setUint8(gpsIfd + 34, lngRef);
  view.setUint8(gpsIfd + 35, 0);
  // GPSLongitude RATIONAL[3]
  view.setUint16(gpsIfd + 38, 0x0004, le);
  view.setUint16(gpsIfd + 40, 5, le);
  view.setUint32(gpsIfd + 42, 3, le);
  view.setUint32(gpsIfd + 46, lngOff, le);
  view.setUint32(gpsIfd + 50, 0, le);

  const writeDms = (offset: number, dec: number) => {
    const parts = toDms(dec);
    for (let i = 0; i < 3; i += 1) {
      const [num, den] = parts[i]!;
      view.setUint32(offset + i * 8, num, le);
      view.setUint32(offset + i * 8 + 4, den, le);
    }
  };
  writeDms(latOff, gps.lat);
  writeDms(lngOff, gps.lng);

  return buf.subarray(0, 0xa8);
}

export function injectExif(jpeg: Uint8Array, gps: GpsPoint, capturedAt?: Date): Uint8Array {
  if (jpeg.length < 2 || markerAt(jpeg, 0) !== 0xffd8) throw new Error("jpeg");
  const tiff = encodeExifTiff(gps, capturedAt);
  const app1Len = 2 + 6 + tiff.length;
  const out = new Uint8Array(jpeg.length + 2 + app1Len);
  out[0] = 0xff;
  out[1] = 0xd8;
  out[2] = 0xff;
  out[3] = 0xe1;
  out[4] = (app1Len >> 8) & 0xff;
  out[5] = app1Len & 0xff;
  out[6] = 0x45;
  out[7] = 0x78;
  out[8] = 0x69;
  out[9] = 0x66;
  out[10] = 0;
  out[11] = 0;
  out.set(tiff, 12);
  out.set(jpeg.subarray(2), 12 + tiff.length);
  return out;
}
