import { STORAGE_KEY } from './constants';

/**
 * The original app persisted through a host-provided `window.storage` bridge.
 * That is honoured when present so existing data keeps loading; otherwise the
 * browser's own localStorage is used.
 */
interface HostStorage {
  get(key: string): Promise<{ value?: string | null } | null>;
  set(key: string, value: string): Promise<unknown>;
}

function host(): HostStorage | null {
  if (typeof window === 'undefined') return null;
  const s = (window as unknown as { storage?: HostStorage }).storage;
  return s && typeof s.get === 'function' && typeof s.set === 'function' ? s : null;
}

export async function readRaw(): Promise<string | null> {
  const h = host();
  if (h) {
    const res = await h.get(STORAGE_KEY);
    return res?.value ?? null;
  }
  return window.localStorage.getItem(STORAGE_KEY);
}

export async function writeRaw(value: string): Promise<void> {
  const h = host();
  if (h) {
    await h.set(STORAGE_KEY, value);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, value);
}
