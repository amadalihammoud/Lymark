import { ClerkProvider } from "@clerk/clerk-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";

import { AuthGate, AuthMisconfigured } from "@/components/studio/auth-gate";
import { DesktopShell } from "@/components/studio/desktop-shell";
import { LocaleProvider } from "@/i18n/locale-provider";
import { loadPublishableKey } from "@/lib/clerk";
import "@/styles.css";

const root = createRoot(document.getElementById("root")!);

function App({ publishableKey }: { publishableKey: string }) {
  return (
    <ClerkProvider
      publishableKey={publishableKey}
      afterSignOutUrl="/entrar?next=/mesa"
    >
      <AuthGate>
        <DesktopShell />
      </AuthGate>
      <Toaster
        theme="dark"
        position="bottom-left"
        toastOptions={{
          style: {
            background: "#182A45",
            border: "1px solid #294675",
            color: "#FFFFFF",
          },
        }}
      />
    </ClerkProvider>
  );
}

void loadPublishableKey().then((key) => {
  root.render(
    <StrictMode>
      <LocaleProvider>
        {key ? <App publishableKey={key} /> : <AuthMisconfigured />}
      </LocaleProvider>
    </StrictMode>,
  );
});
