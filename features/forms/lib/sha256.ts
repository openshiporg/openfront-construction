/** Largest evidence file fingerprinted in the browser (matches the controlled upload limit). */
export const MAX_EVIDENCE_BYTES = 50 * 1024 * 1024;

/** Lowercase hex SHA-256 of the exact file bytes, computed in the browser. */
export async function sha256Hex(file: Blob): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()));
  return [...bytes].map(value => value.toString(16).padStart(2, "0")).join("");
}
