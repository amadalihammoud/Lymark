import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { injectExif, parseJpegExif } from "./exif.ts";

describe("parseJpegExif", () => {
  it("volta ao GPS e à data injetados no JPEG", () => {
    const jpeg = readFileSync("public/demo-obra.jpg");
    const captured = new Date("2026-03-18T07:42:00");
    const withExif = injectExif(
      new Uint8Array(jpeg),
      { lat: -23.5489, lng: -46.6388 },
      captured,
    );
    const exif = parseJpegExif(withExif);
    assert.ok(exif.gps);
    assert.ok(Math.abs(exif.gps!.lat - -23.5489) < 0.0002);
    assert.ok(Math.abs(exif.gps!.lng - -46.6388) < 0.0002);
    assert.equal(exif.capturedAt, "2026-03-18T07:42:00");
  });

  it("foto sem APP1 não inventa coordenada", () => {
    const jpeg = new Uint8Array(readFileSync("public/demo-obra.jpg"));
    const exif = parseJpegExif(jpeg);
    assert.equal(exif.gps, null);
  });

  it("rejeita buffer que não é JPEG", () => {
    const exif = parseJpegExif(new Uint8Array([1, 2, 3, 4]));
    assert.equal(exif.gps, null);
    assert.equal(exif.capturedAt, null);
  });
});
