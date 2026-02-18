const PBKDF2_ITERATIONS = 100000;

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2,"0")).join("");
}
function hexToArrayBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i/2] = parseInt(hex.substring(i, i+2), 16);
  return bytes;
}
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), { name: "PBKDF2" }, false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" }, keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt","decrypt"]);
}
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}
export async function encryptData(data: string, password: string, saltHex: string): Promise<{ ivHex: string; dataHex: string }> {
  const salt = hexToArrayBuffer(saltHex);
  const key = await deriveKey(password, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(data));
  return { ivHex: arrayBufferToHex(iv), dataHex: arrayBufferToHex(encrypted) };
}
export async function decryptData(ivHex: string, dataHex: string, password: string, saltHex: string): Promise<string> {
  const salt = hexToArrayBuffer(saltHex);
  const key = await deriveKey(password, salt);
  try {
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: hexToArrayBuffer(ivHex) }, key, hexToArrayBuffer(dataHex));
    return new TextDecoder().decode(decrypted);
  } catch { throw new Error("Senha incorreta ou dados corrompidos"); }
}
export async function verifyPassword(password: string, saltHex: string, testToken: { ivHex: string; dataHex: string }): Promise<boolean> {
  try { return (await decryptData(testToken.ivHex, testToken.dataHex, password, saltHex)) === "VALID_PASSWORD"; } catch { return false; }
}
export async function createPasswordTestToken(password: string, saltHex: string) {
  return encryptData("VALID_PASSWORD", password, saltHex);
}
