function getDefaultBackendUrl() {
  return 'http://localhost:3001';
}

export function getBackendUrl() {
  return process.env.EXPO_PUBLIC_API_URL ?? getDefaultBackendUrl();
}
