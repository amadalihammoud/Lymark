import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  base: process.env.LYMARK_MESA_BASE || "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@i18n": fileURLToPath(new URL("../../i18n", import.meta.url)),
    },
  },
  // i18n/ e src/i18n/ ficam fora desta pasta; o tsconfig da raiz estende o
  // Expo, que o Vite da mesa não tem. Transforma esses .ts sem consultá-lo.
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        target: "ES2022",
        useDefineForClassFields: true,
        jsx: "react-jsx",
      },
    },
  },
  server: {
    fs: { allow: [repoRoot] },
  },
});
