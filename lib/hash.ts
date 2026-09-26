// Real SHA-256 in both modes. Runs in the browser with Web Crypto, so the
// document itself never leaves the device; only this fingerprint is stored.
export async function sha256Hex(data: Blob | string): Promise<string> {
  const bytes =
    typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(await data.arrayBuffer());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
