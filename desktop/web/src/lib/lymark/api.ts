import { FREE_LIFETIME_QUOTA, LEASE_DAYS, type Entitlement } from "@/lib/lymark/types";

const KEY = "lymark-mesa-used";
const DAY_MS = 24 * 60 * 60 * 1000;

function readUsed(): number {
  if (typeof localStorage === "undefined") return 0;
  const raw = Number.parseInt(localStorage.getItem(KEY) ?? "0", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

function writeUsed(used: number) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, String(used));
}

function resolve(used: number): Entitlement {
  const now = new Date();
  return {
    plan: "free",
    quota: FREE_LIFETIME_QUOTA,
    used,
    periodEnd: null,
    validUntil: new Date(now.getTime() + LEASE_DAYS * DAY_MS).toISOString(),
    issuedAt: now.toISOString(),
  };
}

/** Mesma assinatura da mesa no preview: getEntitlements(). */
export async function getEntitlements(): Promise<Entitlement> {
  return resolve(readUsed());
}

/** Mesma assinatura: syncEntitlements({ data: { spent } }). */
export async function syncEntitlements(opts: {
  data: { spent: number };
}): Promise<Entitlement> {
  const spent = Math.max(0, Math.floor(opts.data.spent));
  const used = readUsed() + spent;
  writeUsed(used);
  return resolve(used);
}

/**
 * Selo remoto vive em lymark.app. Sem sessão aqui, a exportação segue
 * sem recibo — seal-export já trata a falha.
 */
export async function issueAttest(_opts: {
  data: { hash: string };
}): Promise<{ receipt: string }> {
  throw new Error("selo: use a conta em lymark.app");
}

export async function getAttestPublicKey(): Promise<{ publicKey: string }> {
  throw new Error("selo: use a conta em lymark.app");
}
