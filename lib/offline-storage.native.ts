import { Directory, File, Paths } from 'expo-file-system';

const cacheDirectory = new Directory(Paths.document, 'studentgo-offline');

function storageFile(key: string) {
  return new File(cacheDirectory, `${encodeURIComponent(key)}.json`);
}

function ensureCacheDirectory() {
  if (!cacheDirectory.exists) {
    cacheDirectory.create({ idempotent: true, intermediates: true });
  }
}

export async function getOfflineValue(key: string) {
  const file = storageFile(key);

  if (!file.exists) {
    return null;
  }

  return file.text();
}

export async function setOfflineValue(key: string, value: string) {
  ensureCacheDirectory();
  storageFile(key).write(value);
}

export async function removeOfflineValue(key: string) {
  const file = storageFile(key);

  if (file.exists) {
    file.delete();
  }
}
