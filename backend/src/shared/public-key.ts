export function normalizePublicKeyJson(publicKeyJson: unknown) {
  if (typeof publicKeyJson !== "string" || !publicKeyJson.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(publicKeyJson) as { kty?: unknown; n?: unknown; e?: unknown };

    if (parsed.kty === "RSA" && typeof parsed.n === "string" && typeof parsed.e === "string") {
      return publicKeyJson.trim();
    }
  } catch {
    return null;
  }

  return null;
}
