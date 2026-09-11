import { useAuth } from "@clerk/clerk-react";
import { useEffect, type ReactNode } from "react";
import { useTranslations } from "use-intl";

import { Wordmark } from "@/components/wordmark";
import { useLocalePreference } from "@/i18n/locale-provider";
import { goToSignIn, signInUrl } from "@/lib/clerk";
import { setTokenSupplier } from "@/lib/lymark/api";

function Splash({ line }: { line: string }) {
  return (
    <div className="flex h-dvh flex-col items-start justify-end bg-navy-900 px-8 pb-10">
      <Wordmark />
      <p className="mt-4 max-w-sm text-body text-slate text-pretty">{line}</p>
    </div>
  );
}

export function AuthMisconfigured() {
  const t = useTranslations("app.web");
  const { locale } = useLocalePreference();
  return (
    <div className="flex h-dvh flex-col items-start justify-end bg-navy-900 px-8 pb-10">
      <Wordmark />
      <p className="mt-4 max-w-sm text-body text-slate text-pretty">
        {t("needsAccount")}
      </p>
      <a
        href={signInUrl(locale)}
        className="mt-6 text-body font-medium text-ink underline decoration-amber underline-offset-4"
      >
        {t("signIn")}
      </a>
    </div>
  );
}

/**
 * Sem sessão não há versão web. É a mesma regra do aplicativo no celular:
 * a cota é da conta, não do navegador.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const t = useTranslations("app.web");
  const { locale } = useLocalePreference();

  if (isSignedIn) setTokenSupplier(() => getToken());

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setTokenSupplier(null);
      goToSignIn(locale);
    }
  }, [isLoaded, isSignedIn, locale]);

  if (!isLoaded) return <Splash line={t("checkingAccount")} />;
  if (!isSignedIn) return <Splash line={t("openingSignIn")} />;
  return <>{children}</>;
}
