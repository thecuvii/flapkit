export function signedLeafNoise(index: number, salt: number) {
  let hash = Math.imul(index + 1 + salt * 101, 0x45d9f3b)
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b)
  hash ^= hash >>> 16
  return ((hash >>> 0) / 0xffffffff) * 2 - 1
}
