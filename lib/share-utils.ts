export function generateShareToken(): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
  const array = new Uint8Array(64)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => chars[byte % chars.length]).join("")
}

export function validateShareTokenFormat(token: string): boolean {
  return /^[0-9A-Za-z]{64}$/.test(token)
}
