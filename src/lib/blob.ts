// Resolve the Vercel Blob read/write token. Normally this is
// BLOB_READ_WRITE_TOKEN, but a store connected under a custom name can be
// injected with a prefixed env var (e.g. KALORI_APP_BLOB_READ_WRITE_TOKEN).
// We accept any env var ending in BLOB_READ_WRITE_TOKEN so photo hosting works
// regardless of the exact name.
export function getBlobToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  for (const [key, value] of Object.entries(process.env)) {
    if (/BLOB_READ_WRITE_TOKEN$/i.test(key) && value) return value;
  }
  return undefined;
}
