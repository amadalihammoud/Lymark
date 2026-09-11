import { DEFAULT_LOCALE, type Locale } from "@i18n/locales";

const NEXT = "next=/mesa";

export function signInUrl(locale: Locale = DEFAULT_LOCALE): string {
  const path = locale === DEFAULT_LOCALE ? "/entrar" : `/${locale}/entrar`;
  return `${path}?${NEXT}`;
}

export async function loadPublishableKey(): Promise<string> {
  const fromEnv = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (typeof fromEnv === "string" && fromEnv.startsWith("pk_")) return fromEnv;

  try {
    const response = await fetch("/api/public-config", {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return "";
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "clerkPublishableKey" in body &&
      typeof (body as { clerkPublishableKey: unknown }).clerkPublishableKey ===
        "string"
    ) {
      const key = (body as { clerkPublishableKey: string }).clerkPublishableKey;
      if (key.startsWith("pk_")) return key;
    }
  } catch {
    // Sem rede ou rota: o portão fecha.
  }
  return "";
}

export function goToSignIn(locale?: Locale) {
  window.location.replace(signInUrl(locale));
}
