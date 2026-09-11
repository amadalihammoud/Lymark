import { useClerk, useUser } from "@clerk/clerk-react";
import { useTranslations } from "use-intl";

import { useLocalePreference } from "@/i18n/locale-provider";
import { signInUrl } from "@/lib/clerk";
import { remainingPhotos } from "@/lib/lymark/types";
import { useStudio } from "@/store/studio";
import { LOCALES_BY_NAME, LOCALE_NAMES } from "@i18n/locales";

export function AccountPanel() {
  const t = useTranslations("app.web");
  const tLang = useTranslations("app.language");
  const tAccount = useTranslations("app.account");
  const tPlan = useTranslations("app.plan");
  const open = useStudio((s) => s.accountOpen);
  const setAccountOpen = useStudio((s) => s.setAccountOpen);
  const entitlement = useStudio((s) => s.entitlement);
  const lastSeal = useStudio((s) => s.lastSeal);
  const remaining = remainingPhotos(entitlement);
  const { user } = useUser();
  const { signOut } = useClerk();
  const { locale, isAutomatic, setLocale, clearLocale } = useLocalePreference();

  if (!open) return null;

  const email =
    user?.primaryEmailAddress?.emailAddress ?? user?.username ?? tAccount("title");

  return (
    <div className="fixed inset-0 z-20 flex items-start justify-end bg-navy-950/40 p-4 pt-14">
      <button
        type="button"
        className="absolute inset-0"
        aria-label={t("close")}
        onClick={() => setAccountOpen(false)}
      />
      <aside className="relative flex max-h-[calc(100dvh-4.5rem)] w-80 flex-col overflow-hidden rounded-md border border-hairline bg-navy-800 shadow-[var(--shadow-panel)]">
        <div className="overflow-y-auto p-4">
          <p className="text-title font-medium text-ink">{tAccount("title")}</p>
          <p className="mt-1 font-mono text-caption text-mist truncate">{email}</p>

          <p className="mt-6 text-title font-medium text-ink">{tLang("label")}</p>
          <p className="mt-1 text-caption text-slate">{tLang("automaticNote")}</p>
          <div className="mt-2 max-h-48 overflow-y-auto border border-hairline">
            <button
              type="button"
              className={`flex h-9 w-full items-center px-3 text-start text-caption ${isAutomatic ? "bg-lift text-ink" : "text-mist hover:bg-lift hover:text-ink"}`}
              onClick={clearLocale}
            >
              {t("followBrowser")}
            </button>
            {LOCALES_BY_NAME.map((code) => (
              <button
                key={code}
                type="button"
                dir="auto"
                className={`flex h-9 w-full items-center px-3 text-start text-caption ${!isAutomatic && locale === code ? "bg-lift text-ink" : "text-mist hover:bg-lift hover:text-ink"}`}
                onClick={() => setLocale(code)}
              >
                {LOCALE_NAMES[code]}
              </button>
            ))}
          </div>

          <p className="mt-6 text-title font-medium text-ink">{t("accessTitle")}</p>
          <p className="mt-1 text-caption text-slate text-pretty">{t("accessBody")}</p>
          <dl className="mt-4 space-y-2 font-mono text-caption text-mist">
            <div className="flex justify-between">
              <dt>{t("plan")}</dt>
              <dd className="text-ink">
                {entitlement
                  ? entitlement.plan === "pro"
                    ? tPlan("pro")
                    : tPlan("free")
                  : "…"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>{t("quota")}</dt>
              <dd className="text-ink">{entitlement?.quota ?? "∞"}</dd>
            </div>
            <div className="flex justify-between">
              <dt>{t("used")}</dt>
              <dd className="text-ink">{entitlement?.used ?? "…"}</dd>
            </div>
            <div className="flex justify-between">
              <dt>{t("left")}</dt>
              <dd className="text-ink">{remaining ?? "∞"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>{t("validUntil")}</dt>
              <dd className="truncate text-ink">
                {entitlement?.validUntil?.slice(0, 10) ?? "—"}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-micro text-slate text-pretty">
            {t("lastSeal")}:{" "}
            {lastSeal === "on"
              ? t("lastSealOn")
              : lastSeal === "off"
                ? t("lastSealOff")
                : t("lastSealNone")}
          </p>

          <button
            type="button"
            className="mt-5 text-caption font-medium text-mist hover:text-ink"
            onClick={() => {
              setAccountOpen(false);
              void signOut({ redirectUrl: signInUrl(locale) });
            }}
          >
            {tAccount("signOut")}
          </button>
        </div>
      </aside>
    </div>
  );
}
