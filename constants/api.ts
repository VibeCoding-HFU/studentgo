import { Platform } from 'react-native';

function getDefaultBackendUrl() {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3001';
  }

  return 'http://localhost:3001';
}

export function getBackendUrl() {
  return process.env.EXPO_PUBLIC_API_URL ?? getDefaultBackendUrl();
}
