import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { hexToHsv, hsvToHex, parseHex, STAMP_SWATCHES } from "./color.ts";

describe("hsvToHex", () => {
  it("resolve os vértices do espectro", () => {
    assert.equal(hsvToHex({ h: 0, s: 1, v: 1 }), "#FF0000");
    assert.equal(hsvToHex({ h: 120, s: 1, v: 1 }), "#00FF00");
    assert.equal(hsvToHex({ h: 240, s: 1, v: 1 }), "#0000FF");
  });

  it("sem saturação devolve cinza", () => {
    assert.equal(hsvToHex({ h: 0, s: 0, v: 1 }), "#FFFFFF");
    assert.equal(hsvToHex({ h: 217, s: 0, v: 1 }), "#FFFFFF");
    assert.equal(hsvToHex({ h: 0, s: 1, v: 0 }), "#000000");
  });

  it("normaliza matiz fora de 0–360", () => {
    assert.equal(hsvToHex({ h: 360, s: 1, v: 1 }), "#FF0000");
    assert.equal(hsvToHex({ h: -120, s: 1, v: 1 }), "#0000FF");
  });
});

describe("hexToHsv", () => {
  it("volta ao mesmo hexadecimal dos atalhos", () => {
    for (const swatch of STAMP_SWATCHES) {
      assert.equal(hsvToHex(hexToHsv(swatch.hex)), swatch.hex);
    }
  });

  it("aceita com e sem cerquilha", () => {
    assert.deepEqual(hexToHsv("#FF0000"), hexToHsv("FF0000"));
  });

  it("cai no preto em vez de NaN", () => {
    for (const bad of ["", "roxo", "#12345", "#GGGGGG"]) {
      const hsv = hexToHsv(bad);
      assert.equal(Number.isFinite(hsv.h), true);
      assert.equal(Number.isFinite(hsv.s), true);
      assert.equal(Number.isFinite(hsv.v), true);
    }
  });
});

describe("parseHex", () => {
  it("normaliza para #RRGGBB", () => {
    assert.equal(parseHex("f3c218"), "#F3C218");
    assert.equal(parseHex("#63b3ed"), "#63B3ED");
    assert.equal(parseHex("azul"), null);
  });
});
