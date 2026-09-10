import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";

import { DesktopShell } from "@/components/studio/desktop-shell";
import "@/styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DesktopShell />
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
  </StrictMode>,
);
