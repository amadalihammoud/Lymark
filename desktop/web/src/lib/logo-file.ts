/**
 * Onde o logotipo mora no studio — e como ele é preparado antes de morar.
 *
 * Antes o arquivo escolhido ia cru, como data URL, para o `localStorage`
 * junto com o resto do kit. Um PNG de 3 MB estourava a cota, e o kit era
 * regravado SEM o logotipo, em silêncio: a pessoa fechava o navegador e o
 * logo tinha sumido — "precisa subir de novo toda vez".
 *
 * Agora o preparo é o mesmo do aplicativo (`src/features/watermark/logo-image.ts`):
 * aparar a margem transparente, limitar o lado maior a 1024 px e regravar
 * como PNG. E os bytes vão para o IndexedDB, que não tem a cota apertada do
 * `localStorage`; o kit guarda só a referência (`id`) e a geometria.
 */

/** Lado maior do arquivo guardado — o mesmo limite do aplicativo. */
export const LOGO_MAX_EDGE = 1024;

const DB_NAME = "lymark-web";
const STORE = "logos";

export type PreparedLogo = { url: string; aspect: number };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("indexeddb"));
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = run(tx.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("indexeddb"));
        tx.oncomplete = () => db.close();
      }),
  );
}

export async function putLogoBytes(id: string, url: string): Promise<void> {
  await withStore("readwrite", (store) => store.put(url, id));
}

export async function getLogoBytes(id: string): Promise<string | null> {
  try {
    const value = await withStore<unknown>("readonly", (store) => store.get(id));
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

export async function deleteLogoBytes(id: string): Promise<void> {
  try {
    await withStore("readwrite", (store) => store.delete(id));
  } catch {
    /* já não estava lá */
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("load"));
    el.src = src;
  });
}

/** A caixa da tinta: o menor retângulo com algum pixel não transparente. */
function inkBounds(data: Uint8ClampedArray, width: number, height: number) {
  let top = height, left = width, right = -1, bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] === 0) continue;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
      if (x < left) left = x;
      if (x > right) right = x;
    }
  }
  if (right < 0) return null;
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

/**
 * Decodifica, apara, limita e regrava o arquivo como PNG.
 *
 * Sempre PNG: é o formato que preserva a transparência, e recodificar um JPG
 * como PNG não inventa transparência nenhuma — o fundo branco continua branco.
 *
 * @returns a data URL do PNG e a proporção **já recortada**, que é a que o
 *   desenho precisa conhecer.
 */
export async function prepareLogo(file: Blob): Promise<PreparedLogo> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const sw = image.naturalWidth || image.width;
    const sh = image.naturalHeight || image.height;
    if (!(sw > 0 && sh > 0)) throw new Error("empty");

    // Lê os pixels numa cópia já limitada: um PNG de 6000 px não precisa
    // ser varrido inteiro para achar a margem, e alguns navegadores recusam
    // canvases maiores que isso.
    const probeScale = Math.min(1, 2048 / Math.max(sw, sh));
    const probe = document.createElement("canvas");
    probe.width = Math.max(1, Math.round(sw * probeScale));
    probe.height = Math.max(1, Math.round(sh * probeScale));
    const probeCtx = probe.getContext("2d", { willReadFrequently: true });
    if (!probeCtx) throw new Error("canvas");
    probeCtx.drawImage(image, 0, 0, probe.width, probe.height);

    let bounds = { x: 0, y: 0, width: sw, height: sh };
    try {
      const found = inkBounds(
        probeCtx.getImageData(0, 0, probe.width, probe.height).data,
        probe.width,
        probe.height,
      );
      if (found) {
        bounds = {
          x: found.x / probeScale,
          y: found.y / probeScale,
          width: found.width / probeScale,
          height: found.height / probeScale,
        };
      }
    } catch {
      // Canvas "sujo" (SVG com recurso externo, por exemplo): guarda inteiro.
    }

    const fit = Math.min(1, LOGO_MAX_EDGE / Math.max(bounds.width, bounds.height));
    const out = document.createElement("canvas");
    out.width = Math.max(1, Math.round(bounds.width * fit));
    out.height = Math.max(1, Math.round(bounds.height * fit));
    const ctx = out.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.drawImage(
      image,
      bounds.x, bounds.y, bounds.width, bounds.height,
      0, 0, out.width, out.height,
    );

    return { url: out.toDataURL("image/png"), aspect: out.width / out.height };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
