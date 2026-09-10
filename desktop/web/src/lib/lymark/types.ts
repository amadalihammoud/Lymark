export type Plan = "free" | "pro";

export type Entitlement = {
  plan: Plan;
  quota: number | null;
  used: number;
  periodEnd: string | null;
  validUntil: string;
  issuedAt: string;
};

export const FREE_LIFETIME_QUOTA = 12;
export const LEASE_DAYS = 30;

/** `null` = plano pago, sem teto. Antes do primeiro GET, a amostra de 12. */
export function remainingPhotos(entitlement: Entitlement | null): number | null {
  if (!entitlement) return FREE_LIFETIME_QUOTA;
  if (entitlement.plan === "pro") return null;
  return Math.max(0, (entitlement.quota ?? FREE_LIFETIME_QUOTA) - entitlement.used);
}

export function canExportNow(
  entitlement: Entitlement | null,
  alreadyBilled: boolean,
): boolean {
  if (alreadyBilled) return true;
  const remaining = remainingPhotos(entitlement);
  return remaining === null || remaining > 0;
}
