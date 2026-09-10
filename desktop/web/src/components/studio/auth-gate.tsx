import { useAuth } from "@clerk/clerk-react";
import { useEffect, type ReactNode } from "react";

import { Wordmark } from "@/components/wordmark";
import { goToSignIn, MESA_SIGN_IN_URL } from "@/lib/clerk";
import { setTokenSupplier } from "@/lib/lymark/api";

function Splash({ line }: { line: string }) {
  return (
    <div className="flex h-dvh flex-col items-start justify-end bg-navy-900 px-8 pb-10">
      <Wordmark />
      <p className="mt-4 max-w-sm text-body text-slate text-pretty">{line}</p>
    </div>
  );
}

export function AuthSplash({ line }: { line: string }) {
  return <Splash line={line} />;
}

export function AuthMisconfigured() {
  return (
    <div className="flex h-dvh flex-col items-start justify-end bg-navy-900 px-8 pb-10">
      <Wordmark />
      <p className="mt-4 max-w-sm text-body text-slate text-pretty">
        A mesa só abre com a conta Lymark.
      </p>
      <a
        href={MESA_SIGN_IN_URL}
        className="mt-6 text-body font-medium text-ink underline decoration-amber underline-offset-4"
      >
        Entrar
      </a>
    </div>
  );
}

/**
 * Sem sessão não há mesa. É a mesma regra do aplicativo no celular:
 * a cota é da conta, não do navegador.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  useEffect(() => {
    if (!isSignedIn) {
      setTokenSupplier(null);
      return;
    }
    setTokenSupplier(() => getToken());
    return () => setTokenSupplier(null);
  }, [isSignedIn, getToken]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) goToSignIn();
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) return <Splash line="A conferir a conta…" />;
  if (!isSignedIn) return <Splash line="A abrir o login…" />;
  return <>{children}</>;
}
