/**
 * A ponte com o Lymark Desktop — quando o studio roda dentro dele.
 *
 * O Electron abre https://lymark.app/web como qualquer navegador e injeta
 * `window.lymark` só nessa origem (ver `desktop/preload.ts`). É por essa
 * ponte que o desktop entrega o que o navegador não tem: o ffmpeg para o
 * vídeo inteiro (o navegador só tira um quadro), gravar direto na pasta de
 * saída sem diálogo, e o menu do sistema.
 *
 * Fora do desktop `desktop` é `null`, e cada uso pergunta antes. A fonte da
 * verdade dos tipos é a interface `LymarkApi` do preload; este arquivo copia
 * só o subconjunto que o studio consome, para o build do studio não depender
 * dos tipos do Electron.
 */

export type DesktopBridge = {
  platform: "desktop";
  /** Seleciona um vídeo no diálogo do sistema; `url` serve a prévia. */
  pickVideo: () => Promise<{
    status: "selected" | "cancelled" | "failed";
    path?: string;
    url?: string;
    name?: string;
    width?: number;
    height?: number;
    durationMs?: number;
    modifiedMs?: number;
    error?: string;
  }>;
  /** Compõe o carimbo (PNG do tamanho do quadro) sobre o vídeo, via ffmpeg. */
  watermarkVideo: (
    videoPath: string,
    overlay: Uint8Array,
    durationMs: number,
  ) => Promise<{ status: "saved" | "cancelled" | "failed"; path?: string; error?: string }>;
  /** Progresso em porcentagem inteira; devolve a função que cancela a escuta. */
  onVideoProgress: (callback: (percent: number) => void) => () => void;
  hashVideoFile: (path: string) => Promise<{ status: "ok" | "failed"; hash?: string }>;
  sealVideo: (path: string, receipt: string) => Promise<{ ok: boolean }>;
  /** Grava na pasta de saída configurada, sem diálogo. */
  saveFileToOutput: (
    bytes: Uint8Array,
    filename: string,
    mimeType: string,
  ) => Promise<{ status: "saved" | "failed"; path?: string; error?: string }>;
  getOutputFolder: () => Promise<{ path: string }>;
  selectOutputFolder: () => Promise<{ status: "selected" | "cancelled"; path?: string }>;
  setLocale: (locale: string) => Promise<{ ok: boolean }>;
  /** Rotas pedidas pelo menu do sistema. */
  onNavigate: (callback: (route: string) => void) => void;
};

function detect(): DesktopBridge | null {
  if (typeof window === "undefined") return null;
  const bridge = (window as unknown as { lymark?: Partial<DesktopBridge> }).lymark;
  if (!bridge || bridge.platform !== "desktop") return null;
  // Uma ponte incompleta (versão antiga do desktop) conta como ausente: é
  // melhor o studio se comportar como navegador do que quebrar no meio.
  if (typeof bridge.watermarkVideo !== "function" || typeof bridge.pickVideo !== "function") {
    return null;
  }
  return bridge as DesktopBridge;
}

export const desktop: DesktopBridge | null = detect();

export const isDesktop = desktop !== null;
