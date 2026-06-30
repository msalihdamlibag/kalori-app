import { SignJWT, importPKCS8 } from "jose";

// "Sign in with Apple" uses a short-lived JWT as the OAuth client secret. You
// can either supply a pre-generated one via AUTH_APPLE_SECRET, or provide the
// .p8 key material (APPLE_TEAM_ID / APPLE_KEY_ID / APPLE_PRIVATE_KEY) and let
// this helper mint it. Apple allows secrets valid for up to 6 months; we cache
// a generated one for ~5 months so we don't sign on every request.

let cached: { token: string; exp: number } | null = null;

export async function getAppleClientSecret(): Promise<string | undefined> {
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const privateKey = process.env.APPLE_PRIVATE_KEY;
  const clientId = process.env.AUTH_APPLE_ID;

  // No key material → fall back to a pre-generated secret (if any).
  if (!teamId || !keyId || !privateKey || !clientId) {
    return process.env.AUTH_APPLE_SECRET;
  }

  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - now > 60 * 60 * 24) {
    return cached.token;
  }

  // Env vars often store the PEM with literal "\n"; normalise back to newlines.
  const pkcs8 = privateKey.replace(/\\n/g, "\n");
  const key = await importPKCS8(pkcs8, "ES256");
  const exp = now + 60 * 60 * 24 * 150; // ~5 months

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .setAudience("https://appleid.apple.com")
    .setSubject(clientId)
    .sign(key);

  cached = { token, exp };
  return token;
}
