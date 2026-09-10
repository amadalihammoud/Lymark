import { goToSignIn } from "@/lib/clerk";
import type { Entitlement, Plan } from "@/lib/lymark/types";

const ENTITLEMENTS_URL = "https://lymark.app/api/entitlements";
const ATTEST_URL = "https://lymark.app/api/attest";

type TokenSupplier = () => Promise<string | null>;

let tokenSupplier: TokenSupplier | null = null;

export function setTokenSupplier(fn: TokenSupplier | null) {
  tokenSupplier = fn;
}

async function bearer(): Promise<string> {
  const token = tokenSupplier ? await tokenSupplier() : null;
  if (!token) {
    goToSignIn();
    throw new Error("sem sessão");
  }
  return token;
}

function isPlan(value: unknown): value is Plan {
  return value === "free" || value === "pro";
}

function isWholeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function asIsoDate(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  return Number.isNaN(Date.parse(value)) ? null : value;
}

function parseEntitlement(body: unknown): Entitlement | null {
  if (typeof body !== "object" || body === null) return null;
  const raw = body as Record<string, unknown>;
  if (!isPlan(raw.plan)) return null;
  const quota = raw.quota;
  if (quota !== null && !isWholeNumber(quota)) return null;
  if (!isWholeNumber(raw.used)) return null;
  let periodEnd: string | null = null;
  if (raw.periodEnd !== null) {
    periodEnd = asIsoDate(raw.periodEnd);
    if (!periodEnd) return null;
  }
  const validUntil = asIsoDate(raw.validUntil);
  const issuedAt = asIsoDate(raw.issuedAt);
  if (!validUntil || !issuedAt) return null;
  return { plan: raw.plan, quota, used: raw.used, periodEnd, validUntil, issuedAt };
}

async function requestEntitlement(spent = 0): Promise<Entitlement> {
  const token = await bearer();
  const response = await fetch(ENTITLEMENTS_URL, {
    method: spent > 0 ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(spent > 0 ? { "Content-Type": "application/json" } : {}),
    },
    body: spent > 0 ? JSON.stringify({ spent }) : undefined,
  });
  if (response.status === 401 || response.status === 403) {
    goToSignIn();
    throw new Error("sessão expirada");
  }
  if (!response.ok) throw new Error(`entitlements ${response.status}`);
  const parsed = parseEntitlement(await response.json());
  if (!parsed) throw new Error("entitlements fora do contrato");
  return parsed;
}

export async function getEntitlements(): Promise<Entitlement> {
  return requestEntitlement(0);
}

export async function syncEntitlements(opts: {
  data: { spent: number };
}): Promise<Entitlement> {
  return requestEntitlement(Math.max(0, Math.floor(opts.data.spent)));
}

export async function issueAttest(opts: {
  data: { hash: string };
}): Promise<{ receipt: string }> {
  const token = await bearer();
  const response = await fetch(ATTEST_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ hash: opts.data.hash }),
  });
  if (response.status === 401 || response.status === 403) {
    goToSignIn();
    throw new Error("sessão expirada");
  }
  if (!response.ok) throw new Error(`attest ${response.status}`);
  const body: unknown = await response.json();
  const receipt =
    typeof body === "object" && body !== null && "receipt" in body
      ? (body as { receipt: unknown }).receipt
      : null;
  if (typeof receipt !== "string" || !receipt) throw new Error("recibo vazio");
  return { receipt };
}

export async function getAttestPublicKey(): Promise<{ publicKey: string }> {
  throw new Error("selo: chave pública na verificação em lymark.app");
}
