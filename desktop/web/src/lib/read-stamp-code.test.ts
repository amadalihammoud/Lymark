import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extractCodeFromName, ncc, pickHex } from "./read-stamp-code.ts";

describe("extractCodeFromName", () => {
  it("lê código longo no nome", () => {
    assert.equal(
      extractCodeFromName("vistoria-9A26F4C1E08B3D.jpg"),
      "9A26F4C1E08B3D",
    );
  });

  it("ignora o prefixo curto do download lymark-AAAAMMDD-XXXXXX", () => {
    assert.equal(extractCodeFromName("lymark-20260910-9A26F4.jpg"), null);
  });

  it("lê o código inteiro no nome novo", () => {
    assert.equal(
      extractCodeFromName("lymark-20260910-9A26F4C1E08B3D.jpg"),
      "9A26F4C1E08B3D",
    );
  });

  it("não trata id numérico de rede social como carimbo", () => {
    assert.equal(extractCodeFromName("1341774684993066.jpg"), null);
    assert.equal(extractCodeFromName("1341774684993066_n.jpg"), null);
  });

  it("aceita código só numérico no nome lymark-AAAAMMDD", () => {
    assert.equal(
      extractCodeFromName("lymark-20260911-13417746849930.jpg"),
      "13417746849930",
    );
  });
});

describe("pickHex", () => {
  it("fica com o bloco mais longo", () => {
    assert.equal(pickHex("xx 9A26F4 C1E08B3DAA12 yy"), "C1E08B3DAA12");
  });
});

describe("ncc", () => {
  it("é 1 para o mesmo vetor", () => {
    const a = Float32Array.from([0, 1, 0, 1, 1, 0]);
    assert.ok(Math.abs(ncc(a, a) - 1) < 1e-6);
  });

  it("é -1 para o inverso centrado", () => {
    const a = Float32Array.from([0, 1, 0, 1]);
    const b = Float32Array.from([1, 0, 1, 0]);
    assert.ok(ncc(a, b) < -0.99);
  });

  it("zero em vetor constante", () => {
    const a = Float32Array.from([3, 3, 3]);
    const b = Float32Array.from([1, 2, 3]);
    assert.equal(ncc(a, b), 0);
  });
});
