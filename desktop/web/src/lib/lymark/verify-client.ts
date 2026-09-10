import { sha256Base64Url } from "@/lib/lymark/hash";
import { extractSeal, stripSeal } from "@/lib/lymark/jpeg-seal";
import { base64UrlToBytes, parseReceipt, signedPortion } from "@/lib/lymark/receipt";

export type VerifyVerdict =
  | { kind: "intact"; sub: string; issuedAt: string }
  | { kind: "missing" }
  | { kind: "tampered" }
  | { kind: "unconfigured" }
  | { kind: "unsupported" };

function spkiToBytes(b64: string): Uint8Array {
  const url = b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return base64UrlToBytes(url);
}

export async function verifyJpeg(
  bytes: Uint8Array,
  publicKeySpkiBase64: string | null,
): Promise<VerifyVerdict> {
  const receipt = extractSeal(bytes);
  if (!receipt) return { kind: "missing" };
  if (!publicKeySpkiBase64) return { kind: "unconfigured" };

  const parsed = parseReceipt(receipt);
  if (!parsed) return { kind: "tampered" };

  const stripped = stripSeal(bytes);
  const hash = await sha256Base64Url(stripped);
  if (hash !== parsed.payload.h) return { kind: "tampered" };

  try {
    const key = await crypto.subtle.importKey(
      "spki",
      spkiToBytes(publicKeySpkiBase64).slice().buffer as ArrayBuffer,
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    const ok = await crypto.subtle.verify(
      { name: "Ed25519" },
      key,
      base64UrlToBytes(parsed.signatureB64).slice().buffer as ArrayBuffer,
      new TextEncoder().encode(signedPortion(parsed.payloadB64)),
    );
    if (!ok) return { kind: "tampered" };
  } catch {
    return { kind: "unsupported" };
  }

  return {
    kind: "intact",
    sub: parsed.payload.sub,
    issuedAt: new Date(parsed.payload.iat * 1000).toISOString(),
  };
}
