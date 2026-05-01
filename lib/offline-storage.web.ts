const prefix = 'studentgo-offline:';

export async function getOfflineValue(key: string) {
  try {
    return globalThis.localStorage?.getItem(`${prefix}${key}`) ?? null;
  } catch {
    return null;
  }
}

export async function setOfflineValue(key: string, value: string) {
  globalThis.localStorage?.setItem(`${prefix}${key}`, value);
}

export async function removeOfflineValue(key: string) {
  globalThis.localStorage?.removeItem(`${prefix}${key}`);
}
