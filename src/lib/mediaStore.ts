// ── Stockage des médias de réveil ─────────────────────────────────────────
// Les sons et images choisis par l'utilisateur pèsent plusieurs mégaoctets :
// localStorage (5 Mo tout compris, en texte) exploserait et emporterait la
// sauvegarde de jeu avec lui. IndexedDB stocke des Blob tels quels, sans
// conversion, avec un quota d'un autre ordre de grandeur.
//
// Ces fichiers restent volontairement HORS de la sauvegarde exportée/cloud :
// ce sont des médias personnels, potentiellement lourds, qui n'ont rien à
// faire dans un fichier de progression.

const DB_NAME = 'lennyx-media';
const STORE = 'files';

export type MediaKey =
  | 'wake-audio' | 'wake-image'
  | 'lullaby-audio' | 'lullaby-image';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB indisponible'));
  });
}

export async function putMedia(key: MediaKey, blob: Blob): Promise<void> {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('écriture impossible'));
  });
  db.close();
}

export async function getMedia(key: MediaKey): Promise<Blob | null> {
  try {
    const db = await open();
    const blob = await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as Blob) ?? null);
      req.onerror = () => reject(req.error ?? new Error('lecture impossible'));
    });
    db.close();
    return blob;
  } catch {
    return null;
  }
}

export async function deleteMedia(key: MediaKey): Promise<void> {
  try {
    const db = await open();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    db.close();
  } catch {
    /* rien à supprimer */
  }
}

/**
 * Réduit une image à `maxWidth` et la réencode en JPEG.
 * Une photo de galerie fait couramment 12 Mpx et 6 Mo : la stocker telle
 * quelle ferait ramer l'écran de réveil au pire moment, en pleine nuit.
 */
export async function shrinkImage(file: Blob, maxWidth = 1440, quality = 0.86): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const out = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  );
  return out ?? file;
}

/**
 * Calcule l'enveloppe d'un son pour l'afficher : une valeur par colonne de
 * pixel. On agrège en crête (max) plutôt qu'en moyenne, sinon la forme d'onde
 * s'aplatit et les repères visuels de la chanson disparaissent.
 */
export function peaksFrom(buffer: AudioBuffer, columns: number): Float32Array {
  const data = buffer.getChannelData(0);
  const per = Math.max(1, Math.floor(data.length / columns));
  const peaks = new Float32Array(columns);
  for (let c = 0; c < columns; c++) {
    let peak = 0;
    const start = c * per;
    const end = Math.min(data.length, start + per);
    for (let i = start; i < end; i++) {
      const v = Math.abs(data[i]);
      if (v > peak) peak = v;
    }
    peaks[c] = peak;
  }
  return peaks;
}
