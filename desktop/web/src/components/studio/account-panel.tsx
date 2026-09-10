import { useClerk, useUser } from "@clerk/clerk-react";

import { remainingPhotos } from "@/lib/lymark/types";
import { useStudio } from "@/store/studio";

export function AccountPanel() {
  const open = useStudio((s) => s.accountOpen);
  const setAccountOpen = useStudio((s) => s.setAccountOpen);
  const entitlement = useStudio((s) => s.entitlement);
  const lastSeal = useStudio((s) => s.lastSeal);
  const remaining = remainingPhotos(entitlement);
  const { user } = useUser();
  const { signOut } = useClerk();

  if (!open) return null;

  const email =
    user?.primaryEmailAddress?.emailAddress ?? user?.username ?? "conta";

  return (
    <div className="fixed inset-0 z-20 flex items-start justify-end bg-navy-950/40 p-4 pt-14">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Fechar"
        onClick={() => setAccountOpen(false)}
      />
      <aside className="relative w-80 rounded-md border border-hairline bg-navy-800 p-4 shadow-[var(--shadow-panel)]">
        <p className="text-title font-medium text-ink">Direito de acesso</p>
        <p className="mt-1 font-mono text-caption text-mist truncate">{email}</p>
        <p className="mt-2 text-caption text-slate text-pretty">
          Identidade, pagamento e cota são camadas separadas. A foto não sai
          do aparelho — o selo assina um hash.
        </p>
        <dl className="mt-4 space-y-2 font-mono text-caption text-mist">
          <div className="flex justify-between">
            <dt>plano</dt>
            <dd className="text-ink">{entitlement?.plan ?? "…"}</dd>
          </div>
          <div className="flex justify-between">
            <dt>cota</dt>
            <dd className="text-ink">{entitlement?.quota ?? "∞"}</dd>
          </div>
          <div className="flex justify-between">
            <dt>usadas</dt>
            <dd className="text-ink">{entitlement?.used ?? "…"}</dd>
          </div>
          <div className="flex justify-between">
            <dt>restantes</dt>
            <dd className="text-ink">{remaining ?? "∞"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>valido_ate</dt>
            <dd className="truncate text-ink">
              {entitlement?.validUntil?.slice(0, 10) ?? "—"}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-micro text-slate text-pretty">
          Último selo:{" "}
          {lastSeal === "on"
            ? "embutido no JPEG"
            : lastSeal === "off"
              ? "exportou sem selo (sem rede ou sem cota)"
              : "nenhuma exportação nesta sessão"}
        </p>
        <button
          type="button"
          className="mt-5 text-caption font-medium text-mist hover:text-ink"
          onClick={() => {
            setAccountOpen(false);
            void signOut({ redirectUrl: "/entrar?next=/mesa" });
          }}
        >
          Sair
        </button>
      </aside>
    </div>
  );
}
