import { apiFetch } from '@/src/shared/api/client';

export function updateAccountPublicKeyRequest(token: string, publicKeyJson: string) {
  return apiFetch('/api/account/public-key', {
    body: { publicKeyJson },
    method: 'PATCH',
    token,
  });
}
